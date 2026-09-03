// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as os from "os";

/**
 * Configures the worker capacity hints sent to the backend.
 *
 * Omitted values default to 100 times the number of logical processors available to the
 * process. Zero is supported. Values above the protocol's signed 32-bit range are capped
 * when sent to the backend.
 */
export interface ConcurrencyOptions {
  /** Maximum concurrent activity work items the backend should dispatch. */
  maximumConcurrentActivityWorkItems?: number;
  /** Maximum concurrent orchestration work items the backend should dispatch. */
  maximumConcurrentOrchestrationWorkItems?: number;
  /** Maximum concurrent entity work-item batches the backend should dispatch. */
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
