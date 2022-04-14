import nodeFetch, { FetchError, RequestInit, Response } from "node-fetch";
import { AbortSignal } from "node-fetch/externals";
import makeFetchCookie from "fetch-cookie";
import cheerio, { Cheerio, CheerioAPI, Element } from "cheerio";
import { logger } from "../logger";
import { LOCATIONS, Region } from "../locations";
import { captchaService } from "./captchaService";
import { Config, ConfirmationType } from "../configuration";
import { ProxyService } from "./proxyService";
import { getShortDate } from "../utils";

const TITLE_SELECTOR = ".header h1";
const VALIDATION_ERROR_SELECTOR = ".validation-summary-errors";
const EXISTING_BOOKING_ERROR_TEXT =
  "Det går endast att göra en bokning per e-postadress/telefonnummer";

const DEFAULT_REQUEST_TIMEOUT = 30;
const REQUEST_RETRY_COUNT = 25;

const generateBaseUrl = (region: Region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Index/${replaceSpecialChars(
    region.toLowerCase()
  )}`;
const generatePostUrl = (region: Region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Next/${replaceSpecialChars(
    region.toLowerCase()
  )}`;
const generatePreviousUrl = (region: Region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Previous/${replaceSpecialChars(
    region.toLowerCase()
  )}`;

enum SessionStatus {
  INITIAL = "INITIAL",
  INITIATED = "INITIATED",
}

class BookingPageError extends Error {
  page: CheerioAPI;

  constructor({ message, page }: { message?: string; page: CheerioAPI }) {
    super(message);
    this.page = page;
  }
}

interface BookingServiceConfig {
  region: Region;
  numberOfPeople?: number;
  useProxy?: boolean;
  proxyTimeout?: number;
  mockBooking?: boolean;
  proxyRetries?: number;
}

export class BookingService {
  private region: Region;
  private mockBooking: boolean;
  private numberOfPeople: number;
  private fetchInstance = makeFetchCookie(nodeFetch);
  private proxy?: ProxyService;
  private requestTimeout: number;
  private sessionStatus = SessionStatus.INITIAL;

  constructor({
    region,
    numberOfPeople = 1,
    mockBooking = false,
    useProxy = false,
    proxyTimeout = DEFAULT_REQUEST_TIMEOUT,
    proxyRetries,
  }: BookingServiceConfig) {
    this.region = region;
    this.mockBooking = mockBooking;
    this.numberOfPeople = numberOfPeople;
    this.requestTimeout = (proxyTimeout || DEFAULT_REQUEST_TIMEOUT) * 1000;

    if (useProxy) {
      this.proxy = new ProxyService(proxyRetries);
    }
  }

  async fetch(url = generateBaseUrl(this.region), options: RequestInit = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.requestTimeout);

    try {
      const agent =
        (this.sessionStatus === SessionStatus.INITIATED &&
          this.proxy &&
          this.proxy.agent) ||
        undefined;
      if (agent) {
        logger.debug(
          "Fetching with proxy",
          options?.method || "GET",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (agent as any).proxy.href
        );
      }

      const response = await this.fetchInstance(url, {
        ...options,
        agent,
        signal: controller.signal as AbortSignal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36",
          Referer: generateBaseUrl(this.region),
          ...(options.headers || {}),
        },
      });
      return response;
    } catch (err) {
      this.proxy?.trackError();
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async init() {
    logger.info("Launching booking session...");
    await this.getRequest();

    await this.postRequest({
      FormId: 1,
      ServiceGroupId: LOCATIONS[this.region].id,
      StartNextButton: "Boka ny tid",
    });

    const verifiedToken = await captchaService.getNewVerifiedToken();
    logger.debug("Accepting booking terms...");
    await this.postRequest({
      AgreementText: "123",
      AcceptInformationStorage: true,
      NumberOfPeople: this.numberOfPeople,
      "mtcaptcha-verifiedtoken": verifiedToken,
      Next: "Nästa",
    });
    logger.log("info", "Accepted booking terms");

    logger.debug("Setting residency...");
    await this.postRequest(
      [...Array(this.numberOfPeople)]
        .map((_, index) => ({
          [`ServiceCategoryCustomers[${index}].CustomerIndex`]: index,
          [`ServiceCategoryCustomers[${index}].ServiceCategoryId`]: 2,
        }))
        .reduce(
          (prev, current) => ({
            ...prev,
            ...current,
          }),
          { Next: "Nästa" }
        )
    );
    this.sessionStatus = SessionStatus.INITIATED;
    logger.success(
      `Started booking session for ${this.numberOfPeople} person(s) ${
        this.proxy ? "using proxies" : ""
      }`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async postRequest(body: Record<string, any>, retry = 0): Promise<Response> {
    try {
      const response = await this.fetch(generatePostUrl(this.region), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(body),
      });

      if (!response.ok) {
        this.proxy?.trackError();
        throw new Error("Something went wrong");
      }

      return response;
    } catch (err) {
      const error = err as Error | FetchError;
      if (error.name === "AbortError") {
        logger.warn(
          `Request timed out after ${this.requestTimeout / 1000}s, retrying...`
        );
        return this.postRequest(body, retry);
      }

      if (error) {
        logger.error(error.message, error.stack);
        if (retry > REQUEST_RETRY_COUNT) {
          logger.error("Too many retries, exiting", error.stack);
          process.exit();
        }
        return this.postRequest(body, retry + 1);
      }
      throw new Error();
    }
  }

  async getRequest(url?: string, retry = 0): Promise<Response> {
    try {
      return await this.fetch(url);
    } catch (err) {
      const error = err as Error | FetchError;
      if (error) {
        logger.error(error.message, error.stack);
        if (retry > REQUEST_RETRY_COUNT) {
          logger.error("Too many retries, exiting", error.stack);
          process.exit();
        }
        return this.getRequest(url, retry + 1);
      }
      throw new Error();
    }
  }

  async getFreeSlotsForWeek(
    locationId: number,
    date: Date
  ): Promise<[Cheerio<Element> | undefined, Cheerio<Element> | undefined]> {
    try {
      const res = await this.postRequest({
        FormId: 1,
        NumberOfPeople: this.numberOfPeople,
        RegionId: 0,
        SectionId: locationId,
        NQServiceTypeId: 1,
        FromDateString: getShortDate(date),
        SearchTimeHour: 12,
      });
      const $ = cheerio.load(await res.text());

      logger.debug(`Checking week of: ${getShortDate(date)}`);
      const freeSlots = $(".timecell script");
      const bookedSlots = $(".timecell label");

      return [freeSlots, bookedSlots];
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      }
      logger.verbose(`Failed checking week of: ${getShortDate(date)}`);
    }
    return [undefined, undefined];
  }

  async recover(): Promise<boolean> {
    let recovered = false;
    for (let index = 0; index < 6; index++) {
      logger.warn(`Trying to recover booking session... ${index + 1}`);
      let $: CheerioAPI;
      if (index === 0) {
        const res = await this.getRequest();
        $ = cheerio.load(await res.text());
      } else {
        const res = await this.getRequest(
          `${generatePreviousUrl(this.region)}?id=1`
        );
        $ = cheerio.load(await res.text());
      }

      const title = $(TITLE_SELECTOR).text();

      if (title === "Välj tid") {
        recovered = true;
        break;
      }
    }
    return recovered;
  }

  async bookSlot(
    serviceTypeId: string,
    timeslot: string,
    location: number,
    config: Config
  ) {
    try {
      await this.selectSlot(serviceTypeId, timeslot, location);
      await this.providePersonalDetails(config);
      await this.confirmSlot();
      await this.provideContactDetails(config);
      return await this.finalizeBooking();
    } catch (error) {
      logger.error("Something went wrong when trying to book timeslot");
      if (error instanceof BookingPageError) {
        const $ = error.page;
        const html = $.html();
        const title = $(TITLE_SELECTOR).text();
        const errors = $(VALIDATION_ERROR_SELECTOR).text();
        logger.error(errors, { title, errors, html });
        logger.error(error.stack);
      } else if (error instanceof Error) {
        logger.error(error.stack);
      }
      return undefined;
    }
  }

  async selectSlot(serviceTypeId: string, timeslot: string, location: number) {
    logger.verbose(`Selecting timeslot (${timeslot})`);
    const res = await this.postRequest({
      FormId: 2,
      ReservedServiceTypeId: serviceTypeId,
      ReservedSectionId: location,
      NQServiceTypeId: 1,
      SectionId: location,
      FromDateString: getShortDate(new Date(timeslot)),
      NumberOfPeople: this.numberOfPeople,
      SearchTimeHour: 12,
      RegionId: 0,
      Next: "Nästa",
      ReservedDateTime: timeslot,
    });
    const $ = cheerio.load(await res.text());
    const title = $(TITLE_SELECTOR).text();

    if (title !== "Uppgifter till bokningen") {
      throw new BookingPageError({ page: $ });
    }
  }

  async providePersonalDetails({
    personnummer,
    firstname,
    lastname,
    passport,
    id,
  }: Config) {
    const verifiedToken = await captchaService.getNewVerifiedToken();

    logger.verbose(`Providing personal details`);
    const customerData = firstname.map((_, index) => ({
      [`Customers[${index}].BookingCustomerId`]: 0,
      [`Customers[${index}].BookingFieldValues[0].Value`]: personnummer[index],
      [`Customers[${index}].BookingFieldValues[0].BookingFieldId`]: 1,
      [`Customers[${index}].BookingFieldValues[0].BookingFieldTextName`]:
        "BF_2_PERSONNUMMER",
      [`Customers[${index}].BookingFieldValues[0].FieldTypeId`]: 1,
      [`Customers[${index}].BookingFieldValues[1].Value`]: firstname[index],
      [`Customers[${index}].BookingFieldValues[1].BookingFieldId`]: 5,
      [`Customers[${index}].BookingFieldValues[1].BookingFieldTextName`]:
        "BF_2_FÖRNAMN",
      [`Customers[${index}].BookingFieldValues[1].FieldTypeId`]: 1,
      [`Customers[${index}].BookingFieldValues[2].Value`]: lastname[index],
      [`Customers[${index}].BookingFieldValues[2].BookingFieldId`]: 6,
      [`Customers[${index}].BookingFieldValues[2].BookingFieldTextName`]:
        "BF_2_EFTERNAMN",
      [`Customers[${index}].BookingFieldValues[2].FieldTypeId`]: 1,
      [`Customers[${index}].Services[0].IsSelected`]: passport,
      [`Customers[${index}].Services[0].ServiceId`]:
        LOCATIONS[this.region].passportServiceId,
      [`Customers[${index}].Services[0].ServiceTextName`]: `SERVICE_2_PASSANSÖKAN${this.region.toUpperCase()}`,
      [`Customers[${index}].Services[1].IsSelected`]: id,
      [`Customers[${index}].Services[1].ServiceId`]:
        LOCATIONS[this.region].cardServiceId,
      [`Customers[${index}].Services[1].ServiceTextName`]: `SERVICE_2_ID-KORT${this.region.toUpperCase()}`,
    }));
    const res = await this.postRequest(
      Object.assign(
        {},
        { Next: "Nästa", "mtcaptcha-verifiedtoken": verifiedToken },
        ...customerData
      )
    );
    const $ = cheerio.load(await res.text());
    const title = $(TITLE_SELECTOR).text();

    if (title !== "Viktig information") {
      throw new BookingPageError({ page: $ });
    }
  }

  async confirmSlot() {
    logger.verbose(`Confirming selected slot`);
    const res = await this.postRequest({
      Next: "Nästa",
    });
    const $ = cheerio.load(await res.text());
    const title = $(TITLE_SELECTOR).text();

    if (title !== "Kontaktuppgifter") {
      throw new BookingPageError({ page: $ });
    }
  }

  async provideContactDetails({ email, phone, confirmation }: Config) {
    const emailConfirmation = confirmation.includes(ConfirmationType.EMAIL);
    const smsConfirmation = confirmation.includes(ConfirmationType.SMS);

    logger.verbose(`Providing contact details`);
    const res = await this.postRequest({
      EmailAddress: email,
      ConfirmEmailAddress: email,
      PhoneNumber: phone,
      ConfirmPhoneNumber: phone,
      "SelectedContacts[0].IsSelected": emailConfirmation,
      "SelectedContacts[0].MessageTypeId": 2,
      "SelectedContacts[0].MessageKindId": 1,
      "SelectedContacts[0].TextName": "MESSAGETYPE_EMAIL",
      "SelectedContacts[1].IsSelected": smsConfirmation,
      "SelectedContacts[1].MessageTypeId": 1,
      "SelectedContacts[1].MessageKindId": 1,
      "SelectedContacts[1].TextName": "MESSAGETYPE_SMS",
      "SelectedContacts[2].IsSelected": emailConfirmation,
      "SelectedContacts[2].MessageTypeId": 2,
      "SelectedContacts[2].MessageKindId": 2,
      "SelectedContacts[2].TextName": "MESSAGETYPE_EMAIL",
      "SelectedContacts[3].IsSelected": smsConfirmation,
      "SelectedContacts[3].MessageTypeId": 1,
      "SelectedContacts[3].MessageKindId": 2,
      "SelectedContacts[3].TextName": "MESSAGETYPE_SMS",
      ReminderOption: 24,
      Next: "Nästa",
    });
    const $ = cheerio.load(await res.text());
    const title = $(TITLE_SELECTOR).text();

    if (title !== "Bekräfta bokning") {
      throw new BookingPageError({ page: $ });
    }
  }

  async finalizeBooking() {
    if (this.mockBooking) {
      logger.verbose(`Mocking booking...`);
      return {
        bookingNumber: "123456789",
        slot: "2000-01-01 12:00:00",
        expedition: "Mock location",
      };
    }

    logger.verbose(`Confirming booking...`);
    const res = await this.postRequest({
      Next: "Bekräfta bokning",
      "PersonViewModel.Customers[0].Services[0].IsSelected": false,
      "PersonViewModel.Customers[0].Services[1].IsSelected": false,
      "ContactViewModel.SelectedContacts[0].IsSelected": false,
      "ContactViewModel.SelectedContacts[1].IsSelected": false,
      "ContactViewModel.SelectedContacts[2].IsSelected": false,
      "ContactViewModel.SelectedContacts[3].IsSelected": false,
    });
    const $ = cheerio.load(await res.text());
    const title = $(TITLE_SELECTOR).text();

    if (title === "Bekräfta bokning") {
      const validationErrorText = $(VALIDATION_ERROR_SELECTOR).text();
      if (validationErrorText.includes(EXISTING_BOOKING_ERROR_TEXT)) {
        logger.error(
          "An appointment with the same email and/or phone number already exists"
        );
        process.exit();
      }
    }

    if (title !== "Din bokning är nu klar") {
      throw new BookingPageError({ page: $ });
    }

    const bookingNumber = $(".control-freetext").eq(0).text();
    const slot = $(".control-freetext").eq(1).text();
    const expedition = $(".control-freetext").eq(3).text();

    return {
      bookingNumber,
      slot,
      expedition,
    };
  }
}

const replaceSpecialChars = (inputValue: string) =>
  inputValue
    .replace(/å/g, "a")
    .replace(/Å/g, "A")
    .replace(/ä/g, "a")
    .replace(/Ä/g, "A")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O");
