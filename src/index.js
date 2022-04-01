const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
const locations = require("./locations");
const logger = require("./logger");
const tracker = require("./tracker");
const validateConfig = require("./validateConfig");
const readConfig = require("./readConfig");
require("./server");

const config = readConfig();
const BookingService = require("./bookingService");
const maxDate = getMaxDate();
let pendingBookingPromise = undefined;

(async () => {
  validateConfig(config);

  logger.info("Validating configured region...");
  const region = locations[config.region];
  if (!region) {
    logger.error(`Region not supported: ${config.region}, exiting...`);
    process.exit();
  }
  logger.log("success", `Valid region ${config.region}`);

  logger.info("Validating configured locations...");
  const validLocations = [];
  for (const location of config.locations) {
    if (region.locations[location]) {
      validLocations.push({ name: location, id: region.locations[location] });
    } else {
      logger.warn(`Location not found: ${location}, skipping...`);
    }
  }

  if (validLocations.length === 0) {
    logger.error("No valid locations, exiting...");
    process.exit();
  }
  logger.success(
    `Valid locations ${validLocations.map(({ name }) => name).join(", ")}`
  );

  tracker.init();

  logger.log("success", "Starting to check for available timeslots");
  const numOfSessions = Math.min(config.sessions ?? 1, 6);
  const startDate = getStartDateOfCurrentWeek();
  for (let index = 0; index < numOfSessions; index++) {
    const sessionLocationOrder =
      numOfSessions === 1 ? validLocations : shuffleArray(validLocations);
    const sessionStartDate =
      numOfSessions === 1
        ? startDate
        : getStartOfWeekDate(randomDate(startDate, new Date(maxDate)));
    await init(sessionLocationOrder, sessionStartDate);
  }
})();

async function init(locationQueue, date) {
  const numOfPeople = config.firstname.length;
  const bookingService = new BookingService(
    config.region,
    numOfPeople,
    argv.mock
  );
  await bookingService.init();

  checkAvailableSlotsForLocation(bookingService, [...locationQueue], date);
}

async function checkAvailableSlotsForLocation(
  bookingService,
  locationQueue,
  startDate
) {
  let dateToCheck = startDate;
  const { name, id } = locationQueue[0];

  logger.debug(`Switching to location: ${name}`);

  while (dateToCheck.getTime() <= maxDate.getTime()) {
    await pendingBookingPromise;
    logger.debug(`Loading ${name} week of ${getShortDate(dateToCheck)}`);
    const [freeSlots, bookedSlots] = await bookingService.getFreeSlotsForWeek(
      id,
      dateToCheck
    );

    if (freeSlots.length && freeSlots.length > 0) {
      if (!pendingBookingPromise) {
        logger.success(
          `${name} (${getShortDate(dateToCheck)}) ${
            freeSlots.length
          } free time slots`
        );
        pendingBookingPromise = handleBooking(bookingService, freeSlots, id);
        await pendingBookingPromise;
        pendingBookingPromise = undefined;
      }
    } else {
      logger.verbose(
        `${name} (${getShortDate(dateToCheck)}) 0 free - ${
          bookedSlots.length
        } reserved`
      );
      dateToCheck = addDays(dateToCheck);
    }

    tracker.track();
    if (config.throttle) {
      await new Promise((resolve) =>
        setTimeout(resolve, config.throttle * 1000)
      );
    }
  }
  logger.debug("Max date reached, checking next location...");

  locationQueue.push(locationQueue.shift());
  checkAvailableSlotsForLocation(
    bookingService,
    locationQueue,
    getStartDateOfCurrentWeek()
  );
}

async function handleBooking(bookingService, freeSlots, locationId) {
  const parent = freeSlots[0].parent;
  const serviceTypeId = parent.attribs["data-servicetypeid"];
  const timeslot = parent.attribs["data-fromdatetime"];

  const booking = await bookingService.bookSlot(
    serviceTypeId,
    timeslot,
    locationId,
    config
  );

  if (booking) {
    logger.log("success", "BOOKING SUCCESSFUL");
    logger.log("success", `Booking number: \t ${booking.bookingNumber}`);
    logger.log("success", `Time: \t\t\t ${booking.slot}`);
    logger.log("success", `Location: \t\t ${booking.expedition}`);
    logger.log("success", `Email: \t\t\t ${config.email}`);
    logger.log("success", `Phone: \t\t\t ${config.phone}`);
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

function shuffleArray(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function randomDate(start, end) {
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

function getMaxDate() {
  const date = new Date(config.max_date);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

function getStartDateOfCurrentWeek() {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  return getStartOfWeekDate(date);
}

function getStartOfWeekDate(inDate) {
  const date = new Date(inDate);
  const day = date.getDay();
  const diff = date.getDate() - day + (day == 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

const addDays = (inDate) => {
  const date = new Date(inDate);
  date.setDate(date.getDate() + 7);
  return date;
};

const getShortDate = (date) => {
  return date.toISOString().split("T")[0];
};
