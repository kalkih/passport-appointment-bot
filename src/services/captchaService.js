const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");
const logger = require("../logger");
const sound = require("sound-play");

const captchaHtml = fs.readFileSync(
  path.join(__dirname, "../../public/index.html"),
  "utf8"
);

const HEADLESS_HEIGHT = 600;
const HEADLESS_WIDTH = 600;

class CaptchaService {
  verifiedToken = [];

  async startBrowser() {
    const chromePaths = getChromePaths();

    for (const chromePath of chromePaths) {
      logger.debug("Trying to open chrome path: " + chromePath);
      try {
        const browser = await puppeteer.launch({
          product: "chrome",
          headless: false,
          executablePath: chromePath,
          args: [`--window-size=${HEADLESS_WIDTH},${HEADLESS_HEIGHT}`],
          defaultViewport: {
            width: HEADLESS_WIDTH,
            height: HEADLESS_HEIGHT,
          },
        });
        return browser;
      } catch (error) {
        if (chromePaths.findIndex((path) => path === chromePath) === -1) {
          logger.error("Failed starting browser", error);
        } else {
          logger.debug("Failed starting browser, trying next chrome path...");
        }
      }
    }
  }

  async openCaptcha() {
    try {
      const browser = await this.startBrowser();
      const pages = await browser.pages();
      const page = pages[0];
      sound
        .play(path.join(__dirname, "../../assets/sound.wav"))
        .catch(() => {});
      await page.goto("https://bokapass.nemoq.se/Booking/Booking/Error");
      await page.setContent(captchaHtml);
    } catch (error) {
      logger.error("Failed opening captcha page", error);
    }
  }

  async getNewVerifiedToken() {
    if (this.verifiedToken.length > 0) {
      return this.verifiedToken.shift();
    }

    logger.warn("Manual captcha verification required");
    logger.verbose("Opening captcha page...");
    await this.openCaptcha();
    logger.debug("Opened captcha page");

    logger.info("Waiting for captcha input...");
    const token = await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.verifiedToken.length > 0) {
          clearInterval(interval);
          logger.verbose("Got new verified captcha token");
          return resolve(this.verifiedToken.shift());
        }
      }, 500);
    });

    return token;
  }

  addVerifiedToken(token) {
    logger.debug(
      "Added new verified token, currently stored: " + this.verifiedToken.length
    );
    this.verifiedToken.push(token);
  }
}

function getChromePaths() {
  if (process.platform === "darwin") {
    return [
      "asd",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ];
  } else if (process.platform === "win32") {
    return [
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    ];
  } else if (process.platform === "linux") {
    return ["/usr/bin/google-chrome"];
  }
}

module.exports = new CaptchaService();
