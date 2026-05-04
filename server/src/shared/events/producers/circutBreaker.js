/**
 * Enum for circuit breaker states.
 * @readonly
 * @enum {string}
 */
export const CircuitState = Object.freeze({
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN'
});

/**
 * A clean implementation of the Circuit Breaker pattern.
 * All state transitions flow through a single gateway: _transitionTo().
 */
export class CircuitBreaker {
    constructor(opts = {}) {
        this.failureThreshold = opts.failureThreshold ?? 5;
        this.cooldownMs = opts.cooldownMs ?? 30_000;
        this.halfOpenMaxAttempts = opts.halfOpenMaxAttempts ?? 3;
        this.logger = opts.logger ?? console;

        // Initialize state machine
        this._state = CircuitState.CLOSED;
        this._failures = 0;
        this._lastFailureTime = 0;
        this._halfOpenAttempts = 0;
        this._halfOpenSuccesses = 0;
    }

    // ==========================================
    // SINGLE GATEWAY: All state entry logic here
    // ==========================================
    
    /**
     * SOLE entry point for ALL state transitions.
     * Every state change in the system MUST flow through here.
     */
    _transitionTo(newState) {
        if (this._state === newState) return;

        const prev = this._state;
        this._state = newState;
        this.logger.info(`[CircuitBreaker] ${prev} => ${newState}`);

        // State entry logic: ONE place, exhaustive switch
        switch (newState) {
            case CircuitState.CLOSED:
                this._failures = 0;
                this._lastFailureTime = 0;
                this._halfOpenAttempts = 0;
                this._halfOpenSuccesses = 0;
                this.logger.info('[CircuitBreaker] circuit closed, counters reset');
                break;

            case CircuitState.OPEN:
                this._lastFailureTime = Date.now();
                this.logger.error('[CircuitBreaker] circuit opened', {
                    failures: this._failures,
                    cooldownMs: this.cooldownMs
                });
                break;

            case CircuitState.HALF_OPEN:
                this._halfOpenAttempts = 0;
                this._halfOpenSuccesses = 0;
                this.logger.info('[CircuitBreaker] entering half-open, probe counters reset');
                break;

            default:
                // Defensive: should never reach here
                this.logger.error(`[CircuitBreaker] unknown state: ${newState}`);
        }
    }

    // ==========================================
    // PURE OBSERVATION: No side effects
    // ==========================================

    /**
     * Pure getter. Returns current state without mutation.
     * OPEN→HALF_OPEN transition is triggered explicitly in allowRequest().
     */
    get state() {
        return this._state;
    }

    /**
     * Checks if cooldown period has elapsed.
     */
    _cooldownElapsed() {
        return Date.now() - this._lastFailureTime >= this.cooldownMs;
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    /**
     * Determines if a request is allowed.
     * Handles OPEN→HALF_OPEN time-based transition explicitly.
     */
    allowRequest() {
        // EXPLICIT transition: time-based OPEN→HALF_OPEN
        if (this._state === CircuitState.OPEN && this._cooldownElapsed()) {
            this._transitionTo(CircuitState.HALF_OPEN);
        }

        const current = this._state;

        this.logger.debug('[CircuitBreaker] allowRequest check', {
            state: current,
            halfOpenAttempts: this._halfOpenAttempts,
            halfOpenMaxAttempts: this.halfOpenMaxAttempts,
            halfOpenSuccesses: this._halfOpenSuccesses,
            failures: this._failures
        });

        switch (current) {
            case CircuitState.CLOSED:
                return true;

            case CircuitState.HALF_OPEN:
                if (this._halfOpenAttempts < this.halfOpenMaxAttempts) {
                    this._halfOpenAttempts++;
                    this.logger.info(
                        `[CircuitBreaker] allowing HALF_OPEN attempt ${this._halfOpenAttempts}/${this.halfOpenMaxAttempts}`
                    );
                    return true;
                }
                this.logger.warn(
                    `[CircuitBreaker] HALF_OPEN attempts exhausted (${this._halfOpenAttempts}/${this.halfOpenMaxAttempts})`
                );
                return false;

            case CircuitState.OPEN:
                this.logger.info(`[CircuitBreaker] rejecting request, state: OPEN`);
                return false;

            default:
                return false;
        }
    }

    /**
     * Records a successful request.
     * HALF_OPEN→CLOSED transition on sufficient successes.
     */
    onSuccess() {
        this.logger.info('[CircuitBreaker] success recorded', {
            state: this._state,
            halfOpenSuccesses: this._halfOpenSuccesses,
            halfOpenMaxAttempts: this.halfOpenMaxAttempts,
            failures: this._failures
        });

        switch (this._state) {
            case CircuitState.HALF_OPEN:
                this._halfOpenSuccesses++;
                this.logger.info(
                    `[CircuitBreaker] HALF_OPEN success ${this._halfOpenSuccesses}/${this.halfOpenMaxAttempts}`
                );
                if (this._halfOpenSuccesses >= this.halfOpenMaxAttempts) {
                    this._transitionTo(CircuitState.CLOSED);
                    this.logger.info('[CircuitBreaker] reset to CLOSED after successful half-open probes');
                }
                break;

            case CircuitState.CLOSED:
                if (this._failures > 0) {
                    this._failures = 0;
                    this.logger.info('[CircuitBreaker] failure counter reset after success');
                }
                break;

            case CircuitState.OPEN:
                // Impossible in correct usage (requests rejected), but log for debugging misuse
                this.logger.warn('[CircuitBreaker] onSuccess called in OPEN state — possible misuse');
                break;
        }
    }

    /**
     * Records a failed request.
     * HALF_OPEN→OPEN immediate fallback. CLOSED→OPEN on threshold breach.
     */
    onFailure() {
        this.logger.error('[CircuitBreaker] failure recorded', {
            state: this._state,
            failures: this._failures,
            failureThreshold: this.failureThreshold
        });

        switch (this._state) {
            case CircuitState.HALF_OPEN:
                this.logger.warn('[CircuitBreaker] half-open probe failed, reopening circuit');
                this._transitionTo(CircuitState.OPEN);
                break;

            case CircuitState.CLOSED:
                this._failures++;
                this._lastFailureTime = Date.now();
                this.logger.info(`[CircuitBreaker] failure count: ${this._failures}/${this.failureThreshold}`);
                if (this._failures >= this.failureThreshold) {
                    this._transitionTo(CircuitState.OPEN);
                }
                break;

            case CircuitState.OPEN:
                // Impossible in correct usage, but update timestamp for cooldown
                this._lastFailureTime = Date.now();
                this.logger.warn('[CircuitBreaker] onFailure called in OPEN state — possible misuse');
                break;
        }
    }

    /**
     * Returns a snapshot of current state.
     */
    snapshot() {
        return {
            state: this._state,
            failures: this._failures,
            lastFailureTime: this._lastFailureTime,
            halfOpenAttempts: this._halfOpenAttempts,
            halfOpenSuccesses: this._halfOpenSuccesses,
            cooldownMs: this.cooldownMs,
            failureThreshold: this.failureThreshold
        };
    }
}
