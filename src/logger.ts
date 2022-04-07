import winston, { transports, createLogger, format } from "winston";
import path from "path";

const getConfigPath = (): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((process as any).pkg) {
    return path.dirname(process.execPath);
  }
  return process.cwd();
};

const levels = {
  error: 0,
  warn: 1,
  success: 2,
  info: 3,
  verbose: 4,
  debug: 5,
};

const colors = {
  error: "red",
  warn: "yellow",
  success: "white bold",
  info: "green",
  verbose: "blue",
  debug: "magenta",
};

interface Logger extends winston.Logger {
  success: (message: string) => void;
}

export const logger = createLogger({
  levels,
  transports: [
    new transports.Console({
      level: "verbose",
      format: format.combine(
        format.errors({ stack: true }),
        format.colorize({ all: true, colors }),
        format.timestamp({ format: "HH:mm:ss" }),
        format.printf(
          (info) => `[${info.timestamp}] [${info.level}]\t${info.message}`
        )
      ),
    }),
    new transports.File({
      dirname: getConfigPath(),
      filename: ".error.log",
      level: "error",
      format: format.combine(format.timestamp(), format.json(), format.splat()),
    }),
  ],
}) as Logger;
