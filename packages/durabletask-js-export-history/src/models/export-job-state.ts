// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExportCheckpoint } from "./export-checkpoint";
import { ExportJobConfiguration } from "./export-job-configuration";
import { ExportJobStatus } from "./export-job-status";

/**
 * The state of an export job entity. This is the persistent state stored in the entity.
 */
export interface ExportJobState {
  /**
   * The current status of the export job.
   */
  status: ExportJobStatus;

  /**
   * The job configuration, set when the job is created.
   */
  config?: ExportJobConfiguration;

  /**
   * The orchestrator instance ID running this job.
   */
  orchestratorInstanceId?: string;

  /**
   * When the job was created.
   */
  createdAt?: Date;

  /**
   * When the job was last modified.
   */
  lastModifiedAt?: Date;

  /**
   * The total number of instances scanned so far.
   */
  scannedInstances: number;

  /**
   * The total number of instances successfully exported so far.
   */
  exportedInstances: number;

  /**
   * The last error message, if any.
   */
  lastError?: string;

  /**
   * The current checkpoint for pagination.
   */
  checkpoint?: ExportCheckpoint;

  /**
   * When the last checkpoint was committed.
   */
  lastCheckpointTime?: Date;
}

/**
 * Creates a default initial ExportJobState.
 * @returns A new ExportJobState with NotStarted status and zero counters.
 */
export function createInitialExportJobState(): ExportJobState {
  return {
    status: ExportJobStatus.NotStarted,
    scannedInstances: 0,
    exportedInstances: 0,
  };
}
