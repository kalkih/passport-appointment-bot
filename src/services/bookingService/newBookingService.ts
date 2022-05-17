import cheerio, { Cheerio, CheerioAPI, Element } from "cheerio";
import { logger } from "../../logger";
import { LOCATIONS } from "../../locations";
import { Config, ConfirmationType, Location } from "../../configuration";
import { getShortDate } from "../../utils";
import { BankIdService } from "../bankIdService";
import {
  BookingPageError,
  BookingService,
  BookingSessionStatus,
  generatePreviousUrl,
} from "./bookingService";

const TITLE_SELECTOR = ".header h1";
const VALIDATION_ERROR_SELECTOR = ".validation-summary-errors";
const EXISTING_BOOKING_ERROR_TEXT =
  "Det går endast att göra en bokning per personnummer/e-postadress/telefonnummer";

interface PersonalDetails {
  tin: string;
  firstname: string;
  lastname: string;
}

export class NewBookingService extends BookingService {
  public async init(config: Config) {
    logger.info("Launching booking session...");
    await this.getRequest();

    const res = await this.postRequest({
      FormId: 1,
      ServiceGroupId: LOCATIONS[this.region].id,
      StartNextButton: "Boka ny tid",
    });

    const sessionId = res.url.split("?sessionid=")[1];
    const bankIdService = new BankIdService(sessionId);
    const sessionUrl = await bankIdService.identify();

    await this.getRequest(sessionUrl);

    logger.debug("Accepting booking terms...");
    await this.postRequest({
      AgreementText: "123",
      AcceptInformationStorage: true,
      NumberOfPeople: this.numberOfPeople,
      Next: "Nästa",
    });
    logger.log("info", "Accepted booking terms");

    const personalDetails = await this.selectNumberOfPeople();

    await this.providePersonalDetails(personalDetails, config);

    this.sessionStatus = BookingSessionStatus.INITIATED;
    logger.success(
      `Started booking session for ${this.numberOfPeople} person(s) ${
        this.proxy ? "using proxies" : ""
      }`
    );
  }

  private async selectNumberOfPeople(): Promise<PersonalDetails> {
    logger.debug("Setting residency...");
    const res = await this.postRequest(
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
    const $ = cheerio.load(await res.text());
    const title = $(TITLE_SELECTOR).text();

    if (title !== "Uppgifter till bokningen") {
      throw new BookingPageError({ page: $ });
    }

    const tin = $("#Customers_0__BookingFieldValues_0__Value").val() as string;
    const firstname = $(
      "#Customers_0__BookingFieldValues_1__Value"
    ).val() as string;
    const lastname = $(
      "#Customers_0__BookingFieldValues_2__Value"
    ).val() as string;

    return { tin, firstname, lastname };
  }

  public async getFreeSlotsForWeek(
    location: Location,
    date: Date
  ): Promise<[Cheerio<Element> | undefined, Cheerio<Element> | undefined]> {
    try {
      const res = await this.postRequest({
        FormId: 1,
        NumberOfPeople: this.numberOfPeople,
        RegionId: 0,
        SectionId: location.id,
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

  public async recover(): Promise<boolean> {
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

  public async bookSlot(
    serviceTypeId: string,
    timeslot: string,
    location: number,
    config: Config
  ) {
    try {
      await this.selectSlot(serviceTypeId, timeslot, location);
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

  private async selectSlot(
    serviceTypeId: string,
    timeslot: string,
    location: number
  ): Promise<void> {
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

    if (title !== "Viktig information") {
      throw new BookingPageError({ page: $ });
    }
  }

  private async providePersonalDetails(
    personalDetails: PersonalDetails,
    {
      passport,
      id,
      extra_firstnames,
      extra_lastnames,
      extra_personnummer,
    }: Config
  ) {
    const people = [
      personalDetails,
      ...(extra_personnummer.length > 0
        ? [extra_personnummer].map((_, i) => ({
            firstname: extra_firstnames[i],
            lastname: extra_lastnames[i],
            tin: extra_personnummer[i],
          }))
        : []),
    ];

    logger.verbose(`Providing personal details`);
    const customerData = people.map((person, index) => ({
      [`Customers[${index}].BookingCustomerId`]: 0,
      [`Customers[${index}].BookingFieldValues[0].Value`]: person.tin,
      [`Customers[${index}].BookingFieldValues[0].BookingFieldId`]: 1,
      [`Customers[${index}].BookingFieldValues[0].BookingFieldTextName`]:
        "BF_2_PERSONNUMMER",
      [`Customers[${index}].BookingFieldValues[0].FieldTypeId`]: 1,
      [`Customers[${index}].BookingFieldValues[1].Value`]: person.firstname,
      [`Customers[${index}].BookingFieldValues[1].BookingFieldId`]: 5,
      [`Customers[${index}].BookingFieldValues[1].BookingFieldTextName`]:
        "BF_2_FÖRNAMN",
      [`Customers[${index}].BookingFieldValues[1].FieldTypeId`]: 1,
      [`Customers[${index}].BookingFieldValues[2].Value`]: person.lastname,
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
      Object.assign({}, { Next: "Spara" }, ...customerData)
    );
    const $ = cheerio.load(await res.text());
    const title = $(TITLE_SELECTOR).text();

    if (title !== "Välj tid") {
      const validationErrorText = $(VALIDATION_ERROR_SELECTOR).text();
      if (validationErrorText.includes(EXISTING_BOOKING_ERROR_TEXT)) {
        logger.error(
          "An appointment with the same email and/or phone number already exists"
        );
        process.exit();
      }

      throw new BookingPageError({ page: $ });
    }
  }

  private async confirmSlot() {
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

  private async provideContactDetails({ email, phone, confirmation }: Config) {
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

  private async finalizeBooking() {
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
