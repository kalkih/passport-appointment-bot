import fs from "fs";
import { logger } from "../logger";
import { getPath } from "../utils";
import { Config } from "./types";

const readConfig = (): Config => {
  try {
    const configPath = getPath("./config.json");

    const config = JSON.parse(fs.readFileSync(configPath).toString());

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
      useProxies: false,
      proxyTimeout: 0,
      ...config,
    };
  } catch (error) {
    logger.error("Missing or invalid configuration file", error);
    process.exit();
  }
};

export default readConfig;
