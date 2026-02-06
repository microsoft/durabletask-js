// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryPolicy } from "../retry/retry-policy";
import { AsyncRetryHandler, RetryHandler, toAsyncRetryHandler } from "../retry/retry-handler";

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
 * Creates a TaskOptions instance from a RetryPolicy.
 *
 * @param policy - The retry policy to use
 * @returns A TaskOptions instance configured with the retry policy
 *
 * @example
 * ```typescript
 * const retryPolicy = new RetryPolicy({
 *   maxNumberOfAttempts: 3,
 *   firstRetryIntervalInMilliseconds: 1000
 * });
 *
 * const options = taskOptionsFromRetryPolicy(retryPolicy);
 * ```
 */
export function taskOptionsFromRetryPolicy(policy: RetryPolicy): TaskOptions {
  return { retry: policy };
}

/**
 * Creates a TaskOptions instance from an AsyncRetryHandler.
 *
 * @param handler - The async retry handler to use
 * @returns A TaskOptions instance configured with the retry handler
 *
 * @example
 * ```typescript
 * const handler: AsyncRetryHandler = async (context) => {
 *   if (context.lastAttemptNumber >= 5) return false;
 *   if (context.lastFailure.errorType === "ValidationError") return false;
 *   return true;
 * };
 *
 * const options = taskOptionsFromRetryHandler(handler);
 * await ctx.callActivity("myActivity", input, options);
 * ```
 */
export function taskOptionsFromRetryHandler(handler: AsyncRetryHandler): TaskOptions {
  return { retry: handler };
}

/**
 * Creates a TaskOptions instance from a synchronous RetryHandler.
 *
 * @param handler - The sync retry handler to use (will be wrapped in a Promise)
 * @returns A TaskOptions instance configured with the retry handler
 *
 * @example
 * ```typescript
 * const handler: RetryHandler = (context) => {
 *   return context.lastAttemptNumber < 3;
 * };
 *
 * const options = taskOptionsFromSyncRetryHandler(handler);
 * await ctx.callActivity("myActivity", input, options);
 * ```
 */
export function taskOptionsFromSyncRetryHandler(handler: RetryHandler): TaskOptions {
  return { retry: toAsyncRetryHandler(handler) };
}

/**
 * Creates a SubOrchestrationOptions instance from a RetryPolicy and optional instance ID.
 *
 * @param policy - The retry policy to use
 * @param instanceId - Optional instance ID for the sub-orchestration
 * @returns A SubOrchestrationOptions instance configured with the retry policy
 *
 * @example
 * ```typescript
 * const retryPolicy = new RetryPolicy({
 *   maxNumberOfAttempts: 3,
 *   firstRetryIntervalInMilliseconds: 1000
 * });
 *
 * const options = subOrchestrationOptionsFromRetryPolicy(retryPolicy, "my-sub-orch-123");
 * ```
 */
export function subOrchestrationOptionsFromRetryPolicy(
  policy: RetryPolicy,
  instanceId?: string,
): SubOrchestrationOptions {
  return { retry: policy, instanceId };
}

/**
 * Creates a SubOrchestrationOptions instance from an AsyncRetryHandler and optional instance ID.
 *
 * @param handler - The async retry handler to use
 * @param instanceId - Optional instance ID for the sub-orchestration
 * @returns A SubOrchestrationOptions instance configured with the retry handler
 *
 * @example
 * ```typescript
 * const handler: AsyncRetryHandler = async (context) => {
 *   return context.lastAttemptNumber < 3;
 * };
 *
 * const options = subOrchestrationOptionsFromRetryHandler(handler, "my-sub-orch-123");
 * ```
 */
export function subOrchestrationOptionsFromRetryHandler(
  handler: AsyncRetryHandler,
  instanceId?: string,
): SubOrchestrationOptions {
  return { retry: handler, instanceId };
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
