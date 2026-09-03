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

function getLogicalProcessorCount(): number {
  try {
    const available = typeof os.availableParallelism === "function" ? os.availableParallelism() : undefined;
    if (typeof available === "number" && Number.isSafeInteger(available) && available > 0) {
      return Math.min(available, Math.floor(Number.MAX_SAFE_INTEGER / 100));
    }
  } catch {
    // Fall through for runtimes/platforms where availableParallelism() is unavailable.
  }

  try {
    const cpuCount = os.cpus().length;
    if (Number.isSafeInteger(cpuCount) && cpuCount > 0) {
      return Math.min(cpuCount, Math.floor(Number.MAX_SAFE_INTEGER / 100));
    }
  } catch {
    // A conservative single-processor default is safer than failing worker construction.
  }
  return 1;
}

function validateLimit(name: keyof ResolvedConcurrencyOptions, value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer, got ${value}`);
  }
  return value;
}

export function resolveConcurrencyOptions(options: ConcurrencyOptions = {}): ResolvedConcurrencyOptions {
  const defaultLimit = 100 * getLogicalProcessorCount();
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
