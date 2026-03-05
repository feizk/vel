/**
 * Circuit breaker states
 */
export enum CircuitState {
  /** Normal operation - requests pass through */
  CLOSED = 'CLOSED',
  /** Failing fast - requests are rejected */
  OPEN = 'OPEN',
  /** Testing if service recovered - limited requests allowed */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Options for configuring the circuit breaker
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms before attempting to close circuit (default: 30000) */
  resetTimeoutMs?: number;
  /** Number of successes required to fully close circuit (default: 1) */
  successThreshold?: number;
}

/**
 * Circuit breaker pattern implementation for preventing cascading failures.
 * Stops sending requests after consecutive failures and periodically tests recovery.
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeoutMs: 30000,
 * });
 *
 * if (breaker.canExecute()) {
 *   try {
 *     await sendRequest();
 *     breaker.recordSuccess();
 *   } catch (error) {
 *     breaker.recordFailure();
 *   }
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFailureTime?: number;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;

  /**
   * Create a new circuit breaker instance
   * @param options - Configuration options
   */
  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
    this.successThreshold = options.successThreshold ?? 1;
  }

  /**
   * Get the current circuit state
   * @returns Current state (CLOSED, OPEN, or HALF_OPEN)
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if a request can be executed
   * @returns true if request should proceed, false if circuit is open
   */
  canExecute(): boolean {
    return this.state !== CircuitState.OPEN;
  }

  /**
   * Check if circuit is currently open
   * @returns true if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = undefined;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.closeCircuit();
      }
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed in half-open state, reopen circuit
      this.openCircuit();
    } else if (this.failureCount >= this.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Get the current failure count
   * @returns Number of consecutive failures
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get time since last failure in ms
   * @returns Time in ms or undefined if no failures
   */
  getTimeSinceLastFailure(): number | undefined {
    if (!this.lastFailureTime) return undefined;
    return Date.now() - this.lastFailureTime;
  }

  private openCircuit(): void {
    if (this.state === CircuitState.OPEN) return;

    this.state = CircuitState.OPEN;
    this.resetTimer = setTimeout(() => {
      this.state = CircuitState.HALF_OPEN;
    }, this.resetTimeoutMs);
  }

  private closeCircuit(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * Force the circuit to a specific state (useful for testing)
   * @param state - Target state
   */
  forceState(state: CircuitState): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.state = state;
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
}
