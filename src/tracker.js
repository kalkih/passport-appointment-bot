const logger = require("./logger");

const INTERVAL = 15;

const tracker = {
  checks: 0,
  start: undefined,
  init() {
    this.start = new Date();
    setInterval(() => {
      const secondsRunning = (new Date() - this.start) / 1000;
      const num = (this.checks / secondsRunning).toLocaleString("sv-SE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      logger.debug(`CHECKING ${num} WEEKS/s`);
    }, INTERVAL * 1000);
  },
  track() {
    this.checks += 1;
  },
};

module.exports = tracker;
