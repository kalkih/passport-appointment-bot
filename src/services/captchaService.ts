/* eslint-disable unicorn/error-message */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-extra";
// require("puppeteer-extra-plugin-stealth/evasions/chrome.app");
// require("puppeteer-extra-plugin-stealth/evasions/chrome.csi");
// require("puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes");
// require("puppeteer-extra-plugin-stealth/evasions/chrome.runtime");
// require("puppeteer-extra-plugin-stealth/evasions/defaultArgs");
// require("puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow");
// require("puppeteer-extra-plugin-stealth/evasions/media.codecs");
// require("puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency");
// require("puppeteer-extra-plugin-stealth/evasions/navigator.languages");
// require("puppeteer-extra-plugin-stealth/evasions/navigator.permissions");
// require("puppeteer-extra-plugin-stealth/evasions/navigator.plugins");
// require("puppeteer-extra-plugin-stealth/evasions/navigator.vendor");
// require("puppeteer-extra-plugin-stealth/evasions/navigator.webdriver");
// require("puppeteer-extra-plugin-stealth/evasions/sourceurl");
// require("puppeteer-extra-plugin-stealth/evasions/user-agent-override");
// require("puppeteer-extra-plugin-stealth/evasions/webgl.vendor");
// require("puppeteer-extra-plugin-stealth/evasions/window.outerdimensions");
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

import { Browser } from "puppeteer";

import { logger } from "../logger";
import { server } from "../server";

const captchaHtml = fs.readFileSync(
    path.join(__dirname, "../../public/index.html"),
    "utf8"
);

const HEADLESS_HEIGHT = 600;
const HEADLESS_WIDTH = 600;

class CaptchaServiceClass {
    verifiedToken: string[] = [];
    sessions: { sessionId: number; browser: Browser }[] = [];
    sessionId = 1;

    async startBrowser() {
        const chromePaths = getChromePaths();

        if (chromePaths == undefined) {
            return;
        }

        for (const chromePath of chromePaths) {
            logger.debug("Trying to open chrome path: " + chromePath);

            try {
                return await puppeteer.launch({
                    product: "chrome",
                    headless: false,
                    executablePath: chromePath,
                    args: [
                        `--window-size=${HEADLESS_WIDTH},${HEADLESS_HEIGHT}`,
                    ],
                    defaultViewport: {
                        width: HEADLESS_WIDTH,
                        height: HEADLESS_HEIGHT,
                    },
                });
            } catch (error) {
                if (!chromePaths.includes(chromePath)) {
                    logger.error("Failed starting browser", error as any);
                } else {
                    logger.debug(
                        "Failed starting browser, trying next chrome path..."
                    );
                }
            }
        }
    }

    async openCaptcha() {
        try {
            const { sessionId, sessions } = this;

            this.sessionId++;
            const browser = await this.startBrowser();

            if (browser == undefined) {
                throw new Error();
            }

            sessions.push({ sessionId, browser });
            const pages = await browser.pages();
            // eslint-disable-next-line unicorn/prefer-at
            const [page] = pages;

            await page.goto(
                "https://bokapass.nemoq.se/Booking/Booking/Index/Stockholm"
            );

            const captchaHtmlWithSessisonId = captchaHtml
                .replaceAll("[SESSION_ID_PLACEHOLDER]", sessionId.toString())
                .replaceAll(
                    "[PORT_PLACEHOLDER]",
                    (server.address() as any)!.port
                );

            await page.setContent(captchaHtmlWithSessisonId);
        } catch (error) {
            logger.error(
                "Failed opening captcha page, make sure you have Google Chrome installed",
                error as any
            );
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

        return await new Promise((resolve) => {
            const interval = setInterval(() => {
                if (this.verifiedToken.length > 0) {
                    clearInterval(interval);
                    logger.verbose("Got new verified captcha token");

                    return resolve(this.verifiedToken.shift());
                }
            }, 500);
        });
    }

    addVerifiedToken(token: string) {
        logger.debug(
            "Added new verified token, currently stored: " +
                this.verifiedToken.length
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
                } catch {
                    // Empty
                }
            }, 1000);
            this.sessions = this.sessions.filter(
                (session) => session.sessionId !== sessionId
            );
        }
    }
}

const getChromePaths = () => {
    switch (process.platform) {
        case "darwin": {
            return [
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            ];
        }
        case "win32": {
            return [
                "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            ];
        }
        case "linux": {
            return ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"]; // Is google-chrome-stable on some distros
        }
        // No default
    }
};

export const CaptchaService = new CaptchaServiceClass();
