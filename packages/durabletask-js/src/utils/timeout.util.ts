// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TimeoutError } from "../exception/timeout-error";

/**
 * Races a promise against a timeout, throwing a {@link TimeoutError} if the
 * timeout expires first. The timer is always cleaned up regardless of outcome.
 *
 * @param promise - The promise to race against the timeout.
 * @param timeoutMs - The timeout duration in milliseconds.
 * @param makeErrorMessage - A function that returns the error message for the TimeoutError.
 * @returns The resolved value of the promise if it settles before the timeout.
 */
export async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  makeErrorMessage: () => string,
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new RangeError(`timeoutMs must be a finite number >= 0, got ${timeoutMs}`);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await (Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          let message: string;
          try {
            message = makeErrorMessage();
          } catch {
            message = `Operation timed out after ${timeoutMs}ms`;
          }
          reject(new TimeoutError(message));
        }, timeoutMs);
      }),
    ]) as Promise<T>);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
