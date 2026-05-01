import config from "./index.js";
import winston from "winston";

const logger = winston.createLogger({
  level: config.node_env == "development" ? ["info"] : ["error"],
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "api-monitoring" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

if (config.node_env !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple(),
      ),
    }),
  );
}

export { logger };
