import yargs from "yargs";
import { hideBin } from "yargs/helpers";
const { argv } = yargs(hideBin(process.argv));

import { Locations } from "./locations";
import { logger } from "./logger";
import { readConfig } from "./readConfig";
// eslint-disable-next-line unused-imports/no-unused-imports
import { server } from "./server";
import { tracker } from "./tracker";
import { validateConfig } from "./validateConfig";

const config = readConfig();

import { BookingService } from "./services/bookingService";
const maxDate = getMaxDate();
let pendingBookingPromise: undefined | Promise<void>;

(async () => {
    validateConfig(config);

    logger.info("Validating configured region...");
    const region = Locations[config.region];

    if (!region) {
        logger.error(`Region not supported: ${config.region}, exiting...`);
        process.exit();
    }

    logger.success(`Valid region ${config.region}`);

    logger.info("Validating configured locations...");
    const validLocations = [];

    // Object.keys
    for (const location of config.locations as any) {
        if (region.locations) {
            validLocations.push({
                name: location,
                id: region.locations[location],
            });
        } else {
            logger.warn(`Location not found: ${location}, skipping...`);
        }
    }

    if (validLocations.length === 0) {
        logger.error("No valid locations, exiting...");
        process.exit();
    }

    logger.success(
        `Valid locations ${validLocations.map(({ name }) => name).join(", ")}`
    );

    tracker.init((config.throttle * 1000) / config.sessions);

    const numberOfSessions = Math.min(config.sessions ?? 1, 6);
    const startDate = getStartOfWeekDate(config.min_date || new Date());

    for (let index = 0; index < numberOfSessions; index++) {
        const sessionLocationOrder =
            numberOfSessions === 1
                ? validLocations
                : shuffleArray(validLocations);
        const sessionStartDate =
            numberOfSessions === 1
                ? startDate
                : getStartOfWeekDate(randomDate(startDate, new Date(maxDate)));

        await init(sessionLocationOrder, sessionStartDate);
    }
})();

async function init(locationQueue: number[], date: Date) {
    const numberOfPeople = config.firstname.length;
    const bookingService = new BookingService(
        config.region,
        numberOfPeople,
        (argv as any).mock
    );

    await bookingService.init();

    checkAvailableSlotsForLocation(bookingService, [...locationQueue], date);
}

async function checkAvailableSlotsForLocation(
    bookingService: BookingService,
    locationQueue: any,
    startDate: Date
) {
    let dateToCheck = startDate;
    const { name, id } = locationQueue.at(0);

    logger.debug(`Switching to location: ${name}`);

    while (dateToCheck.getTime() <= maxDate.getTime()) {
        await pendingBookingPromise;
        logger.debug(`Loading ${name} week of ${getShortDate(dateToCheck)}`);
        const [freeSlots, bookedSlots] =
            (await bookingService.getFreeSlotsForWeek(id, dateToCheck)) as any;

        if (freeSlots.length > 0) {
            if (!pendingBookingPromise) {
                logger.success(
                    `${name} (${getShortDate(dateToCheck)}) ${
                        freeSlots.length
                    } free time slots`
                );
                pendingBookingPromise = handleBooking(
                    bookingService,
                    freeSlots,
                    id
                );
                await pendingBookingPromise;
                pendingBookingPromise = undefined;
            }
        } else {
            logger.verbose(
                `${name} (${getShortDate(dateToCheck)}) 0 free - ${
                    bookedSlots.length
                } reserved`
            );
            dateToCheck = addDays(dateToCheck);
        }

        tracker.track();

        if (config.throttle) {
            await new Promise((resolve) =>
                setTimeout(resolve, config.throttle * 1000)
            );
        }
    }
    logger.debug("Max date reached, checking next location...");

    locationQueue.push(locationQueue.shift());
    checkAvailableSlotsForLocation(
        bookingService,
        locationQueue,
        getStartOfWeekDate(config.min_date || new Date())
    );
}

async function handleBooking(
    bookingService: BookingService,
    freeSlots: any,
    locationId: string
) {
    const { parent } = freeSlots.at(0);
    const serviceTypeId = parent.attribs["data-servicetypeid"];
    const timeslot = parent.attribs["data-fromdatetime"];

    const booking = await bookingService.bookSlot(
        serviceTypeId,
        timeslot,
        locationId,
        config
    );

    if (booking) {
        logger.success("BOOKING SUCCESSFUL");
        logger.success(`Booking number: \t ${booking.bookingNumber}`);
        logger.success(`Time: \t\t\t ${booking.slot}`);
        logger.success(`Location: \t\t ${booking.expedition}`);
        logger.success(`Email: \t\t\t ${config.email}`);
        logger.success(`Phone: \t\t\t ${config.phone}`);
        process.exit();
    } else {
        logger.error(`Failed booking slot ${timeslot}`);

        if (await bookingService.recover()) {
            logger.info("Recovered booking session");
        } else {
            logger.error("Could not recover booking session...");
            process.exit();
        }
    }
}

function shuffleArray(array: any[]) {
    return array
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
}

function randomDate(start: Date, end: Date) {
    const date = new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );

    date.setUTCHours(12, 0, 0, 0);

    return date;
}

function getMaxDate() {
    const date = new Date(config.max_date);

    date.setUTCHours(12, 0, 0, 0);

    return date;
}

function getStartOfWeekDate(inDate: string | number | Date) {
    const date = new Date(inDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day == 0 ? -6 : 1);

    date.setDate(diff);

    return date;
}

const addDays = (inDate: string | number | Date) => {
    const date = new Date(inDate);

    date.setDate(date.getDate() + 7);

    return date;
};

export const getShortDate = (date: Date) => {
    return date.toISOString().split("T").at(0);
};
