import fs from "fs";
import path from "path";
import { logger } from "../logger";
import { Config } from "./types";

const readConfig = (): Config => {
  try {
    let configPath: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((process as any).pkg) {
      configPath = path.join(path.dirname(process.execPath), "./config.json");
    } else {
      configPath = path.join(process.cwd(), "./config.json");
    }

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

    return config;
  } catch (error) {
    logger.error("Missing or invalid configuration file", error);
    process.exit();
  }
};

export default readConfig;
