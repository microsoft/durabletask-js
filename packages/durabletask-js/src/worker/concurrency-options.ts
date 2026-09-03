// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as os from "os";

/**
 * Configures backend dispatch and prefetch concurrency hints for each work-item kind.
 *
 * These values do not enforce local worker handler concurrency, and a backend may dispatch
 * more than the requested value. Current Azure DTS versions treat 0 as no limit.
 *
 * Omitted values default to 100 times the number of logical processors available to the
 * process. Values above the protocol's signed 32-bit range are capped on the wire.
 */
export interface ConcurrencyOptions {
  /** Backend activity concurrency hint. */
  maximumConcurrentActivityWorkItems?: number;
  /** Backend orchestration concurrency hint. */
  maximumConcurrentOrchestrationWorkItems?: number;
  /** Backend entity concurrency hint. */
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
      options.maximumConcurrentActivityWorkItems === undefined
        ? defaultLimit
        : options.maximumConcurrentActivityWorkItems,
    ),
    maximumConcurrentOrchestrationWorkItems: validateLimit(
      "maximumConcurrentOrchestrationWorkItems",
      options.maximumConcurrentOrchestrationWorkItems === undefined
        ? defaultLimit
        : options.maximumConcurrentOrchestrationWorkItems,
    ),
    maximumConcurrentEntityWorkItems: validateLimit(
      "maximumConcurrentEntityWorkItems",
      options.maximumConcurrentEntityWorkItems === undefined ? defaultLimit : options.maximumConcurrentEntityWorkItems,
    ),
  };
}
