/**
 * List of error message patterns and codes that are considered retryable. This includes common network-related errors and RabbitMQ-specific errors that indicate transient issues with the connection or channel. The isRetryable function uses this list to determine if an error should trigger a retry attempt.
 * @constant {string[]}
 */
const RETRYABLE_PATTERNS = [
  "channel closed",
  "connection closed",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "buffer full",
  "heartbeat timeout",
  "not available",
  "server connection closed",
];

/**
 * Checks if an error is retryable based on a list of predefined patterns.
 * @param {Error} error - The error to check.
 * @returns {boolean} - True if the error is retryable, false otherwise.
 */
export function isRetryable(error) {
  if (!error || typeof error.message !== "string") {
    return false;
  }
  const message = (error.message || "").toLowerCase();
  const code = (error.code || "").toUpperCase();
  return RETRYABLE_PATTERNS.some(
    (pattern) =>
      message.includes(pattern.toLowerCase()) ||
      code.includes(pattern.toUpperCase()),
  );
}

class RetryStrategy {
  constructor(opt) {
    const maxRetry = opt.maxRetry ?? 5;
    const initialDelay = opt.initialDelay ?? 200;
    const maxDelayMs = opt.maxDelayMs ?? 5000;
    const backoffFactor = opt.backoffFactor ?? 2;
    const jitter = opt.jitter ?? 0.1;
    const logger = opt.logger ?? console;

    if (maxRetry < 0) throw new Error("maxRetry must be non-negative");
    if (initialDelay <= 0) throw new Error("initialDelay must be positive");
    if (backoffFactor <= 1)
      throw new Error("backoffFactor must be greater than 1");
    if (jitter < 0 || jitter > 1)
      throw new Error("jitter must be between 0 and 1");

    this._maxRetry = maxRetry;
    this._initialDelay = initialDelay;
    this._maxDelayMs = maxDelayMs;
    this._backoffFactor = backoffFactor;
    this._jitter = jitter;
    this._logger = logger;

    this._metrics = {
      retries: 0,
      success: 0,
      failed: 0,
      retryExhausted: 0,
    };
  }

  shouldRetry(attempt) {
    return attempt < this._maxRetry;
  }

  getDelay(attempt) {
    const baseDelay =
      this._initialDelay * Math.pow(this._backoffFactor, attempt - 1);
    const capped = Math.min(baseDelay, this._maxDelayMs);
    const jitterRange = capped * this._jitter;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, Math.round(capped + jitter));
  }

  wait(attempt) {
    const ms = this.getDelay(attempt);
    if (ms > 0) {
      this._logger.log(
        `[RetryStrategy] waiting for ${ms}ms before retry ${attempt}`,
      );
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    return Promise.resolve();
  }
}

export {RetryStrategy}