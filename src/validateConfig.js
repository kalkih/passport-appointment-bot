const logger = require("./logger");

const requiredProperties = [
  "region",
  "locations",
  "max_date",
  "email",
  "phone",
  "firstname",
  "lastname",
  "type",
];

const validateConfig = (config) => {
  logger.info("Validating configuration...");
  requiredProperties.forEach((prop) => {
    if (!(prop in config)) {
      logger.error(`Missing required configuration for ${prop}.`);
      process.exit();
    }
  });

  if (!["passport", "id"].includes(config.type)) {
    logger.error(
      'Invalid configuration of "type", valid options are "passport" and "id".'
    );
    process.exit();
  }

  logger.log("success", "Configuration is valid");
};

module.exports = validateConfig;
