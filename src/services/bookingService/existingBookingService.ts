import cheerio, { Cheerio, CheerioAPI, Element } from "cheerio";
import { Location } from "../../configuration";
import { logger } from "../../logger";
import { getShortDate } from "../../utils";
import {
  BookingPageError,
  BookingService,
  BookingServiceConfig,
  BookingSessionStatus,
  generatePreviousUrl,
} from "./bookingService";

const TITLE_SELECTOR = ".header h1";
const VALIDATION_ERROR_SELECTOR = ".validation-summary-errors";

interface ExistingBookingServiceConfig extends BookingServiceConfig {
  email: string;
  bookingNumber: string;
}

export class ExistingBookingService extends BookingService {
  private email: string;
  private bookingNumber: string;
  private serviceTypeId?: string;

  constructor({ email, bookingNumber, ...args }: ExistingBookingServiceConfig) {
    super(args);
    this.email = email;
    this.bookingNumber = bookingNumber;
  }

  public async init() {
    logger.info("Launching session for existing booking...");
    await this.getRequest();

    const response = await this.postRequest({
      FormId: 2,
      BookingNumber: this.bookingNumber,
      ContactInfo: this.email,
      NextButtonID6: "Omboka/Avboka",
    });

    const $ = cheerio.load(await response.text());
    const nextButtonId = $("input[title='Ändra tid']").attr("name") || "";

    await this.postRequest({
      [nextButtonId]: "Ändra",
      "PersonViewModel.Customers[0].Services[0].IsSelected": false,
      "ContactViewModel.SelectedContacts[0].IsSelected": false,
      "ContactViewModel.SelectedContacts[1].IsSelected": false,
      "ContactViewModel.SelectedContacts[2].IsSelected": false,
      "ContactViewModel.SelectedContacts[3].IsSelected": false,
    });

    this.sessionStatus = BookingSessionStatus.INITIATED;

    logger.success(
      `Started booking session for ${this.numberOfPeople} person(s) ${
        this.proxy ? "using proxies" : ""
      }`
    );
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
        ServiceTypeId: location.serviceId,
        FromDateString: getShortDate(date),
        SearchTimeHour: 12,
        TimeSearchButton: "Sök tid",
        "ServiceCategoryViewModel.ServiceCategoryCustomers[0].CustomerIndex": 0,
        "ServiceCategoryViewModel.ServiceCategoryCustomers[0].ServiceCategoryId": 2,
      });
      const $ = cheerio.load(await res.text());

      logger.debug(`Checking week of: ${getShortDate(date)}`);
      const freeSlots = $(".timecell").not(".selected").children("script");
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
    for (let index = 0; index < 3; index++) {
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

      if (title === "Omboka/Avboka") {
        recovered = true;
        break;
      }
    }
    return recovered;
  }

  public async bookSlot(
    serviceTypeId: string,
    timeslot: string,
    location: number
  ) {
    try {
      return await this.selectSlot(serviceTypeId, timeslot, location);
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
  ) {
    logger.verbose(`Selecting timeslot (${timeslot})`);
    const res = await this.postRequest({
      FormId: 2,
      Next: "Spara",
      ReservedSectionId: location,
      ReservedServiceTypeId: serviceTypeId,
      ReservedDateTime: timeslot,
      rewindToPageID: 6,
    });
    const $ = cheerio.load(await res.text());
    const title = $(TITLE_SELECTOR).text();

    if (title !== "Omboka/Avboka") {
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
