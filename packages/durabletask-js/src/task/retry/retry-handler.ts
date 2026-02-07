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
 * @returns Returns `true` to retry immediately, `false` to stop retrying,
 *   or a positive number to retry after that many milliseconds
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
 *   // Exponential backoff: 1s, 2s, 4s, 8s, ...
 *   return 1000 * Math.pow(2, context.lastAttemptNumber - 1);
 * };
 *
 * await ctx.callActivity("myActivity", input, { retry: handler });
 * ```
 */
export type RetryHandler = (retryContext: RetryContext) => boolean | number;

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
 * @returns Returns a Promise that resolves to `true` to retry immediately,
 *   `false` to stop retrying, or a positive number to retry after that many milliseconds
 *
 * @example
 * ```typescript
 * const asyncHandler: AsyncRetryHandler = async (context) => {
 *   // Retry up to 5 times
 *   if (context.lastAttemptNumber >= 5) {
 *     return false;
 *   }
 *   // Exponential backoff: 1s, 2s, 4s, 8s, ...
 *   return 1000 * Math.pow(2, context.lastAttemptNumber - 1);
 * };
 *
 * await ctx.callActivity("myActivity", input, { retry: asyncHandler });
 * ```
 */
export type AsyncRetryHandler = (retryContext: RetryContext) => Promise<boolean | number>;

/**
 * The result type returned by retry handlers.
 *
 * - `true` — retry immediately
 * - `false` — stop retrying (the task fails)
 * - a positive `number` — retry after that many milliseconds
 */
export type RetryHandlerResult = boolean | number;

/**
 * Normalizes a retry handler to an {@link AsyncRetryHandler}.
 *
 * If the handler is already an {@link AsyncRetryHandler}, wrapping it with
 * `Promise.resolve` is a no-op since `Promise.resolve(promise)` returns the
 * same promise.  If it is a synchronous {@link RetryHandler}, the result
 * is lifted into a resolved `Promise`.
 *
 * @param handler - A synchronous or asynchronous retry handler
 * @returns An AsyncRetryHandler
 *
 * @example
 * ```typescript
 * const syncHandler: RetryHandler = (context) => context.lastAttemptNumber < 3;
 * const asyncHandler = toAsyncRetryHandler(syncHandler);
 * ```
 */
export function toAsyncRetryHandler(handler: RetryHandler | AsyncRetryHandler): AsyncRetryHandler {
  return (context: RetryContext) => Promise.resolve(handler(context));
}
