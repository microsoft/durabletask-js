// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Enum representing the mode of an export job.
 */
export enum ExportMode {
  /**
   * Batch mode: exports all matching instances once and completes.
   */
  Batch = "Batch",

  /**
   * Continuous mode: continuously exports instances, polling for new ones after the initial batch.
   */
  Continuous = "Continuous",
}
