import { EVENT_TYPE } from "../eventContracts";

class EventProducer {
  constructor({
    channelManager,
    circuitBreaker,
    retryStrategy,
    logger,
    queueName,
  }) {
    if (!channelManager)
      throw new Error("EventProducer: Channel Manager is required");
    if (!circuitBreaker)
      throw new Error("EventProducer: Circuit Breaker is required");
    if (!retryStrategy)
      throw new Error("EventProducer: Retry Strategy is required");
    if (!logger) throw new Error("EventProducer: Logger is required");
    if (!queueName) throw new Error("EventProducer: Queue Name is required");

    this._channelManager = channelManager;
    this._circuitBreaker = circuitBreaker;
    this._retryStrategy = retryStrategy;
    this._logger = logger ? logger : console;
    this._queueName = queueName;

    this._metrics = {
      publish: 0,
      failed: 0,
      retryExhausted: 0,
    };
    this._shuttingDown = false;
  }

  _incrementMetrics(metric) {
    if (this._metrics[metric] !== undefined) {
      this._metrics[metric] = (this._metrics[metric] || 0) + 1;
    }
  }
  async _publish(eventData, { correlationId, attempts }) {
    const channel = await this._channelManager.getChannel();
    const message = {
      type: EVENT_TYPE.API_HIT,
      data: eventData,
      publishAt: new Date().toISOString(),
      metadata: {
        correlationId,
        timestamp: new Date().toISOString(),
        attempts: attempts || 1,
      },
    };
    const buffer = Buffer.from(JSON.stringify(message));
    const publishOption = {
      persistent: true,
      contentType: "application/json",
      messageId: eventData.eventId,
      correlationId,
      timestamp: Math.floor(Date.now() / 1000),
    };
    return new Promise((resolve, reject) => {
      const written = channel.publish("", this._queueName, buffer, (err) => {
        if (err) {
          return reject(new Error(`Publish nacked: ${err.message}`));
        }
        resolve();
      });
      if (!written) {
        this._logger.log(
          `[EventProducer]: back-pressure detected, waiting for drain`,
          {
            eventId: eventData.eventId,
          },
        );
      }
      const onDrain = () => {
        channel.removeListener("drain", onDrain);
        this._logger.log(`[EventProducer] drain event received`, {
          eventId: eventData.eventId,
        });
      };
      channel.once("drain", onDrain);
    });
  }

  async shutDown() {
    this._shuttingDown = true;
    this._logger.info(`[EventProducer] shutting down...`);
    this._channelManager.close();
    this._logger.info(`[EventProducer] shutting down completed`);
  }

  async getState() {
    return {
      metric: { ...this._metrics },
      circuitBreaker: this._circuitBreaker.snapshot(),
    };
  }

  async publishApiHits(eventData, opts = {}) {
    if (this._shuttingDown) {
      const error = new Error("Event Producer is shutting down");
      error.code = "SHUTDOWN_IN_PROCESS";
      this._logger.log(`[EventProducer] publish rejected - shutting down`, {
        eventId: eventData.eventId,
      });
      throw error;
    }
    if (!this._circuitBreaker.allowedRequest()) {
      const error = new Error("Circuit Breaker is open");
      error.code = "CIRCUIT_OPEN";
      this._logger.log(`[EventProducer] publish rejected - circuit open`, {
        eventId: eventData.eventId,
        state: this._circuitBreaker.state,
      });
      return false;
    }
  }
}

export { EventProducer };
