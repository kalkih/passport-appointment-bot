const puppeteer = require("puppeteer");
const locations = require("./locations");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;

const BASE_URL = "https://bokapass.nemoq.se/Booking/Booking/Index/blekinge";
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
    // devtools: true,
  });

  const page = await browser.newPage();

  if (argv.session) {
    console.info("Using session cookie:", argv.session);
    await page.setCookie({
      name: "ASP.NET_VentusBooking_SessionId",
      value: argv.session,
      domain: "bokapass.nemoq.se",
    });
  } else {
    stepQueue.push(...introSteps(page));
  }

  await page.setDefaultNavigationTimeout(0);
  console.info("Starting booking session");
  await page.goto(BASE_URL);

  for (const location of LOCATIONS_TO_CHECK) {
    if (locations[location]) {
      locationQueue.push(locations[location]);
    } else {
      console.warn("Location not found:", location);
    }
  }

  for await (const { name, navigation } of stepQueue) {
    await handleStep(page, name, navigation);
  }

  console.info("Time to start checking for available timeslots");
  checkAvailableSlotsForLocation(page, locationQueue[0]);
})();

const handleStep = async (page, name, callback) => {
  console.log("Started step:", name);
  await page.waitForSelector("h1");
  const textContent = await page.evaluate(
    () => document.querySelector("h1").textContent
  );

  if (textContent === "504 Gateway Time-out") {
    console.warn("504 Gateway Time-out: Retrying...");
    await page.reload();
    await handleStep(page, name, callback);
  }
  await callback();
};

const checkAvailableSlotsForLocation = async (page, location) => {
  console.info("Switching to location:", location);
  const maxDate = new Date(MAX_DATE);
  const currentDate = new Date();
  await page.select('[name="SectionId"]', location.toString());

  while (currentDate.getTime() < maxDate.getTime()) {
    await checkAvailableSlots(page, currentDate);
    console.info("Loading next week...");
    addDays(currentDate);
  }
  console.info("Max date reached, checking next location");

  locationQueue.push(locationQueue.shift());
  checkAvailableSlotsForLocation(locationQueue[0]);
};

const checkAvailableSlots = async (page, date) => {
  await page.$eval('[name="FromDateString"]', (el) => (el.value = ""));
  await page.type('[name="FromDateString"]', getShortDate(date));
  await page.click('[name="TimeSearchButton"]');
  await page.waitForNavigation();

  console.info("Checking week of:", getShortDate(date));
  // TODO: Check for available timeslots here
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
