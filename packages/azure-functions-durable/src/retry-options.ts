// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryPolicy } from "@microsoft/durabletask-js";

/**
 * Classic Durable Functions (v3) retry configuration for `callActivityWithRetry` /
 * `callSubOrchestratorWithRetry`.
 *
 * @remarks
 * This mirrors the legacy `durable-functions` `RetryOptions` shape so existing orchestrator code
 * migrates without changes. It is a thin adapter: {@link toRetryPolicy} converts it to the core
 * `RetryPolicy` that the durabletask engine actually understands.
 */
export class RetryOptions {
  /** Exponential backoff coefficient applied between retries. Defaults to 1 (no backoff). */
  public backoffCoefficient = 1;

  /** Maximum delay between retries, in milliseconds. When unset, the core default (1 hour) applies. */
  public maxRetryIntervalInMilliseconds?: number;

  /** Overall retry timeout, in milliseconds. When unset, retries are not time-bounded. */
  public retryTimeoutInMilliseconds?: number;

  /**
   * @param firstRetryIntervalInMilliseconds - Delay before the first retry, in milliseconds.
   * @param maxNumberOfAttempts - Maximum number of attempts (including the first call).
   */
  constructor(
    public readonly firstRetryIntervalInMilliseconds: number,
    public readonly maxNumberOfAttempts: number,
  ) {}

  /**
   * Converts this classic `RetryOptions` into the core {@link RetryPolicy}.
   */
  toRetryPolicy(): RetryPolicy {
    return new RetryPolicy({
      firstRetryIntervalInMilliseconds: this.firstRetryIntervalInMilliseconds,
      maxNumberOfAttempts: this.maxNumberOfAttempts,
      backoffCoefficient: this.backoffCoefficient,
      maxRetryIntervalInMilliseconds: this.maxRetryIntervalInMilliseconds,
      retryTimeoutInMilliseconds: this.retryTimeoutInMilliseconds,
    });
  }
}
