import { logger } from "./logger";
import { ConfigT } from "./readConfig";

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

export const validateConfig = (config: ConfigT) => {
    logger.info("Validating configuration...");

    for (const property of requiredProperties) {
        if (!(property in config)) {
            logger.error(`Missing required configuration for ${property}.`);
            process.exit();
        }
    }

    if (config.firstname.length !== config.lastname.length) {
        logger.error(
            "Same amount of firstnames & lastnames has to be provided"
        );
        process.exit();
    }

    if (!config.passport && !config.id) {
        logger.error(
            "Configuration options passport & id can't both be set to false"
        );
        process.exit();
    }

    logger.success("Configuration is valid");
};
