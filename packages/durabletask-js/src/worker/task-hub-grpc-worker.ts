// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import * as stubs from "../proto/orchestrator_service_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import { Registry } from "./registry";
import { TActivity } from "../types/activity.type";
import { TInput } from "../types/input.type";
import { TOrchestrator } from "../types/orchestrator.type";
import { TOutput } from "../types/output.type";
import { GrpcClient } from "../client/client-grpc";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import * as pbh from "../utils/pb-helper.util";
import { callWithMetadata, MetadataGenerator } from "../utils/grpc-helper.util";
import { ActivityExecutor } from "./activity-executor";
import { EntityFactory } from "../entities/task-entity";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Logger, ConsoleLogger } from "../types/logger.type";
import { ExponentialBackoff, sleep, withTimeout } from "../utils/backoff.util";
import { VersioningOptions } from "./versioning-options";
import { WorkItemFilters, generateWorkItemFiltersFromRegistry, toGrpcWorkItemFilters } from "./work-item-filters";
import * as WorkerLogs from "./logs";
import {
  startSpanForTaskExecution,
  setSpanError,
  setSpanOk,
  endSpan,
} from "../tracing";
import {
  executeEntityBatchWorkItem,
  executeEntityWorkItem,
  executeOrchestratorWorkItem,
} from "./work-item-executor";

/** Default timeout in milliseconds for graceful shutdown. */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30000;

/**
 * Options for creating a TaskHubGrpcWorker.
 */
export interface TaskHubGrpcWorkerOptions {
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
  /** Optional timeout in milliseconds for graceful shutdown. Defaults to 30000. */
  shutdownTimeoutMs?: number;
  /** Optional versioning options for filtering orchestrations by version. */
  versioning?: VersioningOptions;
  /**
   * Optional work item filters to control which work items the worker receives.
   * By default, no filters are sent and the worker processes all work items.
   * Set to a WorkItemFilters object to use explicit filters.
   * Set to "auto" to auto-generate filters from the registered orchestrations,
   * activities, and entities.
   */
  workItemFilters?: WorkItemFilters | "auto";
}

export class TaskHubGrpcWorker {
  private _responseStream: grpc.ClientReadableStream<pb.WorkItem> | null;
  private _registry: Registry;
  private _hostAddress?: string;
  private _tls?: boolean;
  private _grpcChannelOptions?: grpc.ChannelOptions;
  private _grpcChannelCredentials?: grpc.ChannelCredentials;
  private _metadataGenerator?: MetadataGenerator;
  private _isRunning: boolean;
  private _stopWorker: boolean;
  private _stub: stubs.TaskHubSidecarServiceClient | null;
  private _logger: Logger;
  private _pendingWorkItems: Set<Promise<void>>;
  private _shutdownTimeoutMs: number;
  private _backoff: ExponentialBackoff;
  private _versioning?: VersioningOptions;
  private _workItemFilters?: WorkItemFilters | "auto";

  /**
   * Creates a new TaskHubGrpcWorker instance.
   *
   * @param options Configuration options for the worker.
   */
  constructor(options: TaskHubGrpcWorkerOptions);

  /**
   * Creates a new TaskHubGrpcWorker instance.
   *
   * @param hostAddress The host address to connect to. Defaults to "localhost:4001".
   * @param options gRPC channel options.
   * @param useTLS Whether to use TLS. Defaults to false.
   * @param credentials Optional pre-configured channel credentials. If provided, useTLS is ignored.
   * @param metadataGenerator Optional function to generate per-call metadata (for taskhub, auth tokens, etc.).
   * @param logger Optional logger instance. Defaults to ConsoleLogger.
   * @param shutdownTimeoutMs Optional timeout in milliseconds for graceful shutdown. Defaults to 30000.
   * @deprecated Use the options object constructor instead.
   */
  constructor(
    hostAddress?: string,
    options?: grpc.ChannelOptions,
    useTLS?: boolean,
    credentials?: grpc.ChannelCredentials,
    metadataGenerator?: MetadataGenerator,
    logger?: Logger,
    shutdownTimeoutMs?: number,
  );

