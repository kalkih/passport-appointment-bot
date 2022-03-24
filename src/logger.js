const { transports, createLogger, format } = require("winston");

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
  level: "verbose",
  levels,
  transports: [
    new transports.Console({
      colorize: true,
      format: format.combine(
        format.colorize({ all: true, colors }),
        format.timestamp({ format: "HH:mm:ss" }),
        format.printf(
          (info) => `[${info.timestamp}] [${info.level}]\t${info.message}`
        )
      ),
    }),
  ],
});

module.exports = logger;
