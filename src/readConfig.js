const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const readConfig = () => {
  try {
    let configPath;
    if (process.pkg) {
      configPath = path.join(path.dirname(process.execPath), "./config.json");
    } else {
      configPath = path.join(process.cwd(), "./config.json");
    }

    const config = JSON.parse(fs.readFileSync(configPath));

    if (typeof config.firstname === "string") {
      config.firstname = [config.firstname];
    }

    if (typeof config.lastname === "string") {
      config.lastname = [config.lastname];
    }

    if (config.firstname.length !== config.lastname.length) {
      logger.error("Same amount of firstnames & lastnames has to be provided");
      throw new Error();
    }

    return config;
  } catch {
    logger.error("Missing or invalid configuration file");
    process.exit();
  }
};

module.exports = readConfig;
