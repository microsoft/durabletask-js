// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Checkpoint representing the export progress cursor.
 */
export interface ExportCheckpoint {
  /**
   * The last instance key that was processed. Used for key-based pagination.
   * When null/undefined, pagination starts from the beginning.
   */
  readonly lastInstanceKey?: string;
}
