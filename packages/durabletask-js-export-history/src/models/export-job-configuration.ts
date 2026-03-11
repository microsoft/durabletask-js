// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExportDestination } from "./export-destination";
import { ExportFilter } from "./export-filter";
import { ExportFormat } from "./export-format";
import { ExportMode } from "./export-mode";

/**
 * Configuration for an export job, derived from creation options.
 */
export interface ExportJobConfiguration {
  /**
   * The export mode (Batch or Continuous).
   */
  readonly mode: ExportMode;

  /**
   * The filter criteria for selecting instances to export.
   */
  readonly filter: ExportFilter;

  /**
   * The destination configuration for the exported data.
   */
  readonly destination: ExportDestination;

  /**
   * The format configuration for the exported data.
   */
  readonly format: ExportFormat;

  /**
   * The maximum number of instances to include in each batch.
   * @default 100
   */
  readonly maxInstancesPerBatch: number;

  /**
   * The maximum number of parallel export activities.
   * @default 32
   */
  readonly maxParallelExports: number;
}

/**
 * Default value for maxInstancesPerBatch.
 */
export const DEFAULT_MAX_INSTANCES_PER_BATCH = 100;

/**
 * Default value for maxParallelExports.
 */
export const DEFAULT_MAX_PARALLEL_EXPORTS = 32;
