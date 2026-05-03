import { z } from "zod";
import { RetryStrategy } from "../../shared/events/producers/RetryStrategy";

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

      this._logger.info(
        `Started consuming from queue ${this._config.rabbitMQ.queue}`,
      );
      this.isRunning = true;

      await this.channel.consume(
        this._config.rabbitMQ.queue,
        async (msg) => {
          if (msg !== null) await this._handleMessage(msg);
        },
        { noAck: false, consumerTag: `consumer-${Date.now()}` },
      );
      this._logger.info("Event consumer is running");
    } catch (error) {
      this._logger.error("Failed to Start consumer", error);
      await this._cleanup();
    }
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

      // for idom
      if (this._processedIds.has(messageDate.messageId)) {
        this._logger.debug("Duplicate message skipped", {
          messageId: messageDate.messageId,
        });
        this.channel.ack(msg);
        return;
      }

      await this._processData(messageDate);
      this.channel.ack(msg);
      this._circuitBreaker.onSuccess();
      this.stats.processed++;
      this.stats.lastProcessedAt = new Date();

      this._processedIds.add(messageDate.messageId);
      // if size of processedIds is greater than that then we remove it
      if (this._processedIds.size > 100_00) {
        const first = this._processedIds.values().next().value;
        this._processedIds.delete(first);
      }

      this._poisonMessages.delete(messageDate.type);
    } catch (error) {
      await this._handleProcessingError(error, msg, messageDate, startTime);
    }
  }

  async _processData(messageData) {
    try {
      switch (messageData.type) {
        case EVENT_TYPES.API_HIT:
          await this._processorService.processEvent(messageData.data);
          break;

        default:
          throw new Error(`Unknown event type: ${messageData.type}`);
          break;
      }
    } catch (error) {}
  }

  async _handleProcessingError(error, msg, messageDate, startTime) {}

  _parseMessage(msg) {
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

  async _cleanup() {
    try {
      this.isRunning = false;
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
    } catch (error) {
      this._logger.error(`Error during cleanup:`, error);
    }
  }
}

const consumer = new EventConsumer({
  processorService: processorContainer.services.processorService,
  rabbitmq,
  mongodb,
  postgres,
  config,
  logger,
  retryStrategy,
  circuitBreaker,
});

export const startConsumerWithRetry = () => {
  try {
    const setupRetry = new RetryStrategy({
      maxRetries: 5,
      baseDelayMs: 5000,
      maxDelayMs: 30_000,
    });
    let attempt = 0;
    while (setupRetry.shouldRetry(attempt) || attempt == 0) {
      try {
        logger.info(`Starting Consumer (attempt ${attempt + 1})`);
        await consumer.start();
        logger.info('Consumer started successfully');
        return;
      } catch (error) {
        attempt ++;
        logger.error(`Consumer start attempt ${attempt} failed:`, error);
        if(!setupRetry.shouldRetry(attempt)){
          logger.error('Max retries reached, exiting...');
          process.exit(1);
        }

        await setupRetry.wait(attempt-1);
      }
    }
  } catch (error) {}
};

export { EventConsumer };
