import { logger } from "../logger";
import { isValidRegion, LOCATIONS, Locations } from "../locations";
import { Config, ConfirmationType, Location } from "./types";

const REQUIRED_PROPERTIES = [
  "region",
  "locations",
  "max_date",
  "email",
  "phone",
  "personnummer",
  "firstname",
  "lastname",
  "passport",
  "id",
  "confirmation",
];

export default (config: Config) => {
  logger.info("Validating configuration...");

  const region = validateRegion(config.region);
  const locations = validateLocations(region.locations, config.locations);
  REQUIRED_PROPERTIES.forEach((prop) => {
    if (!(prop in config)) {
      logger.error(`Missing required configuration for ${prop}.`);
      process.exit();
    }
  });

  if (
    ![config.firstname, config.lastname].every(
      (arr) => arr.length === config.personnummer.length
    )
  ) {
    logger.error(
      "Same number of 'personnummer', 'firstnames' & 'lastnames' has to be provided"
    );
    process.exit();
  }

  if (
    !config.confirmation.some(
      (option) =>
        option &&
        [ConfirmationType.EMAIL, ConfirmationType.SMS].includes(option)
    )
  ) {
    logger.error(
      "Configuration option 'confirmation' must be set to 'email' and/or 'sms'"
    );
    process.exit();
  }

  if (!config.passport && !config.id) {
    logger.error(
      "Configuration options 'passport' & 'id' can't both be set to false"
    );
    process.exit();
  }

  logger.success("Configuration is valid");
  return locations;
};

function validateRegion(region: string) {
  logger.debug("Validating configured region...");
  if (!isValidRegion(region)) {
    logger.error(`Region not supported: ${region}, exiting...`);
    process.exit();
  }
  logger.success(`Valid region: ${region}`);
  return LOCATIONS[region];
}

function validateLocations(validLocations: Locations, locations: string[]) {
  logger.debug("Validating configured locations...");
  const confirmedLocations: Location[] = [];
  for (const location of locations) {
    if (location in validLocations) {
      confirmedLocations.push({ name: location, id: validLocations[location] });
    } else {
      logger.warn(`Location not found: ${location}, skipping...`);
    }
  }

  if (confirmedLocations.length === 0) {
    logger.error("No valid locations, exiting...");
    process.exit();
  }

  logger.success(
    `Valid locations: ${confirmedLocations.map(({ name }) => name).join(", ")}`
  );
  return confirmedLocations;
}
