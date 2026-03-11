// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskHubGrpcClient, TaskHubGrpcWorker } from "@microsoft/durabletask-js";
import { ExportHistoryStorageOptions } from "../models";
import { ExportHistoryClient } from "../client/export-history-client";
import { ExportJob } from "../entity/export-job";
import { exportJobOrchestrator } from "../orchestrators/export-job-orchestrator";
import { executeExportJobOperationOrchestrator } from "../orchestrators/execute-export-job-operation-orchestrator";
import { createListTerminalInstancesActivity } from "../activities/list-terminal-instances-activity";
import { createExportInstanceHistoryActivity } from "../activities/export-instance-history-activity";
import {
  EXPORT_JOB_ENTITY_NAME,
  EXPORT_JOB_ORCHESTRATOR_NAME,
  EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME,
  EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
  LIST_TERMINAL_INSTANCES_ACTIVITY_NAME,
} from "../constants";

/**
 * Options for configuring export history on a worker.
 */
export interface UseExportHistoryWorkerOptions {
  /**
   * The TaskHubGrpcClient used by the activities to query orchestration data.
   */
  readonly client: TaskHubGrpcClient;

  /**
   * Azure Blob Storage configuration for the export destination.
   */
  readonly storageOptions: ExportHistoryStorageOptions;
}

/**
 * Registers the export history entity, orchestrators, and activities with a worker.
 *
 * @param worker The TaskHubGrpcWorker to register export history components with.
 * @param options Configuration options including the client and storage options.
 *
 * @remarks
 * This function registers the following components:
 * - ExportJob entity
 * - ExportJobOrchestrator
 * - ExecuteExportJobOperationOrchestrator
 * - ExportInstanceHistoryActivity
 * - ListTerminalInstancesActivity
 *
 * @example
 * ```typescript
 * const client = new TaskHubGrpcClient("localhost:4001");
 * const worker = new TaskHubGrpcWorker("localhost:4001");
 *
 * useExportHistoryWorker(worker, {
 *   client,
 *   storageOptions: {
 *     connectionString: "UseDevelopmentStorage=true",
 *     containerName: "export-history",
 *   },
 * });
 *
 * await worker.start();
 * ```
 */
export function useExportHistoryWorker(
  worker: TaskHubGrpcWorker,
  options: UseExportHistoryWorkerOptions,
): void {
  if (!options.storageOptions.connectionString) {
    throw new Error("ExportHistoryStorageOptions.connectionString is required");
  }

  if (!options.storageOptions.containerName) {
    throw new Error("ExportHistoryStorageOptions.containerName is required");
  }

  // Register the ExportJob entity
  worker.addNamedEntity(EXPORT_JOB_ENTITY_NAME, () => new ExportJob());

  // Register orchestrators
  worker.addNamedOrchestrator(EXPORT_JOB_ORCHESTRATOR_NAME, exportJobOrchestrator);
  worker.addNamedOrchestrator(
    EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME,
    executeExportJobOperationOrchestrator,
  );

  // Register activities (these require the client and storage options for closure)
  const listActivity = createListTerminalInstancesActivity(options.client);
  const exportActivity = createExportInstanceHistoryActivity(options.client, options.storageOptions);

  worker.addNamedActivity(LIST_TERMINAL_INSTANCES_ACTIVITY_NAME, listActivity);
  worker.addNamedActivity(EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME, exportActivity);
}

/**
 * Creates an ExportHistoryClient configured with the given client and storage options.
 *
 * @param client The TaskHubGrpcClient to use for orchestration interactions.
 * @param storageOptions Azure Blob Storage configuration for the export destination.
 * @returns A configured ExportHistoryClient instance.
 *
 * @example
 * ```typescript
 * const client = new TaskHubGrpcClient("localhost:4001");
 * const exportClient = createExportHistoryClient(client, {
 *   connectionString: "UseDevelopmentStorage=true",
 *   containerName: "export-history",
 * });
 *
 * const jobClient = exportClient.getJobClient("my-job-id");
 * await jobClient.create({
 *   destination: { container: "exports" },
 *   filter: { completedTimeFrom: new Date("2024-01-01") },
 * });
 * ```
 */
export function createExportHistoryClient(
  client: TaskHubGrpcClient,
  storageOptions: ExportHistoryStorageOptions,
): ExportHistoryClient {
  if (!storageOptions.connectionString) {
    throw new Error("ExportHistoryStorageOptions.connectionString is required");
  }

  if (!storageOptions.containerName) {
    throw new Error("ExportHistoryStorageOptions.containerName is required");
  }

  return new ExportHistoryClient(client, storageOptions);
}
