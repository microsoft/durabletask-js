// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Configuration options for Azure Blob Storage used by export history.
 */
export interface ExportHistoryStorageOptions {
  /**
   * The Azure Storage connection string.
   */
  connectionString: string;

  /**
   * The name of the blob container to use for exports.
   */
  containerName: string;

  /**
   * An optional default prefix for blob names within the container.
   */
  prefix?: string;
}
