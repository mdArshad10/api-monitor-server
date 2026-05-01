import { z } from "zod";

const messageSchema = z.object({
  type: z.enum([EVENT_TYPES.API_HIT]),
  data: z.record(z.string(), z.unknown()),
  messageId: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

class EventConsumer {
  constructor({
    processorService,
    rabbitMQ,
    mongodb,
    postgres,
    config,
    logger,
    retryService,
    circuitBreaker,
  }) {
    this._processorService = processorService;
    this._rabbitMQ = rabbitMQ;
    this._mongodb = mongodb;
    this._postgres = postgres;
    this._config = config;
    this._logger = logger;
    this._retryService = retryService;
    this._circuitBreaker = circuitBreaker;

    this.isRunning = false;
    this.channel = null;
    this._state = {
      processed: 0,
      failed: 0,
      retried: 0,
      dlqRouted: 0,
      lastProcessedAt: null,
    };
    this._processedIds = new Set();
    this._poisonMessages = new Map();
  }

  async start() {
    try {
      await this._connectDatabase();
      this.channel = await this._rabbitMQ.connect();
      const prefetch = this._config?.consumer?.prefetch || 10;
      this.channel.prefetch(prefetch);

      this.channel.on("error", (err) => {
        this._logger.error(`Consumer channel error: `, err);
        this._circuitBreaker.onFailure();
      });

      this.channel.on("close", () => {
        this._logger.warn("Consumer channel closed unexpectedly");
        if (this.isRunning) this._reconnect();
      });
    } catch (error) {}
  }

  async _connectDatabase() {
    const maxRetries = 5;
    let retries = 0;
    while (retries < maxRetries) {
      try {
        this._logger.info("Connecting to database...");
        await Promise.all([
          this._mongodb.connect(),
          this._postgres.testConnection(),
        ]);
        this._logger.info("Database connected successfully");
        break;
      } catch (error) {
        this._logger.error("Database connection failed", error);
        retries++;
        if (retries >= maxRetries) {
          throw new Error(
            `Failed to connect to database after ${maxRetries} attempts`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
      }
    }
  }

  async _reconnect() {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.channel = await this._rabbitMQ.connect();
      const prefetch = this._config?.consumer?.prefetch || 10;
      this.channel.prefetch(prefetch);

      this.channel.on("error", (err) => {
        this._logger.error(`Consumer channel error: `, err);
        this._circuitBreaker.onFailure();
      });
      this.channel.on("close", () => {
        this._logger.warn("Consumer channel closed unexpectedly");
        if (this.isRunning) this._reconnect();
      });

      await this.channel.consumer(
        this._config?.rabbitMQ.queue,
        async (msg) => {
          if (msg !== null) await this._handleMessage(msg);
        },
        {
          noAck: false,
          consumerTag: `consumer-${Date.now()}`,
        },
      );
    } catch (error) {
      this._logger.error("Failed to reconnect:", error);
      if (this.isRunning) {
        setTimeout(() => this._reconnect(), 10000);
      }
    }
  }

  async _handleMessage(msg) {
    if (!this._circuitBreaker.allowRequest()) {
      this._logger.warn(`Circuit breaker open, requeuing message`);
      this.channel.nack(msg, false, true);
      return;
    }
    const startTime = Date.now();
    let messageDate = null;
    try {
      messageDate = this._parseMessage(msg);
    } catch (error) {}
  }

  async _parseMessage(msg) {
    try {
      const content = msg.content.toString();
      const messageData = JSON.parse(content);
      const parsed = messageSchema.safeParse(messageData);
      if (!parsed.success) {
        throw new Error(
          `Schema validation failed: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        );
      }
      return {
        ...parsed.data,
        messageId:
          msg.properties.messageId || messageData.messageId || "unknown",
        retryCount: parseInt(msg.properties.headers?.["x-retry-count"] || 0),
      };
    } catch (error) {
      throw new Error(`Message parsing failed: ${error.message}`);
    }
  }
}

export { EventConsumer };
