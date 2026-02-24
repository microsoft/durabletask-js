// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Configuration for the export destination (Azure Blob Storage).
 */
export interface ExportDestination {
  /**
   * The name of the blob container.
   */
  readonly container: string;

  /**
   * An optional prefix (virtual directory path) for the blob names.
   */
  readonly prefix?: string;
}
