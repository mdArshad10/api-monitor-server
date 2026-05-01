import { logger } from "./logger";
import amqplib from "amqplib";

class RabbitMQConnection {
  constructor() {
    this.channel = null;
    this.connection = null;
    this.isConnecting = false;
  }

  async connect() {
    try {
      if (this.channel) {
        return this.channel;
      }
      if (this.connection) {
        await new Promise((resolve, reject) => {
          const checkInterval = setInterval(() => {
            if (!this.isConnecting) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
        return this.channel;
      }
      this.isConnecting = true;
      this.connection = await amqplib.connect(config.rabbitmq_url);
      this.channel = await this.connection.createChannel();

      const dlqName = `${config.rabbitmq.queueName}.dlq`;

      // Create Dead Letter Queue
      await this.channel.assertQueue(dlqName, { durable: true });

      await this.channel.assertQueue(config.rabbitmq.queueName, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": "",
          "x-dead-letter-routing-key": dlqName,
        },
      });

      this.connection.on("error", (error) => {
        logger.error("RabbitMQ connection error:", error);
        this.channel = null;
        this.connection = null;
      });

      this.connection.on("close", () => {
        logger.error("RabbitMQ connection closed");
        this.channel = null;
        this.connection = null;
      });

      logger.info("RabbitMQ connection established");
      return this.channel;
    } catch (error) {
      logger.error("Error in connecting to RabbitMQ:", error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  getStatus() {
    if (!this.channel || !this.connection) return "disconnected";
    if (this.connection.closing) return "closing";
    return "connected";
  }

  getChannel() {
    return this.channel;
  }
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.isConnecting) {
        await this.connection.close();
        this.connection = null;
      }
      logger.info("RabbitMQ connection closed");
    } catch (error) {
      logger.error("Error in closing RabbitMQ connection:", error);
    }
  }
}

export default new RabbitMQConnection();
