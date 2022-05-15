import yargs from "yargs";
import { Cheerio, Element } from "cheerio";
import { logger } from "./logger";
import { tracker } from "./tracker";
import { Location, readConfig, validateConfig } from "./configuration";
import { BookingService } from "./services/bookingService/bookingService";
import {
  addDays,
  getMaxDate,
  getShortDate,
  getStartOfWeekDate,
  getToday,
  randomDate,
  shuffleArray,
} from "./utils";
import { NewBookingService } from "./services/bookingService/newBookingService";
import { ExistingBookingService } from "./services/bookingService/existingBookingService";
import "./server";

const args = yargs.option("mock", {
  alias: "m",
  demand: false,
  boolean: true,
  default: false,
}).argv;

const config = readConfig();
const locations = validateConfig(config);
const maxDate = getMaxDate(config.max_date);
let pendingBookingPromise: undefined | Promise<void> = undefined;

(async () => {
  tracker.init((config.throttle * 1000) / config.sessions);

  const numOfSessions = Math.min(config.sessions ?? 1, 6);
  const startDate = config.min_date
    ? getStartOfWeekDate(config.min_date)
    : getToday();
  for (let index = 0; index < numOfSessions; index++) {
    const sessionLocationOrder =
      numOfSessions === 1 ? locations : shuffleArray(locations);
    const sessionStartDate =
      numOfSessions === 1
        ? startDate
        : getStartOfWeekDate(randomDate(startDate, new Date(maxDate)));
    await init(sessionLocationOrder, sessionStartDate);
  }
})();

async function init(locations: Location[], date: Date) {
  const { mock } = await args;
  const bookingConfig = {
    region: config.region,
    numberOfPeople: 1 + config.extra_firstnames.length,
    mockBooking: mock,
    useProxy: config.useProxies,
    proxyTimeout: config.proxyTimeout,
    proxyRetries: config.proxyRetries,
  };

  const bookingService = config.booking_number
    ? new ExistingBookingService({
        ...bookingConfig,
        email: config.email,
        bookingNumber: config.booking_number,
      })
    : new NewBookingService(bookingConfig);

  await bookingService.init(config);

  checkAvailableSlotsForLocation(bookingService, [...locations], date);
}

async function checkAvailableSlotsForLocation(
  bookingService: BookingService,
  locationQueue: Location[],
  startDate: Date
) {
  let dateToCheck = startDate;
  const { name, id } = locationQueue[0];

  logger.debug(`Switching to location: ${name}`);

  while (dateToCheck.getTime() <= maxDate.getTime()) {
    await pendingBookingPromise;
    logger.debug(`Loading ${name} week of ${getShortDate(dateToCheck)}`);
    const [freeSlots, bookedSlots] = await bookingService.getFreeSlotsForWeek(
      locationQueue[0],
      dateToCheck
    );

    if (freeSlots && freeSlots.length > 0) {
      if (!pendingBookingPromise) {
        logger.success(
          `${name} (Week ${getShortDate(dateToCheck)}): ${
            freeSlots.length
          } free time slots`
        );
        pendingBookingPromise = handleBooking(bookingService, freeSlots, id);
        await pendingBookingPromise;
        pendingBookingPromise = undefined;
      }
    } else {
      logger.verbose(
        `${name} (Week ${getShortDate(dateToCheck)}): 0 free - ${
          bookedSlots?.length || 0
        } reserved`
      );
      dateToCheck = getStartOfWeekDate(addDays(dateToCheck));
    }

    tracker.track();
    if (config.throttle) {
      await new Promise((resolve) =>
        setTimeout(resolve, config.throttle * 1000)
      );
    }
  }
  logger.debug("Max date reached, checking next location...");

  const location = locationQueue.shift();
  location && locationQueue.push(location);

  const nextStartDate = config.min_date
    ? getStartOfWeekDate(config.min_date)
    : getToday();
  checkAvailableSlotsForLocation(bookingService, locationQueue, nextStartDate);
}

async function handleBooking(
  bookingService: BookingService,
  freeSlots: Cheerio<Element> | never[],
  locationId: number
) {
  const parent = freeSlots[0].parentNode as Element;
  const serviceTypeId = parent.attribs["data-servicetypeid"];
  const timeslot = parent.attribs["data-fromdatetime"];

  const booking = await bookingService.bookSlot(
    serviceTypeId,
    timeslot,
    locationId,
    config
  );

  if (booking) {
    logger.success("BOOKING SUCCESSFUL");
    logger.success(`Booking number: \t ${booking.bookingNumber}`);
    logger.success(`Time: \t\t\t ${booking.slot}`);
    logger.success(`Location: \t\t ${booking.expedition}`);
    logger.success(`Email: \t\t\t ${config.email}`);
    logger.success(`Phone: \t\t\t ${config.phone}`);
    process.exit();
  } else {
    logger.error(`Failed booking slot ${timeslot}`);

    if (await bookingService.recover()) {
      logger.info("Recovered booking session");
    } else {
      logger.error("Could not recover booking session...");
      process.exit();
    }
  }
}
