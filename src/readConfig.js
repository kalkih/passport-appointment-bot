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
    return JSON.parse(fs.readFileSync(configPath));
  } catch {
    logger.error("Missing or invalid configuration file");
    process.exit();
  }
};

module.exports = readConfig;
