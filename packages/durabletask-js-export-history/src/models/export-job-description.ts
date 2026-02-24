// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExportCheckpoint } from "./export-checkpoint";
import { ExportJobConfiguration } from "./export-job-configuration";
import { ExportJobStatus } from "./export-job-status";

/**
 * A description of an export job, returned by query operations.
 */
export interface ExportJobDescription {
  /**
   * The unique identifier for the export job.
   */
  readonly jobId: string;

  /**
   * The current status of the export job.
   */
  readonly status: ExportJobStatus;

  /**
   * When the job was created.
   */
  readonly createdAt?: Date;

  /**
   * When the job was last modified.
   */
  readonly lastModifiedAt?: Date;

  /**
   * The job configuration.
   */
  readonly config?: ExportJobConfiguration;

  /**
   * The orchestrator instance ID running this job.
   */
  readonly orchestratorInstanceId?: string;

  /**
   * The total number of instances scanned so far.
   */
  readonly scannedInstances: number;

  /**
   * The total number of instances successfully exported so far.
   */
  readonly exportedInstances: number;

  /**
   * The last error message, if any.
   */
  readonly lastError?: string;

  /**
   * The current checkpoint for pagination.
   */
  readonly checkpoint?: ExportCheckpoint;

  /**
   * When the last checkpoint was committed.
   */
  readonly lastCheckpointTime?: Date;
}
