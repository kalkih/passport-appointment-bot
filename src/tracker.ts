import { logger } from "./logger";

const MIN_INTERVAL = 30 * 1000;

export const tracker = {
    checks: 0,
    start: new Date(),
    lastChecks: 0,
    slow: false,
    init(interval: number) {
        setInterval(() => {
            if (this.checks === 0 || typeof this.start === "undefined") {
                return;
            }

            if (this.lastChecks === this.checks) {
                if (!this.slow) {
                    logger.warn("Booking system is running slow...");
                    this.slow = true;
                }

                return;
            }

            const secondsRunning = (Date.now() - this.start.getTime()) / 1000;
            const number_ = (this.checks / secondsRunning).toLocaleString(
                "sv-SE",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                }
            );

            logger.info(`CHECKING ${number_} WEEKS / SECOND`);
            this.lastChecks = this.checks;
            this.slow = false;
        }, Math.max(interval * 15, MIN_INTERVAL));
    },
    track() {
        if (this.checks === 0) {
            this.start = new Date();
        }

        this.checks += 1;
    },
};
