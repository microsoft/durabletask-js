// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { RetryTaskBase, RetryTaskType } from "./retry-task-base";
import { AsyncRetryHandler } from "./retry/retry-handler";
import { createRetryContext } from "./retry/retry-context";
import { TaskFailureDetails } from "./failure-details";

/**
 * A task that uses an AsyncRetryHandler for imperative retry control.
 *
 * @remarks
 * Unlike RetryableTask which uses a declarative RetryPolicy, this task delegates
 * all retry decisions to a user-provided handler function. The handler receives
 * a RetryContext with failure details, attempt count, and elapsed time, and
 * returns true to retry or false to stop.
 *
 * This mirrors the .NET SDK's InvokeWithCustomRetryHandler pattern, where the
 * retry handler runs as orchestrator code (subject to replay).
 */
export class RetryHandlerTask<T> extends RetryTaskBase<T> {
  private readonly _handler: AsyncRetryHandler;

  /**
   * Creates a new RetryHandlerTask instance.
   *
   * @param handler - The async retry handler for imperative retry decisions
   * @param action - The orchestrator action associated with this task
   * @param startTime - The time when the task was first scheduled
   * @param taskType - The type of task (activity or sub-orchestration)
   */
  constructor(
    handler: AsyncRetryHandler,
    action: pb.OrchestratorAction,
    startTime: Date,
    taskType: RetryTaskType,
  ) {
    super(action, startTime, taskType);
    this._handler = handler;
  }

  /**
   * Gets the async retry handler for this task.
   */
  get handler(): AsyncRetryHandler {
    return this._handler;
  }

  /**
   * Invokes the async retry handler to determine whether to retry.
   *
   * @param currentTime - The current orchestration time (for deterministic replay)
   * @returns A Promise that resolves to true if the handler says to retry, false otherwise
   */
  async shouldRetry(currentTime: Date): Promise<boolean> {
    if (!this.lastFailure) {
      return false;
    }

    // Check for non-retriable failures (e.g., activity not found)
    if (this.lastFailure.getIsnonretriable()) {
      return false;
    }

    const failureDetails: TaskFailureDetails = {
      errorType: this.lastFailure.getErrortype() || "Error",
      message: this.lastFailure.getErrormessage() || "",
      stackTrace: this.lastFailure.getStacktrace()?.getValue(),
    };

    const totalRetryTimeMs = currentTime.getTime() - this.startTime.getTime();

    const retryContext = createRetryContext(
      this.attemptCount,
      failureDetails,
      totalRetryTimeMs,
      false, // isCancelled - not yet supported
    );

    return this._handler(retryContext);
  }
}
