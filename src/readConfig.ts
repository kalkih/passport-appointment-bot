import fs from "node:fs";
import path from "node:path";

import { Location } from "./locations";
import { logger } from "./logger";

export type ConfigT = {
    region: Location;
    locations: Record<string, number>;
    max_date: string;
    email: string;
    phone: string;
    firstname: string[];
    lastname: string[];
    passport: boolean;
    id: boolean;
    sessions: number;
    throttle: number;
    min_date: undefined | Date;
};

export const readConfig = () => {
    try {
        const configPath = (process as any).pkg
            ? path.join(path.dirname(process.execPath), "./config.json")
            : path.join(process.cwd(), "./config.json");

        const config = JSON.parse(fs.readFileSync(configPath).toString());

        if (typeof config.firstname === "string") {
            config.firstname = [config.firstname];
        }

        if (typeof config.lastname === "string") {
            config.lastname = [config.lastname];
        }

        return config as ConfigT;
    } catch (error) {
        logger.error("Missing or invalid configuration file", error as any);
        process.exit();
    }
};
