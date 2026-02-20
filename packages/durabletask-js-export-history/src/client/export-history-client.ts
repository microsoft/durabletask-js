// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  TaskHubGrpcClient,
  EntityInstanceId,
  OrchestrationStatus,
  AsyncPageable,
  createAsyncPageable,
  Page,
} from "@microsoft/durabletask-js";
import {
  ExportJobCreationOptions,
  ExportJobDescription,
  ExportJobQuery,
  ExportJobState,
  ExportDestination,
  ExportHistoryStorageOptions,
  DEFAULT_EXPORT_JOB_QUERY_PAGE_SIZE,
} from "../models";
import {
  EXPORT_JOB_ENTITY_NAME,
  EXPORT_JOB_ORCHESTRATOR_NAME,
  EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME,
  getOrchestratorInstanceId,
} from "../constants";
import { ExportJobNotFoundError } from "../errors";
import { ExportJobOperationRequest } from "../orchestrators/execute-export-job-operation-orchestrator";
import { ExportJobRunRequest } from "../entity/export-job";

/**
 * Client for managing export history jobs.
 *
 * This client provides methods to create, query, and manage export jobs
 * by interacting with the export job entity through orchestrations.
 */
export class ExportHistoryClient {
  private readonly client: TaskHubGrpcClient;
  private readonly storageOptions: ExportHistoryStorageOptions;

  constructor(client: TaskHubGrpcClient, storageOptions: ExportHistoryStorageOptions) {
    if (!client) throw new Error("client is required");
    if (!storageOptions) throw new Error("storageOptions is required");

    this.client = client;
    this.storageOptions = storageOptions;
  }

  /**
   * Creates a new export job.
   * @param options The options for the export job.
   * @returns A client for managing the created export job.
   */
  async createJob(options: ExportJobCreationOptions): Promise<ExportHistoryJobClient> {
    if (!options) throw new Error("options is required");

    const jobClient = this.getJobClient(options.jobId);
    await jobClient.create(options);
    return jobClient;
  }

  /**
   * Gets an export job by ID.
   * @param jobId The ID of the export job.
   * @returns The export job description.
   * @throws ExportJobNotFoundError if the job is not found.
   */
  async getJob(jobId: string): Promise<ExportJobDescription> {
    if (!jobId) throw new Error("jobId is required");

    const jobClient = this.getJobClient(jobId);
    return jobClient.describe();
  }

  /**
   * Lists export jobs matching the optional filter.
   * @param filter Optional query parameters.
   * @returns An async pageable of export job descriptions.
   */
  listJobs(filter?: ExportJobQuery): AsyncPageable<ExportJobDescription> {
    return createAsyncPageable(async (_continuationToken?: string) => {
      // Use the operation orchestrator to get entity state
      // We query orchestration instances that match the export job pattern
      const _instanceIdPrefix = `@${EXPORT_JOB_ENTITY_NAME.toLowerCase()}@${filter?.jobIdPrefix ?? ""}`;
      const _pageSize = filter?.pageSize ?? DEFAULT_EXPORT_JOB_QUERY_PAGE_SIZE;

      // Since we don't have direct entity query APIs in the JS client,
      // we need to list orchestration instances and filter
      // For now, we'll use the entity-based approach with individual gets
      // This is a simplified implementation that may need enhancement
      // when entity query APIs become available in the JS SDK

      // Return a page of results
      // Note: Full entity listing requires gRPC entity query support
      // which is not yet available in the JS SDK
      const jobs: ExportJobDescription[] = [];
      return new Page<ExportJobDescription>(jobs, undefined);
    });
  }

  /**
   * Gets a job client for the specified job ID.
   * @param jobId The job ID.
   * @returns An ExportHistoryJobClient for managing the job.
   */
  getJobClient(jobId: string): ExportHistoryJobClient {
    if (!jobId) throw new Error("jobId is required");
    return new ExportHistoryJobClient(this.client, jobId, this.storageOptions);
  }
}

/**
 * Client for managing a specific export history job.
 *
 * This client provides methods to create, describe, and delete
 * a specific export job by interacting with the entity through orchestrations.
 */
export class ExportHistoryJobClient {
  private readonly client: TaskHubGrpcClient;
  private readonly jobId: string;
  private readonly storageOptions: ExportHistoryStorageOptions;
  private readonly entityId: EntityInstanceId;

