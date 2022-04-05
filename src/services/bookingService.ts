/* eslint-disable unicorn/error-message */
import cheerio, { CheerioAPI } from "cheerio";
import fetchCookie from "fetch-cookie";
import nodeFetch from "node-fetch";

import { getShortDate } from "../index";
import { Location, Locations } from "../locations";
import { logger } from "../logger";
import { CaptchaService } from "./captchaService";

const TITLE_SELECTOR = ".header h1";
const VALIDATION_ERROR_SELECTOR = ".validation-summary-errors";
const EXISTING_BOOKING_ERROR_TEXT =
    "Det går endast att göra en bokning per e-postadress/telefonnummer";

const generateBaseUrl = (region: string) =>
    `https://bokapass.nemoq.se/Booking/Booking/Index/${replaceSpecialChars(
        region.toLowerCase()
    )}`;
const generatePostUrl = (region: string) =>
    `https://bokapass.nemoq.se/Booking/Booking/Next/${replaceSpecialChars(
        region.toLowerCase()
    )}`;
const generatePreviousUrl = (region: string) =>
    `https://bokapass.nemoq.se/Booking/Booking/Previous/${replaceSpecialChars(
        region.toLowerCase()
    )}`;

type CheerioError = Error & { page: CheerioAPI };

const confirm_booking = "Bekräfta bokning";

export class BookingService {
    fetch;

    constructor(
        public region: Location,
        public numberOfPeople = 1,
        public mock = false
    ) {
        this.region = region;
        this.mock = mock;
        this.fetch = (url: string, options: any = {}) => {
            options.headers = {
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4844.52 Safari/537.36",
                ...options.headers,
            };

            return fetchCookie(nodeFetch)(url, options);
        };

        this.numberOfPeople = numberOfPeople;
    }

    get baseUrl() {
        return generateBaseUrl(this.region);
    }

    get postUrl() {
        return generatePostUrl(this.region);
    }

    async init() {
        logger.info("Starting booking session...");
        await this.fetch(this.baseUrl);

        await this.postRequest({
            FormId: 1,
            ServiceGroupId: Locations[this.region].id,
            StartNextButton: "Boka ny tid",
        });
        logger.success(
            `Started booking session for ${this.numberOfPeople} person(s)`
        );

        const verifiedToken = await CaptchaService.getNewVerifiedToken();

        logger.debug("Accepting booking terms...");
        await this.postRequest({
            AgreementText: "123",
            AcceptInformationStorage: true,
            NumberOfPeople: this.numberOfPeople,
            "mtcaptcha-verifiedtoken": verifiedToken,
            Next: "Nästa",
        });
        logger.success("Accepted booking terms");

        logger.debug("Setting residency...");
        await this.postRequest(
            // eslint-disable-next-line unicorn/no-new-array
            [...new Array(this.numberOfPeople)]
                .map((_, index) => ({
                    [`ServiceCategoryCustomers[${index}].CustomerIndex`]: index,
                    [`ServiceCategoryCustomers[${index}].ServiceCategoryId`]: 2,
                }))
                // eslint-disable-next-line unicorn/no-array-reduce
                .reduce(
                    (previous, current) => ({
                        ...previous,
                        ...current,
                    }),
                    { Next: "Nästa" }
                )
        );
        logger.success("Residency set");
    }

