// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryPolicy } from "../retry/retry-policy";

/**
 * Options that can be used to control the behavior of orchestrator task execution.
 */
export interface TaskOptions {
  /**
   * The retry policy for the task.
   * Controls how many times a task is retried and the delay between retries.
   */
  retry?: RetryPolicy;
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
