// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskFailureDetails } from "../failure-details";

/**
 * Retry context data that's provided to task retry handler implementations.
 *
 * @remarks
 * This context is passed to custom retry handlers to provide information about
 * the current retry state and allow making informed decisions about whether
 * to continue retrying.
 *
 * Retry handler code is an extension of the orchestrator code and must therefore
 * comply with all the determinism requirements of orchestrator code.
 *
 * @example
 * ```typescript
 * const retryHandler: RetryHandler = (context: RetryContext) => {
 *   // Don't retry after 5 attempts
 *   if (context.lastAttemptNumber >= 5) {
 *     return false;
 *   }
 *   // Don't retry if we've been retrying for more than 5 minutes
 *   if (context.totalRetryTimeInMilliseconds > 300000) {
 *     return false;
 *   }
 *   // Don't retry certain error types
 *   if (context.lastFailure.errorType === "ValidationError") {
 *     return false;
 *   }
 *   return true;
 * };
 * ```
 */
export interface RetryContext {
  /**
   * The previous retry attempt number.
   * This is 1 after the first failure, 2 after the second, etc.
   */
  readonly lastAttemptNumber: number;

  /**
   * The details of the previous task failure.
   * Contains the error type, message, and stack trace.
   */
  readonly lastFailure: TaskFailureDetails;

  /**
   * The total amount of time spent in the retry loop for the current task, in milliseconds.
   * This includes the time spent executing the task and waiting between retries.
   */
  readonly totalRetryTimeInMilliseconds: number;

  /**
   * Whether the retry operation has been cancelled.
   * Handlers should check this and return false if cancellation is requested.
   */
  readonly isCancelled: boolean;
}

/**
 * Creates a new RetryContext object.
 *
 * @param lastAttemptNumber - The previous retry attempt number
 * @param lastFailure - The details of the previous task failure
 * @param totalRetryTimeInMilliseconds - The total time spent retrying
 * @param isCancelled - Whether cancellation has been requested
 * @returns A RetryContext object
 */
export function createRetryContext(
  lastAttemptNumber: number,
  lastFailure: TaskFailureDetails,
  totalRetryTimeInMilliseconds: number,
  isCancelled: boolean = false,
): RetryContext {
  return {
    lastAttemptNumber,
    lastFailure,
    totalRetryTimeInMilliseconds,
    isCancelled,
  };
}
