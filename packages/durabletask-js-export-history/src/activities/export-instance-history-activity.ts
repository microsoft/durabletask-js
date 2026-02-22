// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createHash } from "crypto";
import { gzipSync } from "zlib";
import { BlobServiceClient } from "@azure/storage-blob";
import { HistoryEvent, OrchestrationStatus, TaskHubGrpcClient } from "@microsoft/durabletask-js";
import { ExportDestination, ExportFormat, ExportFormatKind, ExportHistoryStorageOptions } from "../models";

/**
 * Export request for one orchestration instance.
 */
export interface ExportRequest {
  /**
   * The instance ID to export.
   */
  readonly instanceId: string;

  /**
   * The export destination configuration.
   */
  readonly destination: ExportDestination;

  /**
   * The export format configuration.
   */
  readonly format: ExportFormat;
}

/**
 * Export result.
 */
export interface ExportResult {
  /**
   * The instance ID that was exported.
   */
  readonly instanceId: string;

  /**
   * Whether the export was successful.
   */
  readonly success: boolean;

  /**
   * The error message if the export failed.
   */
  readonly error?: string;
}

/**
 * Formats a Date to match .NET's DateTimeOffset round-trip ("O") format.
 * .NET format: "2026-02-20T15:30:00.0000000+00:00"
 * JS toISOString: "2026-02-20T15:30:00.000Z"
 * This ensures blob filename hashes match between JS and .NET implementations.
 */
function formatDateRoundTrip(date: Date): string {
  const iso = date.toISOString(); // e.g. "2026-02-20T15:30:00.000Z"
  // Pad fractional seconds to 7 digits and replace Z with +00:00
  const dotIndex = iso.lastIndexOf(".");
  const fractional = iso.substring(dotIndex + 1, iso.length - 1); // e.g. "000"
  const padded = fractional.padEnd(7, "0"); // e.g. "0000000"
  return iso.substring(0, dotIndex + 1) + padded + "+00:00";
}

/**
 * Generates a blob file name from a completed timestamp and instance ID.
 * Uses SHA-256 hash for deterministic naming.
 */
function generateBlobFileName(completedTimestamp: Date, instanceId: string, format: ExportFormat): string {
  const hashInput = `${formatDateRoundTrip(completedTimestamp)}|${instanceId}`;
  const hash = createHash("sha256").update(hashInput).digest("hex").toLowerCase();
  const extension = getFileExtension(format);
  return `${hash}.${extension}`;
}

/**
 * Gets the file extension for a given export format.
 */
function getFileExtension(format: ExportFormat): string {
  switch (format.kind) {
    case ExportFormatKind.Jsonl:
      return "jsonl.gz";
    case ExportFormatKind.Json:
      return "json";
    default:
      return "jsonl.gz";
  }
}

/**
 * Serializes history events to a string based on the export format.
 */
function serializeInstanceData(historyEvents: HistoryEvent[], format: ExportFormat): string {
  if (format.kind === ExportFormatKind.Jsonl) {
    // JSONL format: one history event per line
    return historyEvents.map((event) => JSON.stringify(event)).join("\n") + "\n";
  } else {
    // JSON format: array of history events
    return JSON.stringify(historyEvents);
  }
}

/**
 * Creates the ExportInstanceHistoryActivity function.
 * This activity exports one orchestration instance's history to the configured blob destination.
 *
 * @param client The TaskHubGrpcClient to use for fetching instance data.
 * @param storageOptions The Azure Blob Storage options.
 * @returns An activity function that exports instance history.
 */
export function createExportInstanceHistoryActivity(
  client: TaskHubGrpcClient,
  storageOptions: ExportHistoryStorageOptions,
) {
  return async function exportInstanceHistoryActivity(
    _context: unknown,
    input: ExportRequest,
  ): Promise<ExportResult> {
    if (!input) {
      throw new Error("input is required");
    }
    if (!input.instanceId) {
      throw new Error("instanceId is required");
    }
    if (!input.destination) {
      throw new Error("destination is required");
    }
    if (!input.format) {
      throw new Error("format is required");
    }

    const instanceId = input.instanceId;

    try {
      // Get instance metadata
      const metadata = await client.getOrchestrationState(instanceId, true);

      if (!metadata) {
        return {
          instanceId,
          success: false,
          error: `Instance ${instanceId} not found`,
        };
      }

      const completedTimestamp = metadata.lastUpdatedAt;
      const terminalStatuses = [
        OrchestrationStatus.COMPLETED,
        OrchestrationStatus.FAILED,
        OrchestrationStatus.TERMINATED,
      ];
      if (!terminalStatuses.includes(metadata.runtimeStatus)) {
        return {
          instanceId,
          success: false,
          error: `Instance ${instanceId} is not in a terminal state`,
        };
      }

      // Stream all history events
      const historyEvents = await client.getOrchestrationHistory(instanceId);

      // Create blob filename from hash of completed timestamp and instance ID
      const blobFileName = generateBlobFileName(completedTimestamp, instanceId, input.format);

      // Build blob path with prefix if provided
      const blobPath = input.destination.prefix
        ? `${input.destination.prefix.replace(/\/$/, "")}/${blobFileName}`
        : blobFileName;

      // Serialize history events
      const jsonContent = serializeInstanceData(historyEvents, input.format);

      // Upload to blob storage
      await uploadToBlobStorage(
        storageOptions.connectionString,
        input.destination.container,
        blobPath,
        jsonContent,
        input.format,
        instanceId,
      );

      return {
        instanceId,
        success: true,
      };
    } catch (ex) {
      return {
        instanceId,
        success: false,
        error: ex instanceof Error ? ex.message : String(ex),
      };
    }
  };
}

/**
 * Uploads content to Azure Blob Storage.
 */
async function uploadToBlobStorage(
  connectionString: string,
  containerName: string,
  blobPath: string,
  content: string,
  format: ExportFormat,
  instanceId: string,
): Promise<void> {
  const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = serviceClient.getContainerClient(containerName);

  // Ensure container exists
  await containerClient.createIfNotExists();

  const blobClient = containerClient.getBlockBlobClient(blobPath);

  const contentBytes = Buffer.from(content, "utf-8");

  if (format.kind === ExportFormatKind.Jsonl) {
    // Compress with gzip
    const compressedData = gzipSync(contentBytes);

    await blobClient.uploadData(compressedData, {
      blobHTTPHeaders: {
        blobContentType: "application/jsonl+gzip",
        blobContentEncoding: "gzip",
      },
      metadata: {
        instanceId,
      },
    });
  } else {
    // Upload uncompressed
    await blobClient.uploadData(contentBytes, {
      blobHTTPHeaders: {
        blobContentType: "application/json",
      },
      metadata: {
        instanceId,
      },
    });
  }
}
