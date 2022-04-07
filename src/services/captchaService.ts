import { Browser } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { logger } from "../logger";
import { serverPort } from "../server";

import "puppeteer-extra-plugin-stealth/evasions/chrome.app";
import "puppeteer-extra-plugin-stealth/evasions/chrome.csi";
import "puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes";
import "puppeteer-extra-plugin-stealth/evasions/chrome.runtime";
import "puppeteer-extra-plugin-stealth/evasions/defaultArgs";
import "puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow";
import "puppeteer-extra-plugin-stealth/evasions/media.codecs";
import "puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency";
import "puppeteer-extra-plugin-stealth/evasions/navigator.languages";
import "puppeteer-extra-plugin-stealth/evasions/navigator.permissions";
import "puppeteer-extra-plugin-stealth/evasions/navigator.plugins";
import "puppeteer-extra-plugin-stealth/evasions/navigator.vendor";
import "puppeteer-extra-plugin-stealth/evasions/navigator.webdriver";
import "puppeteer-extra-plugin-stealth/evasions/sourceurl";
import "puppeteer-extra-plugin-stealth/evasions/user-agent-override";
import "puppeteer-extra-plugin-stealth/evasions/webgl.vendor";
import "puppeteer-extra-plugin-stealth/evasions/window.outerdimensions";

puppeteer.use(StealthPlugin());

interface CaptchaSession {
  sessionId: number;
  browser: Browser;
}

export type VerifiedCaptchaToken = string & {
  readonly isVerifiedCaptchaToken: true;
};

const HEADLESS_HEIGHT = 600;
const HEADLESS_WIDTH = 600;

export class CaptchaService {
  verifiedToken: VerifiedCaptchaToken[] = [];
  sessions: CaptchaSession[] = [];
  sessionId = 1;

  async startBrowser(): Promise<Browser | undefined> {
    for (const chromePath of CHROME_PATHS[process.platform]) {
      logger.debug("Trying to open chrome path: " + chromePath);
      try {
        const browser = await puppeteer.launch({
          product: "chrome",
          headless: false,
          executablePath: chromePath,
          args: [
            `--window-size=${HEADLESS_WIDTH},${HEADLESS_HEIGHT}`,
            "--autoplay-policy=no-user-gesture-required",
          ],
          ignoreDefaultArgs: ["--mute-audio"],
          defaultViewport: {
            width: HEADLESS_WIDTH,
            height: HEADLESS_HEIGHT,
          },
        });
        return browser;
      } catch (error) {
        if (
          CHROME_PATHS[process.platform].findIndex(
            (path) => path === chromePath
          ) === -1
        ) {
          logger.error("Failed starting browser", error);
        } else {
          logger.debug("Failed starting browser, trying next chrome path...");
        }
      }
    }
  }

  async openCaptcha(): Promise<void> {
    try {
      const sessionId = this.sessionId;
      this.sessionId++;
      const browser = await this.startBrowser();
      if (!browser) {
        logger.error("No browser session was started");
        throw new Error();
      }
      this.sessions.push({ sessionId, browser });
      const pages = await browser.pages();
      const page = pages[0];
      page.setExtraHTTPHeaders({
        origin: "https://bokapass.nemoq.se",
      });
      await page.goto(getCaptchaUrl(sessionId));
    } catch (error) {
      logger.error(
        "Failed opening captcha page, make sure you have Google Chrome installed",
        error
      );
    }
  }

  async getNewVerifiedToken() {
    if (this.verifiedToken.length > 0) {
      return this.verifiedToken.shift();
    }

    logger.warn("Manual captcha verification required");
    logger.info("Opening captcha page...");
    await this.openCaptcha();
    logger.debug("Opened captcha page");

    logger.verbose("Waiting for captcha input...");
    const token = await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.verifiedToken.length > 0) {
          clearInterval(interval);
          logger.success("Received captcha from user");
          return resolve(this.verifiedToken.shift());
        }
      }, 500);
    });

    return token;
  }

  addVerifiedToken(token: VerifiedCaptchaToken) {
    logger.debug(
      "Added new verified token, currently stored: " + this.verifiedToken.length
    );
    this.verifiedToken.push(token);
  }

  sessionCompleted(sessionId: number) {
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

function getCaptchaUrl(sessionId: number) {
  return `http://localhost:${serverPort()}/captcha/${sessionId}`;
}

const CHROME_PATHS: Record<NodeJS.Platform, string[]> = {
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  win32: [
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ],
  linux: ["/usr/bin/google-chrome"],
  aix: [],
  android: [],
  freebsd: [],
  haiku: [],
  openbsd: [],
  sunos: [],
  cygwin: [],
  netbsd: [],
};

const captchaService = new CaptchaService();
export { captchaService };
