import { createLogger } from "@lvksh/logger";
import chalk from "chalk";

export const logger = createLogger(
    {
        error: chalk.red`[ERROR]`,
        warn: chalk.yellow`[WARN]`,
        success: chalk.greenBright`[SUCCESS]`,
        info: chalk.blue`[INFO]`,
        verbose: chalk.blue`[VERBOSE]`,
        debug: chalk.magentaBright`[DEBUG]`,
    },
    {
        padding: "APPEND",
    },

    console.log
);
