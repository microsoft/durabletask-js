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

// NOTE: Per-activity RetryPolicy is intentionally omitted due to a DTS server-side bug
// where RetryPolicy timestamps cause "Timestamp contains invalid values" errors.
// Fault tolerance is provided by the batch-level retry loop with exponential backoff.
// TODO: Restore RetryPolicy once the DTS Timestamp bug is fixed.
// See .NET equivalent: ExportActivityRetryPolicy (3 attempts, 15s first retry, 2x backoff, 60s max)

/**
 * Batch export result tracking success/failure across a batch.
 */
interface BatchExportResult {
  readonly allSucceeded: boolean;
  readonly exportedCount: number;
  readonly failures: ExportFailure[] | undefined;
}

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

  try {
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
          yield ctx.createTimer(new Date(ctx.currentUtcDateTime.getTime() + CONTINUOUS_EXPORT_IDLE_DELAY_MS));
          continue;
        } else if (config.mode === ExportMode.Batch) {
          // No more instances - break to completion
          break;
        } else {
          throw new Error("Invalid export mode.");
        }
      }

      // Process batch with retry logic
      const batchResult: BatchExportResult = yield* processBatchWithRetry(
        ctx,
        instancesToExport,
        config,
      );

      // Commit checkpoint based on batch result
      if (batchResult.allSucceeded) {
        yield* commitCheckpoint(ctx, jobEntityId, {
          scannedInstances: scannedCount,
          exportedInstances: batchResult.exportedCount,
          checkpoint: pageResult.nextCheckpoint,
        } as CommitCheckpointRequest);

        // If the server returned no continuation token, all matching instances fit in this page.
        // Break now to avoid re-listing the same instances (which would cause an infinite loop
        // because exported instances are not removed from the task hub).
        const hasMorePages =
          pageResult.nextCheckpoint?.lastInstanceKey !== undefined &&
          pageResult.nextCheckpoint?.lastInstanceKey !== null;
        if (config.mode === ExportMode.Batch && !hasMorePages) {
          break;
        }
      } else {
        yield* commitCheckpoint(ctx, jobEntityId, {
          scannedInstances: 0,
          exportedInstances: 0,
          failures: batchResult.failures,
        } as CommitCheckpointRequest);

        const failures = batchResult.failures ?? [];
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
    yield* markAsCompleted(ctx, jobEntityId);
    return null;
  } catch (ex) {
    // Mark the entity as failed before re-throwing
    const errorMessage = ex instanceof Error ? ex.message : String(ex);
    yield* markAsFailed(ctx, jobEntityId, errorMessage);
    throw ex;
  }
};

/**
 * Processes a batch of instance exports with retry logic.
 */
async function* processBatchWithRetry(
  ctx: OrchestrationContext,
  instanceIds: string[],
  config: ExportJobConfiguration,
): AsyncGenerator<any, BatchExportResult, any> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    // Export all instances in the batch, respecting MaxParallelExports
    const results: ExportResult[] = yield* exportBatch(ctx, instanceIds, config);

    const failedResults = results.filter((r) => !r.success);

    if (failedResults.length === 0) {
      return {
        allSucceeded: true,
        exportedCount: results.length,
        failures: undefined,
      };
    }

    if (attempt === MAX_RETRY_ATTEMPTS) {
      return {
        allSucceeded: false,
        exportedCount: results.filter((r) => r.success).length,
        failures: failedResults.map((r) => ({
          instanceId: r.instanceId,
          reason: r.error ?? "Unknown error",
          attemptCount: attempt,
          lastAttempt: ctx.currentUtcDateTime,
        })),
      };
    }

    // Exponential backoff before retrying
    const backoffSeconds = Math.min(
      MIN_BACKOFF_SECONDS * Math.pow(2, attempt - 1),
      MAX_BACKOFF_SECONDS,
    );
    yield ctx.createTimer(new Date(ctx.currentUtcDateTime.getTime() + backoffSeconds * 1000));
  }

  // Should not reach here
  return { allSucceeded: true, exportedCount: 0, failures: undefined };
}

/**
 * Exports a batch of instances, limiting parallelism via config.maxParallelExports.
 * Individual activities use the exportActivityRetryPolicy.
 */
async function* exportBatch(
  ctx: OrchestrationContext,
  instanceIds: string[],
  config: ExportJobConfiguration,
): AsyncGenerator<any, ExportResult[], any> {
  const results: ExportResult[] = [];
  let exportTasks: Task<ExportResult>[] = [];

  for (const instanceId of instanceIds) {
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

    // Limit parallel export activities
    if (exportTasks.length >= config.maxParallelExports) {
      const batchResults: ExportResult[] = yield whenAll(exportTasks);
      results.push(...batchResults);
      exportTasks = [];
    }
  }

  // Wait for remaining export activities
  if (exportTasks.length > 0) {
    const remainingResults: ExportResult[] = yield whenAll(exportTasks);
    results.push(...remainingResults);
  }

  return results;
}

/**
 * Commits a checkpoint to the entity.
 */
async function* commitCheckpoint(
  ctx: OrchestrationContext,
  jobEntityId: EntityInstanceId,
  request: CommitCheckpointRequest,
): AsyncGenerator<any, void, any> {
  yield ctx.entities.callEntity(jobEntityId, "commitCheckpoint", request);
}

/**
 * Marks the entity as completed.
 */
async function* markAsCompleted(
  ctx: OrchestrationContext,
  jobEntityId: EntityInstanceId,
): AsyncGenerator<any, void, any> {
  yield ctx.entities.callEntity(jobEntityId, "markAsCompleted");
}

/**
 * Marks the entity as failed.
 */
async function* markAsFailed(
  ctx: OrchestrationContext,
  jobEntityId: EntityInstanceId,
  errorMessage?: string,
): AsyncGenerator<any, void, any> {
  yield ctx.entities.callEntity(jobEntityId, "markAsFailed", errorMessage);
}
