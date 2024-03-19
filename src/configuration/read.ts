import fs from "fs";
import { logger } from "../logger";
import { getPath } from "../utils";
import { Config, RequiredConfig } from "./types";

const DEFAULT_OPTIONS = {
  extra_firstnames: [],
  extra_lastnames: [],
  extra_personnummer: [],
  sessions: 1,
  throttle: 0,
  useProxies: false,
  proxyTimeout: 30,
  proxyRetries: 3,
};

const readConfig = (): Config => {
  try {
    const localConfigPath = getPath("./config.local.json");
    const configPath = getPath("./config.json");

    const path = fs.existsSync(localConfigPath) ? localConfigPath : configPath;

    const config: RequiredConfig = JSON.parse(fs.readFileSync(path).toString());

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
