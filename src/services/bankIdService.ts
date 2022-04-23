import { logger } from "../logger";
import nodeFetch from "node-fetch";
import qrCode from "qrcode-terminal";

import makeFetchCookie from "fetch-cookie";
import cheerio from "cheerio";

enum BankIdStatus {
  COMPLETED = 1,
  SIGNING = 2,
  NOT_STARTED = 3,
  FINISHED = 4,
  EXPIRED = 5,
  EXCEPTION = 16,
  CANCELED = 17,
}

interface BankIdState {
  code: BankIdStatus;
  description: string;
  result: number;
}

interface BankIdAttempt {
  code: number;
  description: string;
  qr_text: string;
  result: number;
}

const BASE_URL = "https://legitimera.polisen.se";

class BankIdService {
  private sessionId: string;
  private fetch = makeFetchCookie(nodeFetch);

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  private get identifyUrl(): string {
    return `${BASE_URL}/authenticate?sessionId=${this.sessionId}`;
  }

  private get pollStatusUrl(): string {
    return `${BASE_URL}/ajax-wpki.polling?sessionId=${this.sessionId}`;
  }

  private get newAttemptUrl(): string {
    return `${BASE_URL}/ajax-wpki.new-attempt?sessionId=${this.sessionId}`;
  }

  private get continueUrl(): string {
    return `${BASE_URL}/continue.request?sessionId=${this.sessionId}`;
  }

  public async identify(): Promise<string> {
    const res = await this.fetch(
      `https://legitimera.polisen.se/api/login?sessionid=${this.sessionId}`
    );
    const $ = cheerio.load(await res.text());
    const url = $("#a_wpki2").attr("href");

    await this.fetch(BASE_URL + url);

    await this.fetch(this.identifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        device: "other",
        use_qr: "true",
      }),
    });

    await this.newAttempt();
    return await this.pollStatus();
  }

  private async pollStatus(): Promise<string> {
    let isSigningLogged = false;
    const statusPromise: Promise<void> = new Promise((resolve) => {
      const interval = setInterval(async () => {
        const res = await this.fetch(this.pollStatusUrl);
        const state: BankIdState = await res.json();
        logger.debug(state);

        if (state.code === BankIdStatus.SIGNING) {
          if (!isSigningLogged) {
            logger.verbose("BankID signing in progress");
            isSigningLogged = true;
          }
          return;
        } else {
          isSigningLogged = false;
        }

        if (
          [
            BankIdStatus.EXPIRED,
            BankIdStatus.EXCEPTION,
            BankIdStatus.CANCELED,
          ].includes(state.code)
        ) {
          if (state.code === BankIdStatus.CANCELED) {
            logger.error("BankID identification canceled");
          } else {
            logger.warn(
              "BankID identification attempt expired, generating new attempt..."
            );
          }
          return await this.newAttempt();
        }

        if (
          [BankIdStatus.COMPLETED, BankIdStatus.FINISHED].includes(state.code)
        ) {
          logger.success("BankID identification completed");
          clearInterval(interval);
          return resolve();
        }
      }, 1000);
    });

    await statusPromise;

    const res = await this.fetch(this.continueUrl);
    return res.url;
  }

  private async newAttempt(): Promise<void> {
    const res = await this.fetch(this.newAttemptUrl);
    const attempt: BankIdAttempt = await res.json();
    const qr = attempt.qr_text;
    logger.info("Requires BankID identification to proceed");
    logger.info(
      "Use the link or scan the QR code in the BankID app (valid for 30 seconds)"
    );
    console.log(qr);
    qrCode.generate(qr, { small: true });
    logger.verbose("Waiting for BankID verification...");
  }
}

export { BankIdService };
