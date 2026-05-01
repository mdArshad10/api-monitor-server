import config from "../../config/index.js";
import { logger } from "../../config/logger.js";
import rabbitMQ from "../../config/rabbitMQ.js";
import { CircuitBreaker } from "./circutBreaker.js";
import { ConfirmChannelManager } from "./confirmChannelManager.js";
import { EventProducer } from "./eventProducer.js";
import { RetryStrategy } from "./RetryStrategy.js";

export const createEventProducer = (overrides = {}) => {
  const log = overrides.logger ?? logger;
  const rmq = overrides.rabbitMQ ?? rabbitMQ;
  const queueName = overrides.queueName ?? config.rabbitmq.queue;

  if (!rmq) throw new Error("Rabbit MQ connection Manger is required");
  if (!queueName) throw new Error("Queue name must be specified");
  if (!config.rabbitmq.retryAttempts || config.rabbitmq.retryAttempts < 0) {
    throw new Error("Invalid retry attempts configuration");
  }

  const channelManager =
    overrides.channelManager ??
    new ConfirmChannelManager({ logger: log, rabbitMQ: rmq });

  const circuitBreaker =
    overrides.circuitBreaker ??
    new CircuitBreaker({
      failureThreshold: 2,
      coolDownMs: 30_000,
      halfOpenMaxAttempts: 3,
      logger: log,
    });

  const retryStrategy =
    overrides.retryStrategy ??
    new RetryStrategy({
      maxRetry: config.rabbitmq.retryAttempts,
      initialDelay: 200,
      maxDelayMs: 5000,
      backoffFactor: 2,
      jitter: 0.1,
      logger: log,
    });

  const eventProducer =
    overrides.eventProducer ??
    new EventProducer({
      channelManager,
      circuitBreaker,
      retryStrategy,
      logger: log,
      queueName,
    });

  return eventProducer;
};
