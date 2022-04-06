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

module.exports = readConfig;
