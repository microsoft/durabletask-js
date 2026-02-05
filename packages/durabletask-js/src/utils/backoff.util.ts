// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Configuration options for exponential backoff.
 */
export interface BackoffOptions {
  /**
   * Initial delay in milliseconds before the first retry.
   * @default 1000
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in milliseconds between retries.
   * @default 30000
   */
  maxDelayMs?: number;

  /**
   * Multiplier applied to the delay after each retry.
   * @default 2
   */
  multiplier?: number;

  /**
   * Maximum number of retry attempts. Use -1 for unlimited.
   * @default -1
   */
  maxAttempts?: number;

  /**
   * Optional jitter factor (0-1) to add randomness to delays.
   * @default 0.1
   */
  jitterFactor?: number;
}

/**
 * Default backoff configuration values.
 */
export const DEFAULT_BACKOFF_OPTIONS: Required<BackoffOptions> = {
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  multiplier: 2,
  maxAttempts: -1,
  jitterFactor: 0.1,
};

/**
 * Implements exponential backoff with jitter for retry scenarios.
 *
 * @example
 * ```typescript
 * const backoff = new ExponentialBackoff({ initialDelayMs: 1000, maxDelayMs: 30000 });
 *
 * while (shouldRetry) {
 *   try {
 *     await doSomething();
 *     backoff.reset();
 *     break;
 *   } catch (err) {
 *     if (!backoff.canRetry()) throw err;
 *     await backoff.wait();
 *   }
 * }
 * ```
 */
export class ExponentialBackoff {
  private readonly _initialDelayMs: number;
  private readonly _maxDelayMs: number;
  private readonly _multiplier: number;
  private readonly _maxAttempts: number;
  private readonly _jitterFactor: number;

  private _currentDelayMs: number;
  private _attemptCount: number;

  constructor(options?: BackoffOptions) {
    const opts = { ...DEFAULT_BACKOFF_OPTIONS, ...options };

    this._initialDelayMs = opts.initialDelayMs;
    this._maxDelayMs = opts.maxDelayMs;
    this._multiplier = opts.multiplier;
    this._maxAttempts = opts.maxAttempts;
    this._jitterFactor = opts.jitterFactor;

    this._currentDelayMs = this._initialDelayMs;
    this._attemptCount = 0;
  }

  /**
   * Gets the current attempt count.
   */
  get attemptCount(): number {
    return this._attemptCount;
  }

  /**
   * Gets the current delay in milliseconds (before jitter is applied).
   */
  get currentDelayMs(): number {
    return this._currentDelayMs;
  }

  /**
   * Checks if another retry attempt is allowed.
   */
  canRetry(): boolean {
    if (this._maxAttempts === -1) {
      return true;
    }
    return this._attemptCount < this._maxAttempts;
  }

  /**
   * Calculates the next delay with optional jitter.
   */
  private _calculateDelayWithJitter(): number {
    if (this._jitterFactor <= 0) {
      return this._currentDelayMs;
    }

    const jitterRange = this._currentDelayMs * this._jitterFactor;
    const jitter = Math.random() * jitterRange * 2 - jitterRange;
    return Math.max(0, Math.floor(this._currentDelayMs + jitter));
  }

  /**
   * Waits for the current backoff delay, then increments the attempt count
   * and calculates the next delay.
   *
   * @returns Promise that resolves after the delay.
   */
  async wait(): Promise<void> {
    const delay = this._calculateDelayWithJitter();

    await new Promise<void>((resolve) => setTimeout(resolve, delay));

    this._attemptCount++;
    this._currentDelayMs = Math.min(
      this._currentDelayMs * this._multiplier,
      this._maxDelayMs,
    );
  }

  /**
   * Gets the next delay without waiting or incrementing the counter.
   */
  peekNextDelay(): number {
    return this._calculateDelayWithJitter();
  }

  /**
   * Resets the backoff state to initial values.
   * Call this after a successful operation.
   */
  reset(): void {
    this._currentDelayMs = this._initialDelayMs;
    this._attemptCount = 0;
  }
}

/**
 * Creates a promise that resolves after the specified delay.
 *
 * @param ms Delay in milliseconds.
 * @returns Promise that resolves after the delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a promise that resolves after the specified delay,
 * but can be cancelled via an AbortSignal.
 *
 * @param ms Delay in milliseconds.
 * @param signal Optional AbortSignal to cancel the sleep.
 * @returns Promise that resolves after the delay or rejects if aborted.
 */
export function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Sleep aborted"));
      return;
    }

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new Error("Sleep aborted"));
    };

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Waits for a promise to resolve with a timeout.
 *
 * @param promise The promise to wait for.
 * @param timeoutMs Maximum time to wait in milliseconds.
 * @param timeoutMessage Optional message for the timeout error.
 * @returns The resolved value or rejects with a timeout error.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = "Operation timed out",
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
