// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { randomUUID } from "crypto";
import { OrchestrationStatus } from "@microsoft/durabletask-js";
import { ExportDestination } from "./export-destination";
import { ExportFormat, ExportFormatKind, createExportFormat } from "./export-format";
import { ExportMode } from "./export-mode";
import { DEFAULT_MAX_INSTANCES_PER_BATCH, DEFAULT_MAX_PARALLEL_EXPORTS } from "./export-job-configuration";
import { ExportJobClientValidationError } from "../errors";

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
   * @default 32
   */
  readonly maxParallelExports: number;
}

/**
 * Creates ExportJobCreationOptions with defaults applied for optional fields.
 * @param options Partial options to create from.
 * @returns A fully populated ExportJobCreationOptions.
 */
export function createExportJobCreationOptions(
  options: Partial<ExportJobCreationOptions> & { completedTimeFrom: Date },
): ExportJobCreationOptions {
  // Generate GUID if jobId not provided (matches .NET: Guid.NewGuid().ToString("N"))
  const jobId = options.jobId && options.jobId.trim() !== "" ? options.jobId : randomUUID().replace(/-/g, "");
  const mode = options.mode ?? ExportMode.Batch;

  // Validate mode-specific requirements (aligned with .NET ExportJobCreationOptions constructor)
  if (mode === ExportMode.Batch) {
    if (!options.completedTimeFrom) {
      throw new ExportJobClientValidationError(
        "CompletedTimeFrom is required for Batch export mode.",
        "completedTimeFrom",
      );
    }
    if (!options.completedTimeTo) {
      throw new ExportJobClientValidationError(
        "CompletedTimeTo is required for Batch export mode.",
        "completedTimeTo",
      );
    }
    if (options.completedTimeTo <= options.completedTimeFrom) {
      throw new ExportJobClientValidationError(
        `CompletedTimeTo(${options.completedTimeTo.toISOString()}) must be greater than CompletedTimeFrom(${options.completedTimeFrom.toISOString()}).`,
        "completedTimeTo",
      );
    }
    if (options.completedTimeTo > new Date()) {
      throw new ExportJobClientValidationError(
        `CompletedTimeTo(${options.completedTimeTo.toISOString()}) cannot be in the future.`,
        "completedTimeTo",
      );
    }
  } else if (mode === ExportMode.Continuous) {
    if (options.completedTimeTo) {
      throw new ExportJobClientValidationError(
        "CompletedTimeTo is not allowed for Continuous export mode.",
        "completedTimeTo",
      );
    }
  } else {
    throw new ExportJobClientValidationError("Invalid export mode.", "mode");
  }

  // Validate maxInstancesPerBatch range
  if (
    options.maxInstancesPerBatch !== undefined &&
    (options.maxInstancesPerBatch <= 0 || options.maxInstancesPerBatch > 1000)
  ) {
    throw new ExportJobClientValidationError(
      "MaxInstancesPerBatch must be between 1 and 1000.",
      "maxInstancesPerBatch",
    );
  }

  // Validate runtimeStatus (only terminal statuses allowed)
  const terminalStatuses = [
    OrchestrationStatus.COMPLETED,
    OrchestrationStatus.FAILED,
    OrchestrationStatus.TERMINATED,
  ];
  if (
    options.runtimeStatus &&
    options.runtimeStatus.length > 0 &&
    options.runtimeStatus.some((s) => !terminalStatuses.includes(s))
  ) {
    throw new ExportJobClientValidationError(
      "Export supports terminal orchestration statuses only. Valid statuses are: Completed, Failed, and Terminated.",
      "runtimeStatus",
    );
  }

  // Default runtimeStatus to all terminal statuses if not provided
  const runtimeStatus =
    options.runtimeStatus && options.runtimeStatus.length > 0
      ? options.runtimeStatus
      : terminalStatuses;

  // Validate maxParallelExports range
  const validatedMaxParallelExports = options.maxParallelExports ?? DEFAULT_MAX_PARALLEL_EXPORTS;
  if (validatedMaxParallelExports <= 0) {
    throw new ExportJobClientValidationError(
      "MaxParallelExports must be greater than 0.",
      "maxParallelExports",
    );
  }

  return {
    jobId,
    mode,
    completedTimeFrom: options.completedTimeFrom,
    completedTimeTo: options.completedTimeTo,
    runtimeStatus,
    destination: options.destination,
    format: options.format ?? createExportFormat(ExportFormatKind.Jsonl),
    maxInstancesPerBatch: options.maxInstancesPerBatch ?? DEFAULT_MAX_INSTANCES_PER_BATCH,
    maxParallelExports: validatedMaxParallelExports,
  };
}
