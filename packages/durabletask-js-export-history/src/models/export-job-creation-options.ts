// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationStatus } from "@microsoft/durabletask-js";
import { ExportDestination } from "./export-destination";
import { ExportFormat, ExportFormatKind, createExportFormat } from "./export-format";
import { ExportMode } from "./export-mode";
import { DEFAULT_MAX_INSTANCES_PER_BATCH, DEFAULT_MAX_PARALLEL_EXPORTS } from "./export-job-configuration";

/**
 * Options for creating a new export job.
 */
export interface ExportJobCreationOptions {
  /**
   * The unique identifier for the export job.
   */
  readonly jobId: string;

  /**
   * The export mode (Batch or Continuous).
   * @default ExportMode.Batch
   */
  readonly mode: ExportMode;

  /**
   * The earliest completed time to include (inclusive).
   */
  readonly completedTimeFrom: Date;

  /**
   * The latest completed time to include (exclusive).
   */
  readonly completedTimeTo?: Date;

  /**
   * Optional list of runtime statuses to include.
   */
  readonly runtimeStatus?: OrchestrationStatus[];

  /**
   * The export destination configuration. If not provided, it will be constructed
   * from the storage options when the job is created.
   */
  readonly destination?: ExportDestination;

  /**
   * The export format configuration.
   * @default { kind: ExportFormatKind.Jsonl, schemaVersion: "1.0" }
   */
  readonly format: ExportFormat;

  /**
   * The maximum number of instances to include in each batch.
   * @default 100
   */
  readonly maxInstancesPerBatch: number;

  /**
   * The maximum number of parallel export activities.
   * @default 10
   */
  readonly maxParallelExports: number;
}

/**
 * Creates ExportJobCreationOptions with defaults applied for optional fields.
 * @param options Partial options to create from.
 * @returns A fully populated ExportJobCreationOptions.
 */
export function createExportJobCreationOptions(
  options: Partial<ExportJobCreationOptions> & { jobId: string; completedTimeFrom: Date },
): ExportJobCreationOptions {
  return {
    jobId: options.jobId,
    mode: options.mode ?? ExportMode.Batch,
    completedTimeFrom: options.completedTimeFrom,
    completedTimeTo: options.completedTimeTo,
    runtimeStatus: options.runtimeStatus,
    destination: options.destination,
    format: options.format ?? createExportFormat(ExportFormatKind.Jsonl),
    maxInstancesPerBatch: options.maxInstancesPerBatch ?? DEFAULT_MAX_INSTANCES_PER_BATCH,
    maxParallelExports: options.maxParallelExports ?? DEFAULT_MAX_PARALLEL_EXPORTS,
  };
}
