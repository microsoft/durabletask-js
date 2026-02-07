// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryPolicy } from "../retry/retry-policy";
import { AsyncRetryHandler, RetryHandler } from "../retry/retry-handler";

/**
 * Union type representing the available retry strategies for a task.
 *
 * - {@link RetryPolicy} for declarative retry control (with backoff, max attempts, etc.)
 * - {@link AsyncRetryHandler} for asynchronous imperative retry control
 * - {@link RetryHandler} for synchronous imperative retry control
 *
 * When a synchronous {@link RetryHandler} is provided, it is automatically
 * wrapped into an {@link AsyncRetryHandler} internally.
 */
export type TaskRetryOptions = RetryPolicy | AsyncRetryHandler | RetryHandler;

/**
 * Options that can be used to control the behavior of orchestrator task execution.
 */
export interface TaskOptions {
  /**
   * The retry options for the task.
   * Can be a RetryPolicy for declarative retry control,
   * an AsyncRetryHandler for async imperative retry control,
   * or a RetryHandler for sync imperative retry control.
   */
  retry?: TaskRetryOptions;
  /**
   * The tags to associate with the task.
   */
  tags?: Record<string, string>;
  /**
   * The version of the task (activity) to execute.
   * When specified, only workers that handle this version will process the task.
   */
  version?: string;
}

/**
 * Options that can be used to control the behavior of sub-orchestrator execution.
 * Extends TaskOptions with additional options specific to sub-orchestrations.
 */
export interface SubOrchestrationOptions extends TaskOptions {
  /**
   * The unique ID to use for the sub-orchestration instance.
   * If not specified, a deterministic ID will be generated based on the parent instance ID.
   */
  instanceId?: string;
}

/**
 * Options for scheduling new orchestrations via the client.
 */
export interface StartOrchestrationOptions {
  /**
   * The unique ID to use for the orchestration instance.
   * If not specified, a random UUID will be generated.
   */
  instanceId?: string;
  /**
   * The time when the orchestration should start executing.
   * If not specified or in the past, it will start immediately.
   */
  startAt?: Date;
  /**
   * The tags to associate with the orchestration instance.
   */
  tags?: Record<string, string>;
  /**
   * The version of the orchestration to execute.
   * This version is stored with the orchestration instance and can be accessed
   * via the OrchestrationContext.version property.
   */
  version?: string;
}

/**
 * Type guard to check if the retry option is a RetryPolicy.
 *
 * @param retry - The retry option to check
 * @returns true if the retry option is a RetryPolicy, false otherwise
 */
export function isRetryPolicy(retry: TaskRetryOptions | undefined): retry is RetryPolicy {
  return retry instanceof RetryPolicy;
}

/**
 * Type guard to check if the retry option is a retry handler function
 * (either {@link AsyncRetryHandler} or {@link RetryHandler}).
 *
 * @param retry - The retry option to check
 * @returns true if the retry option is a handler function, false otherwise
 */
export function isRetryHandler(retry: TaskRetryOptions | undefined): retry is AsyncRetryHandler | RetryHandler {
  return typeof retry === "function";
}
