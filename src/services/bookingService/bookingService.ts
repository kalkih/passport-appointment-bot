import nodeFetch, { FetchError, RequestInit, Response } from "node-fetch";
import { AbortSignal } from "node-fetch/externals";
import makeFetchCookie from "fetch-cookie";
import { Cheerio, CheerioAPI, Element } from "cheerio";
import { logger } from "../../logger";
import { Region } from "../../locations";
import { Config, Location } from "../../configuration";
import { ProxyService } from "../proxyService";

export interface BookingServiceConfig {
  region: Region;
  numberOfPeople?: number;
  useProxy?: boolean;
  proxyTimeout?: number;
  mockBooking?: boolean;
  proxyRetries?: number;
  bookingNumber?: string;
}

export enum BookingSessionStatus {
  INITIAL = "INITIAL",
  INITIATED = "INITIATED",
}

const DEFAULT_REQUEST_TIMEOUT = 30;
const REQUEST_RETRY_COUNT = 3;

export const generateBaseUrl = (region: Region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Index/${replaceSpecialChars(
    region.toLowerCase()
  )}`;
export const generatePostUrl = (region: Region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Next/${replaceSpecialChars(
    region.toLowerCase()
  )}`;
export const generatePreviousUrl = (region: Region) =>
  `https://bokapass.nemoq.se/Booking/Booking/Previous/${replaceSpecialChars(
    region.toLowerCase()
  )}`;

export abstract class BookingService {
  protected region: Region;
  protected mockBooking: boolean;
  protected numberOfPeople: number;
  protected fetchInstance = makeFetchCookie(nodeFetch);
  protected proxy?: ProxyService;
  protected requestTimeout: number;
  protected sessionStatus = BookingSessionStatus.INITIAL;

  constructor({
    region,
    numberOfPeople = 1,
    mockBooking = false,
    useProxy = false,
    proxyTimeout = DEFAULT_REQUEST_TIMEOUT,
    proxyRetries,
  }: BookingServiceConfig) {
    this.region = region;
    this.mockBooking = mockBooking;
    this.numberOfPeople = numberOfPeople;
    this.requestTimeout = (proxyTimeout || DEFAULT_REQUEST_TIMEOUT) * 1000;

    if (useProxy) {
      this.proxy = new ProxyService(proxyRetries);
    }
  }

  protected async fetch(
    url = generateBaseUrl(this.region),
    options: RequestInit = {}
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.requestTimeout);

    try {
      const agent =
        (this.sessionStatus === BookingSessionStatus.INITIATED &&
          this.proxy &&
          this.proxy.agent) ||
        undefined;
      if (agent) {
        logger.debug(
          "Fetching with proxy",
          options?.method || "GET",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (agent as any).proxy.href
        );
      }

      const response = await this.fetchInstance(url, {
        ...options,
        agent,
        signal: controller.signal as AbortSignal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36",
          Referer: generateBaseUrl(this.region),
          ...(options.headers || {}),
        },
      });
      return response;
    } catch (err) {
      this.proxy?.trackError();
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  protected async postRequest(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: Record<string, any>,
    url = generatePostUrl(this.region),
    retry = 0
  ): Promise<Response> {
    try {
      const response = await this.fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(body),
      });

      if (!response.ok) {
        this.proxy?.trackError();
        throw new Error("Something went wrong");
      }

      return response;
    } catch (err) {
      const error = err as Error | FetchError;
      if (error.name === "AbortError") {
        logger.warn(
          `Request timed out after ${this.requestTimeout / 1000}s, retrying...`
        );
        return this.postRequest(body, url, retry);
      }

      if (error) {
        logger.error(error.message, error.stack);
        if (retry >= REQUEST_RETRY_COUNT) {
          logger.error("Too many retries, exiting", error.stack);
          process.exit();
        }
        return this.postRequest(body, url, retry + 1);
      }
      throw new Error();
    }
  }

  protected async getRequest(url?: string, retry = 0): Promise<Response> {
    try {
      return await this.fetch(url);
    } catch (err) {
      const error = err as Error | FetchError;
      if (error) {
        logger.error(error.message, error.stack);
        if (retry > REQUEST_RETRY_COUNT) {
          logger.error("Too many retries, exiting", error.stack);
          process.exit();
        }
        return this.getRequest(url, retry + 1);
      }
      throw new Error();
    }
  }

  public abstract init(config: Config): Promise<void>;

  public abstract recover(): Promise<boolean>;

  public abstract bookSlot(
    serviceTypeId: string,
    timeslot: string,
    location: number,
    config: Config
  ): Promise<
    | {
        bookingNumber: string;
        slot: string;
        expedition: string;
      }
    | undefined
  >;

  public abstract getFreeSlotsForWeek(
    location: Location,
    date: Date
  ): Promise<[Cheerio<Element> | undefined, Cheerio<Element> | undefined]>;
}

export class BookingPageError extends Error {
  page: CheerioAPI;

  constructor({ message, page }: { message?: string; page: CheerioAPI }) {
    super(message);
    this.page = page;
  }
}

const replaceSpecialChars = (inputValue: string) =>
  inputValue
    .replace(/å/g, "a")
    .replace(/Å/g, "A")
    .replace(/ä/g, "a")
    .replace(/Ä/g, "A")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O");
