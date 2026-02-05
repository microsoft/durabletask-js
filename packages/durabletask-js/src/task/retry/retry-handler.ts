// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryContext } from "./retry-context";

/**
 * Delegate for manually handling task retries (synchronous version).
 *
 * @remarks
 * Retry handler code is an extension of the orchestrator code and must therefore
 * comply with all the determinism requirements of orchestrator code. This means:
 * - No I/O operations (file, network, database)
 * - No random number generation
 * - No accessing current date/time directly
 * - No accessing environment variables
 *
 * @param retryContext - Retry context that's updated between each retry attempt
 * @returns Returns `true` to continue retrying or `false` to stop retrying
 *
 * @example
 * ```typescript
 * const handler: RetryHandler = (context) => {
 *   // Retry up to 5 times
 *   if (context.lastAttemptNumber >= 5) {
 *     return false;
 *   }
 *   // Don't retry validation errors
 *   if (context.lastFailure.errorType === "ValidationError") {
 *     return false;
 *   }
 *   return true;
 * };
 *
 * const options = taskOptionsFromRetryHandler(handler);
 * await ctx.callActivity("myActivity", input, options);
 * ```
 */
export type RetryHandler = (retryContext: RetryContext) => boolean;

/**
 * Delegate for manually handling task retries (asynchronous version).
 *
 * @remarks
 * Retry handler code is an extension of the orchestrator code and must therefore
 * comply with all the determinism requirements of orchestrator code. This means:
 * - No I/O operations (file, network, database)
 * - No random number generation
 * - No accessing current date/time directly
 * - No accessing environment variables
 *
 * While this handler is async, the async operations should only be used for
 * deterministic orchestration operations (like waiting for events or timers),
 * not for non-deterministic I/O.
 *
 * @param retryContext - Retry context that's updated between each retry attempt
 * @returns Returns a Promise that resolves to `true` to continue retrying or `false` to stop retrying
 *
 * @example
 * ```typescript
 * const asyncHandler: AsyncRetryHandler = async (context) => {
 *   // Retry up to 5 times
 *   if (context.lastAttemptNumber >= 5) {
 *     return false;
 *   }
 *   // Add exponential backoff
 *   const delay = Math.min(1000 * Math.pow(2, context.lastAttemptNumber), 30000);
 *   // Note: In practice you would use ctx.createTimer() for deterministic delays
 *   return true;
 * };
 *
 * const options = taskOptionsFromRetryHandler(asyncHandler);
 * await ctx.callActivity("myActivity", input, options);
 * ```
 */
export type AsyncRetryHandler = (retryContext: RetryContext) => Promise<boolean>;

/**
 * Creates an AsyncRetryHandler from a synchronous RetryHandler.
 *
 * @param handler - The synchronous retry handler to wrap
 * @returns An AsyncRetryHandler that wraps the synchronous handler
 *
 * @example
 * ```typescript
 * const syncHandler: RetryHandler = (context) => context.lastAttemptNumber < 3;
 * const asyncHandler = toAsyncRetryHandler(syncHandler);
 * ```
 */
export function toAsyncRetryHandler(handler: RetryHandler): AsyncRetryHandler {
  return (context: RetryContext) => Promise.resolve(handler(context));
}
