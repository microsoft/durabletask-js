// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { OrchestrationContext } from "./context/orchestration-context";
import { RetryTaskBase, RetryTaskType } from "./retry-task-base";
import { AsyncRetryHandler, RetryHandlerResult } from "./retry/retry-handler";
import { createRetryContext } from "./retry/retry-context";
import { TaskFailureDetails } from "./failure-details";
import { convertFailureDetails } from "../utils/failure-details.util";

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
  private readonly _orchestrationContext: OrchestrationContext;

  /**
   * Creates a new RetryHandlerTask instance.
   *
   * @param handler - The async retry handler for imperative retry decisions
   * @param orchestrationContext - The orchestration context for the current execution
   * @param action - The orchestrator action associated with this task
   * @param startTime - The time when the task was first scheduled
   * @param taskType - The type of task (activity or sub-orchestration)
   */
  constructor(
    handler: AsyncRetryHandler,
    orchestrationContext: OrchestrationContext,
    action: pb.OrchestratorAction,
    startTime: Date,
    taskType: RetryTaskType,
  ) {
    super(action, startTime, taskType);
    if (!handler) {  
        throw new Error("RetryHandlerTask requires a non-null handler");  
    }
    this._handler = handler;
    this._orchestrationContext = orchestrationContext;
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
   * @returns A Promise that resolves to `true` to retry immediately,
   *   `false` to stop retrying, or a positive number indicating the
   *   delay in milliseconds before the next retry attempt
   */
  async shouldRetry(currentTime: Date): Promise<RetryHandlerResult> {
    if (!this.lastFailure) {
      return false;
    }

    // Check for non-retriable failures (e.g., activity not found)
    if (this.lastFailure.getIsnonretriable()) {
      return false;
    }

    const details = convertFailureDetails(this.lastFailure);
    const failureDetails: TaskFailureDetails = {
      errorType: details.errorType || "Error",
      message: details.message,
      stackTrace: details.stackTrace,
      innerFailure: details.innerFailure,
    };

    const totalRetryTimeMs = currentTime.getTime() - this.startTime.getTime();

    const retryContext = createRetryContext(
      this._orchestrationContext,
      this.attemptCount,
      failureDetails,
      totalRetryTimeMs,
    );

    return this._handler(retryContext);
  }
}
