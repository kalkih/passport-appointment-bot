import express from "express";
import cors from "cors";
import path from "path";
import { logger } from "./logger";
const app = express();

import { captchaService } from "./services/captchaService";

app.use(express.json());
app.use(cors());

app.post("/captcha", (req, res) => {
  const { token, sessionId } = req.body;
  captchaService.addVerifiedToken(token);
  captchaService.sessionCompleted(sessionId);
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
      logger.debug(`Started captcha webserver on port ${serverPort()}`);
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

const server = createServer();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serverPort = () => (server.address() as any).port;
export { server, serverPort };
