const circuitStatus = Object.freeze({
  OPENED: "OPENED",
  CLOSED: "CLOSED",
  HALF_OPENED: "HALF_OPENED",
});

export class CircuitBreaker {
  constructor(opt = {}) {
    this.failureThreshold = opt.failureThreshold || 3;
    this.coolDownMs = opt.coolDownMs || 10000;
    this.halfOpenMaxAttempt = opt.halfOpenMaxAttempt || 3;

    this.state = circuitStatus.CLOSED;
    this._failure = 0;
    this._lastFailureTime = 0;
    this._halfOpenAttempts = 0;
    this._halfOpenSuccess = 0;
  }

  allowedRequest() {
    if (this.state === circuitStatus.CLOSED) return true;

    if (this.state === circuitStatus.HALF_OPENED) {
      if (this._halfOpenAttempts < this.halfOpenMaxAttempt) {
        this._halfOpenAttempts++;
        return true;
      }
      return false;
    }

    return false;
  }

  _coolDownElapsed() {
    return Date.now() - this._lastFailureTime >= this.coolDownMs;
  }

  _reset() {
    this.state = circuitStatus.CLOSED;
    this._failure = 0;
    this._lastFailureTime = 0;
    this._halfOpenAttempts = 0;
    this._halfOpenSuccess = 0;
  }

  _transitionTo(newState) {
    const prev = this.state;
    this.state = newState;
    /// logger to print change status from prev to new
    if (newState === circuitStatus.HALF_OPENED) {
      this._halfOpenAttempts = 0;
      this._halfOpenSuccess = 0;
    }
  }

  _openCircuit() {
    this._lastFailureTime = new Date();
    this._transitionTo(circuitStatus.OPENED);
  }

  onSuccess() {
    if (this.state === circuitStatus.HALF_OPENED) {
      this._halfOpenSuccess++;
      if (this._halfOpenSuccess >= this.halfOpenMaxAttempt) {
        this._reset();
        return;
      }
    }
    if (this._failure > 0) {
      this._failure = 0;
    }
  }

  onFailure() {
    if (this.state === circuitStatus.HALF_OPENED) {
      this._openCircuit();
      return;
    }
    this._failure++;
    this._lastFailureTime = new Date();
    if (this._failure > this.failureThreshold) {
      this._openCircuit();
    }
  }

  get state() {
    if (this.state === circuitStatus.OPENED && this._coolDownElapsed()) {
      this._transitionTo(circuitStatus.HALF_OPENED);
    }
    return this.state;
  }
  snapshot() {
    return {
      state: this.state,
      failures: this._failure,
      lastFailureTime: this._lastFailureTime,
      halfOpenAttempts: this._halfOpenAttempts,
      halfOpenSuccesses: this._halfOpenSuccess,
      coolDownMs: this.coolDownMs,
      failureThreshold: this.failureThreshold,
    };
  }
}
