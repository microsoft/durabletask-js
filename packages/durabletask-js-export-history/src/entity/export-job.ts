// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskEntity } from "@microsoft/durabletask-js";
import {
  ExportJobState,
  ExportJobStatus,
  ExportJobCreationOptions,
  ExportJobConfiguration,
  ExportFilter,
  CommitCheckpointRequest,
  isValidTransition,
  createInitialExportJobState,
} from "../models";
import { ExportJobInvalidTransitionError } from "../errors";
import {
  EXPORT_JOB_ORCHESTRATOR_NAME,
  getOrchestratorInstanceId,
} from "../constants";

/**
 * Input for the ExportJobOrchestrator.
 */
export interface ExportJobRunRequest {
  /**
   * The entity instance ID of the job entity in string form (e.g. "@exportjob@my-key").
   * Use EntityInstanceId.toString() to produce this value.
   */
  readonly jobEntityId: string;

  /**
   * The number of processing cycles already completed (for ContinueAsNew tracking).
   */
  readonly processedCycles: number;
}

/**
 * Durable entity that manages a history export job: lifecycle, configuration, and progress.
 *
 * Operations:
 * - create: Creates a new export job from creation options.
 * - get: Returns the current export job state.
 * - run: Starts the export orchestration.
 * - commitCheckpoint: Commits a checkpoint with progress updates.
 * - markAsCompleted: Marks the export job as completed.
 * - markAsFailed: Marks the export job as failed.
 * - delete: Deletes the export job entity.
 */
export class ExportJob extends TaskEntity<ExportJobState> {
  protected initializeState(): ExportJobState {
    return createInitialExportJobState();
  }

  /**
   * Creates a new export job from creation options.
   * After updating entity state, signals the Run operation to start the export orchestration.
   */
  create(creationOptions: ExportJobCreationOptions): void {
    if (!creationOptions) {
      throw new Error("creationOptions is required");
    }

    if (!this.canTransitionTo("create", ExportJobStatus.Active)) {
      throw new ExportJobInvalidTransitionError(
        creationOptions.jobId,
        this.state.status,
        ExportJobStatus.Active,
        "create",
      );
    }

    if (!creationOptions.destination) {
      throw new Error("Destination must be populated before creating an export job.");
    }

    const config: ExportJobConfiguration = {
      mode: creationOptions.mode,
      filter: {
        completedTimeFrom: creationOptions.completedTimeFrom,
        completedTimeTo: creationOptions.completedTimeTo,
        runtimeStatus: creationOptions.runtimeStatus,
      } as ExportFilter,
      destination: creationOptions.destination,
      format: creationOptions.format,
      maxInstancesPerBatch: creationOptions.maxInstancesPerBatch,
      maxParallelExports: creationOptions.maxParallelExports,
    };

    this.state.config = config;
    this.state.status = ExportJobStatus.Active;
    const now = new Date();
    this.state.createdAt = now;
    this.state.lastModifiedAt = now;
    this.state.lastError = undefined;

    // Reset progress counters and checkpoint for clean restart
    this.state.scannedInstances = 0;
    this.state.exportedInstances = 0;
    this.state.checkpoint = undefined;
    this.state.lastCheckpointTime = undefined;

    // Signal the startExport method to start the export orchestration
    // (aligned with .NET's context.SignalEntity(context.Id, nameof(this.Run)),
    // renamed to 'startExport' because JS TaskEntity reserves 'run' for dispatch)
    this.context!.signalEntity(this.context!.id, "startExport");
  }

  /**
   * Gets the current state of the export job.
   */
  get(): ExportJobState {
    return this.state;
  }

  /**
   * Starts the export job by starting the export orchestrator.
   * This is signaled by Create after the entity state is initialized.
   * Named 'startExport' because JS TaskEntity reserves 'run' for dispatch.
   * (.NET equivalent: ExportJob.Run)
   */
  startExport(): void {
    if (this.state.status !== ExportJobStatus.Active) {
      throw new Error("Export job must be in Active status to run.");
    }

    if (!this.state.config) {
      throw new Error("Export job has no configuration.");
    }

    this.startExportOrchestration();
  }

  /**
   * Commits a checkpoint snapshot with progress updates and optional failures.
   */
  commitCheckpoint(request: CommitCheckpointRequest): void {
    if (!request) {
      throw new Error("request is required");
    }

    // Update progress counts
    this.state.scannedInstances += request.scannedInstances;
    this.state.exportedInstances += request.exportedInstances;

    // Update checkpoint if provided (successful batch moves cursor forward)
    if (request.checkpoint !== undefined) {
      this.state.checkpoint = request.checkpoint;
    }

    // Update checkpoint time and last modified time
    const now = new Date();
    this.state.lastCheckpointTime = now;
    this.state.lastModifiedAt = now;

    // If there are failures and checkpoint is null (batch failed), mark job as failed
    if (!request.checkpoint && request.failures && request.failures.length > 0) {
      this.state.status = ExportJobStatus.Failed;
      const failureSummary = request.failures
        .map((f) => `${f.instanceId}: ${f.reason}`)
        .join("; ");
      this.state.lastError = `Batch export failed after retries. Failures: ${failureSummary}`;
    }
  }

  /**
   * Marks the export job as completed.
   */
  markAsCompleted(): void {
    if (!this.canTransitionTo("markAsCompleted", ExportJobStatus.Completed)) {
      const jobId = this.context?.id.key ?? "unknown";
      throw new ExportJobInvalidTransitionError(
        jobId,
        this.state.status,
        ExportJobStatus.Completed,
        "markAsCompleted",
      );
    }

    this.state.status = ExportJobStatus.Completed;
    this.state.lastModifiedAt = new Date();
    this.state.lastError = undefined;
  }

  /**
   * Marks the export job as failed.
   */
  markAsFailed(errorMessage?: string): void {
    if (!this.canTransitionTo("markAsFailed", ExportJobStatus.Failed)) {
      const jobId = this.context?.id.key ?? "unknown";
      throw new ExportJobInvalidTransitionError(
        jobId,
        this.state.status,
        ExportJobStatus.Failed,
        "markAsFailed",
      );
    }

    this.state.status = ExportJobStatus.Failed;
    this.state.lastError = errorMessage;
    this.state.lastModifiedAt = new Date();
  }

  /**
   * Starts the export orchestration by scheduling it from the entity context.
   * Uses a fixed instance ID to prevent concurrent orchestrators for the same job.
   */
  private startExportOrchestration(): void {
    try {
      const jobKey = this.context!.id.key;
      const instanceId = getOrchestratorInstanceId(jobKey);

      const runRequest: ExportJobRunRequest = {
        jobEntityId: this.context!.id.toString(),
        processedCycles: 0,
      };

      this.context!.scheduleNewOrchestration(
        EXPORT_JOB_ORCHESTRATOR_NAME,
        runRequest,
        { instanceId },
      );

      this.state.orchestratorInstanceId = instanceId;
      this.state.lastModifiedAt = new Date();
    } catch (ex) {
      // Mark job as failed and record the exception
      this.state.status = ExportJobStatus.Failed;
      this.state.lastError = ex instanceof Error ? ex.message : String(ex);
      this.state.lastModifiedAt = new Date();
    }
  }

  private canTransitionTo(operationName: string, targetStatus: ExportJobStatus): boolean {
    return isValidTransition(operationName, this.state.status, targetStatus);
  }
}
