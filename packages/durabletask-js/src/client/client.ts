// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import * as pb from "../proto/orchestrator_service_pb";
import * as stubs from "../proto/orchestrator_service_grpc_pb";
import { TOrchestrator } from "../types/orchestrator.type";
import { TInput } from "../types/input.type";
import { getName } from "../task";
import { randomUUID } from "crypto";
import { newOrchestrationState } from "../orchestration";
import { OrchestrationState } from "../orchestration/orchestration-state";
import { GrpcClient } from "./client-grpc";
import { OrchestrationStatus, toProtobuf, fromProtobuf } from "../orchestration/enum/orchestration-status.enum";
import { TimeoutError } from "../exception/timeout-error";
import { PurgeResult } from "../orchestration/orchestration-purge-result";
import { PurgeInstanceCriteria } from "../orchestration/orchestration-purge-criteria";
import { callWithMetadata, MetadataGenerator } from "../utils/grpc-helper.util";
import { OrchestrationQuery, ListInstanceIdsOptions, DEFAULT_PAGE_SIZE } from "../orchestration/orchestration-query";
import { Page, AsyncPageable, createAsyncPageable } from "../orchestration/page";
import { FailureDetails } from "../task/failure-details";
import { Logger, ConsoleLogger } from "../types/logger.type";

// Re-export MetadataGenerator for backward compatibility
export { MetadataGenerator } from "../utils/grpc-helper.util";

/**
 * Options for creating a TaskHubGrpcClient.
 */
export interface TaskHubGrpcClientOptions {
  /** The host address to connect to. Defaults to "localhost:4001". */
  hostAddress?: string;
  /** gRPC channel options. */
  options?: grpc.ChannelOptions;
  /** Whether to use TLS. Defaults to false. */
  useTLS?: boolean;
  /** Optional pre-configured channel credentials. If provided, useTLS is ignored. */
  credentials?: grpc.ChannelCredentials;
  /** Optional function to generate per-call metadata (for taskhub, auth tokens, etc.). */
  metadataGenerator?: MetadataGenerator;
  /** Optional logger instance. Defaults to ConsoleLogger. */
  logger?: Logger;
}

export class TaskHubGrpcClient {
  private _stub: stubs.TaskHubSidecarServiceClient;
  private _metadataGenerator?: MetadataGenerator;
  private _logger: Logger;

  /**
   * Creates a new TaskHubGrpcClient instance.
   *
   * @param options Configuration options for the client.
   */
  constructor(options: TaskHubGrpcClientOptions);

  /**
   * Creates a new TaskHubGrpcClient instance.
   *
   * @param hostAddress The host address to connect to. Defaults to "localhost:4001".
   * @param options gRPC channel options.
   * @param useTLS Whether to use TLS. Defaults to false.
   * @param credentials Optional pre-configured channel credentials. If provided, useTLS is ignored.
   * @param metadataGenerator Optional function to generate per-call metadata (for taskhub, auth tokens, etc.).
   * @param logger Optional logger instance. Defaults to ConsoleLogger.
   * @deprecated Use the options object constructor instead.
   */
  constructor(
    hostAddress?: string,
    options?: grpc.ChannelOptions,
    useTLS?: boolean,
    credentials?: grpc.ChannelCredentials,
    metadataGenerator?: MetadataGenerator,
    logger?: Logger,
  );

  constructor(
    hostAddressOrOptions?: string | TaskHubGrpcClientOptions,
    options?: grpc.ChannelOptions,
    useTLS?: boolean,
    credentials?: grpc.ChannelCredentials,
    metadataGenerator?: MetadataGenerator,
    logger?: Logger,
  ) {
    let resolvedHostAddress: string | undefined;
    let resolvedOptions: grpc.ChannelOptions | undefined;
    let resolvedUseTLS: boolean | undefined;
    let resolvedCredentials: grpc.ChannelCredentials | undefined;
    let resolvedMetadataGenerator: MetadataGenerator | undefined;
    let resolvedLogger: Logger | undefined;

    if (typeof hostAddressOrOptions === "object" && hostAddressOrOptions !== null) {
      // Options object constructor
      resolvedHostAddress = hostAddressOrOptions.hostAddress;
      resolvedOptions = hostAddressOrOptions.options;
      resolvedUseTLS = hostAddressOrOptions.useTLS;
      resolvedCredentials = hostAddressOrOptions.credentials;
      resolvedMetadataGenerator = hostAddressOrOptions.metadataGenerator;
      resolvedLogger = hostAddressOrOptions.logger;
    } else {
      // Deprecated positional parameters constructor
      resolvedHostAddress = hostAddressOrOptions;
      resolvedOptions = options;
      resolvedUseTLS = useTLS;
      resolvedCredentials = credentials;
      resolvedMetadataGenerator = metadataGenerator;
      resolvedLogger = logger;
    }

    this._stub = new GrpcClient(resolvedHostAddress, resolvedOptions, resolvedUseTLS, resolvedCredentials).stub;
    this._metadataGenerator = resolvedMetadataGenerator;
    this._logger = resolvedLogger ?? new ConsoleLogger();
  }

