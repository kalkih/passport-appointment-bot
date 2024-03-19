import fs from "fs";

import { logger } from "../logger";
import { getPath } from "../utils";

interface SessionData {
  cookie: string;
  hash: string;
}

export const saveSession = (hash: string, cookie: string) => {
  try {
    const configPath = getPath("./.session.json");

    if (configPath) {
      fs.writeFileSync(configPath, JSON.stringify({ cookie, hash }), "utf-8");
    }
  } catch (error) {
    logger.verbose(`Failed to save session: ${error}`);
  }
};

export const getSession = (hash: string) => {
  try {
    const sessionPath = getPath("./.session.json");
    const data: SessionData = JSON.parse(
      fs.readFileSync(sessionPath).toString()
    );

    if (data.hash !== hash) {
      logger.verbose(
        "Session hash mismatch, ignoring recovering from last session"
      );
      return;
    }

    return data.cookie;
  } catch (error) {
    // quiet, there might be no session...
  }
};
