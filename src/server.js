const express = require("express");
const app = express();
const path = require("path");
const CaptchaService = require("./captchaService");
const logger = require("./logger");

const PORT = process.env.PORT || 6969;

app.use(express.json());

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.post("/", (req, res) => {
  const token = req.body.token;
  CaptchaService.addVerifiedToken(token);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  logger.success(`Started captcha webserver on port ${PORT}`);
});
