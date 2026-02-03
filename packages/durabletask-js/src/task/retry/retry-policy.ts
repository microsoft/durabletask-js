// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * A declarative retry policy that can be configured for activity or sub-orchestration calls.
 *
 * @remarks
 * Retry policies control how many times a task is retried and the delay between retries.
 * The delay between retries increases exponentially based on the backoffCoefficient.
 *
 * @example
 * ```typescript
 * const retryPolicy = new RetryPolicy({
 *   maxNumberOfAttempts: 5,
 *   firstRetryIntervalInMilliseconds: 1000,
 *   backoffCoefficient: 2.0,
 *   maxRetryIntervalInMilliseconds: 30000,
 *   retryTimeoutInMilliseconds: 300000
 * });
 * ```
 */
export class RetryPolicy {
  private readonly _maxNumberOfAttempts: number;
  private readonly _firstRetryIntervalInMilliseconds: number;
  private readonly _backoffCoefficient: number;
  private readonly _maxRetryIntervalInMilliseconds: number;
  private readonly _retryTimeoutInMilliseconds: number;

  /**
   * Creates a new RetryPolicy instance.
   *
   * @param options - The retry policy options
   * @throws Error if any of the validation constraints are violated
   */
  constructor(options: RetryPolicyOptions) {
    const {
      maxNumberOfAttempts,
      firstRetryIntervalInMilliseconds,
      backoffCoefficient = 1.0,
      maxRetryIntervalInMilliseconds,
      retryTimeoutInMilliseconds,
    } = options;

    // Validation aligned with .NET SDK
    if (maxNumberOfAttempts <= 0) {
      throw new Error("maxNumberOfAttempts must be greater than zero");
    }

    if (firstRetryIntervalInMilliseconds <= 0) {
      throw new Error("firstRetryIntervalInMilliseconds must be greater than zero");
    }

    if (backoffCoefficient < 1.0) {
      throw new Error("backoffCoefficient must be greater than or equal to 1.0");
    }

    if (
      maxRetryIntervalInMilliseconds !== undefined &&
      maxRetryIntervalInMilliseconds !== -1 &&
      maxRetryIntervalInMilliseconds < firstRetryIntervalInMilliseconds
    ) {
      throw new Error("maxRetryIntervalInMilliseconds must be greater than or equal to firstRetryIntervalInMilliseconds");
    }

    if (
      retryTimeoutInMilliseconds !== undefined &&
      retryTimeoutInMilliseconds !== -1 &&
      retryTimeoutInMilliseconds < firstRetryIntervalInMilliseconds
    ) {
      throw new Error("retryTimeoutInMilliseconds must be greater than or equal to firstRetryIntervalInMilliseconds");
    }

    this._maxNumberOfAttempts = maxNumberOfAttempts;
    this._firstRetryIntervalInMilliseconds = firstRetryIntervalInMilliseconds;
    this._backoffCoefficient = backoffCoefficient;
    // Default to 1 hour (3600000ms) if not specified, -1 means infinite
    this._maxRetryIntervalInMilliseconds = maxRetryIntervalInMilliseconds ?? 3600000;
    // Default to -1 (infinite) if not specified
    this._retryTimeoutInMilliseconds = retryTimeoutInMilliseconds ?? -1;
  }

  /**
   * Gets the max number of attempts for executing a given task.
   */
  get maxNumberOfAttempts(): number {
    return this._maxNumberOfAttempts;
  }

  /**
   * Gets the amount of time in milliseconds to delay between the first and second attempt.
   */
  get firstRetryIntervalInMilliseconds(): number {
    return this._firstRetryIntervalInMilliseconds;
  }

  /**
   * Gets the exponential back-off coefficient used to determine the delay between subsequent retries.
   * @remarks Defaults to 1.0 for no back-off.
   */
  get backoffCoefficient(): number {
    return this._backoffCoefficient;
  }

  /**
   * Gets the maximum time in milliseconds to delay between attempts.
   * @remarks Defaults to 1 hour (3600000ms). Use -1 for infinite.
   */
  get maxRetryIntervalInMilliseconds(): number {
    return this._maxRetryIntervalInMilliseconds;
  }

  /**
   * Gets the overall timeout for retries in milliseconds.
   * No further attempts will be made after this timeout expires.
   * @remarks Defaults to -1 (infinite).
   */
  get retryTimeoutInMilliseconds(): number {
    return this._retryTimeoutInMilliseconds;
  }
}

/**
 * Options for creating a RetryPolicy.
 */
export interface RetryPolicyOptions {
  /**
   * The maximum number of task invocation attempts. Must be 1 or greater.
   */
  maxNumberOfAttempts: number;

  /**
   * The amount of time in milliseconds to delay between the first and second attempt.
   * Must be greater than 0.
   */
  firstRetryIntervalInMilliseconds: number;

  /**
   * The exponential back-off coefficient used to determine the delay between subsequent retries.
   * Must be 1.0 or greater.
   * @default 1.0
   */
  backoffCoefficient?: number;

  /**
   * The maximum time in milliseconds to delay between attempts.
   * Must be greater than or equal to firstRetryIntervalInMilliseconds.
   * Use -1 for infinite (no maximum).
   * @default 3600000 (1 hour)
   */
  maxRetryIntervalInMilliseconds?: number;

  /**
   * The overall timeout for retries in milliseconds.
   * No further attempts will be made after this timeout expires.
   * Use -1 for infinite (no timeout).
   * @default -1 (infinite)
   */
  retryTimeoutInMilliseconds?: number;
}
