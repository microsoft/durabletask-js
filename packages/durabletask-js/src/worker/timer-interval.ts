// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const DEFAULT_MAXIMUM_TIMER_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

export function resolveMaximumTimerInterval(
  interval: number | null = DEFAULT_MAXIMUM_TIMER_INTERVAL_MS,
): number | null {
  if (interval !== null && !Number.isFinite(interval)) {
    throw new RangeError("maximumTimerIntervalMs must be a finite number or null");
  }
  // Date has millisecond precision; never round a positive interval down to zero.
  return interval !== null && interval > 0 ? Math.ceil(interval) : interval;
}
