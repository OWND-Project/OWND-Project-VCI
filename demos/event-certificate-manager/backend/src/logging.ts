import winston, { format, transports } from "winston";

const { combine, timestamp, printf, splat } = format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// https://github.com/winstonjs/winston?tab=readme-ov-file#logging-levels
const levels: Record<string, string> = {
  local: "debug",
  dev: "info",
  prod: "info",
};
const getLogger = () => {
  const env = process.env.NODE_ENV || "prod";
  // https://github.com/winstonjs/winston
  return winston.createLogger({
    level: levels[env],
    format: combine(splat(), timestamp(), myFormat),
    // defaultMeta: { service: "user-service" },
    transports: [
      // https://github.com/winstonjs/winston/blob/master/docs/transports.md#console-transport
      //
      // - Write all logs with importance level of `error` or less to `error.log`
      // - Write all logs with importance level of `info` or less to `combined.log`
      //
      // new winston.transports.File({ filename: "error.log", level: "error" }),
      // new winston.transports.File({ filename: "combined.log" }),
      new transports.Console(),
    ],
  });
};

export default getLogger;