  constructor(
    hostAddressOrOptions?: string | TaskHubGrpcWorkerOptions,
    options?: grpc.ChannelOptions,
    useTLS?: boolean,
    credentials?: grpc.ChannelCredentials,
    metadataGenerator?: MetadataGenerator,
    logger?: Logger,
    shutdownTimeoutMs?: number,
  ) {
    let resolvedHostAddress: string | undefined;
    let resolvedOptions: grpc.ChannelOptions | undefined;
    let resolvedUseTLS: boolean | undefined;
    let resolvedCredentials: grpc.ChannelCredentials | undefined;
    let resolvedMetadataGenerator: MetadataGenerator | undefined;
    let resolvedLogger: Logger | undefined;
    let resolvedShutdownTimeoutMs: number | undefined;
    let resolvedVersioning: VersioningOptions | undefined;
    let resolvedWorkItemFilters: WorkItemFilters | "auto" | undefined;

    if (typeof hostAddressOrOptions === "object" && hostAddressOrOptions !== null) {
      // Options object constructor
      resolvedHostAddress = hostAddressOrOptions.hostAddress;
      resolvedOptions = hostAddressOrOptions.options;
      resolvedUseTLS = hostAddressOrOptions.useTLS;
      resolvedCredentials = hostAddressOrOptions.credentials;
      resolvedMetadataGenerator = hostAddressOrOptions.metadataGenerator;
      resolvedLogger = hostAddressOrOptions.logger;
      resolvedShutdownTimeoutMs = hostAddressOrOptions.shutdownTimeoutMs;
      resolvedVersioning = hostAddressOrOptions.versioning;
      resolvedWorkItemFilters = hostAddressOrOptions.workItemFilters;
    } else {
      // Deprecated positional parameters constructor
      resolvedHostAddress = hostAddressOrOptions;
      resolvedOptions = options;
      resolvedUseTLS = useTLS;
      resolvedCredentials = credentials;
      resolvedMetadataGenerator = metadataGenerator;
      resolvedLogger = logger;
      resolvedShutdownTimeoutMs = shutdownTimeoutMs;
    }

    this._registry = new Registry();
    this._hostAddress = resolvedHostAddress;
    this._tls = resolvedUseTLS;
    this._grpcChannelOptions = resolvedOptions;
    this._grpcChannelCredentials = resolvedCredentials;
    this._metadataGenerator = resolvedMetadataGenerator;
    this._responseStream = null;
    this._isRunning = false;
    this._stopWorker = false;
    this._stub = null;
    this._logger = resolvedLogger ?? new ConsoleLogger();
    this._pendingWorkItems = new Set();
    this._shutdownTimeoutMs = resolvedShutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
    this._backoff = new ExponentialBackoff({
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      multiplier: 2,
    });
    this._versioning = resolvedVersioning;
    this._workItemFilters = resolvedWorkItemFilters;
  }

  /**
   * Helper to get metadata for gRPC calls.
   */
  private async _getMetadata(): Promise<grpc.Metadata> {
    if (this._metadataGenerator) {
      return await this._metadataGenerator();
    }
    return new grpc.Metadata();
  }

  /**
   * Creates a new gRPC client and retries the worker.
   * Properly closes the old client to prevent connection leaks.
   */
  private async _createNewClientAndRetry(): Promise<void> {
    // Close the old stub to prevent connection leaks
    if (this._stub) {
      this._stub.close();
    }

    await this._backoff.wait();

    const newClient = new GrpcClient(
      this._hostAddress,
      this._grpcChannelOptions,
      this._tls,
      this._grpcChannelCredentials,
    );
    this._stub = newClient.stub;

    // Do not await - run in background
    this.internalRunWorker(newClient, true).catch((err) => {
      if (!this._stopWorker) {
        WorkerLogs.workerError(this._logger, err);
      }
    });
  }

