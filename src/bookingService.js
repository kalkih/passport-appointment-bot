const nodeFetch = require("node-fetch");
const fetchCookie = require("fetch-cookie");
const logger = require("./logger");
const cheerio = require("cheerio");
const locations = require("./locations");

const NUMBER_OF_PEOPLE = 1;

const BookingType = {
  PASSPORT: "passport",
  ID_CARD: "id",
};

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
  fetch = undefined;

  constructor(region, mock = false) {
    this.region = region;
    this.mock = mock;
    this.fetch = fetchCookie(nodeFetch);
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
    logger.log("success", "Started booking session");

    logger.debug("Accepting booking terms...");
    await this.postRequest({
      AgreementText: "123",
      AcceptInformationStorage: true,
      NumberOfPeople: NUMBER_OF_PEOPLE,
      Next: "Nästa",
    });
    logger.log("success", "Accepted booking terms");

    logger.debug("Setting residency...");
    await this.postRequest({
      "ServiceCategoryCustomers[0].CustomerIndex": 0,
      "ServiceCategoryCustomers[0].ServiceCategoryId": 2,
      Next: "Nästa",
    });
    logger.log("success", "Residency set");
  }

  async postRequest(body) {
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
      logger.error(error.message);
      this.postRequest(body);
    }
  }

  async getFreeSlotsForWeek(locationId, date) {
    try {
      const res = await this.postRequest({
        FormId: 1,
        NumberOfPeople: NUMBER_OF_PEOPLE,
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

      const title = $(".header h1").text();

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
        config.type
      );
      await this.confirmSlot();
      await this.provideContactDetails(config.email, config.phone);
      return await this.finalizeBooking();
    } catch (error) {
      logger.error("Something went wrong when trying to book timeslot");
      logger.error(error);
      return undefined;
    }
  }

  async selectSlot(serviceTypeId, timeslot, location) {
    logger.verbose(`Selecting timeslot: ${timeslot}`);
    const res = await this.postRequest({
      FormId: 2,
      ReservedServiceTypeId: serviceTypeId,
      ReservedSectionId: location,
      NQServiceTypeId: 1,
      SectionId: location,
      FromDateString: getShortDate(new Date(timeslot)),
      NumberOfPeople: NUMBER_OF_PEOPLE,
      SearchTimeHour: 12,
      RegionId: 0,
      Next: "Nästa",
      ReservedDateTime: timeslot,
    });
    const $ = cheerio.load(await res.text());
    const title = $(".header h1").text();

    if (title !== "Uppgifter till bokningen") {
      throw new Error();
    }
  }

  async providePersonalDetails(firstname, lastname, type) {
    logger.verbose(`Providing personal details for booking`);
    const res = await this.postRequest({
      "Customers[0].BookingCustomerId": 0,
      "Customers[0].BookingFieldValues[0].Value": firstname,
      "Customers[0].BookingFieldValues[0].BookingFieldId": 5,
      "Customers[0].BookingFieldValues[0].BookingFieldTextName": "BF_2_FÖRNAMN",
      "Customers[0].BookingFieldValues[0].FieldTypeId": 1,
      "Customers[0].BookingFieldValues[1].Value": lastname,
      "Customers[0].BookingFieldValues[1].BookingFieldId": 6,
      "Customers[0].BookingFieldValues[1].BookingFieldTextName":
        "BF_2_EFTERNAMN",
      "Customers[0].BookingFieldValues[1].FieldTypeId": 1,
      "Customers[0].Services[0].IsSelected": type === BookingType.PASSPORT,
      "Customers[0].Services[0].ServiceId":
        locations[this.region].passportServiceId,
      "Customers[0].Services[0].ServiceTextName": `SERVICE_2_PASSANSÖKAN${this.region.toUpperCase()}`,
      "Customers[0].Services[1].IsSelected": type === BookingType.ID_CARD,
      "Customers[0].Services[1].ServiceId":
        locations[this.region].cardServiceId,
      "Customers[0].Services[1].ServiceTextName": `SERVICE_2_ID-KORT${this.region.toUpperCase()}`,
      Next: "Nästa",
    });
    const $ = cheerio.load(await res.text());
    const title = $(".header h1").text();

    if (title !== "Viktig information") {
      throw new Error();
    }
  }

  async confirmSlot() {
    logger.verbose(`Confirming selected slot`);
    const res = await this.postRequest({
      Next: "Nästa",
    });
    const $ = cheerio.load(await res.text());
    const title = $(".header h1").text();

    if (title !== "Kontaktuppgifter") {
      throw new Error();
    }
  }

  async provideContactDetails(email, phone) {
    logger.verbose(`Providing contact details for booking`);
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
    const title = $(".header h1").text();

    if (title !== "Bekräfta bokning") {
      throw new Error();
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
    const title = $(".header h1").text();

    if (title !== "Din bokning är nu klar") {
      throw new Error();
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
