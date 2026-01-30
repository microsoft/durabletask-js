// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { TaskFailedError } from "./exception/task-failed-error";
import { CompletableTask } from "./completable-task";
import { RetryPolicy } from "./retry/retry-policy";

/**
 * Represents the type of retryable task - activity or sub-orchestration.
 */
export type RetryableTaskType = "activity" | "subOrchestration";

/**
 * A task that can be retried according to a retry policy.
 *
 * @remarks
 * This class extends CompletableTask and adds retry tracking and delay computation.
 * It tracks the number of attempts and computes the next retry delay based on
 * exponential backoff with the configured retry policy.
 */
export class RetryableTask<T> extends CompletableTask<T> {
  private readonly _retryPolicy: RetryPolicy;
  private readonly _action: pb.OrchestratorAction;
  private readonly _startTime: Date;
  private readonly _taskType: RetryableTaskType;
  private _attemptCount: number;
  private _lastFailure: pb.TaskFailureDetails | undefined;

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
    taskType: RetryableTaskType,
  ) {
    super();
    this._retryPolicy = retryPolicy;
    this._action = action;
    this._startTime = startTime;
    this._taskType = taskType;
    this._attemptCount = 1;
  }

  /**
   * Gets the retry policy for this task.
   */
  get retryPolicy(): RetryPolicy {
    return this._retryPolicy;
  }

  /**
   * Gets the orchestrator action associated with this task.
   */
  get action(): pb.OrchestratorAction {
    return this._action;
  }

  /**
   * Gets the current attempt count.
   */
  get attemptCount(): number {
    return this._attemptCount;
  }

  /**
   * Gets the time when the task was first scheduled.
   */
  get startTime(): Date {
    return this._startTime;
  }

  /**
   * Gets the type of task (activity or sub-orchestration).
   */
  get taskType(): RetryableTaskType {
    return this._taskType;
  }

  /**
   * Gets the last failure details.
   */
  get lastFailure(): pb.TaskFailureDetails | undefined {
    return this._lastFailure;
  }

  /**
   * Increments the attempt count.
   */
  incrementAttemptCount(): void {
    this._attemptCount++;
  }

  /**
   * Records a failure for potential retry.
   *
   * @param message - The failure message
   * @param details - The failure details from the protobuf
   */
  recordFailure(message: string, details?: pb.TaskFailureDetails): void {
    details = details ?? new pb.TaskFailureDetails();
    this._lastFailure = details;

    // Store the exception for later if we exhaust retries
    this._exception = new TaskFailedError(message, details);
  }

  /**
   * Completes the task with the given result.
   * Clears any previously recorded failure since the retry succeeded.
   *
   * @param result - The result of the task
   */
  override complete(result: T): void {
    // Clear any previously recorded failure since the retry succeeded
    this._exception = undefined;
    this._lastFailure = undefined;

    // Call the parent implementation
    super.complete(result);
  }

  /**
   * Marks the task as failed after exhausting all retry attempts.
   *
   * @param message - The failure message
   * @param details - Optional failure details
   */
  override fail(message: string, details?: pb.TaskFailureDetails): void {
    if (this._isComplete) {
      throw new Error("Task is already completed");
    }

    details = details ?? new pb.TaskFailureDetails();

    // Create error message that includes task type and task ID
    const taskTypeLabel = this._taskType === "activity" ? "Activity" : "Sub-orchestration";
    const fullMessage = `${taskTypeLabel} task #${this._action.getId()} failed: ${message}`;

    this._exception = new TaskFailedError(fullMessage, details);
    this._isComplete = true;

    if (this._parent) {
      this._parent.onChildCompleted(this);
    }
  }

  /**
   * Computes the next retry delay in milliseconds.
   *
   * @param currentTime - The current orchestration time (for deterministic replay)
   * @returns The delay in milliseconds until the next retry, or undefined if no more retries should be attempted
   *
   * @remarks
   * Returns undefined if:
   * - The maximum number of attempts has been reached
   * - The retry timeout has been exceeded
   *
   * The delay is calculated using exponential backoff:
   * delay = firstRetryInterval * (backoffCoefficient ^ (attemptCount - 1))
   *
   * The delay is capped at maxRetryInterval.
   */
  computeNextDelayInMilliseconds(currentTime: Date): number | undefined {
    // Check if we've exhausted max attempts
    if (this._attemptCount >= this._retryPolicy.maxNumberOfAttempts) {
      return undefined;
    }

    // Check if we've exceeded the retry timeout
    if (this._retryPolicy.retryTimeoutInMilliseconds !== -1) {
      const elapsedTime = currentTime.getTime() - this._startTime.getTime();
      if (elapsedTime >= this._retryPolicy.retryTimeoutInMilliseconds) {
        return undefined;
      }
    }

    // Calculate the next delay using exponential backoff
    // delay = firstRetryInterval * (backoffCoefficient ^ (attemptCount - 1))
    const backoffCoefficient = this._retryPolicy.backoffCoefficient;
    const exponent = this._attemptCount - 1;
    let nextDelay =
      this._retryPolicy.firstRetryIntervalInMilliseconds * Math.pow(backoffCoefficient, exponent);

    // Cap at maxRetryInterval if specified and not infinite
    if (this._retryPolicy.maxRetryIntervalInMilliseconds !== -1) {
      nextDelay = Math.min(nextDelay, this._retryPolicy.maxRetryIntervalInMilliseconds);
    }

    // Check if the computed delay would exceed the retry timeout
    if (this._retryPolicy.retryTimeoutInMilliseconds !== -1) {
      const elapsedTime = currentTime.getTime() - this._startTime.getTime();
      const remainingTime = this._retryPolicy.retryTimeoutInMilliseconds - elapsedTime;
      if (nextDelay > remainingTime) {
        // No more retries - timeout would be exceeded
        return undefined;
      }
    }

    return nextDelay;
  }
}