    // Can fix type later
    async postRequest(body: any) {
        try {
            const response = await this.fetch(this.postUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams(body),
            });

            if (response.ok) {
                return response;
            }

            throw new Error("Something went wrong.");
        } catch (error) {
            logger.error((error as Error).message);
            this.postRequest(body);
        }
    }

    async getFreeSlotsForWeek(locationId: number, date: Date) {
        try {
            const response = await this.postRequest({
                FormId: 1,
                NumberOfPeople: this.numberOfPeople,
                RegionId: 0,
                SectionId: locationId,
                NQServiceTypeId: 1,
                FromDateString: getShortDate(date),
                SearchTimeHour: 12,
            });

            if (!response) {
                logger.error("Did not get response");

                return;
            }

            const $ = cheerio.load(await response.text());

            logger.debug(`Checking week of: ${getShortDate(date)}`);
            const freeSlots = $(".timecell script");
            const bookedSlots = $(".timecell label");

            return [freeSlots, bookedSlots];
        } catch (error) {
            logger.error((error as Error).message);
            logger.verbose(`Failed checking week of: ${getShortDate(date)}`);
        }

        return [[], []];
    }

    async recover() {
        let recovered = false;

        for (let index = 0; index < 6; index++) {
            logger.warn(`Trying to recover booking session... ${index + 1}`);
            const response = await this.fetch(
                `${generatePreviousUrl(this.region)}?id=1`
            );
            const $ = cheerio.load(await response.text());

            const title = $(TITLE_SELECTOR).text();

            if (title === "Välj tid") {
                recovered = true;
                break;
            }
        }

        return recovered;
    }

    // Config type can also be fixed
    async bookSlot(
        serviceTypeId: number,
        timeslot: string,
        location: string,
        config: any
    ) {
        try {
            await this.selectSlot(serviceTypeId, timeslot, location);
            await this.providePersonalDetails(
                config.firstname,
                config.lastname,
                config.passport,
                config.id
            );
            await this.confirmSlot();
            await this.provideContactDetails(config.email, config.phone);

            return await this.finalizeBooking();
        } catch (error) {
            logger.error("Something went wrong when trying to book timeslot");

            if ((error as CheerioError).page) {
                const $ = (error as CheerioError).page;
                const html = $.html();
                const title = $(TITLE_SELECTOR).text();
                const errors = $(VALIDATION_ERROR_SELECTOR).text();

                logger.error(errors, { title, errors, html });
            }

            logger.error((error as CheerioError).stack);
        }
    }

    async selectSlot(
        serviceTypeId: number,
        timeslot: string,
        location: string
    ) {
        logger.verbose(`Selecting timeslot (${timeslot})`);
        const response = await this.postRequest({
            FormId: 2,
            ReservedServiceTypeId: serviceTypeId,
            ReservedSectionId: location,
            NQServiceTypeId: 1,
            SectionId: location,
            FromDateString: getShortDate(new Date(timeslot)),
            NumberOfPeople: this.numberOfPeople,
            SearchTimeHour: 12,
            RegionId: 0,
            Next: "Nästa",
            ReservedDateTime: timeslot,
        });
        const $ = cheerio.load(await response!.text());
        const title = $(TITLE_SELECTOR).text();

        if (title !== "Uppgifter till bokningen") {
            const error = new Error() as CheerioError;

            error.page = $;
            throw error;
        }
    }

    async providePersonalDetails(
        firstname: string[],
        lastname: string,
        passport: string,
        idCard: string
    ) {
        const verifiedToken = await CaptchaService.getNewVerifiedToken();

        logger.verbose("Providing personal details");
        const customerData = firstname.map((_, index) => ({
            [`Customers[${index}].BookingCustomerId`]: 0,
            [`Customers[${index}].BookingFieldValues[0].Value`]:
                firstname[index],
            [`Customers[${index}].BookingFieldValues[0].BookingFieldId`]: 5,
            [`Customers[${index}].BookingFieldValues[0].BookingFieldTextName`]:
                "BF_2_FÖRNAMN",
            [`Customers[${index}].BookingFieldValues[0].FieldTypeId`]: 1,
            [`Customers[${index}].BookingFieldValues[1].Value`]:
                lastname[index],
            [`Customers[${index}].BookingFieldValues[1].BookingFieldId`]: 6,
            [`Customers[${index}].BookingFieldValues[1].BookingFieldTextName`]:
                "BF_2_EFTERNAMN",
            [`Customers[${index}].BookingFieldValues[1].FieldTypeId`]: 1,
            [`Customers[${index}].Services[0].IsSelected`]: passport,
            [`Customers[${index}].Services[0].ServiceId`]:
                Locations[this.region].passportServiceId,
            [`Customers[${index}].Services[0].ServiceTextName`]: `SERVICE_2_PASSANSÖKAN${this.region.toUpperCase()}`,
            [`Customers[${index}].Services[1].IsSelected`]: idCard,
            [`Customers[${index}].Services[1].ServiceId`]:
                Locations[this.region].cardServiceId,
            [`Customers[${index}].Services[1].ServiceTextName`]: `SERVICE_2_ID-KORT${this.region.toUpperCase()}`,
        }));
        const response = await this.postRequest(
            Object.assign(
                {},
                { Next: "Nästa", "mtcaptcha-verifiedtoken": verifiedToken },
                ...customerData
            )
        );
        const $ = cheerio.load(await response!.text());
        const title = $(TITLE_SELECTOR).text();

        if (title !== "Viktig information") {
            const error = new Error() as CheerioError;

            error.page = $;
            throw error;
        }
    }

    async confirmSlot() {
        logger.verbose("Confirming selected slot");
        const response = await this.postRequest({
            Next: "Nästa",
        });
        const $ = cheerio.load(await response!.text());
        const title = $(TITLE_SELECTOR).text();

        if (title !== "Kontaktuppgifter") {
            const error = new Error() as CheerioError;

            error.page = $;
            throw error;
        }
    }

    async provideContactDetails(email: string, phone: string) {
        logger.verbose("Providing contact details");
        const response = await this.postRequest({
            EmailAddress: email,
            ConfirmEmailAddress: email,
            PhoneNumber: phone,
            ConfirmPhoneNumber: phone,
            "SelectedContacts[0].IsSelected": true,
            "SelectedContacts[0].MessageTypeId": 2,
            "SelectedContacts[0].MessageKindId": 1,
            "SelectedContacts[0].TextName": "MESSAGETYPE_EMAIL",
            "SelectedContacts[1].IsSelected": false,
            "SelectedContacts[1].MessageTypeId": 1,
            "SelectedContacts[1].MessageKindId": 1,
            "SelectedContacts[1].TextName": "MESSAGETYPE_SMS",
            "SelectedContacts[2].IsSelected": true,
            "SelectedContacts[2].MessageTypeId": 2,
            "SelectedContacts[2].MessageKindId": 2,
            "SelectedContacts[2].TextName": "MESSAGETYPE_EMAIL",
            "SelectedContacts[3].IsSelected": false,
            "SelectedContacts[3].MessageTypeId": 1,
            "SelectedContacts[3].MessageKindId": 2,
            "SelectedContacts[3].TextName": "MESSAGETYPE_SMS",
            ReminderOption: 24,
            Next: "Nästa",
        });
        const $ = cheerio.load(await response!.text());
        const title = $(TITLE_SELECTOR).text();

        if (title !== confirm_booking) {
            const error = new Error() as CheerioError;

            error.page = $;
            throw error;
        }
    }

    async finalizeBooking() {
        if (this.mock) {
            logger.verbose("Mocking booking...");

            return {
                bookingNumber: "123456789",
                slot: "2000-01-01 12:00:00",
                expedition: "Mock location",
            };
        }

        logger.verbose("Confirming booking...");
        const response = await this.postRequest({
            Next: confirm_booking,
            "PersonViewModel.Customers[0].Services[0].IsSelected": false,
            "PersonViewModel.Customers[0].Services[1].IsSelected": false,
            "ContactViewModel.SelectedContacts[0].IsSelected": false,
            "ContactViewModel.SelectedContacts[1].IsSelected": false,
            "ContactViewModel.SelectedContacts[2].IsSelected": false,
            "ContactViewModel.SelectedContacts[3].IsSelected": false,
        });
        const $ = cheerio.load(await response!.text());
        const title = $(TITLE_SELECTOR).text();

        if (title === confirm_booking) {
            const validationErrorText = $(VALIDATION_ERROR_SELECTOR).text();

            if (validationErrorText.includes(EXISTING_BOOKING_ERROR_TEXT)) {
                logger.error(
                    "An appointment with the same email and/or phone number already exists"
                );
                process.exit();
            }
        }

        if (title !== "Din bokning är nu klar") {
            const error = new Error() as CheerioError;

            error.page = $;
            throw error;
        }

        const control_class = ".control-freetext";
        const bookingNumber = $(control_class).eq(0).text();
        const slot = $(control_class).eq(1).text();
        const expedition = $(control_class).eq(3).text();

        return {
            bookingNumber,
            slot,
            expedition,
        };
    }
}

const replaceSpecialChars = (inputValue: string) =>
    inputValue
        .replace(/å/g, "a")
        .replace(/Å/g, "A")
        .replace(/ä/g, "a")
        .replace(/Ä/g, "A")
        .replace(/ö/g, "o")
        .replace(/Ö/g, "O");