  /**
   * Registers an orchestrator function with the worker.
   *
   * @param fn
   * @returns
   */
  addOrchestrator(fn: TOrchestrator): string {
    if (this._isRunning) {
      throw new Error("Cannot add orchestrator while worker is running.");
    }

    return this._registry.addOrchestrator(fn);
  }

  /**
   * Registers an named orchestrator function with the worker.
   *
   * @param fn
   * @returns
   */
  addNamedOrchestrator(name: string, fn: TOrchestrator): string {
    if (this._isRunning) {
      throw new Error("Cannot add orchestrator while worker is running.");
    }

    this._registry.addNamedOrchestrator(name, fn);
    return name;
  }

  /**
   * Registers an activity function with the worker.
   *
   * @param fn
   * @returns
   */
  addActivity(fn: TActivity<TInput, TOutput>): string {
    if (this._isRunning) {
      throw new Error("Cannot add activity while worker is running.");
    }

    return this._registry.addActivity(fn);
  }

  /**
   * Registers an named activity function with the worker.
   *
   * @param fn
   * @returns
   */
  addNamedActivity(name: string, fn: TActivity<TInput, TOutput>): string {
    if (this._isRunning) {
      throw new Error("Cannot add activity while worker is running.");
    }

    this._registry.addNamedActivity(name, fn);
    return name;
  }

  /**
   * Registers an entity with the worker.
   *
   * @param factory - Factory function that creates entity instances.
   * @returns The registered entity name (normalized to lowercase).
   *
   * @remarks
   * Entity names are derived from the factory function name and normalized to lowercase.
   */
  addEntity(factory: EntityFactory): string {
    if (this._isRunning) {
      throw new Error("Cannot add entity while worker is running.");
    }

    return this._registry.addEntity(factory);
  }

  /**
   * Registers a named entity with the worker.
   *
   * @param name - The name to register the entity under.
   * @param factory - Factory function that creates entity instances.
   * @returns The registered entity name (normalized to lowercase).
   *
   * @remarks
   * Entity names are normalized to lowercase for case-insensitive matching.
   */
  addNamedEntity(name: string, factory: EntityFactory): string {
    if (this._isRunning) {
      throw new Error("Cannot add entity while worker is running.");
    }

    this._registry.addNamedEntity(name, factory);
    return name.toLowerCase();
  }

  /**
   * Executes a single orchestration request and returns the response without
   * completing it over gRPC.
   *
   * @remarks
   * This is intended for host integrations, such as Azure Functions, that
   * receive a base64-encoded TaskHubSidecarService OrchestratorRequest and need
   * to return a base64-encoded OrchestratorResponse. It follows this package's
   * runtime support matrix, which currently requires Node.js 22 or higher.
   */
  async executeOrchestratorRequest(
    req: pb.OrchestratorRequest,
    completionToken: string = "",
  ): Promise<pb.OrchestratorResponse> {
    const result = await executeOrchestratorWorkItem(
      this._registry,
      req,
      completionToken,
      { logger: this._logger, versioning: this._versioning },
    );

    if (result.kind === "abandoned") {
      throw new Error(
        `Orchestrator work item was rejected: ${result.errorMessage ?? result.errorType ?? "unknown reason"}`,
      );
    }

    return result.response;
  }

  /**
   * Processes a serialized TaskHubSidecarService OrchestratorRequest and returns
   * the serialized OrchestratorResponse.
   *
   * @remarks
   * Host integrations should handle any transport-specific base64 conversion and
   * pass raw protobuf bytes to this method.
   */
  async processOrchestratorRequest(request: Uint8Array | Buffer): Promise<Uint8Array> {
    const req = pb.OrchestratorRequest.deserializeBinary(request);
    const response = await this.executeOrchestratorRequest(req);
    return response.serializeBinary();
  }