  async stop(): Promise<void> {
    await this._stub.close();

    // Brief pause to allow gRPC cleanup - this is a known issue with grpc-node
    // https://github.com/grpc/grpc-node/issues/1563#issuecomment-829483711
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * Schedules a new orchestrator using the DurableTask client.
   *
   * @param {TOrchestrator | string} orchestrator - The orchestrator or the name of the orchestrator to be scheduled.
   * @return {Promise<string>} A Promise resolving to the unique ID of the scheduled orchestrator instance.
   */
  async scheduleNewOrchestration(
    orchestrator: TOrchestrator | string,
    input?: TInput,
    instanceId?: string,
    startAt?: Date,
  ): Promise<string> {
    let name;
    if (typeof orchestrator === "string") {
      name = orchestrator;
    } else {
      name = getName(orchestrator);
    }
    const req = new pb.CreateInstanceRequest();
    req.setName(name);
    req.setInstanceid(instanceId ?? randomUUID());

    const i = new StringValue();
    i.setValue(JSON.stringify(input));

    const ts = new Timestamp();
    ts.fromDate(new Date(startAt?.getTime() ?? 0));

    req.setInput(i);
    req.setScheduledstarttimestamp(ts);

    this._logger.info(`Starting new ${name} instance with ID = ${req.getInstanceid()}`);

    const res = await callWithMetadata<pb.CreateInstanceRequest, pb.CreateInstanceResponse>(
      this._stub.startInstance.bind(this._stub),
      req,
      this._metadataGenerator,
    );

    return res.getInstanceid();
  }

  /**
   * Fetches orchestrator instance metadata from the configured durable store.
   *
   * @param {string} instanceId - The unique identifier of the orchestrator instance to fetch.
   * @param {boolean} fetchPayloads - Indicates whether to fetch the orchestrator instance's
   *                                       inputs, outputs, and custom status (true) or omit them (false).
   * @returns {Promise<OrchestrationState | undefined>} A Promise that resolves to a metadata record describing
   *                                              the orchestrator instance and its execution status, or undefined
   *                                              if the instance is not found.
   */
  async getOrchestrationState(
    instanceId: string,
    fetchPayloads: boolean = true,
  ): Promise<OrchestrationState | undefined> {
    const req = new pb.GetInstanceRequest();
    req.setInstanceid(instanceId);
    req.setGetinputsandoutputs(fetchPayloads);

    const res = await callWithMetadata<pb.GetInstanceRequest, pb.GetInstanceResponse>(
      this._stub.getInstance.bind(this._stub),
      req,
      this._metadataGenerator,
    );

    return newOrchestrationState(req.getInstanceid(), res);
  }

  /**
   * Waits for a orchestrator to start running and returns a {@link OrchestrationState} object
   * containing metadata about the started instance, and optionally, its input, output,
   * and custom status payloads.
   *
   * A "started" orchestrator instance refers to any instance not in the Pending state.
   *
   * If a orchestrator instance is already running when this method is called, it returns immediately.
   *
   * @param {string} instanceId - The unique identifier of the orchestrator instance to wait for.
   * @param {boolean} fetchPayloads - Indicates whether to fetch the orchestrator instance's
   *                                  inputs, outputs (true) or omit them (false).
   * @param {number} timeout - The amount of time, in seconds, to wait for the orchestrator instance to start.
   * @returns {Promise<OrchestrationState | undefined>} A Promise that resolves to the orchestrator instance metadata
   *                                               or undefined if no such instance is found.
   */
  async waitForOrchestrationStart(
    instanceId: string,
    fetchPayloads: boolean = false,
    timeout: number = 60,
  ): Promise<OrchestrationState | undefined> {
    const req = new pb.GetInstanceRequest();
    req.setInstanceid(instanceId);
    req.setGetinputsandoutputs(fetchPayloads);

    const callPromise = callWithMetadata<pb.GetInstanceRequest, pb.GetInstanceResponse>(
      this._stub.waitForInstanceStart.bind(this._stub),
      req,
      this._metadataGenerator,
    );

    // Execute the request and wait for the first response or timeout
    const res = (await Promise.race([
      callPromise,
      new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), timeout * 1000)),
    ])) as pb.GetInstanceResponse;

    return newOrchestrationState(req.getInstanceid(), res);
  }

  /**
   * Waits for a orchestrator to complete running and returns a {@link OrchestrationState} object
   * containing metadata about the completed instance, and optionally, its input, output,
   * and custom status payloads.
   *
   * A "completed" orchestrator instance refers to any instance in one of the terminal states.
   * For example, the Completed, Failed, or Terminated states.
   *
   * If a orchestrator instance is already running when this method is called, it returns immediately.
   *
   * @param {string} instanceId - The unique identifier of the orchestrator instance to wait for.
   * @param {boolean} fetchPayloads - Indicates whether to fetch the orchestrator instance's
   *                                  inputs, outputs (true) or omit them (false).
   * @param {number} timeout - The amount of time, in seconds, to wait for the orchestrator instance to start.
   * @returns {Promise<OrchestrationState | undefined>} A Promise that resolves to the orchestrator instance metadata
   *                                               or undefined if no such instance is found.
   */
  async waitForOrchestrationCompletion(
    instanceId: string,
    fetchPayloads: boolean = true,
    timeout: number = 60,
  ): Promise<OrchestrationState | undefined> {
    const req = new pb.GetInstanceRequest();
    req.setInstanceid(instanceId);
    req.setGetinputsandoutputs(fetchPayloads);

    this._logger.info(`Waiting ${timeout} seconds for instance ${instanceId} to complete...`);

    const callPromise = callWithMetadata<pb.GetInstanceRequest, pb.GetInstanceResponse>(
      this._stub.waitForInstanceCompletion.bind(this._stub),
      req,
      this._metadataGenerator,
    );

    // Execute the request and wait for the first response or timeout
    const res = (await Promise.race([
      callPromise,
      new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), timeout * 1000)),
    ])) as pb.GetInstanceResponse;

    const state = newOrchestrationState(req.getInstanceid(), res);

    if (!state) {
      return undefined;
    }

    let details;

    if (state.runtimeStatus === OrchestrationStatus.FAILED && state.failureDetails) {
      details = state.failureDetails;
      this._logger.info(`Instance ${instanceId} failed: [${details.errorType}] ${details.message}`);
    } else if (state.runtimeStatus === OrchestrationStatus.TERMINATED) {
      this._logger.info(`Instance ${instanceId} was terminated`);
    } else if (state.runtimeStatus === OrchestrationStatus.COMPLETED) {
      this._logger.info(`Instance ${instanceId} completed`);
    }

    return state;
  }

  /**
   * Sends an event notification message to an awaiting orchestrator instance.
   *
   * This method triggers the specified event in a running orchestrator instance,
   * allowing the orchestrator to respond to the event if it has defined event handlers.
   *
   * @param {string} instanceId - The unique identifier of the orchestrator instance that will handle the event.
   * @param {string} eventName - The name of the event. Event names are case-insensitive.
   * @param {any} [data] - An optional serializable data payload to include with the event.
   */
  async raiseOrchestrationEvent(instanceId: string, eventName: string, data: any = null): Promise<void> {
    const req = new pb.RaiseEventRequest();
    req.setInstanceid(instanceId);
    req.setName(eventName);

    const i = new StringValue();
    i.setValue(JSON.stringify(data));

    req.setInput(i);

    this._logger.info(`Raising event '${eventName}' for instance '${instanceId}'`);

    await callWithMetadata<pb.RaiseEventRequest, pb.RaiseEventResponse>(
      this._stub.raiseEvent.bind(this._stub),
      req,
      this._metadataGenerator,
    );
  }

  /**
   * Terminates the orchestrator associated with the provided instance id.
   *
   * @param {string} instanceId - orchestrator instance id to terminate.
   * @param {any} output - The optional output to set for the terminated orchestrator instance.
   */
  async terminateOrchestration(instanceId: string, output: any = null): Promise<void> {
    const req = new pb.TerminateRequest();
    req.setInstanceid(instanceId);

    const i = new StringValue();
    i.setValue(JSON.stringify(output));

    req.setOutput(i);

    this._logger.info(`Terminating '${instanceId}'`);

    await callWithMetadata<pb.TerminateRequest, pb.TerminateResponse>(
      this._stub.terminateInstance.bind(this._stub),
      req,
      this._metadataGenerator,
    );
  }

  async suspendOrchestration(instanceId: string): Promise<void> {
    const req = new pb.SuspendRequest();
    req.setInstanceid(instanceId);

    this._logger.info(`Suspending '${instanceId}'`);

    await callWithMetadata<pb.SuspendRequest, pb.SuspendResponse>(
      this._stub.suspendInstance.bind(this._stub),
      req,
      this._metadataGenerator,
    );
  }

  async resumeOrchestration(instanceId: string): Promise<void> {
    const req = new pb.ResumeRequest();
    req.setInstanceid(instanceId);

    this._logger.info(`Resuming '${instanceId}'`);

    await callWithMetadata<pb.ResumeRequest, pb.ResumeResponse>(
      this._stub.resumeInstance.bind(this._stub),
      req,
      this._metadataGenerator,
    );
  }

  /**
   * Rewinds a failed orchestration instance to a previous state to allow it to retry from the point of failure.
   *
   * This method is used to "rewind" a failed orchestration back to its last known good state, allowing it
   * to be replayed from that point. This is particularly useful for recovering from transient failures
   * or for debugging purposes.
   *
   * Only orchestration instances in the `Failed` state can be rewound.
   *
   * @param instanceId - The unique identifier of the orchestration instance to rewind.
   * @param reason - A reason string describing why the orchestration is being rewound.
   * @throws {Error} If the orchestration instance is not found.
   * @throws {Error} If the orchestration instance is in a state that does not allow rewinding.
   * @throws {Error} If the rewind operation is not supported by the backend.
   */
  async rewindInstance(instanceId: string, reason: string): Promise<void> {
    if (!instanceId) {
      throw new Error("instanceId is required");
    }

    const req = new pb.RewindInstanceRequest();
    req.setInstanceid(instanceId);

    if (reason) {
      const reasonValue = new StringValue();
      reasonValue.setValue(reason);
      req.setReason(reasonValue);
    }

    this._logger.info(`Rewinding '${instanceId}' with reason: ${reason}`);

    try {
      await callWithMetadata<pb.RewindInstanceRequest, pb.RewindInstanceResponse>(
        this._stub.rewindInstance.bind(this._stub),
        req,
        this._metadataGenerator,
      );
    } catch (e) {
      // Handle gRPC errors and convert them to appropriate errors
      if (e && typeof e === "object" && "code" in e) {
        const grpcError = e as { code: number; details?: string };
        if (grpcError.code === grpc.status.NOT_FOUND) {
          throw new Error(`An orchestration with the instanceId '${instanceId}' was not found.`);
        }
        if (grpcError.code === grpc.status.FAILED_PRECONDITION) {
          throw new Error(grpcError.details || `Cannot rewind orchestration '${instanceId}': it is in a state that does not allow rewinding.`);
        }
        if (grpcError.code === grpc.status.UNIMPLEMENTED) {
          throw new Error(grpcError.details || `The rewind operation is not supported by the backend.`);
        }
        if (grpcError.code === grpc.status.CANCELLED) {
          throw new Error(`The rewind operation for '${instanceId}' was cancelled.`);
        }
      }
      throw e;
    }
  }

  /**
   * Restarts an existing orchestration instance with its original input.
   *
   * This method allows you to restart a completed, failed, or terminated orchestration
   * instance. The restarted orchestration will use the same input that was provided
   * when the orchestration was originally started.
   *
   * @param instanceId - The unique ID of the orchestration instance to restart.
   * @param restartWithNewInstanceId - If true, the restarted orchestration will be assigned
   * a new instance ID. If false (default), the same instance ID will be reused.
   * When reusing the same instance ID, the orchestration must be in a terminal state
   * (Completed, Failed, or Terminated).
   * @returns A Promise that resolves to the instance ID of the restarted orchestration.
   * This will be the same as the input instanceId if restartWithNewInstanceId is false,
   * or a new ID if restartWithNewInstanceId is true.
   * @throws Error if the orchestration instance is not found.
   * @throws Error if the orchestration cannot be restarted (e.g., it's still running
   * and restartWithNewInstanceId is false).
   */
  async restartOrchestration(instanceId: string, restartWithNewInstanceId: boolean = false): Promise<string> {
    if (!instanceId) {
      throw new Error("instanceId cannot be null or empty");
    }

    const req = new pb.RestartInstanceRequest();
    req.setInstanceid(instanceId);
    req.setRestartwithnewinstanceid(restartWithNewInstanceId);

    this._logger.info(`Restarting '${instanceId}' with restartWithNewInstanceId=${restartWithNewInstanceId}`);

    try {
      const res = await callWithMetadata<pb.RestartInstanceRequest, pb.RestartInstanceResponse>(
        this._stub.restartInstance.bind(this._stub),
        req,
        this._metadataGenerator,
      );
      return res.getInstanceid();
    } catch (e) {
      if (e instanceof Error && "code" in e) {
        const grpcError = e as grpc.ServiceError;
        if (grpcError.code === grpc.status.NOT_FOUND) {
          throw new Error(`An orchestration with the instanceId '${instanceId}' was not found.`);
        }
        if (grpcError.code === grpc.status.FAILED_PRECONDITION) {
          throw new Error(`An orchestration with the instanceId '${instanceId}' cannot be restarted.`);
        }
        if (grpcError.code === grpc.status.CANCELLED) {
          throw new Error(`The restartOrchestration operation was canceled.`);
        }
      }
      throw e;
    }
  }

  /**
   * Purges orchestration instance metadata from the durable store.
   *
   * This method can be used to permanently delete orchestration metadata from the underlying storage provider,
   * including any stored inputs, outputs, and orchestration history records. This is often useful for implementing
   * data retention policies and for keeping storage costs minimal. Only orchestration instances in the
   * `Completed`, `Failed`, or `Terminated` state can be purged.
   *
   * If the target orchestration instance is not found in the data store, or if the instance is found but not in a
   * terminal state, then the returned {@link PurgeResult} will report that zero instances were purged.
   * Otherwise, the existing data will be purged, and the returned {@link PurgeResult} will report that one instance
   * was purged.
   *
   * @param value - The unique ID of the orchestration instance to purge or orchestration instance filter criteria used
   * to determine which instances to purge.
   * @returns A Promise that resolves to a {@link PurgeResult} or `undefined` if the purge operation was not successful.
   */
  async purgeOrchestration(value: string | PurgeInstanceCriteria): Promise<PurgeResult | undefined> {
    let res;
    if (typeof value === `string`) {
      const instanceId = value;
      const req = new pb.PurgeInstancesRequest();
      req.setInstanceid(instanceId);

      this._logger.info(`Purging Instance '${instanceId}'`);

      res = await callWithMetadata<pb.PurgeInstancesRequest, pb.PurgeInstancesResponse>(
        this._stub.purgeInstances.bind(this._stub),
        req,
        this._metadataGenerator,
      );
    } else {
      const purgeInstanceCriteria = value;
      const req = new pb.PurgeInstancesRequest();
      const filter = new pb.PurgeInstanceFilter();
      const createdTimeFrom = purgeInstanceCriteria.getCreatedTimeFrom();
      if (createdTimeFrom != undefined) {
        const timestamp = new Timestamp();
        timestamp.fromDate(createdTimeFrom);
        filter.setCreatedtimefrom(timestamp);
      }
      const createdTimeTo = purgeInstanceCriteria.getCreatedTimeTo();
      if (createdTimeTo != undefined) {
        const timestamp = new Timestamp();
        timestamp.fromDate(createdTimeTo);
        filter.setCreatedtimeto(timestamp);
      }
      const runtimeStatusList = purgeInstanceCriteria.getRuntimeStatusList();
      for (const status of runtimeStatusList) {
        filter.addRuntimestatus(toProtobuf(status));
      }
      req.setPurgeinstancefilter(filter);
      const timeout = purgeInstanceCriteria.getTimeout();

      this._logger.info("Purging Instance using purging criteria");

      const callPromise = callWithMetadata<pb.PurgeInstancesRequest, pb.PurgeInstancesResponse>(
        this._stub.purgeInstances.bind(this._stub),
        req,
        this._metadataGenerator,
      );
      // Execute the request and wait for the first response or timeout
      res = (await Promise.race([
        callPromise,
        new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), timeout)),
      ])) as pb.PurgeInstancesResponse;
    }
    if (!res) {
      return;
    }
    return new PurgeResult(res.getDeletedinstancecount());
  }

  /**
   * Queries orchestration instances and returns an async iterable of results.
   *
   * This method supports querying orchestration instances by various filter criteria including
   * creation time range, runtime status, instance ID prefix, and task hub names.
   *
   * The results are returned as an AsyncPageable that supports both iteration over individual
   * items and iteration over pages.
   *
   * @example
   * ```typescript
   * // Iterate over all matching instances
   * const pageable = client.getAllInstances({ statuses: [OrchestrationStatus.COMPLETED] });
   * for await (const instance of pageable) {
   *   console.log(instance.instanceId);
   * }
   *
   * // Iterate over pages
   * for await (const page of pageable.asPages()) {
   *   console.log(`Page has ${page.values.length} items`);
   * }
   * ```
   *
   * @param filter - Optional filter criteria for the query.
   * @returns An AsyncPageable of OrchestrationState objects.
   */
  getAllInstances(filter?: OrchestrationQuery): AsyncPageable<OrchestrationState> {
    return createAsyncPageable<OrchestrationState>(
      async (continuationToken?: string, pageSize?: number): Promise<Page<OrchestrationState>> => {
        const req = new pb.QueryInstancesRequest();
        const query = new pb.InstanceQuery();

        // Set created time range
        if (filter?.createdFrom) {
          const timestamp = new Timestamp();
          timestamp.fromDate(filter.createdFrom);
          query.setCreatedtimefrom(timestamp);
        }

        if (filter?.createdTo) {
          const timestamp = new Timestamp();
          timestamp.fromDate(filter.createdTo);
          query.setCreatedtimeto(timestamp);
        }

        // Set runtime statuses
        if (filter?.statuses) {
          for (const status of filter.statuses) {
            query.addRuntimestatus(toProtobuf(status));
          }
        }

        // Set task hub names
        if (filter?.taskHubNames) {
          for (const name of filter.taskHubNames) {
            const stringValue = new StringValue();
            stringValue.setValue(name);
            query.addTaskhubnames(stringValue);
          }
        }

        // Set instance ID prefix
        if (filter?.instanceIdPrefix) {
          const prefixValue = new StringValue();
          prefixValue.setValue(filter.instanceIdPrefix);
          query.setInstanceidprefix(prefixValue);
        }

        // Set page size
        const effectivePageSize = pageSize ?? filter?.pageSize ?? DEFAULT_PAGE_SIZE;
        query.setMaxinstancecount(effectivePageSize);

        // Set continuation token (use provided or from filter)
        const token = continuationToken ?? filter?.continuationToken;
        if (token) {
          const tokenValue = new StringValue();
          tokenValue.setValue(token);
          query.setContinuationtoken(tokenValue);
        }

        // Set fetch inputs and outputs
        query.setFetchinputsandoutputs(filter?.fetchInputsAndOutputs ?? false);

        req.setQuery(query);

        const response = await callWithMetadata<pb.QueryInstancesRequest, pb.QueryInstancesResponse>(
          this._stub.queryInstances.bind(this._stub),
          req,
          this._metadataGenerator,
        );

        const states: OrchestrationState[] = [];
        const orchestrationStateList = response.getOrchestrationstateList();
        for (const state of orchestrationStateList) {
          const orchestrationState = this._createOrchestrationStateFromProto(state, filter?.fetchInputsAndOutputs ?? false);
          if (orchestrationState) {
            states.push(orchestrationState);
          }
        }

        const responseContinuationToken = response.getContinuationtoken()?.getValue();
        return new Page(states, responseContinuationToken);
      },
    );
  }

  /**
   * Lists orchestration instance IDs that match the specified runtime status
   * and completed time range, using key-based pagination.
   *
   * This method is optimized for listing instance IDs without fetching full instance metadata,
   * making it more efficient when only instance IDs are needed.
   *
   * @example
   * ```typescript
   * // Get first page of completed instances
   * const page = await client.listInstanceIds({
   *   runtimeStatus: [OrchestrationStatus.COMPLETED],
   *   pageSize: 50
   * });
   *
   * // Get next page using the continuation key
   * if (page.hasMoreResults) {
   *   const nextPage = await client.listInstanceIds({
   *     runtimeStatus: [OrchestrationStatus.COMPLETED],
   *     pageSize: 50,
   *     lastInstanceKey: page.continuationToken
   *   });
   * }
   * ```
   *
   * @param options - Optional filter criteria and pagination options.
   * @returns A Promise that resolves to a Page of instance IDs.
   */
  async listInstanceIds(options?: ListInstanceIdsOptions): Promise<Page<string>> {
    const req = new pb.ListInstanceIdsRequest();

    // Set page size
    const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
    req.setPagesize(pageSize);

    // Set last instance key (continuation token)
    if (options?.lastInstanceKey) {
      const keyValue = new StringValue();
      keyValue.setValue(options.lastInstanceKey);
      req.setLastinstancekey(keyValue);
    }

    // Set runtime statuses
    if (options?.runtimeStatus) {
      for (const status of options.runtimeStatus) {
        req.addRuntimestatus(toProtobuf(status));
      }
    }

    // Set completed time range
    if (options?.completedTimeFrom) {
      const timestamp = new Timestamp();
      timestamp.fromDate(options.completedTimeFrom);
      req.setCompletedtimefrom(timestamp);
    }

    if (options?.completedTimeTo) {
      const timestamp = new Timestamp();
      timestamp.fromDate(options.completedTimeTo);
      req.setCompletedtimeto(timestamp);
    }

    const response = await callWithMetadata<pb.ListInstanceIdsRequest, pb.ListInstanceIdsResponse>(
      this._stub.listInstanceIds.bind(this._stub),
      req,
      this._metadataGenerator,
    );

    const instanceIds = response.getInstanceidsList();
    const lastInstanceKey = response.getLastinstancekey()?.getValue();

    return new Page(instanceIds, lastInstanceKey);
  }

  /**
   * Helper method to create an OrchestrationState from a protobuf OrchestrationState.
   */
  private _createOrchestrationStateFromProto(
    protoState: pb.OrchestrationState,
    fetchPayloads: boolean,
  ): OrchestrationState | undefined {
    const instanceId = protoState.getInstanceid();
    const name = protoState.getName();
    const runtimeStatus = protoState.getOrchestrationstatus();
    const createdTimestamp = protoState.getCreatedtimestamp();
    const lastUpdatedTimestamp = protoState.getLastupdatedtimestamp();

    if (!instanceId) {
      return undefined;
    }

    const createdAt = createdTimestamp ? createdTimestamp.toDate() : new Date(0);
    const lastUpdatedAt = lastUpdatedTimestamp ? lastUpdatedTimestamp.toDate() : new Date(0);

    // Map proto status to our status enum using the existing conversion function
    const status = fromProtobuf(runtimeStatus);

    let serializedInput: string | undefined;
    let serializedOutput: string | undefined;
    let serializedCustomStatus: string | undefined;

    if (fetchPayloads) {
      serializedInput = protoState.getInput()?.getValue();
      serializedOutput = protoState.getOutput()?.getValue();
      serializedCustomStatus = protoState.getCustomstatus()?.getValue();
    }

    // Extract failure details if present
    let failureDetails;
    const protoFailureDetails = protoState.getFailuredetails();
    if (protoFailureDetails) {
      failureDetails = new FailureDetails(
        protoFailureDetails.getErrormessage(),
        protoFailureDetails.getErrortype(),
        protoFailureDetails.getStacktrace()?.getValue(),
      );
    }

    return new OrchestrationState(
      instanceId,
      name ?? "",
      status,
      createdAt,
      lastUpdatedAt,
      serializedInput,
      serializedOutput,
      serializedCustomStatus,
      failureDetails,
    );
  }
}
