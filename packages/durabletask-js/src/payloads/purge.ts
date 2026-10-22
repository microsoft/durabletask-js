// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const BlobPurgeConstants = {
  orchestrator: "BlobPurgeJobOrchestrator",
  instanceId: "BlobPurgeJob-__dt_blob_payload_autopurge__",
  fetch: "GetLargePayloadTombstonesActivity",
  delete: "DeleteExternalBlobActivity",
  report: "ReportLargePayloadPurgeResultsActivity",
  configurationEvent: "SetBatchSize",
} as const;

export enum LargePayloadPurgeDisposition {
  Unspecified = 0,
  Deleted = 1,
  Retry = 2,
  Quarantined = 3,
}

// These activity/orchestration wire shapes intentionally retain .NET's default JSON property casing.
export interface LargePayloadTombstone {
  TombstoneToken: string;
  PayloadToken: string;
}
export interface LargePayloadPurgeResult {
  TombstoneToken: string;
  Disposition: LargePayloadPurgeDisposition;
}
export interface BlobPurgeOutcome {
  Disposition: LargePayloadPurgeDisposition;
}
export interface BlobPurgeJobRunRequest {
  PurgeBatchSize: number;
  PurgedCount: number;
}

export function validatePurgeBatchSize(batchSize: number): void {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
    throw new RangeError("Purge batch size must be an integer between 1 and 1000.");
  }
}