  constructor(
    client: TaskHubGrpcClient,
    jobId: string,
    storageOptions: ExportHistoryStorageOptions,
  ) {
    if (!client) throw new Error("client is required");
    if (!jobId) throw new Error("jobId is required");
    if (!storageOptions) throw new Error("storageOptions is required");

    this.client = client;
    this.jobId = jobId;
    this.storageOptions = storageOptions;
    this.entityId = new EntityInstanceId(EXPORT_JOB_ENTITY_NAME, jobId);
  }

  /**
   * Creates the export job.
   * @param options The creation options.
   */
  async create(options: ExportJobCreationOptions): Promise<void> {
    if (!options) throw new Error("options is required");

    // Determine destination
    const defaultPrefix = `${options.mode.toLowerCase()}-${this.jobId}/`;
    const prefix = options.destination?.prefix ?? this.storageOptions.prefix ?? defaultPrefix;
    const container = options.destination?.container ?? this.storageOptions.containerName;

    const destination: ExportDestination = { container, prefix };
    const optionsWithDestination: ExportJobCreationOptions = {
      ...options,
      destination,
    };

    const request: ExportJobOperationRequest = {
      entityId: this.entityId.toString(),
      operationName: "create",
      input: optionsWithDestination,
    };

    const instanceId = await this.client.scheduleNewOrchestration(
      EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME,
      request,
    );

    // Wait for the orchestration to complete
    const state = await this.client.waitForOrchestrationCompletion(instanceId, true, 120);

    if (!state || state.runtimeStatus !== OrchestrationStatus.COMPLETED) {
      throw new Error(
        `Failed to create export job '${this.jobId}': ${state?.failureDetails?.message ?? "Unknown error"}`,
      );
    }

    // Schedule the export job orchestrator directly from the client.
    // Entity-level scheduleNewOrchestration is not reliably supported in all runtimes,
    // so we schedule it here after the entity has been created successfully.
    const exportOrchestratorInstanceId = getOrchestratorInstanceId(this.jobId);
    const runRequest: ExportJobRunRequest = {
      jobEntityId: this.entityId.toString(),
      processedCycles: 0,
    };

    await this.client.scheduleNewOrchestration(
      EXPORT_JOB_ORCHESTRATOR_NAME,
      runRequest,
      { instanceId: exportOrchestratorInstanceId },
    );
  }

  /**
   * Gets the description of the export job.
   * @returns The export job description.
   * @throws ExportJobNotFoundError if the job is not found.
   */
  async describe(): Promise<ExportJobDescription> {
    // Use the operation orchestrator to get the entity state
    const request: ExportJobOperationRequest = {
      entityId: this.entityId.toString(),
      operationName: "get",
    };

    const instanceId = await this.client.scheduleNewOrchestration(
      EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME,
      request,
    );

    const state = await this.client.waitForOrchestrationCompletion(instanceId, true, 60);

    if (!state || state.runtimeStatus !== OrchestrationStatus.COMPLETED) {
      throw new ExportJobNotFoundError(this.jobId);
    }

    // The orchestrator output is the entity state
    const jobState = state.serializedOutput
      ? (JSON.parse(state.serializedOutput) as ExportJobState)
      : null;

    if (!jobState) {
      throw new ExportJobNotFoundError(this.jobId);
    }

    return {
      jobId: this.jobId,
      status: jobState.status,
      createdAt: jobState.createdAt ? new Date(jobState.createdAt) : undefined,
      lastModifiedAt: jobState.lastModifiedAt ? new Date(jobState.lastModifiedAt) : undefined,
      config: jobState.config,
      orchestratorInstanceId: jobState.orchestratorInstanceId,
      scannedInstances: jobState.scannedInstances,
      exportedInstances: jobState.exportedInstances,
      lastError: jobState.lastError,
      checkpoint: jobState.checkpoint,
      lastCheckpointTime: jobState.lastCheckpointTime
        ? new Date(jobState.lastCheckpointTime)
        : undefined,
    };
  }

  /**
   * Deletes the export job.
   */
  async delete(): Promise<void> {
    const orchestrationInstanceId = getOrchestratorInstanceId(this.jobId);

    // First, delete the entity
    const request: ExportJobOperationRequest = {
      entityId: this.entityId.toString(),
      operationName: "delete",
    };

    await this.client.scheduleNewOrchestration(
      EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME,
      request,
    );

    // Then terminate the linked export orchestration if it exists
    try {
      await this.client.terminateOrchestration(orchestrationInstanceId, "Export job deleted");
      await this.client.waitForOrchestrationCompletion(orchestrationInstanceId, false, 30);
      await this.client.purgeOrchestration(orchestrationInstanceId);
    } catch {
      // Orchestration instance doesn't exist or already purged - this is expected
    }
  }
}
