const nodeFetch = require("node-fetch");
const makeFetchCookie = require("fetch-cookie");
const cheerio = require("cheerio");
const logger = require("../logger");
const locations = require("../locations");
const CaptchaService = require("./captchaService");

const TITLE_SELECTOR = ".header h1";
const VALIDATION_ERROR_SELECTOR = ".validation-summary-errors";
const EXISTING_BOOKING_ERROR_TEXT =
  "Det går endast att göra en bokning per e-postadress/telefonnummer";

const generateBaseUrl = (region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Index/${replaceSpecialChars(
    region.toLowerCase()
  )}`;
const generatePostUrl = (region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Next/${replaceSpecialChars(
    region.toLowerCase()
  )}`;
const generatePreviousUrl = (region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Previous/${replaceSpecialChars(
    region.toLowerCase()
  )}`;

class BookingService {
  region = undefined;
  mock = false;
  fetchInstance = undefined;
  fetch = undefined;
  numberOfPeople = undefined;

  constructor(region, numberOfPeople = 1, mock = false) {
    this.region = region;
    this.mock = mock;
    this.fetchInstance = makeFetchCookie(nodeFetch);
    this.fetch = (url, options = {}) =>
      this.fetchInstance(url, {
        ...options,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36",
          Referer: this.baseUrl,
          ...(options.headers || {}),
        },
      });

    this.numberOfPeople = numberOfPeople;
  }

  get baseUrl() {
    return generateBaseUrl(this.region);
  }

  get postUrl() {
    return generatePostUrl(this.region);
  }

  async init() {
    logger.info("Starting booking session...");
    await this.fetch(this.baseUrl);

    await this.postRequest({
      FormId: 1,
      ServiceGroupId: locations[this.region].id,
      StartNextButton: "Boka ny tid",
    });
    logger.log(
      "success",
      `Started booking session for ${this.numberOfPeople} person(s)`
    );

    const verifiedToken = await CaptchaService.getNewVerifiedToken();
    logger.debug("Accepting booking terms...");
    await this.postRequest({
      AgreementText: "123",
      AcceptInformationStorage: true,
      NumberOfPeople: this.numberOfPeople,
      "mtcaptcha-verifiedtoken": verifiedToken,
      Next: "Nästa",
    });
    logger.log("success", "Accepted booking terms");

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
    logger.log("success", "Residency set");
  }

  async postRequest(body, retry = 0) {
    try {
      const response = await this.fetch(this.postUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(body),
      });

      if (response.ok) {
        return response;
      }

      throw new Error("Something went wrong.");
    } catch (error) {
      logger.error(error.message, error.stack);
      if (retry > 6) {
        logger.error("Too many retries, exiting", error.stack);
        process.exit();
      }
      this.postRequest(body, retry + 1);
    }
  }

  async getFreeSlotsForWeek(locationId, date) {
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
      logger.error(error.message);
      logger.verbose(`Failed checking week of: ${getShortDate(date)}`);
    }
    return [[], []];
  }

  async recover() {
    let recovered = false;
    for (let index = 0; index < 6; index++) {
      logger.warn(`Trying to recover booking session... ${index + 1}`);
      const res = await this.fetch(`${generatePreviousUrl(this.region)}?id=1`);
      const $ = cheerio.load(await res.text());

      const title = $(TITLE_SELECTOR).text();

      if (title === "Välj tid") {
        recovered = true;
        break;
      }
    }
    return recovered;
  }

  async bookSlot(serviceTypeId, timeslot, location, config) {
    try {
      await this.selectSlot(serviceTypeId, timeslot, location);
      await this.providePersonalDetails(
        config.firstname,
        config.lastname,
        config.passport,
        config.id
      );
      await this.confirmSlot();
      await this.provideContactDetails(config.email, config.phone);
      return await this.finalizeBooking();
    } catch (error) {
      logger.error("Something went wrong when trying to book timeslot");
      if (error.page) {
        const $ = error.page;
        const html = $.html();
        const title = $(TITLE_SELECTOR).text();
        const errors = $(VALIDATION_ERROR_SELECTOR).text();
        logger.error(errors, { title, errors, html });
      }
      logger.error(error.stack);
      return undefined;
    }
  }

  async selectSlot(serviceTypeId, timeslot, location) {
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
      const error = new Error();
      error.page = $;
      throw error;
    }
  }

  async providePersonalDetails(firstname, lastname, passport, idCard) {
    const verifiedToken = await CaptchaService.getNewVerifiedToken();

    logger.verbose(`Providing personal details`);
    const customerData = firstname.map((_, index) => ({
      [`Customers[${index}].BookingCustomerId`]: 0,
      [`Customers[${index}].BookingFieldValues[0].Value`]: firstname[index],
      [`Customers[${index}].BookingFieldValues[0].BookingFieldId`]: 5,
      [`Customers[${index}].BookingFieldValues[0].BookingFieldTextName`]:
        "BF_2_FÖRNAMN",
      [`Customers[${index}].BookingFieldValues[0].FieldTypeId`]: 1,
      [`Customers[${index}].BookingFieldValues[1].Value`]: lastname[index],
      [`Customers[${index}].BookingFieldValues[1].BookingFieldId`]: 6,
      [`Customers[${index}].BookingFieldValues[1].BookingFieldTextName`]:
        "BF_2_EFTERNAMN",
      [`Customers[${index}].BookingFieldValues[1].FieldTypeId`]: 1,
      [`Customers[${index}].Services[0].IsSelected`]: passport,
      [`Customers[${index}].Services[0].ServiceId`]:
        locations[this.region].passportServiceId,
      [`Customers[${index}].Services[0].ServiceTextName`]: `SERVICE_2_PASSANSÖKAN${this.region.toUpperCase()}`,
      [`Customers[${index}].Services[1].IsSelected`]: idCard,
      [`Customers[${index}].Services[1].ServiceId`]:
        locations[this.region].cardServiceId,
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
      const error = new Error();
      error.page = $;
      throw error;
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
      const error = new Error();
      error.page = $;
      throw error;
    }
  }

  async provideContactDetails(email, phone) {
    logger.verbose(`Providing contact details`);
    const res = await this.postRequest({
      EmailAddress: email,
      ConfirmEmailAddress: email,
      PhoneNumber: phone,
      ConfirmPhoneNumber: phone,
      "SelectedContacts[0].IsSelected": true,
      "SelectedContacts[0].MessageTypeId": 2,
      "SelectedContacts[0].MessageKindId": 1,
      "SelectedContacts[0].TextName": "MESSAGETYPE_EMAIL",
      "SelectedContacts[1].IsSelected": false,
      "SelectedContacts[1].MessageTypeId": 1,
      "SelectedContacts[1].MessageKindId": 1,
      "SelectedContacts[1].TextName": "MESSAGETYPE_SMS",
      "SelectedContacts[2].IsSelected": true,
      "SelectedContacts[2].MessageTypeId": 2,
      "SelectedContacts[2].MessageKindId": 2,
      "SelectedContacts[2].TextName": "MESSAGETYPE_EMAIL",
      "SelectedContacts[3].IsSelected": false,
      "SelectedContacts[3].MessageTypeId": 1,
      "SelectedContacts[3].MessageKindId": 2,
      "SelectedContacts[3].TextName": "MESSAGETYPE_SMS",
      ReminderOption: 24,
      Next: "Nästa",
    });
    const $ = cheerio.load(await res.text());
    const title = $(TITLE_SELECTOR).text();

    if (title !== "Bekräfta bokning") {
      const error = new Error();
      error.page = $;
      throw error;
    }
  }

  async finalizeBooking() {
    if (this.mock) {
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
      const error = new Error();
      error.page = $;
      throw error;
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

const getShortDate = (date) => {
  return date.toISOString().split("T")[0];
};

const replaceSpecialChars = (inputValue) =>
  inputValue
    .replace(/å/g, "a")
    .replace(/Å/g, "A")
    .replace(/ä/g, "a")
    .replace(/Ä/g, "A")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O");

module.exports = BookingService;