  /**
   * Executes a single entity batch request and returns the result without
   * completing it over gRPC.
   *
   * @remarks
   * This is intended for host integrations, such as Azure Functions, that
   * receive a base64-encoded TaskHubSidecarService EntityBatchRequest and need
   * to return a base64-encoded EntityBatchResult. It follows this package's
   * runtime support matrix, which currently requires Node.js 22 or higher.
   */
  async executeEntityBatchRequest(
    req: pb.EntityBatchRequest,
    completionToken: string = "",
  ): Promise<pb.EntityBatchResult> {
    return executeEntityBatchWorkItem(
      this._registry,
      req,
      completionToken,
      { logger: this._logger, versioning: this._versioning },
    );
  }

  /**
   * Processes a serialized TaskHubSidecarService EntityBatchRequest and returns
   * the serialized EntityBatchResult.
   *
   * @remarks
   * Host integrations should handle any transport-specific base64 conversion and
   * pass raw protobuf bytes to this method.
   */
  async processEntityBatchRequest(request: Uint8Array | Buffer): Promise<Uint8Array> {
    const req = pb.EntityBatchRequest.deserializeBinary(request);
    const response = await this.executeEntityBatchRequest(req);
    return response.serializeBinary();
  }

  /**
   * Executes a single V2 entity request and returns the batch result without
   * completing it over gRPC.
   */
  async executeEntityRequest(
    req: pb.EntityRequest,
    completionToken: string = "",
  ): Promise<pb.EntityBatchResult> {
    return executeEntityWorkItem(
      this._registry,
      req,
      completionToken,
      { logger: this._logger, versioning: this._versioning },
    );
  }

  /**
   * In node.js we don't require a new thread as we have a main event loop
   * Therefore, we open the stream and simply listen through the eventemitter behind the scenes
   */
  async start(): Promise<void> {
    if (this._isRunning) {
      throw new Error("The worker is already running.");
    }

    const client = new GrpcClient(this._hostAddress, this._grpcChannelOptions, this._tls, this._grpcChannelCredentials);
    this._stub = client.stub;

    // Run in background but catch any unhandled errors to prevent unhandled rejections
    this.internalRunWorker(client).catch((err) => {
      // Only log if the worker wasn't stopped intentionally
      if (!this._stopWorker) {
        WorkerLogs.workerError(this._logger, err);
      }
    });

    this._isRunning = true;
  }

