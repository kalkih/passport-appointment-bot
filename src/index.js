const puppeteer = require("puppeteer");

const BASE_URL = "https://bokapass.nemoq.se/Booking/Booking/Index/blekinge";
const HEADLESS_HEIGHT = 800;
const HEADLESS_WIDTH = 1000;

// TODO: Should make these into an option / environment variable
const LOCATIONS = ["Karlskrona", "Karlshamn"];
const MAX_WEEKS = 8;

const locationQueue = [];

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
  await page.setDefaultNavigationTimeout(0);
  await page.goto(BASE_URL);

  await handleStep(page, "Start", async () => {
    await page.click('[name="StartNextButton"]');
    await page.waitForNavigation();
  });
  await handleStep(page, "Cookies", async () => {
    await page.click('[name="AcceptInformationStorage"]');
    await page.click('[name="Next"]');
    await page.waitForNavigation();
  });
  await handleStep(page, "Residency", async () => {
    await page.click('[name="ServiceCategoryCustomers[0].ServiceCategoryId"]');
    await page.click('[name="Next"]');
    await page.waitForNavigation();
  });
  await handleStep(page, "Residency", async () => {
    await page.click('[name="ServiceCategoryCustomers[0].ServiceCategoryId"]');
    await page.click('[name="Next"]');
    await page.waitForNavigation();
  });

  // Ready to start the looping to check for available times
  locationQueue = [...LOCATIONS];
  checkAvailableSlotsForLocation(page, locationQueue[0]);
})();

const handleStep = async (page, name, callback) => {
  console.log("Navigating step", name);
  await page.waitForSelector("h1");
  const textContent = await page.evaluate(
    () => document.querySelector("h1").textContent
  );

  if (textContent === "504 Gateway Time-out") {
    console.warn("504 Gateway Time-out: Retrying...");
    await page.reload();
    await handleStep(page, callback);
  }
  await callback();
};

// TODO: Loop through weeks to check for available slots for location in param
// when done, we move location to the back of the queue and call checkAvailableSlotsForLocation
// with the next location
const checkAvailableSlotsForLocation = async (page, location) => {};
