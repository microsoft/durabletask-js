// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExportCheckpoint } from "./export-checkpoint";
import { ExportFailure } from "./export-failure";

/**
 * Request to commit a checkpoint with progress updates and failures.
 */
export interface CommitCheckpointRequest {
  /**
   * The number of instances scanned in this batch.
   */
  readonly scannedInstances: number;

  /**
   * The number of instances successfully exported in this batch.
   */
  readonly exportedInstances: number;

  /**
   * The checkpoint to commit. If provided, the checkpoint is updated (cursor moves forward).
   * If undefined, the current checkpoint is kept (cursor does not move forward), allowing retry of the same batch.
   */
  readonly checkpoint?: ExportCheckpoint;

  /**
   * The list of failed instance exports, if any.
   */
  readonly failures?: ExportFailure[];
}
