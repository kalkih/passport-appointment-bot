import cors from "cors";
import express from "express";
import path from "node:path";

import { logger } from "./logger";
const app = express();

export const server = createServer();

import { CaptchaService } from "./services/captchaService";

app.use(express.json());
app.use(cors());

app.post("/", (request, response) => {
    const { token, sessionId } = request.body;

    CaptchaService.addVerifiedToken(token);
    CaptchaService.sessionCompleted(sessionId);
    response.sendStatus(200);
});

app.get("/sound.wav", (_, response) => {
    response.sendFile(path.join(__dirname, "../assets/sound.wav"));
});

function createServer() {
    const server = app
        .listen(0, () => {
            logger.verbose(
                `Started captcha webserver on port ${
                    (server.address() as any).port
                }`
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
