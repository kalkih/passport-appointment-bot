import express from "express";
import cors from "cors";
import path from "path";
import { logger } from "./logger";
import { bankIdState } from "./store/bankIdStore";
import { readConfig } from "./configuration";
const { ip } = readConfig();
const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/identify", (_, res) => {
  res.json(bankIdState);
});

const createServer = () => {
  const server = app
    .listen(80, async () => {
      logger.info(
        `Webserver listening on port http://${ip || "localhost"}:${
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (server.address() as any).port
        }`
      );
    })
    .on("error", (error) => {
      logger.error("Failed starting webserver", error);
      process.exit();
    });
  return server;
};

const server = createServer();

function handleShutdownGracefully() {
  logger.info("Closing webserver gracefully...");

  server.close(() => {
    logger.info("Closed webserver gracefully");
    process.exit(0);
  });
}

process.on("SIGINT", handleShutdownGracefully);
process.on("SIGTERM", handleShutdownGracefully);
process.on("SIGHUP", handleShutdownGracefully);

export { server };
