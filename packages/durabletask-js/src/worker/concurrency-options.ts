// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as os from "os";

/**
 * Configures backend concurrency hints for each work-item kind.
 *
 * Omitted values default to 100 times the number of logical processors available to the
 * process. Values above the protocol's signed 32-bit range are capped on the wire.
 */
export interface ConcurrencyOptions {
  /** Maximum concurrent activity work items. */
  maximumConcurrentActivityWorkItems?: number;
  /** Maximum concurrent orchestration work items. */
  maximumConcurrentOrchestrationWorkItems?: number;
  /** Maximum concurrent entity work items. */
  maximumConcurrentEntityWorkItems?: number;
}

export interface ResolvedConcurrencyOptions {
  maximumConcurrentActivityWorkItems: number;
  maximumConcurrentOrchestrationWorkItems: number;
  maximumConcurrentEntityWorkItems: number;
}

function validateLimit(name: keyof ResolvedConcurrencyOptions, value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer, got ${value}`);
  }
  return value;
}

export function resolveConcurrencyOptions(options: ConcurrencyOptions = {}): ResolvedConcurrencyOptions {
  const defaultLimit = 100 * os.availableParallelism();
  return {
    maximumConcurrentActivityWorkItems: validateLimit(
      "maximumConcurrentActivityWorkItems",
      options.maximumConcurrentActivityWorkItems ?? defaultLimit,
    ),
    maximumConcurrentOrchestrationWorkItems: validateLimit(
      "maximumConcurrentOrchestrationWorkItems",
      options.maximumConcurrentOrchestrationWorkItems ?? defaultLimit,
    ),
    maximumConcurrentEntityWorkItems: validateLimit(
      "maximumConcurrentEntityWorkItems",
      options.maximumConcurrentEntityWorkItems ?? defaultLimit,
    ),
  };
}
