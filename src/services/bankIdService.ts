import { logger } from "../logger";
import nodeFetch from "node-fetch";
import qrCode from "qrcode-terminal";

import makeFetchCookie from "fetch-cookie";

const BASE_URL = "https://etjanster.polisen.se/login";

class BankIdService {
  private sessionId: string;
  private fetch = makeFetchCookie(nodeFetch);

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  private get loginUrl(): string {
    return `${BASE_URL}/request?tid=external-api&lid=${this.sessionId}`;
  }

  private get bankIdUrl(): string {
    return `${BASE_URL}/bankid?tid=external-api&lid=${this.sessionId}`;
  }

  private get pollStatusUrl(): string {
    return `${BASE_URL}/bankid/api/v1/status`;
  }

  private get newAttemptUrl(): string {
    return `${BASE_URL}/bankid/api/v1/init`;
  }

  public async identify(): Promise<string> {
    // fetch login/id page
    await this.fetch(this.loginUrl);

    // select bank id option
    await this.fetch(this.bankIdUrl);

    await this.newAttempt();
    return await this.pollStatus();
  }

  private async pollStatus(): Promise<string> {
    let isSigningLogged = false;
    const statusPromise: Promise<string> = new Promise((resolve) => {
      const interval = setInterval(async () => {
        const res = await this.fetch(this.pollStatusUrl, {
          method: "POST",
        });
        const response: BankIdResponse = await res.json();
        logger.debug(response);

        if (response.userMessageShortCode === BankIdHintCode.RFA21) {
          if (!isSigningLogged) {
            logger.verbose(HintCodeDescription[response.userMessageShortCode]);
            isSigningLogged = true;
          }
          return;
        } else {
          isSigningLogged = false;
        }

        if (response.status === BankIdStatus.FAILED) {
          if (response.userMessageShortCode) {
            logger.error(
              `BankID signing failed: ${
                HintCodeDescription[response.userMessageShortCode] ??
                "Timed out"
              }`
            );
          } else {
            logger.warn(
              "BankID identification attempt expired, generating new attempt..."
            );
          }
          return await this.newAttempt();
        }

        if (response.status === BankIdStatus.COMPLETE && response.completeUrl) {
          logger.success("BankID identification completed");
          clearInterval(interval);
          return resolve(response.completeUrl);
        }
      }, 2500);
    });

    const returnUrl = await statusPromise;

    const res = await this.fetch(returnUrl);
    return res.url;
  }

  private async newAttempt(): Promise<void> {
    const res = await this.fetch(this.newAttemptUrl, {
      method: "POST",
    });
    const attempt: BankIdInitResponse = await res.json();
    const qr = attempt.qrData;
    logger.info("Requires BankID identification to proceed");
    logger.info(
      "Use the link or scan the QR code in the BankID app (valid for 30 seconds)"
    );
    console.log(qr);
    qrCode.generate(qr, { small: true });
    logger.verbose("Waiting for BankID verification...");
  }
}

interface BankIdResponse {
  status: BankIdStatus;
  qrData: string;
  userMessageShortCode: BankIdHintCode | "";

  completeUrl: string | null;
  errorCode: string | null;
}

interface BankIdInitResponse
  extends Pick<
    BankIdResponse,
    "errorCode" | "qrData" | "userMessageShortCode"
  > {
  autoStartToken: string;
}

enum BankIdStatus {
  PENDING = "pending",
  COMPLETE = "complete",
  FAILED = "failed",
}

enum BankIdHintCode {
  RFA1 = "RFA1",
  RFA2 = "RFA2",
  RFA3 = "RFA3",
  RFA4 = "RFA4",
  RFA5 = "RFA5",
  RFA6 = "RFA6",
  RFA8 = "RFA8",
  RFA9 = "RFA9",
  RFA13 = "RFA13",
  RFA14A = "RFA14A",
  RFA14B = "RFA14B",
  RFA15A = "RFA15A",
  RFA15B = "RFA15B",
  RFA16 = "RFA16",
  RFA17A = "RFA17A",
  RPA17B = "RPA17B",
  RFA18 = "RFA18",
  RFA19 = "RFA19",
  RFA20 = "RFA20",
  RFA21 = "RFA21",
  RFA22 = "RFA22",
  RFA23 = "RFA23",
}

const HintCodeDescription: Record<BankIdHintCode, string> = {
  RFA1: "Start your BankID app.",
  RFA2: "The BankID app is not installed. Please contact your bank.",
  RFA3: "Action cancelled. Please try again.",
  RFA4: "An identification or signing for this personal number is already started. Please try again.",
  RFA5: "Internal error. Please try again.",
  RFA6: "Action cancelled.",
  RFA8: "The BankID app is not responding. Please check that it’s started and that you have internet access. If you don’t have a valid BankID you can get one from your bank. Try again.",
  RFA9: "Enter your security code in the BankID app and select Identify or Sign.",
  RFA13: "Trying to start your BankID app.",
  RFA14A:
    "Searching for BankID, it may take a little while … If a few seconds have passed and still no BankID has been found, you probably don’t have a BankID which can be used for this identification/signing on this computer. If you have a BankID card, please insert it into your card reader. If you don’t have a BankID you can get one from your bank. If you have a BankID on another device you can start the BankID app on that device.",
  RFA14B:
    "Searching for BankID, it may take a little while … If a few seconds have passed and still no BankID has been found, you probably don’t have a BankID which can be used for this identification/signing on this device. If you don’t have a BankID you can get one from your bank. If you have a BankID on another device you can start the BankID app on that device.",
  RFA15A:
    "Searching for BankID:s, it may take a little while … If a few seconds have passed and still no BankID has been found, you probably don’t have a BankID which can be used for this identification/signing on this computer. If you have a BankID card, please insert it into your card reader. If you don’t have a BankID you can get one from your bank.",
  RFA15B:
    "Searching for BankID, it may take a little while … If a few seconds have passed and still no BankID has been found, you probably don’t have a BankID which can be used for this identification/signing on this device. If you don’t have a BankID you can get one from your bank.",
  RFA16:
    "The BankID you are trying to use is blocked or too old. Please use another BankID or get a new one from your bank.",
  RFA17A:
    "The BankID app couldn’t be found on your computer or mobile device. Please install it and get a BankID from your bank. Install the app from your app store or https://install.bankid.com.",
  RPA17B:
    "Failed to scan the QR code. Start the BankID app and scan the QR code. Check that the BankID app is up to date. If you don't have the BankID app, you need to install it and get a BankID from your bank. Install the app from your app store or https://install.bankid.com.",
  RFA18: "Start the BankID app.",
  RFA19:
    "Would you like to identify yourself or sign with a BankID on this computer, or with a Mobile BankID?",
  RFA20:
    "Would you like to identify yourself or sign with a BankID on this device, or with a BankID on another device?",
  RFA21: "Identification or signing in progress.",
  RFA22: "Unknown error. Please try again.",
  RFA23: "Process your machine-readable travel document using the BankID app.",
};

export { BankIdService };
