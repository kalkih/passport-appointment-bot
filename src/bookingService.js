const nodeFetch = require("node-fetch");
const fetchCookie = require("fetch-cookie");
const fetch = fetchCookie(nodeFetch);
const logger = require("./logger");
const cheerio = require("cheerio");
const locations = require("./locations");

const NUMBER_OF_PEOPLE = 1;

const generateBaseUrl = (region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Index/${region.toLowerCase()}`;
const generatePostUrl = (region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Next/${region.toLowerCase()}`;

const bookingService = (region, mock = false) => ({
  baseUrl: generateBaseUrl(region),
  postUrl: generatePostUrl(region),
  region,
  sessionId: undefined,
  async initSession() {
    logger.info("Starting booking session...");
    await fetch(this.baseUrl);

    await this.postRequest({
      FormId: 1,
      ServiceGroupId: locations[region].id,
      StartNextButton: "Boka ny tid",
    });
    logger.log("success", "Started booking session");

    logger.info("Accepting booking terms...");
    await this.postRequest({
      AgreementText: "123",
      AcceptInformationStorage: true,
      NumberOfPeople: NUMBER_OF_PEOPLE,
      Next: "Nästa",
    });
    logger.log("success", "Accepted booking terms");

    logger.info("Setting residency...");
    const res = await this.postRequest({
      "ServiceCategoryCustomers[0].CustomerIndex": 0,
      "ServiceCategoryCustomers[0].ServiceCategoryId": 2,
      Next: "Nästa",
    });
    logger.log("success", "Residency set");
  },
  async postRequest(body) {
    try {
      const response = await fetch(this.postUrl, {
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
  },
  async getFreeSlotsForWeek(location, date) {
    logger.info(`Loading week of: ${getShortDate(date)}`);
    try {
      const res = await this.postRequest({
        FormId: 1,
        NumberOfPeople: NUMBER_OF_PEOPLE,
        RegionId: 0,
        SectionId: location,
        NQServiceTypeId: 1,
        FromDateString: getShortDate(date),
        SearchTimeHour: 12,
      });
      const $ = cheerio.load(await res.text());

      logger.verbose(`Checking week of: ${getShortDate(date)}`);
      const freeSlots = $(".timecell script");
      const bookedSlots = $(".timecell label");

      return [freeSlots, bookedSlots];
    } catch (error) {
      logger.error(error.message);
      logger.verbose(`Failed checking week of: ${getShortDate(date)}`);
    }
    return [[], []];
  },
  async bookSlot(serviceTypeId, timeslot, location, config) {
    try {
      await this.selectSlot(serviceTypeId, timeslot, location);
      await this.providePersonalDetails(config.firstname, config.lastname);
      await this.confirmSlot();
      await this.provideContactDetails(config.email, config.phone);
      return await this.finalizeBooking();
    } catch (error) {
      logger.error("Something went wrong when trying to book timeslot");
      return undefined;
    }
  },
  async selectSlot(serviceTypeId, timeslot, location) {
    logger.verbose(`Selecting timeslot: ${timeslot}...`);
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
  },
  async providePersonalDetails(firstname, lastname) {
    logger.verbose(`Providing personal details for booking`);
    const res = await this.postRequest({
      gCustomerId: 0,
      "Customers[0].BookingFieldValues[0].Value": firstname,
      "Customers[0].BookingFieldValues[0].BookingFieldId": 5,
      "Customers[0].BookingFieldValues[0].BookingFieldTextName": "BF_2_FÖRNAMN",
      "Customers[0].BookingFieldValues[0].FieldTypeId": 1,
      "Customers[0].BookingFieldValues[1].Value": lastname,
      "Customers[0].BookingFieldValues[1].BookingFieldId": 6,
      "Customers[0].BookingFieldValues[1].BookingFieldTextName":
        "BF_2_EFTERNAMN",
      "Customers[0].BookingFieldValues[1].FieldTypeId": 1,
      "Customers[0].Services[0].IsSelected": true,
      "Customers[0].Services[0].ServiceId": 54,
      "Customers[0].Services[0].ServiceTextName": `SERVICE_2_PASSANSÖKAN${this.region.toUpperCase()}`,
      "Customers[0].Services[1].IsSelected": false,
      "Customers[0].Services[1].ServiceId": 55,
      "Customers[0].Services[1].ServiceTextName": `SERVICE_2_ID-KORT${this.region.toUpperCase()}`,
      Next: "Nästa",
    });
    const $ = cheerio.load(await res.text());
    const title = $(".header h1").text();

    if (title !== "Viktig information") {
      throw new Error();
    }
  },
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
  },
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
  },
  async finalizeBooking() {
    if (mock) {
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
  },
});

const getShortDate = (date) => {
  return date.toISOString().split("T")[0];
};

module.exports = bookingService;
