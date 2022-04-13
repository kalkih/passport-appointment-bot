import { HttpsProxyAgent } from "https-proxy-agent";
import fs from "fs";
import { getPath } from "../utils";
import { logger } from "../logger";

const availableProxies = getProxies();
let proxyIndex = 0;

const DEFAULT_MAX_ERROR_COUNT = 3;

class ProxyService {
  public agent: HttpsProxyAgent;
  private errorCount = 0;
  private maxErrors: number;

  constructor(maxErrors = DEFAULT_MAX_ERROR_COUNT) {
    this.maxErrors = maxErrors;
    this.agent = this.createProxyAgent(this.getProxy());
  }

  private getProxy(): string {
    const proxy = availableProxies[proxyIndex];
    proxyIndex++;
    if (proxyIndex >= availableProxies.length) {
      proxyIndex = 0;
    }
    return "http://" + proxy;
  }

  private createProxyAgent(proxy: string): HttpsProxyAgent {
    return new HttpsProxyAgent(proxy);
  }

  private switchProxy(): void {
    const proxy = this.getProxy();
    logger.info(`Switching proxy: ${proxy}`);
    this.agent = this.createProxyAgent(proxy);
  }

  public trackError(): void {
    this.errorCount++;
    if (this.errorCount >= this.maxErrors) {
      this.errorCount = 0;
      this.switchProxy();
    }
  }
}

function getProxies(): string[] {
  const proxyPath = getPath("./proxies.txt");
  try {
    const proxies = fs
      .readFileSync(proxyPath, "utf8")
      .split("\n")
      .map((line) => line.replace("\r", "").trim());
    logger.success(`Read ${proxies.length} from file`);
    return proxies;
  } catch {
    logger.error(`Failed to load proxies from file ${proxyPath}`);
    logger.info("Continuing without proxies");
    return [];
  }
}

const numberOfAvailableProxies = availableProxies.length;

export { ProxyService, numberOfAvailableProxies };
