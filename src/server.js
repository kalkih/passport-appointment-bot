const express = require("express");
const cors = require("cors");
const path = require("path");
const logger = require("./logger");
const app = express();
const server = createServer();

module.exports = server;

const CaptchaService = require("./services/captchaService");

app.use(express.json());
app.use(cors());

app.post("/captcha", (req, res) => {
  const { token, sessionId } = req.body;
  CaptchaService.addVerifiedToken(token);
  CaptchaService.sessionCompleted(sessionId);
  res.sendStatus(200);
});

app.get("/captcha/:sessionId", (_, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/sound.wav", (_, res) => {
  res.sendFile(path.join(__dirname, "../assets/sound.wav"));
});

function createServer() {
  const server = app
    .listen(0, () => {
      logger.debug(
        `Started captcha webserver on port ${server.address().port}`
      );
    })
    .on("error", (error) => {
      logger.error("Failed starting webserver", error);
      process.exit();
    });
  return server;
}

function handleShutdownGracefully() {
  logger.info("Closing webserver gracefully...");

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", handleShutdownGracefully);
process.on("SIGTERM", handleShutdownGracefully);
process.on("SIGHUP", handleShutdownGracefully);
