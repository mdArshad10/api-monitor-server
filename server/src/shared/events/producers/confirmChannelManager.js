import { EventEmitter } from "node:events";

export class ConfirmChannelManager extends EventEmitter {
  constructor({ rabbitMQ, logger }) {
    super();
    if (!rabbitMQ)
      throw new Error(
        "Confirm Channel Manager requires RabbitMQ connection manager",
      );

    this._rabbitMQ = rabbitMQ;
    this._logger = logger ? logger : console;
    this._channel = null;
    this._connecting = false; // use for concurrency
    this._connectWaiters = [];
  }

  async getChannel() {
    if (this._channel) return this._channel;
    if (this._connecting) {
      return new Promise((resolve, reject) => {
        this._connectWaiters.push({ resolve, reject });
      });
    }
    this._connect();
  }

  async _connect() {
    this._connecting = true;
    try {
      let connection;
      if (this._rabbitMQ.connection) {
        connection = this._rabbitMQ.connection;
      } else {
        await this._rabbitMQ.connect();
        if (!this._rabbitMQ.connection) {
          throw new Error("Failed to connect Rabbit MQ");
        }
        connection = this._rabbitMQ.connection;
      }
      const confirmChannel = await connection.createConfirmChannel();

      // back pressue handling
      confirmChannel.on("drain", () => this.emit("drain"));
      confirmChannel.on("close", () => {
        this._logger.log(
          "[channelManager] confirm channel closed unexpectedly",
        );
        this._channel = null;
      });
      confirmChannel.on("error", (err) => {
        this._logger.log("[channelManager] confirm channel error", {
          error: err.message,
          stack: err.stack,
          code: err.code,
        });
        this._channel = null;
        this.emit("error", err);
      });
      this._channel = confirmChannel;
      this._logger.log("[ChannelManager] confirm channel ready");
      for (const { resolve } of this._connectWaiters) {
        resolve(confirmChannel);
      }
      this._connectWaiters = [];
      return confirmChannel;
    } catch (error) {
      this._logger.log("[ChannelManager] confirm channel error", {
        error: error.message,
        stack: error.stack,
        code: error.code,
      });
      this._channel = null;
      for (const { reject } of this._connectWaiters) {
        reject(error);
      }
      this._connectWaiters = [];
      return error;
    } finally {
      this._connecting = false;
    }
  }
}
