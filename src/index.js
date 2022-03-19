const puppeteer = require("puppeteer");
const locations = require("./locations");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
const fetch = require("node-fetch");
const { transports, createLogger, format } = require("winston");

const levels = {
  error: 0,
  warn: 1,
  success: 2,
  info: 3,
  verbose: 4,
  debug: 5,
};

const colors = {
  error: "red",
  warn: "yellow",
  success: "white bold",
  info: "green",
  verbose: "blue",
  debug: "magenta",
};

const logger = createLogger({
  level: "debug",
  levels,
  transports: [
    new transports.Console({
      colorize: true,
      format: format.combine(
        format.colorize({ all: true, colors }),
        format.timestamp({ format: "HH:mm:ss" }),
        format.printf(
          (info) => `[${info.timestamp}] [${info.level}]\t${info.message}`
        )
      ),
    }),
  ],
});

const BASE_URL = "https://bokapass.nemoq.se/Booking/Booking/Index/blekinge";
const POST_URL = "https://bokapass.nemoq.se/Booking/Booking/Next/blekinge";
const HEADLESS_HEIGHT = 800;
const HEADLESS_WIDTH = 1000;

// TODO: Should make these into an option / environment variable
const LOCATIONS_TO_CHECK = ["Karlskrona", "Karlshamn"];
const MAX_DATE = "2022-05-01";

const locationQueue = [];

const stepQueue = [];

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [`--window-size=${HEADLESS_WIDTH},${HEADLESS_HEIGHT}`],
    defaultViewport: {
      width: HEADLESS_WIDTH,
      height: HEADLESS_HEIGHT,
    },
    devtools: true,
  });

  const page = await browser.newPage();

  if (argv.session) {
    logger.info("Using session cookie:", argv.session);
    await page.setCookie({
      name: "ASP.NET_VentusBooking_SessionId",
      value: argv.session,
      domain: "bokapass.nemoq.se",
    });
  } else {
    stepQueue.push(...introSteps(page));
  }

  await page.setDefaultNavigationTimeout(0);
  logger.info("Starting booking session");
  await page.goto(BASE_URL);

  for (const location of LOCATIONS_TO_CHECK) {
    if (locations[location]) {
      locationQueue.push(locations[location]);
    } else {
      logger.error(`Location not found: ${location}, skipping...`);
    }
  }

  for await (const { name, navigation } of stepQueue) {
    await handleStep(page, name, navigation);
  }

  logger.info("Starting to check for available timeslots");
  checkAvailableSlotsForLocation(page, locationQueue[0]);
})();

const handleStep = async (page, name, callback) => {
  logger.info(`Started step: ${name}`);
  await page.waitForSelector("h1");
  const textContent = await page.evaluate(
    () => document.querySelector("h1").textContent
  );

  if (textContent === "504 Gateway Time-out") {
    logger.warn("504 Gateway Time-out: Retrying...");
    await page.reload();
    await handleStep(page, name, callback);
  }
  await callback();
};

const checkAvailableSlotsForLocation = async (page, location) => {
  logger.info(`Switching to location: ${location}`);
  const maxDate = new Date(MAX_DATE);
  const currentDate = new Date();

  while (currentDate.getTime() < maxDate.getTime()) {
    await checkAvailableSlots(page, currentDate);
    logger.info("Loading next week...");
    addDays(currentDate);
  }
  logger.verbose("Max date reached, checking next location...");

  locationQueue.push(locationQueue.shift());
  checkAvailableSlotsForLocation(page, locationQueue[0]);
};

const checkAvailableSlots = async (page, date) => {
  const cookies = await page.cookies();
  const cookie = cookies.find(
    (c) => c.name === "ASP.NET_VentusBooking_SessionId"
  ).value;
  logger.info(`Loading week of: ${getShortDate(date)}`);
  // logger.info(cookie);
  await fetch(POST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `ASP.NET_VentusBooking_SessionId=${cookie};`,
    },
    redirect: "manual",
    follow: 0,
    body: new URLSearchParams({
      FormId: 1,
      NumberOfPeople: 1,
      RegionId: 0,
      SectionId: locationQueue[0],
      NQServiceTypeId: 1,
      FromDateString: getShortDate(date),
      SearchTimeHour: 12,
    }),
  });
  await page.goto(BASE_URL);

  logger.verbose(`Checking week of: ${getShortDate(date)}`);
  const freeSlots = await page.$$(".timecell script");
  const bookedSlots = await page.$$(".timecell label");
  if (freeSlots.length && freeSlots.length > 0) {
    logger.log("success", `Free timeslots found: ${freeSlots.length}`);
  } else {
    logger.verbose(`No free timeslots found, ${bookedSlots.length} reserved`);
  }
};

const introSteps = (page) => [
  {
    name: "New booking session",
    navigation: async () => {
      await page.click('[name="StartNextButton"]');
      await page.waitForNavigation();
    },
  },
  {
    name: "Cookie consent",
    navigation: async () => {
      await page.click('[name="AcceptInformationStorage"]');
      await page.click('[name="Next"]');
      await page.waitForNavigation();
    },
  },
  {
    name: "Residency information",
    navigation: async () => {
      await page.click(
        '[name="ServiceCategoryCustomers[0].ServiceCategoryId"]'
      );
      await page.click('[name="Next"]');
      await page.waitForNavigation();
    },
  },
];

const getShortDate = (date) => {
  return date.toISOString().split("T")[0];
};

const addDays = (date) => {
  date.setDate(date.getDate() + 7);
};
