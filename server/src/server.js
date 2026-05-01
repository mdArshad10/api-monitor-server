import { createServer } from "http";
import { app } from "./app.js";
import { logger } from "./shared/config/logger.js";
import config from "./shared/config/index.js";
import mongodb from "./shared/config/mongodb.js";
import postgres from "./shared/config/postgres.js";

async function initialConnection() {
  try {
    logger.info("Initializing database connections...");
    await mongodb.connect();
    await postgres.connection();

    logger.info("All connections established successfully");
  } catch (error) {
    logger.error("Failed to initialize connections:", error);
    throw error;
  }
}

async function main() {
  try {
    await initialConnection();
    const port = config.port;
    const server = createServer(app);
    server.listen(port, () => {
      logger.info(`there server is running at port ${port}`);
      logger.info(`Environment ${config.node_env}`);
      logger.info(`API Available at : http://localhost:${config.port}`);
    });

    const gracefulShutDown = async (signal) => {
      logger.info(`${signal} received, shut down gracefully..`);

      server.close(async () => {
        try {
          await mongodb.disconnect();
          await postgres.close();
          logger.info("All connection closed, existing process");
          process.exit(0);
        } catch (error) {
          logger.error("Error during the gracefully shut down", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error("forced shutdown");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", () => gracefulShutDown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutDown("SIGTERM"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      gracefulShutDown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutDown("unhandledRejection");
    });
  } catch (error) {
    console.log("Error in running on the server");
    throw error;
  }
}

void main();
