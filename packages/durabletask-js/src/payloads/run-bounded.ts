// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/** Stops dispatch on failure/cancellation, drains started I/O, then throws the first message-order failure. */
export async function runBounded(operations: (() => Promise<void>)[], signal?: AbortSignal): Promise<void> {
  const active = new Set<Promise<void>>();
  const failures = new Map<number, unknown>();
  let cancellationPreventedDispatch = false;
  for (let ordinal = 0; ordinal < operations.length; ordinal++) {
    if (active.size >= 8) await Promise.race(active);
    if (failures.size) break;
    if (signal?.aborted) {
      cancellationPreventedDispatch = true;
      break;
    }
    const operation = operations[ordinal];
    const tracked = (async () => {
      try {
        await operation();
      } catch (error) {
        failures.set(ordinal, error);
      }
    })();
    active.add(tracked);
    void tracked.then(() => active.delete(tracked));
    // Observe synchronously rejected operations before claiming the next dispatch.
    await Promise.resolve();
  }
  await Promise.all(active);
  if (failures.size) throw failures.get(Math.min(...failures.keys()));
  if (cancellationPreventedDispatch) signal?.throwIfAborted();
}
