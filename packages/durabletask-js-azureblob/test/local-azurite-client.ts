// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BlobServiceClient, StoragePipelineOptions } from "@azure/storage-blob";

export function createLocalAzuriteClient(
  connectionString?: string,
  options?: StoragePipelineOptions,
): BlobServiceClient | undefined {
  if (!connectionString) return undefined;
  const service = BlobServiceClient.fromConnectionString(connectionString, options);
  if (
    !/(?:^|;)\s*BlobEndpoint=/.test(connectionString) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(new URL(service.url).hostname)
  ) {
    throw new Error("Azurite tests require an explicit local-only BlobEndpoint.");
  }
  return service;
}
