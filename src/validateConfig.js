const logger = require("./logger");

const requiredProperties = [
  "region",
  "locations",
  "max_date",
  "email",
  "phone",
  "firstname",
  "lastname",
  "passport",
  "id",
];

const validateConfig = (config) => {
  logger.info("Validating configuration...");
  requiredProperties.forEach((prop) => {
    if (!(prop in config)) {
      logger.error(`Missing required configuration for ${prop}.`);
      process.exit();
    }
  });

  if (config.firstname.length !== config.lastname.length) {
    logger.error("Same amount of firstnames & lastnames has to be provided");
    process.exit();
  }

  if (!config.passport && !config.id) {
    logger.error(
      "Configuration options passport & id can't both be set to false"
    );
    process.exit();
  }

  logger.log("success", "Configuration is valid");
};

module.exports = validateConfig;