  async internalRunWorker(client: GrpcClient, isRetry: boolean = false): Promise<void> {
    try {
      // send a "Hello" message to the sidecar to ensure that it's listening
      await callWithMetadata(client.stub.hello.bind(client.stub), new Empty(), this._metadataGenerator);

      // Reset backoff on successful connection
      this._backoff.reset();

      // Stream work items from the sidecar (pass metadata for insecure connections)
      const metadata = await this._getMetadata();
      const request = this._buildGetWorkItemsRequest();

      const stream = client.stub.getWorkItems(request, metadata);
      this._responseStream = stream;

      WorkerLogs.workerConnected(this._logger, this._hostAddress ?? "localhost:4001");

      // Wait for a work item to be received
      stream.on("data", (workItem: pb.WorkItem) => {
        const completionToken = workItem.getCompletiontoken();
        if (workItem.hasOrchestratorrequest()) {
          WorkerLogs.workItemReceived(
            this._logger,
            "Orchestrator Request",
            workItem?.getOrchestratorrequest()?.getInstanceid(),
          );
          this._executeOrchestrator(workItem.getOrchestratorrequest() as any, completionToken, client.stub);
        } else if (workItem.hasActivityrequest()) {
          WorkerLogs.workItemReceived(this._logger, "Activity Request");
          this._executeActivity(workItem.getActivityrequest() as any, completionToken, client.stub);
        } else if (workItem.hasEntityrequest()) {
          const entityRequest = workItem.getEntityrequest() as pb.EntityBatchRequest;
          WorkerLogs.entityRequestReceived(this._logger, entityRequest.getInstanceid(), "Entity Request");
          this._executeEntity(entityRequest, completionToken, client.stub);
        } else if (workItem.hasEntityrequestv2()) {
          const entityRequestV2 = workItem.getEntityrequestv2() as pb.EntityRequest;
          WorkerLogs.entityRequestReceived(this._logger, entityRequestV2.getInstanceid(), "Entity Request V2");
          this._executeEntityV2(entityRequestV2, completionToken, client.stub);
        } else if (workItem.hasHealthping()) {
          // Health ping - no-op, just a keep-alive message from the server
        } else {
          WorkerLogs.unknownWorkItem(this._logger);
        }
      });

      // Wait for the stream to end or error
      stream.on("end", () => {
        if (this._stopWorker) {
          WorkerLogs.streamEnded(this._logger);
          stream.removeAllListeners();
          stream.destroy();
          return;
        }
        // Stream ended unexpectedly - clean up and retry
        stream.removeAllListeners();
        stream.on("error", () => {}); // Prevent unhandled "error" after cleanup
        stream.destroy();
        WorkerLogs.streamRetry(this._logger, this._backoff.peekNextDelay());
        this._createNewClientAndRetry().catch((retryErr) => {
          if (!this._stopWorker) {
            WorkerLogs.workerError(this._logger, retryErr instanceof Error ? retryErr : new Error(String(retryErr)));
          }
        });
      });

      stream.on("error", (err: Error) => {
        // Ignore cancellation errors when the worker is being stopped intentionally
        if (this._stopWorker) {
          return;
        }
        WorkerLogs.streamErrorInfo(this._logger, err);

        // Clean up the errored stream and retry the connection.
        // In Node.js, gRPC stream errors (e.g., UNAVAILABLE, transport failures)
        // may not always be followed by an "end" event. Without recovery here,
        // the worker would silently stop processing work items.
        stream.removeAllListeners();
        stream.on("error", () => {}); // Prevent unhandled "error" after cleanup
        stream.destroy();
        WorkerLogs.streamRetry(this._logger, this._backoff.peekNextDelay());
        this._createNewClientAndRetry().catch((retryErr) => {
          if (!this._stopWorker) {
            WorkerLogs.workerError(this._logger, retryErr instanceof Error ? retryErr : new Error(String(retryErr)));
          }
        });
      });
    } catch (err) {
      if (this._stopWorker) {
        // ignoring the error because the worker has been stopped
        return;
      }
      const error = err instanceof Error ? err : new Error(String(err));
      WorkerLogs.streamError(this._logger, error);
      if (!isRetry) {
        throw error;
      }
      WorkerLogs.connectionRetry(this._logger, this._backoff.peekNextDelay());
      await this._createNewClientAndRetry();
      return;
    }
  }

  /**
   * Stop the worker and wait for any pending work items to complete.
   * Uses a configurable timeout (default 30s) to wait for in-flight work.
   */
  async stop(): Promise<void> {
    if (!this._isRunning) {
      throw new Error("The worker is not running.");
    }

    this._stopWorker = true;

    // Cancel stream first while error handlers are still attached
    // This allows the error handler to suppress CANCELLED errors
    this._responseStream?.cancel();

    // Wait for the stream to react to cancellation using events rather than a fixed delay.
    // This avoids race conditions caused by relying on timing alone.
    if (this._responseStream) {
      try {
        await withTimeout(
          new Promise<void>((resolve) => {
            const stream = this._responseStream!;
            // Any of these events indicates the stream has processed cancellation / is closing.
            stream.once("end", resolve);
            stream.once("close", resolve);
            stream.once("error", () => resolve());
          }),
          1000,
          "Timed out waiting for response stream to close after cancellation",
        );
      } catch {
        // If we time out waiting for the stream to close, proceed with forced cleanup below.
      }
    }

    // Now safe to remove listeners and destroy
    this._responseStream?.removeAllListeners();
    this._responseStream?.destroy();

    // Wait for pending work items to complete with timeout
    if (this._pendingWorkItems.size > 0) {
      WorkerLogs.shutdownWaiting(this._logger, this._pendingWorkItems.size);
      try {
        await withTimeout(
          Promise.all(this._pendingWorkItems),
          this._shutdownTimeoutMs,
          `Shutdown timed out after ${this._shutdownTimeoutMs}ms waiting for pending work items`,
        );
        WorkerLogs.shutdownCompleted(this._logger);
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        WorkerLogs.shutdownTimeout(this._logger, error.message);
      }
    }

    if (this._stub) {
      // Close the gRPC client - this is a synchronous operation
      this._stub.close();
    }
    this._isRunning = false;

    // Brief pause to allow gRPC cleanup
    // https://github.com/grpc/grpc-node/issues/1563#issuecomment-829483711
    await sleep(1000);
  }

