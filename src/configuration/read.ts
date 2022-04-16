import fs from "fs";
import { logger } from "../logger";
import { getPath } from "../utils";
import { Config, RequiredConfig } from "./types";

const DEFAULT_OPTIONS = {
  sessions: 1,
  throttle: 0,
  useProxies: false,
  proxyTimeout: 30,
  proxyRetries: 3,
};

const readConfig = (): Config => {
  try {
    const configPath = getPath("./config.json");

    const config: RequiredConfig = JSON.parse(
      fs.readFileSync(configPath).toString()
    );

    if (typeof config.personnummer === "string") {
      config.personnummer = [config.personnummer];
    }

    if (typeof config.firstname === "string") {
      config.firstname = [config.firstname];
    }

    if (typeof config.lastname === "string") {
      config.lastname = [config.lastname];
    }

    if (typeof config.confirmation === "string") {
      config.confirmation = [config.confirmation];
    }

    return {
      ...DEFAULT_OPTIONS,
      ...config,
    };
  } catch (error) {
    logger.error("Missing or invalid configuration file", error);
    process.exit();
  }
};

export default readConfig;
