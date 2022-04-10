import express from "express";
import cors from "cors";
import path from "path";
import { logger } from "./logger";
import { captchaService } from "./services/captchaService";
import { websocket } from "./websocket";

const app = express();

app.use(express.json());
app.use(cors());
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "../views"));

app.post("/captcha", (req, res) => {
  const { token, sessionId } = req.body;
  captchaService.addVerifiedToken(token);
  captchaService.sessionCompleted(sessionId);
  res.sendStatus(200);
});

app.get("/captcha/:sessionId", (_, res) => {
  // res.sendFile(path.join(__dirname, "../public/index.html"));
  res.render("index");
});

app.get("/sound.wav", (_, res) => {
  res.sendFile(path.join(__dirname, "../assets/sound.wav"));
});

function createServer() {
  const server = app
    .listen(3333, () => {
      logger.debug(`Started captcha webserver on port ${serverPort()}`);
    })
    .on("error", (error) => {
      logger.error("Failed starting webserver", error);
      process.exit();
    });

  const ws = websocket(server);

  setTimeout(() => {
    console.log("notice");
    ws.clients.forEach((client) => {
      console.log(client);
      client.send(JSON.stringify({ message: "hello world" }));
    });
  }, 5000);

  process.on("message", (message) => {
    console.log(message);
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
