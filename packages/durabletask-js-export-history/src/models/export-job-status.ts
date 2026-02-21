// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Enum representing the status of an export job.
 */
export enum ExportJobStatus {
  /**
   * The export job has not been started.
   */
  Pending = "Pending",

  /**
   * The export job is actively running.
   */
  Active = "Active",

  /**
   * The export job has completed successfully.
   */
  Completed = "Completed",

  /**
   * The export job has failed.
   */
  Failed = "Failed",
}
