const logger = require("./logger");

const requiredProperties = [
  "region",
  "locations",
  "max_date",
  "email",
  "phone",
  "firstname",
  "lastname",
];

const validateConfig = (config) => {
  logger.info("Validating configuration...");
  requiredProperties.forEach((prop) => {
    if (!(prop in config)) {
      logger.error(`Missing required configuration for ${prop}.`);
      process.exit();
    }
  });
  logger.log("success", "Configuration is valid");
};

module.exports = validateConfig;
