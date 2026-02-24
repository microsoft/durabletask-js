// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  TaskHubGrpcClient,
  EntityInstanceId,
  OrchestrationStatus,
  AsyncPageable,
  createAsyncPageable,
  Page,
  EntityQuery,
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
  EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME,
  getOrchestratorInstanceId,
} from "../constants";
import { ExportJobNotFoundError } from "../errors";
import { ExportJobOperationRequest } from "../orchestrators/execute-export-job-operation-orchestrator";

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
   * Uses direct entity query API (aligned with .NET's GetAllEntitiesAsync).
   * @param filter Optional query parameters.
   * @returns An async pageable of export job descriptions.
   */
  listJobs(filter?: ExportJobQuery): AsyncPageable<ExportJobDescription> {
    return createAsyncPageable(async (continuationToken?: string) => {
      const entityQuery: EntityQuery = {
        instanceIdStartsWith: `@${EXPORT_JOB_ENTITY_NAME.toLowerCase()}@${filter?.jobIdPrefix ?? ""}`,
        includeState: true,
        pageSize: filter?.pageSize ?? DEFAULT_EXPORT_JOB_QUERY_PAGE_SIZE,
        continuationToken,
      };

      // Fetch one page of entities
      const jobs: ExportJobDescription[] = [];
      let nextToken: string | undefined;

      for await (const entityPage of this.client.getEntities<ExportJobState>(entityQuery).asPages()) {
        for (const metadata of entityPage.values) {
          const state = metadata.state;
          if (state === undefined) {
            continue;
          }

          // Apply client-side filtering (aligned with .NET's MatchesFilter)
          if (filter && !matchesFilter(state, filter)) {
            continue;
          }

          jobs.push(mapStateToDescription(metadata.id.key, state));
        }

        nextToken = entityPage.continuationToken;
        break; // Only process one page per call; the outer createAsyncPageable handles iteration
      }

      return new Page<ExportJobDescription>(jobs, nextToken);
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

    // The entity's Create operation signals Run, which schedules the export orchestrator.
    // No need to schedule the orchestrator from the client.
  }

  /**
   * Gets the description of the export job.
   * Uses direct entity read API (aligned with .NET's GetEntityAsync).
   * @returns The export job description.
   * @throws ExportJobNotFoundError if the job is not found.
   */
  async describe(): Promise<ExportJobDescription> {
    const metadata = await this.client.getEntity<ExportJobState>(this.entityId, true);

    if (!metadata || metadata.state === undefined) {
      throw new ExportJobNotFoundError(this.jobId);
    }

    return mapStateToDescription(this.jobId, metadata.state);
  }

  /**
   * Deletes the export job.
   * Schedules entity deletion via operation orchestrator (does not wait for completion, aligned with .NET),
   * then terminates and purges the linked export orchestration.
   */
  async delete(): Promise<void> {
    const orchestrationInstanceId = getOrchestratorInstanceId(this.jobId);

    // Schedule entity deletion (does not wait for the operation orchestrator to complete)
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

/**
 * Maps an ExportJobState to an ExportJobDescription.
 */
function mapStateToDescription(jobId: string, state: ExportJobState): ExportJobDescription {
  return {
    jobId,
    status: state.status,
    createdAt: state.createdAt ? new Date(state.createdAt) : undefined,
    lastModifiedAt: state.lastModifiedAt ? new Date(state.lastModifiedAt) : undefined,
    config: state.config,
    orchestratorInstanceId: state.orchestratorInstanceId,
    scannedInstances: state.scannedInstances,
    exportedInstances: state.exportedInstances,
    lastError: state.lastError,
    checkpoint: state.checkpoint,
    lastCheckpointTime: state.lastCheckpointTime ? new Date(state.lastCheckpointTime) : undefined,
  };
}

/**
 * Client-side filter matching for export job queries (aligned with .NET's MatchesFilter).
 */
function matchesFilter(state: ExportJobState, filter: ExportJobQuery): boolean {
  const statusMatches = filter.status === undefined || state.status === filter.status;
  const createdFromMatches =
    filter.createdFrom === undefined ||
    (state.createdAt !== undefined && new Date(state.createdAt) >= filter.createdFrom);
  const createdToMatches =
    filter.createdTo === undefined ||
    (state.createdAt !== undefined && new Date(state.createdAt) <= filter.createdTo);
  return statusMatches && createdFromMatches && createdToMatches;
}
