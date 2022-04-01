const open = require("open");
const logger = require("./logger");

const PORT = process.env.PORT || 6969;

class CaptchaService {
  verifiedToken = [];

  async openCaptcha() {
    await open(`http:localhost:${PORT}`);
  }

  async getNewVerifiedToken() {
    if (this.verifiedToken.length > 0) {
      return this.verifiedToken.shift();
    }

    logger.warn("Manual captcha verification required");
    logger.verbose("Opening captcha page http://localhost:6969");
    await this.openCaptcha();

    logger.info("Waiting for captcha input...");
    const token = await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.verifiedToken.length > 0) {
          clearInterval(interval);
          logger.verbose("Got new verified captcha token");
          return resolve(this.verifiedToken.shift());
        }
      }, 500);
    });

    return token;
  }

  addVerifiedToken(token) {
    logger.debug(
      "Added new verified token, currently stored: " + this.verifiedToken.length
    );
    this.verifiedToken.push(token);
  }
}

module.exports = new CaptchaService();
