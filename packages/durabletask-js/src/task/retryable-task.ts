// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryTaskBase } from "./retry-task-base";
import { RetryPolicy } from "./retry/retry-policy";
import * as pb from "../proto/orchestrator_service_pb";

/**
 * A task that can be retried according to a declarative retry policy.
 *
 * @remarks
 * This class extends RetryTaskBase and adds policy-driven delay computation.
 * It tracks attempts and computes the next retry delay based on exponential
 * backoff with the configured retry policy.
 */
export class RetryableTask<T> extends RetryTaskBase<T> {
  private readonly _retryPolicy: RetryPolicy;

  /**
   * Creates a new RetryableTask instance.
   *
   * @param retryPolicy - The retry policy to use for this task
   * @param action - The orchestrator action associated with this task
   * @param startTime - The time when the task was first scheduled
   * @param taskType - The type of task (activity or sub-orchestration)
   */
  constructor(
    retryPolicy: RetryPolicy,
    action: pb.OrchestratorAction,
    startTime: Date,
    taskType: "activity" | "subOrchestration",
  ) {
    super(action, startTime, taskType);
    this._retryPolicy = retryPolicy;
  }

  /**
   * Gets the retry policy for this task.
   */
  get retryPolicy(): RetryPolicy {
    return this._retryPolicy;
  }

  /**
   * Computes the next retry delay in milliseconds.
   *
   * @param currentTime - The current orchestration time (for deterministic replay)
   * @returns The delay in milliseconds until the next retry, or undefined if no more retries should be attempted
   *
   * @remarks
   * Returns undefined if:
   * - The handleFailure predicate returns false for the last failure
   * - The maximum number of attempts has been reached
   * - The retry timeout has been exceeded
   *
   * The delay is calculated using exponential backoff:
   * delay = firstRetryInterval * (backoffCoefficient ^ (attemptCount - 1))
   *
   * The delay is capped at maxRetryInterval.
   */
  computeNextDelayInMilliseconds(currentTime: Date): number | undefined {
    // Check if handleFailure predicate says we should NOT retry this failure type
    if (this.lastFailure) {
      const failureDetails = {
        errorType: this.lastFailure.getErrortype() || "Error",
        message: this.lastFailure.getErrormessage() || "",
        stackTrace: this.lastFailure.getStacktrace()?.getValue(),
      };

      if (!this._retryPolicy.shouldRetry(failureDetails)) {
        return undefined;
      }
    }

    // Check if we've exhausted max attempts
    if (this.attemptCount >= this._retryPolicy.maxNumberOfAttempts) {
      return undefined;
    }

    // Check if we've exceeded the retry timeout
    if (this._retryPolicy.retryTimeoutInMilliseconds !== -1) {
      const elapsedTime = currentTime.getTime() - this.startTime.getTime();
      if (elapsedTime >= this._retryPolicy.retryTimeoutInMilliseconds) {
        return undefined;
      }
    }

    // Calculate the next delay using exponential backoff
    // delay = firstRetryInterval * (backoffCoefficient ^ (attemptCount - 1))
    const backoffCoefficient = this._retryPolicy.backoffCoefficient;
    const exponent = this.attemptCount - 1;
    let nextDelay =
      this._retryPolicy.firstRetryIntervalInMilliseconds * Math.pow(backoffCoefficient, exponent);

    // Cap at maxRetryInterval if specified and not infinite
    if (this._retryPolicy.maxRetryIntervalInMilliseconds !== -1) {
      nextDelay = Math.min(nextDelay, this._retryPolicy.maxRetryIntervalInMilliseconds);
    }

    // Check if the computed delay would exceed the retry timeout
    if (this._retryPolicy.retryTimeoutInMilliseconds !== -1) {
      const elapsedTime = currentTime.getTime() - this.startTime.getTime();
      const remainingTime = this._retryPolicy.retryTimeoutInMilliseconds - elapsedTime;
      if (nextDelay > remainingTime) {
        // No more retries - timeout would be exceeded
        return undefined;
      }
    }

    return nextDelay;
  }
}
