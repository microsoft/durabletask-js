// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  OrchestrationContext,
  Task,
  TOrchestrator,
  EntityInstanceId,
  whenAll,
} from "@microsoft/durabletask-js";
import { ExportJobRunRequest } from "../entity/export-job";
import {
  ExportJobState,
  ExportJobStatus,
  ExportJobConfiguration,
  ExportFailure,
  CommitCheckpointRequest,
  ExportMode,
} from "../models";
import {
  LIST_TERMINAL_INSTANCES_ACTIVITY_NAME,
  EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
} from "../constants";
import { ListTerminalInstancesRequest, InstancePage } from "../activities/list-terminal-instances-activity";
import { ExportRequest, ExportResult } from "../activities/export-instance-history-activity";

const MAX_RETRY_ATTEMPTS = 3;
const MIN_BACKOFF_SECONDS = 60; // 1 minute
const MAX_BACKOFF_SECONDS = 300; // 5 minutes
const CONTINUE_AS_NEW_FREQUENCY = 5;
const CONTINUOUS_EXPORT_IDLE_DELAY_MS = 60_000; // 1 minute

/**
 * The export job orchestrator function.
 *
 * This orchestrator performs the actual export work by:
 * 1. Querying orchestration instances using ListTerminalInstancesActivity
 * 2. Exporting their history to blob storage using ExportInstanceHistoryActivity
 * 3. Committing checkpoints to track progress
 * 4. Handling batch retries with exponential backoff
 * 5. Supporting both batch and continuous export modes
 */
export const exportJobOrchestrator: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  input: ExportJobRunRequest,
): any {
  // Reconstruct EntityInstanceId from its string representation
  const jobEntityId = EntityInstanceId.fromString(input.jobEntityId);
  const jobId = jobEntityId.key;

  // Get the export job state and configuration from the entity
  const jobState: ExportJobState | null = yield ctx.entities.callEntity<ExportJobState | null>(
    jobEntityId,
    "get",
  );

  if (!jobState || !jobState.config) {
    throw new Error(`Export job '${jobId}' not found or has no configuration.`);
  }

  if (jobState.status !== ExportJobStatus.Active) {
    return null;
  }

  const config: ExportJobConfiguration = jobState.config;
  let processedCycles = input.processedCycles;

  while (true) {
    processedCycles++;
    if (processedCycles > CONTINUE_AS_NEW_FREQUENCY) {
      const newRequest: ExportJobRunRequest = {
        jobEntityId: jobEntityId.toString(),
        processedCycles: 0,
      };
      ctx.continueAsNew(newRequest, false);
      return null;
    }

    // Check if job is still active
    const currentState: ExportJobState | null = yield ctx.entities.callEntity<ExportJobState | null>(
      jobEntityId,
      "get",
    );

    if (!currentState || !currentState.config || currentState.status !== ExportJobStatus.Active) {
      return null;
    }

    // List terminal instances
    const listRequest: ListTerminalInstancesRequest = {
      completedTimeFrom: currentState.config.filter.completedTimeFrom,
      completedTimeTo: currentState.config.filter.completedTimeTo,
      runtimeStatus: currentState.config.filter.runtimeStatus,
      lastInstanceKey: currentState.checkpoint?.lastInstanceKey,
      maxInstancesPerBatch: currentState.config.maxInstancesPerBatch,
    };

    const pageResult: InstancePage = yield ctx.callActivity(
      LIST_TERMINAL_INSTANCES_ACTIVITY_NAME,
      listRequest,
    );

    const instancesToExport = pageResult.instanceIds;
    const scannedCount = instancesToExport.length;

    if (scannedCount === 0) {
      if (config.mode === ExportMode.Continuous) {
        // Wait and continue polling in continuous mode
        yield ctx.createTimer(Date.now() + CONTINUOUS_EXPORT_IDLE_DELAY_MS);
        continue;
      } else if (config.mode === ExportMode.Batch) {
        // No more instances - break to completion
        break;
      } else {
        throw new Error("Invalid export mode.");
      }
    }

    // ---- Process batch inline (no sub-generators) ----
    let batchAllSucceeded = false;
    let batchExportedCount = 0;
    let batchFailures: ExportFailure[] | undefined;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      // Schedule export activities for all instances
      const exportTasks: Task<ExportResult>[] = [];
      for (const instanceId of instancesToExport) {
        const exportRequest: ExportRequest = {
          instanceId,
          destination: config.destination,
          format: config.format,
        };
        exportTasks.push(
          ctx.callActivity<ExportRequest, ExportResult>(
            EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
            exportRequest,
          ),
        );
      }

      // Wait for all exports to complete
      const exportResults: ExportResult[] = yield whenAll(exportTasks);

      const failedResults = exportResults.filter((r) => !r.success);

      if (failedResults.length === 0) {
        batchAllSucceeded = true;
        batchExportedCount = exportResults.length;
        break;
      }

      if (attempt === MAX_RETRY_ATTEMPTS) {
        batchAllSucceeded = false;
        batchExportedCount = exportResults.filter((r) => r.success).length;
        batchFailures = failedResults.map((r) => ({
          instanceId: r.instanceId,
          reason: r.error ?? "Unknown error",
          attemptCount: attempt,
          lastAttempt: ctx.currentUtcDateTime,
        }));
        break;
      }

      // Exponential backoff before retrying
      const backoffSeconds = Math.min(
        MIN_BACKOFF_SECONDS * Math.pow(2, attempt - 1),
        MAX_BACKOFF_SECONDS,
      );
      yield ctx.createTimer(Date.now() + backoffSeconds * 1000);
    }

    // Commit checkpoint based on batch result
    if (batchAllSucceeded) {
      yield ctx.entities.callEntity(jobEntityId, "commitCheckpoint", {
        scannedInstances: scannedCount,
        exportedInstances: batchExportedCount,
        checkpoint: pageResult.nextCheckpoint,
      } as CommitCheckpointRequest);
    } else {
      yield ctx.entities.callEntity(jobEntityId, "commitCheckpoint", {
        scannedInstances: 0,
        exportedInstances: 0,
        failures: batchFailures,
      } as CommitCheckpointRequest);

      const failures = batchFailures ?? [];
      let failureDetails = failures
        .slice(0, 10)
        .map((f) => `InstanceId: ${f.instanceId}, Reason: ${f.reason}`)
        .join("; ");

      if (failures.length > 10) {
        failureDetails += ` ... and ${failures.length - 10} more failures`;
      }

      throw new Error(
        `Export job '${jobId}' batch export failed after ${MAX_RETRY_ATTEMPTS} retry attempts. ` +
          `Failure details: ${failureDetails || "No failure details available"}`,
      );
    }
  }

  // Mark as completed
  yield ctx.entities.callEntity(jobEntityId, "markAsCompleted");
  return null;
};
