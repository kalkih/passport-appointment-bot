import { logger } from "../logger";
import nodeFetch from "node-fetch";

import makeFetchCookie from "fetch-cookie";
import cheerio from "cheerio";
import {
  BankIdStatus,
  clearBankIdState,
  setBankIdState,
} from "../store/bankIdStore";

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

  private get loginUrl(): string {
    return `${BASE_URL}/api/login?sessionid=${this.sessionId}`;
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
    const res = await this.fetch(this.loginUrl);
    const $ = cheerio.load(await res.text());
    const url = $("#a_wpki2").attr("href");

    await this.fetch(BASE_URL + url);

    await this.newAttempt();
    return await this.pollStatus();
  }

  private async pollStatus(): Promise<string> {
    let isSigningLogged = false;
    const statusPromise: Promise<void> = new Promise((resolve) => {
      const interval = setInterval(async () => {
        const res = await this.fetch(this.pollStatusUrl);
        const state: BankIdState = await res.json();
        setBankIdState(state);
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
          clearBankIdState();
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
    logger.info("Requires BankID identification to proceed");
    logger.info("Visit the website to scan the QR code");
    setBankIdState(attempt);
    logger.verbose("Waiting for BankID verification...");
  }
}

export { BankIdService };
