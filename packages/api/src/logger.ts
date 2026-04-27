import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const customFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` \n  ${JSON.stringify(metadata, null, 2)}`;
  }
  if (stack) {
    msg += `\n  ${stack}`;
  }
  return msg;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  defaultMeta: { service: "labas-api" },
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        errors({ stack: true }),
        customFormat,
      ),
    }),
  ],
});
