const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
const locations = require("./locations");
const logger = require("./logger");
const tracker = require("./tracker");
const validateConfig = require("./validateConfig");
const readConfig = require("./readConfig");

const config = readConfig();
const bookingService = require("./bookingService")(config.region, argv.mock);
const locationQueue = [];

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
  for (const location of config.locations) {
    if (region.locations[location]) {
      locationQueue.push({ name: location, id: region.locations[location] });
    } else {
      logger.error(`Location not found: ${location}, skipping...`);
    }
  }
  logger.success(
    `Valid locations ${locationQueue.map(({ name }) => name).join(", ")}`
  );

  await bookingService.initSession();

  tracker.init();

  logger.log("success", "Starting to check for available timeslots");
  checkAvailableSlotsForLocation(locationQueue[0]);
})();

const checkAvailableSlotsForLocation = async ({ name, id }) => {
  logger.info(`Switching to location: ${name}`);
  const maxDate = new Date(config.max_date);
  const currentDate = new Date();

  while (currentDate.getTime() < maxDate.getTime()) {
    const [freeSlots, bookedSlots] = await bookingService.getFreeSlotsForWeek(
      id,
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
        id,
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
