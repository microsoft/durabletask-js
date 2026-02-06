// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { TaskFailedError } from "./exception/task-failed-error";
import { CompletableTask } from "./completable-task";

/**
 * Represents the type of retryable task - activity or sub-orchestration.
 */
export type RetryTaskType = "activity" | "subOrchestration";

/**
 * Abstract base class for tasks that support retry behavior.
 *
 * @remarks
 * This class provides shared state and behavior for both policy-based retry
 * (RetryableTask) and handler-based retry (RetryHandlerTask). It manages the
 * action, attempt count, start time, task type, and failure tracking that are
 * common to both retry strategies.
 */
export abstract class RetryTaskBase<T> extends CompletableTask<T> {
  private readonly _action: pb.OrchestratorAction;
  private readonly _startTime: Date;
  private readonly _taskType: RetryTaskType;
  private _attemptCount: number;
  private _lastFailure: pb.TaskFailureDetails | undefined;

  /**
   * Creates a new RetryTaskBase instance.
   *
   * @param action - The orchestrator action associated with this task
   * @param startTime - The time when the task was first scheduled
   * @param taskType - The type of task (activity or sub-orchestration)
   */
  constructor(
    action: pb.OrchestratorAction,
    startTime: Date,
    taskType: RetryTaskType,
  ) {
    super();
    this._action = action;
    this._startTime = startTime;
    this._taskType = taskType;
    this._attemptCount = 1;
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
  get taskType(): RetryTaskType {
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
   * Marks the task as failed after all retry attempts are exhausted.
   *
   * @param message - The failure message
   * @param details - Optional failure details
   */
  override fail(message: string, details?: pb.TaskFailureDetails): void {
    if (this._isComplete) {
      throw new Error("Task is already completed");
    }

    details = details ?? new pb.TaskFailureDetails();

    this._exception = new TaskFailedError(message, details);
    this._isComplete = true;

    if (this._parent) {
      this._parent.onChildCompleted(this);
    }
  }
}
