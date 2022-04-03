const express = require("express");
const app = express();
const CaptchaService = require("./services/captchaService");
const logger = require("./logger");
const cors = require("cors");

const PORT = process.env.PORT || 6969;

app.use(express.json());
app.use(cors());

app.post("/", (req, res) => {
  const { token, sessionId } = req.body;
  CaptchaService.addVerifiedToken(token);
  CaptchaService.sessionCompleted(sessionId);
  res.sendStatus(200);
});

const server = app.listen(PORT, () => {
  logger.success(`Started captcha webserver on port ${PORT}`);
});

function handleShutdownGracefully() {
  logger.info("Closing webserver gracefully...");

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", handleShutdownGracefully);
process.on("SIGTERM", handleShutdownGracefully);
process.on("SIGHUP", handleShutdownGracefully);
