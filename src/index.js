const locations = require("./locations");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
const logger = require("./logger");
const nodeFetch = require("node-fetch");
const fetchCookie = require("fetch-cookie");
const cheerio = require("cheerio");
const tracker = require("./tracker");
const fetch = fetchCookie(nodeFetch);

const SESSION_COOKIE_NAME = "ASP.NET_VentusBooking_SessionId";
const BASE_URL = "https://bokapass.nemoq.se/Booking/Booking/Index/blekinge";
const POST_URL = "https://bokapass.nemoq.se/Booking/Booking/Next/blekinge";

// TODO: Should make these into an option / environment variable
const LOCATIONS_TO_CHECK = ["Karlskrona", "Karlshamn"];
const MAX_DATE = "2022-05-01";
const NUMBER_OF_PEOPLE = 1;

const requestOptions = {
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
};

const locationQueue = [];
let sessionId = undefined;

(async () => {
  if (argv.session) {
    logger.info("Using provided session cookie:", argv.session);
    sessionId = argv.session;
  } else {
    logger.info("Getting session cookie...");
    await setCookie();
  }

  logger.info("Validating provided locations...");
  for (const location of LOCATIONS_TO_CHECK) {
    if (locations[location]) {
      locationQueue.push(locations[location]);
    } else {
      logger.error(`Location not found: ${location}, skipping...`);
    }
  }

  await initSession();

  tracker.init();

  logger.info("Starting to check for available timeslots");
  checkAvailableSlotsForLocation(locationQueue[0]);
})();

const checkAvailableSlotsForLocation = async (location) => {
  logger.info(`Switching to location: ${location}`);
  const maxDate = new Date(MAX_DATE);
  const currentDate = new Date();

  while (currentDate.getTime() < maxDate.getTime()) {
    await checkAvailableSlots(currentDate);
    tracker.track();
    addDays(currentDate);
  }
  logger.verbose("Max date reached, checking next location...");

  locationQueue.push(locationQueue.shift());
  checkAvailableSlotsForLocation(locationQueue[0]);
};

const checkAvailableSlots = async (date) => {
  logger.info(`Loading week of: ${getShortDate(date)}`);
  try {
    const res = await postRequest({
      FormId: 1,
      NumberOfPeople: NUMBER_OF_PEOPLE,
      RegionId: 0,
      SectionId: locationQueue[0],
      NQServiceTypeId: 1,
      FromDateString: getShortDate(date),
      SearchTimeHour: 12,
    });
    const $ = cheerio.load(await res.text());

    logger.verbose(`Checking week of: ${getShortDate(date)}`);
    const freeSlots = $(".timecell script");
    const bookedSlots = $(".timecell label");
    if (freeSlots.length && freeSlots.length > 0) {
      logger.log("success", `Free timeslots found: ${freeSlots.length}`);
    } else {
      logger.verbose(`No free timeslots found, ${bookedSlots.length} reserved`);
    }
  } catch {
    logger.verbose(`Failed checking week of: ${getShortDate(date)}`);
  }
};

async function postRequest(body) {
  try {
    const response = await fetch(POST_URL, {
      method: "POST",
      ...requestOptions,
      body: new URLSearchParams(body),
    });

    if (response.ok) {
      return response;
    }

    throw new Error("Something went wrong.");
  } catch {
    logger.error(response.status);
    handleFormPost(body);
  }
}

async function setCookie() {
  try {
    const response = await fetch(BASE_URL);

    if (response.ok) {
      const cookies = `; ${response.headers.get("set-cookie")}`;
      const cookieParts = cookies.split(`; ${SESSION_COOKIE_NAME}=`);
      if (cookieParts.length === 2) {
        sessionId = cookieParts.pop().split(";").shift();
        logger.log("success", "Cookie set");
        return sessionId;
      }
    }

    throw new Error(response.status);
  } catch {
    logger.error("Failed setting cookie, trying again...");
    await setCookie();
  }
}

async function initSession() {
  logger.info("Starting booking session...");
  await postRequest({
    FormId: 1,
    ServiceGroupId: 74,
    StartNextButton: "Boka ny tid",
  });
  logger.log("success", "Started booking session");

  logger.info("Accepting booking terms...");
  await postRequest({
    AgreementText: "123",
    AcceptInformationStorage: true,
    NumberOfPeople: NUMBER_OF_PEOPLE,
    Next: "Nästa",
  });
  logger.log("success", "Accepted booking terms");

  logger.info("Setting residency...");
  await postRequest({
    "ServiceCategoryCustomers[0].CustomerIndex": 0,
    "ServiceCategoryCustomers[0].ServiceCategoryId": 2,
    Next: "Nästa",
  });
  logger.log("success", "Residency set");
}

const getShortDate = (date) => {
  return date.toISOString().split("T")[0];
};

const addDays = (date) => {
  date.setDate(date.getDate() + 7);
};
