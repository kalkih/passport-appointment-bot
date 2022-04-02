const express = require("express");
const app = express();
const CaptchaService = require("./captchaService");
const logger = require("./logger");
const cors = require("cors");

const PORT = process.env.PORT || 6969;

app.use(express.json());
app.use(cors());

app.post("/", (req, res) => {
  const token = req.body.token;
  CaptchaService.addVerifiedToken(token);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  logger.success(`Started captcha webserver on port ${PORT}`);
});
