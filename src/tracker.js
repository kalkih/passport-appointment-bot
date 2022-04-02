const logger = require("./logger");

const INTERVAL = 15;

const tracker = {
  checks: 0,
  start: undefined,
  lastChecks: undefined,
  slow: false,
  init() {
    setInterval(() => {
      if (this.checks === 0 || typeof this.start === "undefined") {
        return;
      }

      this.lastChecks = this.checks;
      if (this.lastChecks === this.checks) {
        if (!this.slow) {
          logger.warn("Booking system is running slow...");
          this.slow = true;
        }
        return;
      }

      const secondsRunning = (new Date() - this.start) / 1000;
      const num = (this.checks / secondsRunning).toLocaleString("sv-SE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      logger.info(`CHECKING ${num} WEEKS / SECOND`);
      this.lastChecks = this.checks;
      this.slow = false;
    }, INTERVAL * 1500);
  },
  track() {
    if (this.checks === 0) {
      this.start = new Date();
    }
    this.checks += 1;
  },
};

module.exports = tracker;
