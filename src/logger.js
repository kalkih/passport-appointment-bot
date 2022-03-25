const { transports, createLogger, format } = require("winston");
const path = require("path");

const getConfigPath = () => {
  if (process.pkg) {
    return (configPath = path.dirname(process.execPath));
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

const logger = createLogger({
  levels,
  transports: [
    new transports.Console({
      level: "verbose",
      colorize: true,
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
      handleExceptions: true,
    }),
  ],
});

module.exports = logger;
