// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/** Backend-specific configuration for durable timers, including retry delays. */
export interface DurableTimerOptions {
  /**
   * Maximum duration of each backend timer segment, in milliseconds.
   * Must be a positive safe integer. `null` disables segmentation (native timers).
   * Core workers default to native timers; host integrations may supply a different default.
   * This does not limit the total duration of a logical timer.
   *
   * Keep this setting unchanged for in-flight orchestrations: changing it can alter
   * timer IDs and replay behavior. All workers sharing a task hub must agree.
   */
  maximumTimerIntervalMs?: number | null;
}

/** @internal */
export function resolveMaximumTimerInterval(options: DurableTimerOptions): number | null {
  const interval = options.maximumTimerIntervalMs ?? null;
  if (interval !== null && (!Number.isSafeInteger(interval) || interval <= 0)) {
    throw new RangeError("maximumTimerIntervalMs must be a positive safe integer or null");
  }
  return interval;
}
