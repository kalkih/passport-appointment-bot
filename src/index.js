const locations = require("./locations");
const logger = require("./logger");
const tracker = require("./tracker");
const validateConfig = require("./validateConfig");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
const fs = require("fs");
const path = require("path");

let config;
try {
  let configPath;
  if (process.pkg) {
    configPath = path.join(path.dirname(process.execPath), "./config.json");
  } else {
    configPath = path.join(process.cwd(), "./config.json");
  }
  config = JSON.parse(fs.readFileSync(configPath));
} catch {
  logger.error("Missing or invalid configuration file");
  process.exit();
}

const bookingService = require("./bookingService")(config.region, argv.mock);

const locationQueue = [];

(async () => {
  validateConfig(config);

  logger.info("Validating provided region...");
  const region = locations[config.region];
  if (!region) {
    logger.error(`Region not supported: ${config.region}, exiting...`);
    process.exit();
  }
  logger.log("success", `Valid region ${config.region}`);

  logger.info("Validating provided locations...");
  for (const location of config.locations) {
    if (region.locations[location]) {
      locationQueue.push(region.locations[location]);
    } else {
      logger.error(`Location not found: ${location}, skipping...`);
    }
  }

  await bookingService.initSession();

  tracker.init();

  logger.log("success", "Starting to check for available timeslots");
  checkAvailableSlotsForLocation(locationQueue[0]);
})();

const checkAvailableSlotsForLocation = async (location) => {
  logger.info(`Switching to location: ${location}`);
  const maxDate = new Date(config.max_date);
  const currentDate = new Date();

  while (currentDate.getTime() < maxDate.getTime()) {
    const [freeSlots, bookedSlots] = await bookingService.getFreeSlotsForWeek(
      locationQueue[0],
      currentDate
    );

    if (freeSlots.length && freeSlots.length > 0) {
      logger.log("success", `Free timeslots found: ${freeSlots.length}`);

      const parent = freeSlots[0].parent;
      const serviceTypeId = parent.attribs["data-servicetypeid"];
      const timeslot = parent.attribs["data-fromdatetime"];

      const booking = await bookingService.bookSlot(
        serviceTypeId,
        timeslot,
        location,
        locations[config.region],
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
      }
    } else {
      logger.verbose(`No free timeslots found, ${bookedSlots.length} reserved`);
    }

    tracker.track();
    addDays(currentDate);
  }
  logger.verbose("Max date reached, checking next location...");

  locationQueue.push(locationQueue.shift());
  checkAvailableSlotsForLocation(locationQueue[0]);
};

const addDays = (date) => {
  date.setDate(date.getDate() + 7);
};