  /**
   * Builds the GetWorkItemsRequest, attaching work item filters based on configuration.
   * - undefined (default): no filters sent, worker receives all work items
   * - "auto": auto-generate filters from the registry
   * - explicit WorkItemFilters: use as provided
   */
  private _buildGetWorkItemsRequest(): pb.GetWorkItemsRequest {
    const request = new pb.GetWorkItemsRequest();

    if (this._workItemFilters !== undefined) {
      const filters =
        this._workItemFilters === "auto"
          ? generateWorkItemFiltersFromRegistry(this._registry, this._versioning)
          : this._workItemFilters;
      request.setWorkitemfilters(toGrpcWorkItemFilters(filters));
    }

    return request;
  }

  private _trackPendingWorkItem(workPromise: Promise<void>, onError: (error: Error) => void): void {
    const handledPromise = workPromise
      .catch((e: unknown) => {
        const error = e instanceof Error ? e : new Error(String(e));
        onError(error);
      })
      .finally(() => {
        this._pendingWorkItems.delete(handledPromise);
      });

    this._pendingWorkItems.add(handledPromise);
  }

  /**
   * Executes an orchestrator request and tracks it as a pending work item.
   */
  private _executeOrchestrator(
    req: pb.OrchestratorRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
  ): void {
    const workPromise = this._executeOrchestratorInternal(req, completionToken, stub);
    this._trackPendingWorkItem(workPromise, (error) => {
      WorkerLogs.executionError(this._logger, req.getInstanceid() || "(unknown)", error);
    });
  }

  /**
   * Internal implementation of orchestrator execution.
   */
  private async _executeOrchestratorInternal(
    req: pb.OrchestratorRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
  ): Promise<void> {
    const result = await executeOrchestratorWorkItem(
      this._registry,
      req,
      completionToken,
      { logger: this._logger, versioning: this._versioning },
    );

    if (result.kind === "abandoned") {
      try {
        await callWithMetadata(
          stub.abandonTaskOrchestratorWorkItem.bind(stub),
          result.abandonRequest,
          this._metadataGenerator,
        );
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        WorkerLogs.completionError(this._logger, req.getInstanceid(), error);
      }
      return;
    }

    try {
      await callWithMetadata(stub.completeOrchestratorTask.bind(stub), result.response, this._metadataGenerator);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      WorkerLogs.completionError(this._logger, req.getInstanceid(), error);
    }
  }

  /**
   * Executes an activity request and tracks it as a pending work item.
   */
  private _executeActivity(
    req: pb.ActivityRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
  ): void {
    const workPromise = this._executeActivityInternal(req, completionToken, stub);
    this._trackPendingWorkItem(workPromise, (error) => {
      WorkerLogs.workerError(this._logger, error);
    });
  }

