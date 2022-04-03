const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer-extra");

require("puppeteer-extra-plugin-stealth/evasions/chrome.app");
require("puppeteer-extra-plugin-stealth/evasions/chrome.csi");
require("puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes");
require("puppeteer-extra-plugin-stealth/evasions/chrome.runtime");
require("puppeteer-extra-plugin-stealth/evasions/defaultArgs");
require("puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow");
require("puppeteer-extra-plugin-stealth/evasions/media.codecs");
require("puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency");
require("puppeteer-extra-plugin-stealth/evasions/navigator.languages");
require("puppeteer-extra-plugin-stealth/evasions/navigator.permissions");
require("puppeteer-extra-plugin-stealth/evasions/navigator.plugins");
require("puppeteer-extra-plugin-stealth/evasions/navigator.vendor");
require("puppeteer-extra-plugin-stealth/evasions/navigator.webdriver");
require("puppeteer-extra-plugin-stealth/evasions/sourceurl");
require("puppeteer-extra-plugin-stealth/evasions/user-agent-override");
require("puppeteer-extra-plugin-stealth/evasions/webgl.vendor");
require("puppeteer-extra-plugin-stealth/evasions/window.outerdimensions");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const logger = require("../logger");
const server = require("../server");

const captchaHtml = fs.readFileSync(
  path.join(__dirname, "../../public/index.html"),
  "utf8"
);

const HEADLESS_HEIGHT = 600;
const HEADLESS_WIDTH = 600;

class CaptchaService {
  verifiedToken = [];
  sessions = [];
  sessionId = 1;

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
      const sessionId = this.sessionId;
      this.sessionId++;
      const browser = await this.startBrowser();
      this.sessions.push({ sessionId, browser });
      const pages = await browser.pages();
      const page = pages[0];
      await page.goto(
        "https://bokapass.nemoq.se/Booking/Booking/Index/Stockholm"
      );
      const captchaHtmlWithSessisonId = captchaHtml
        .replaceAll("[SESSION_ID_PLACEHOLDER]", sessionId)
        .replaceAll("[PORT_PLACEHOLDER]", server.address().port);
      await page.setContent(captchaHtmlWithSessisonId);
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

  sessionCompleted(sessionId) {
    const session = this.sessions.find(
      (session) => session.sessionId === Number(sessionId)
    );
    if (session) {
      setTimeout(() => {
        try {
          session.browser.close();
        } catch {}
      }, 1000);
      this.sessions = this.sessions.filter(
        (session) => session.sessionId !== sessionId
      );
    }
  }
}

function getChromePaths() {
  if (process.platform === "darwin") {
    return ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
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