  /**
   * Internal implementation of activity execution.
   */
  private async _executeActivityInternal(
    req: pb.ActivityRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
  ): Promise<void> {
    const instanceId = req.getOrchestrationinstance()?.getInstanceid();

    if (!instanceId) {
      throw new Error("Activity request does not contain an orchestration instance id");
    }

    let res;

    // Start the activity span for distributed tracing
    const activitySpan = startSpanForTaskExecution(req);

    try {
      const executor = new ActivityExecutor(this._registry, this._logger);
      const result = await executor.execute(
        instanceId,
        req.getName(),
        req.getTaskid(),
        req.getInput()?.toString() ?? "",
      );

      const s = new StringValue();
      s.setValue(result?.toString() ?? "");

      res = new pb.ActivityResponse();
      res.setInstanceid(instanceId);
      res.setTaskid(req.getTaskid());
      res.setCompletiontoken(completionToken);
      res.setResult(s);

      setSpanOk(activitySpan);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      WorkerLogs.activityExecutionError(this._logger, req.getName(), error);

      setSpanError(activitySpan, error);

      const failureDetails = pbh.newFailureDetails(error);

      res = new pb.ActivityResponse();
      res.setInstanceid(instanceId);
      res.setTaskid(req.getTaskid());
      res.setCompletiontoken(completionToken);
      res.setFailuredetails(failureDetails);
    } finally {
      // End the activity span BEFORE the gRPC completion call.
      // This ensures the span duration reflects only the activity execution time,
      // not the network latency of reporting back to the sidecar.
      // Status (OK/Error) is set in the respective try/catch branches above.
      endSpan(activitySpan);
    }

    try {
      await callWithMetadata(stub.completeActivityTask.bind(stub), res, this._metadataGenerator);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      WorkerLogs.activityResponseError(this._logger, req.getName(), req.getTaskid(), instanceId!, error);
    }
  }

  /**
   * Executes an entity batch request and tracks it as a pending work item.
   */
  private _executeEntity(
    req: pb.EntityBatchRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
    operationInfos?: pb.OperationInfo[],
  ): void {
    const workPromise = this._executeEntityInternal(req, completionToken, stub, operationInfos);
    this._trackPendingWorkItem(workPromise, (error) => {
      WorkerLogs.workerError(this._logger, error);
    });
  }

  /**
   * Internal implementation of entity batch execution.
   *
   * @param req - The entity batch request from the sidecar.
   * @param completionToken - The completion token for the work item.
   * @param stub - The gRPC stub for completing the task.
   * @param operationInfos - Optional V2 operation info list to include in the result.
   *
   * @remarks
   * This method delegates execution to the shared single-work-item executor and sends the
   * result back to the sidecar.
   */
  private async _executeEntityInternal(
    req: pb.EntityBatchRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
    operationInfos?: pb.OperationInfo[],
  ): Promise<void> {
    const batchResult = await executeEntityBatchWorkItem(
      this._registry,
      req,
      completionToken,
      { logger: this._logger, versioning: this._versioning },
      operationInfos,
    );
    await this._sendEntityResult(batchResult, stub);
  }

  /**
   * Executes an entity request (V2 format) and tracks it as a pending work item.
   */
  private _executeEntityV2(
    req: pb.EntityRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
  ): void {
    const workPromise = this._executeEntityV2Internal(req, completionToken, stub);
    this._trackPendingWorkItem(workPromise, (error) => {
      WorkerLogs.workerError(this._logger, error);
    });
  }

  /**
   * Internal implementation of V2 entity execution.
   *
   * @param req - The entity request (V2) from the sidecar.
   * @param completionToken - The completion token for the work item.
   * @param stub - The gRPC stub for completing the task.
   *
   * @remarks
   * This method delegates V2 entity execution to the shared single-work-item executor and
   * sends the result back to the sidecar.
   */
  private async _executeEntityV2Internal(
    req: pb.EntityRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
  ): Promise<void> {
    const batchResult = await executeEntityWorkItem(
      this._registry,
      req,
      completionToken,
      { logger: this._logger, versioning: this._versioning },
    );
    await this._sendEntityResult(batchResult, stub);
  }

  /**
   * Sends the entity batch result to the sidecar.
   */
  private async _sendEntityResult(
    batchResult: pb.EntityBatchResult,
    stub: stubs.TaskHubSidecarServiceClient,
  ): Promise<void> {
    try {
      await callWithMetadata(stub.completeEntityTask.bind(stub), batchResult, this._metadataGenerator);
    } catch (e: any) {
      WorkerLogs.entityResponseDeliveryFailed(this._logger, e);
    }
  }
}
