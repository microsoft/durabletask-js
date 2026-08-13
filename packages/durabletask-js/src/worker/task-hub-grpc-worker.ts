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
import { OrchestrationExecutor } from "./orchestration-executor";
import { ActivityExecutor } from "./activity-executor";
import { TaskEntityShim } from "./entity-executor";
import { EntityInstanceId } from "../entities/entity-instance-id";
import { EntityFactory } from "../entities/task-entity";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Logger, ConsoleLogger } from "../types/logger.type";
import { ExponentialBackoff, withTimeout } from "../utils/backoff.util";
import { VersioningOptions, VersionMatchStrategy, VersionFailureStrategy } from "./versioning-options";
import { WorkItemFilters, generateWorkItemFiltersFromRegistry, toGrpcWorkItemFilters } from "./work-item-filters";
import { compareVersions } from "../utils/versioning.util";
import * as WorkerLogs from "./logs";
import {
  DurableTaskAttributes,
  startSpanForOrchestrationExecution,
  startSpanForTaskExecution,
  processActionsForTracing,
  createOrchestrationTraceContextPb,
  setOrchestrationStatusFromActions,
  processNewEventsForTracing,
  setSpanError,
  setSpanOk,
  endSpan,
} from "../tracing";

/** Default timeout in milliseconds for graceful shutdown. */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30000;
/** Timeout applied to each sidecar hello attempt. */
const HELLO_TIMEOUT_MS = 30000;

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
  private _registry: Registry;
  private _hostAddress?: string;
  private _tls?: boolean;
  private _grpcChannelOptions?: grpc.ChannelOptions;
  private _grpcChannelCredentials?: grpc.ChannelCredentials;
  private _metadataGenerator?: MetadataGenerator;
  private _isRunning: boolean;
  private _stub: stubs.TaskHubSidecarServiceClient | null;
  private _responseStream: grpc.ClientReadableStream<pb.WorkItem> | null;
  private _logger: Logger;
  private _pendingWorkItems: Set<Promise<void>>;
  private _shutdownTimeoutMs: number;
  private _backoff: ExponentialBackoff;
  private _versioning?: VersioningOptions;
  private _workItemFilters?: WorkItemFilters | "auto";
  private _abortController: AbortController | null;
  private _runPromise: Promise<void> | null;
  private _helloCall: grpc.ClientUnaryCall | null;

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
    this._isRunning = false;
    this._stub = null;
    this._responseStream = null;
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
    this._abortController = null;
    this._runPromise = null;
    this._helloCall = null;
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
   * Processes a single serialized TaskHubSidecarService OrchestratorRequest and
   * returns the serialized OrchestratorResponse.
   *
   * @param request - The protobuf-encoded OrchestratorRequest bytes.
   * @returns The protobuf-encoded OrchestratorResponse bytes.
   *
   * @remarks
   * This is intended for host integrations, such as Azure Functions, that drive a
   * single orchestration work item per invocation instead of running the
   * long-lived gRPC worker loop. It reuses the same execution path as the worker
   * loop, capturing the response in-process rather than completing it over gRPC.
   * Host integrations own any transport-specific encoding (for example base64).
   */
  async processOrchestratorRequest(request: Uint8Array): Promise<Uint8Array> {
    const req = pb.OrchestratorRequest.deserializeBinary(request);
    const stub = new CapturingSidecarStub();
    await this._executeOrchestratorInternal(req, "", stub as unknown as stubs.TaskHubSidecarServiceClient);

    if (!stub.orchestratorResponse) {
      if (stub.abandoned) {
        // Versioning resolved this work item to the abandon (Reject) path. Abandon has no meaning on
        // the single-work-item host path (there is no work-item queue to hand the item back to), so
        // surface a distinct, actionable error instead of the generic "no response" one. Only the
        // Reject failure strategy is unsupported here: VersionFailureStrategy.Fail (or no versioning)
        // resolves in-process and returns a response.
        throw new Error(
          "Orchestrator work item was abandoned because a version mismatch resolved to the Reject " +
            "(abandon) strategy, which the single-work-item processOrchestratorRequest path cannot " +
            "honor (there is no work-item queue to hand the item back to). Set the versioning " +
            "failureStrategy to VersionFailureStrategy.Fail (which fails the orchestration in-process " +
            "and returns a response) or disable versioning for this host integration.",
        );
      }
      throw new Error("Orchestrator execution did not produce a response.");
    }

    return stub.orchestratorResponse.serializeBinary();
  }

  /**
   * Processes a single serialized TaskHubSidecarService EntityBatchRequest and
   * returns the serialized EntityBatchResult.
   *
   * @param request - The protobuf-encoded EntityBatchRequest bytes.
   * @returns The protobuf-encoded EntityBatchResult bytes.
   *
   * @remarks
   * This is intended for host integrations, such as Azure Functions, that drive a
   * single entity batch work item per invocation instead of running the
   * long-lived gRPC worker loop. It reuses the same execution path as the worker
   * loop, capturing the result in-process rather than completing it over gRPC.
   * Host integrations own any transport-specific encoding (for example base64).
   */
  async processEntityBatchRequest(request: Uint8Array): Promise<Uint8Array> {
    const req = pb.EntityBatchRequest.deserializeBinary(request);
    const stub = new CapturingSidecarStub();
    await this._executeEntityInternal(req, "", stub as unknown as stubs.TaskHubSidecarServiceClient);

    if (!stub.entityResult) {
      throw new Error("Entity batch execution did not produce a result.");
    }

    return stub.entityResult.serializeBinary();
  }

  /**
   * In node.js we don't require a new thread as we have a main event loop
   * Therefore, we open the stream and simply listen through the eventemitter behind the scenes
   *
   * @remarks Resolves after launching the background connection loop. Connection failures
   * are logged and retried while the worker remains running.
   */
  async start(): Promise<void> {
    this._startConnectionLoop();
  }

  async internalRunWorker(client: GrpcClient, _isRetry: boolean = false): Promise<void> {
    this._startConnectionLoop(client);
  }

  private _startConnectionLoop(initialClient?: GrpcClient): void {
    if (this._isRunning) {
      throw new Error("The worker is already running.");
    }

    this._isRunning = true;
    this._abortController = new AbortController();
    this._backoff.reset();
    const signal = this._abortController.signal;
    this._runPromise = this._runConnectionLoop(signal, initialClient).catch((err) => {
      if (!signal.aborted) {
        WorkerLogs.workerError(this._logger, err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private async _runConnectionLoop(signal: AbortSignal, initialClient?: GrpcClient): Promise<void> {
    let nextClient = initialClient;

    while (!signal.aborted) {
      let stub: stubs.TaskHubSidecarServiceClient | null = null;
      let stream: grpc.ClientReadableStream<pb.WorkItem> | null = null;

      try {
        const client =
          nextClient ??
          new GrpcClient(this._hostAddress, this._grpcChannelOptions, this._tls, this._grpcChannelCredentials);
        nextClient = undefined;
        const activeStub = client.stub;
        stub = activeStub;
        this._stub = activeStub;

        const helloMetadata = await this._getMetadata();
        if (signal.aborted) {
          break;
        }
        await this._waitForHello(activeStub, helloMetadata, signal);

        const metadata = await this._getMetadata();
        if (signal.aborted) {
          break;
        }
        const request = this._buildGetWorkItemsRequest();
        stream = activeStub.getWorkItems(request, metadata);
        this._responseStream = stream;

        stream.on("data", (workItem: pb.WorkItem) => {
          if (signal.aborted) {
            return;
          }
          const completionToken = workItem.getCompletiontoken();
          if (workItem.hasOrchestratorrequest()) {
            WorkerLogs.workItemReceived(
              this._logger,
              "Orchestrator Request",
              workItem?.getOrchestratorrequest()?.getInstanceid(),
            );
            this._executeOrchestrator(workItem.getOrchestratorrequest() as any, completionToken, activeStub);
          } else if (workItem.hasActivityrequest()) {
            WorkerLogs.workItemReceived(this._logger, "Activity Request");
            this._executeActivity(workItem.getActivityrequest() as any, completionToken, activeStub);
          } else if (workItem.hasEntityrequest()) {
            const entityRequest = workItem.getEntityrequest() as pb.EntityBatchRequest;
            WorkerLogs.entityRequestReceived(this._logger, entityRequest.getInstanceid(), "Entity Request");
            this._executeEntity(entityRequest, completionToken, activeStub);
          } else if (workItem.hasEntityrequestv2()) {
            const entityRequestV2 = workItem.getEntityrequestv2() as pb.EntityRequest;
            WorkerLogs.entityRequestReceived(this._logger, entityRequestV2.getInstanceid(), "Entity Request V2");
            this._executeEntityV2(entityRequestV2, completionToken, activeStub);
          } else if (workItem.hasHealthping()) {
            // Health ping - no-op, just a keep-alive message from the server
          } else {
            WorkerLogs.unknownWorkItem(this._logger);
          }
        });

        this._backoff.reset();
        WorkerLogs.workerConnected(this._logger, this._hostAddress ?? "localhost:4001");

        const streamError = await this._waitForStreamEnd(stream, signal);
        if (signal.aborted) {
          WorkerLogs.streamEnded(this._logger);
          break;
        }
        if (streamError) {
          WorkerLogs.streamErrorInfo(this._logger, streamError);
        }
        WorkerLogs.streamRetry(this._logger, this._backoff.peekNextDelay());
      } catch (err) {
        if (signal.aborted) {
          break;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        WorkerLogs.streamError(this._logger, error);
        WorkerLogs.connectionRetry(this._logger, this._backoff.peekNextDelay());
      } finally {
        if (stream) {
          this._disposeResponseStream(stream);
        }
        if (stub && !signal.aborted) {
          stub.close();
          if (this._stub === stub) {
            this._stub = null;
          }
        }
      }

      if (signal.aborted) {
        break;
      }

      try {
        await this._backoff.wait(signal);
      } catch (err) {
        if (!signal.aborted) {
          throw err;
        }
      }
    }
  }

  private async _waitForHello(
    stub: stubs.TaskHubSidecarServiceClient,
    metadata: grpc.Metadata,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) {
      throw this._getAbortError(signal);
    }

    let call: grpc.ClientUnaryCall | undefined;
    let removeAbortListener: (() => void) | undefined;

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (error?: Error) => {
          if (settled) {
            return;
          }
          settled = true;
          removeAbortListener?.();
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };
        const onAbort = () => finish(this._getAbortError(signal));
        removeAbortListener = () => signal.removeEventListener("abort", onAbort);
        signal.addEventListener("abort", onAbort, { once: true });

        try {
          call = stub.hello(new Empty(), metadata, { deadline: new Date(Date.now() + HELLO_TIMEOUT_MS) }, (error) =>
            finish(error ?? undefined),
          );
          this._helloCall = call;
        } catch (err) {
          finish(err instanceof Error ? err : new Error(String(err)));
        }
      });
    } finally {
      removeAbortListener?.();
      if (this._helloCall === call) {
        this._helloCall = null;
      }
    }
  }

  private _waitForStreamEnd(
    stream: grpc.ClientReadableStream<pb.WorkItem>,
    signal: AbortSignal,
  ): Promise<Error | undefined> {
    if (signal.aborted) {
      return Promise.resolve(undefined);
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(error);
      };
      const onAbort = () => finish();

      signal.addEventListener("abort", onAbort, { once: true });
      stream.once("end", () => finish());
      // Keep handling duplicate errors until the loop disposes the stream.
      stream.on("error", (error: Error) => finish(error));
    });
  }

  private _getAbortError(signal: AbortSignal): Error {
    const reason = signal.reason;
    return reason instanceof Error ? reason : new Error("The worker was stopped.");
  }

  private _disposeResponseStream(stream: grpc.ClientReadableStream<pb.WorkItem>): void {
    stream.removeAllListeners();
    stream.on("error", () => {});
    stream.destroy();
    if (this._responseStream === stream) {
      this._responseStream = null;
    }
  }

  /**
   * Stop the worker and wait for any pending work items to complete.
   * Uses a configurable timeout (default 30s) to wait for in-flight work.
   */
  async stop(): Promise<void> {
    const abortController = this._abortController;
    const runPromise = this._runPromise;
    if (!this._isRunning || !abortController || !runPromise || abortController.signal.aborted) {
      throw new Error("The worker is not running.");
    }

    abortController.abort(new Error("The worker was stopped."));
    this._helloCall?.cancel();
    this._responseStream?.cancel();
    await runPromise;

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

    this._stub?.close();
    this._abortController = null;
    this._runPromise = null;
    this._helloCall = null;
    this._responseStream = null;
    this._stub = null;
    this._isRunning = false;
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

  /**
   * Result of version compatibility check.
   */
  private _checkVersionCompatibility(req: pb.OrchestratorRequest): {
    compatible: boolean;
    shouldFail: boolean;
    orchestrationVersion?: string;
    errorType?: string;
    errorMessage?: string;
  } {
    // If no versioning options configured or match strategy is None, always compatible
    if (!this._versioning || this._versioning.matchStrategy === VersionMatchStrategy.None) {
      return { compatible: true, shouldFail: false };
    }

    // Extract orchestration version from ExecutionStarted event
    const orchestrationVersion = this._getOrchestrationVersion(req);
    const workerVersion = this._versioning.version;

    // If worker version is not set, process all
    if (!workerVersion) {
      return { compatible: true, shouldFail: false };
    }

    let compatible = false;
    let errorType = "VersionMismatch";
    let errorMessage = "";

    switch (this._versioning.matchStrategy) {
      case VersionMatchStrategy.Strict:
        // Only process if versions match (using semantic comparison)
        compatible = compareVersions(orchestrationVersion, workerVersion) === 0;
        if (!compatible) {
          errorMessage = `The orchestration version '${orchestrationVersion ?? ""}' does not match the worker version '${workerVersion}'.`;
        }
        break;

      case VersionMatchStrategy.CurrentOrOlder:
        // Process if orchestration version is current or older
        if (!orchestrationVersion) {
          // Empty orchestration version is considered older
          compatible = true;
        } else {
          compatible = compareVersions(orchestrationVersion, workerVersion) <= 0;
          if (!compatible) {
            errorMessage = `The orchestration version '${orchestrationVersion}' is greater than the worker version '${workerVersion}'.`;
          }
        }
        break;

      default:
        // Unknown match strategy - treat as version error
        compatible = false;
        errorType = "VersionError";
        errorMessage = `The version match strategy '${this._versioning.matchStrategy}' is unknown.`;
        break;
    }

    if (!compatible) {
      const shouldFail = this._versioning.failureStrategy === VersionFailureStrategy.Fail;
      return { compatible: false, shouldFail, orchestrationVersion, errorType, errorMessage };
    }

    return { compatible: true, shouldFail: false };
  }

  /**
   * Extracts the orchestration version from the ExecutionStarted event in the request.
   */
  private _getOrchestrationVersion(req: pb.OrchestratorRequest): string | undefined {
    // Look for ExecutionStarted event in both past and new events
    const allEvents = [...req.getPasteventsList(), ...req.getNeweventsList()];

    for (const event of allEvents) {
      if (event.hasExecutionstarted()) {
        return event.getExecutionstarted()?.getVersion()?.getValue();
      }
    }

    return undefined;
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
    const instanceId = req.getInstanceid();

    if (!instanceId) {
      throw new Error(`Could not execute the orchestrator as the instanceId was not provided (${instanceId})`);
    }

    // Check version compatibility if versioning is enabled
    const versionCheckResult = this._checkVersionCompatibility(req);
    if (!versionCheckResult.compatible) {
      if (versionCheckResult.shouldFail) {
        // Fail the orchestration with version mismatch error
        WorkerLogs.versionMismatchFail(
          this._logger,
          instanceId,
          versionCheckResult.errorType!,
          versionCheckResult.errorMessage!,
        );

        const failureDetails = pbh.newVersionMismatchFailureDetails(
          versionCheckResult.errorType!,
          versionCheckResult.errorMessage!,
        );

        const actions = [
          pbh.newCompleteOrchestrationAction(
            -1,
            pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
            undefined,
            failureDetails,
          ),
        ];

        const res = new pb.OrchestratorResponse();
        res.setInstanceid(instanceId);
        res.setCompletiontoken(completionToken);
        res.setActionsList(actions);

        try {
          await callWithMetadata(stub.completeOrchestratorTask.bind(stub), res, this._metadataGenerator);
        } catch (e: unknown) {
          const error = e instanceof Error ? e : new Error(String(e));
          WorkerLogs.completionError(this._logger, instanceId, error);
        }
        return;
      } else {
        // Reject the work item - explicitly abandon it so it can be picked up by another worker
        WorkerLogs.versionMismatchAbandon(
          this._logger,
          instanceId,
          versionCheckResult.errorType!,
          versionCheckResult.errorMessage!,
        );

        try {
          const abandonRequest = new pb.AbandonOrchestrationTaskRequest();
          abandonRequest.setCompletiontoken(completionToken);
          await callWithMetadata(
            stub.abandonTaskOrchestratorWorkItem.bind(stub),
            abandonRequest,
            this._metadataGenerator,
          );
        } catch (e: unknown) {
          const error = e instanceof Error ? e : new Error(String(e));
          WorkerLogs.completionError(this._logger, instanceId, error);
        }
        return;
      }
    }

    // Find the ExecutionStartedEvent from either past or new events for tracing
    const allProtoEvents = [...req.getPasteventsList(), ...req.getNeweventsList()];
    let executionStartedProtoEvent: pb.ExecutionStartedEvent | undefined;
    for (const protoEvent of allProtoEvents) {
      if (protoEvent.hasExecutionstarted()) {
        executionStartedProtoEvent = protoEvent.getExecutionstarted()!;
        break;
      }
    }

    // Start the orchestration span BEFORE execution so failures are traced
    const orchTraceContext = req.getOrchestrationtracecontext();
    const tracingResult = executionStartedProtoEvent
      ? startSpanForOrchestrationExecution(executionStartedProtoEvent, orchTraceContext, instanceId)
      : undefined;

    // Emit retroactive spans for tasks/sub-orchestrations that completed/failed and timers
    // that fired. This follows the .NET SDK pattern where these spans are emitted from
    // history events BEFORE the orchestrator executor runs.
    const orchName = executionStartedProtoEvent?.getName() ?? "";
    if (tracingResult) {
      processNewEventsForTracing(
        tracingResult.span,
        req.getPasteventsList(),
        req.getNeweventsList(),
        instanceId,
        orchName,
      );
    }

    let res;

    try {
      const executor = new OrchestrationExecutor(this._registry, this._logger);
      const result = await executor.execute(
        req.getInstanceid(),
        req.getPasteventsList(),
        req.getNeweventsList(),
        req.getExecutionid()?.getValue(),
      );

      // Process actions to inject trace context into scheduled tasks, sub-orchestrations, etc.
      if (tracingResult) {
        const executionId = req.getExecutionid()?.getValue();
        processActionsForTracing(tracingResult.span, result.actions, orchName, instanceId, executionId);
      }

      res = new pb.OrchestratorResponse();
      res.setInstanceid(req.getInstanceid());
      res.setCompletiontoken(completionToken);
      res.setActionsList(result.actions);
      if (result.customStatus !== undefined) {
        res.setCustomstatus(pbh.getStringValue(result.customStatus));
      }

      // Set the OrchestrationTraceContext on the response for replay continuity
      if (tracingResult) {
        const orchTraceCtxPb = createOrchestrationTraceContextPb(tracingResult.spanInfo);
        res.setOrchestrationtracecontext(orchTraceCtxPb);

        // Set orchestration completion status attribute and span status
        // (OK for success, ERROR for failed orchestrations — matching .NET)
        setOrchestrationStatusFromActions(tracingResult.span, result.actions);
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      WorkerLogs.executionError(this._logger, req.getInstanceid(), error);

      // Record the failure on the tracing span
      if (tracingResult) {
        setSpanError(tracingResult.span, error);
        // Set just the status attribute — don't call setOrchestrationStatusFromActions
        // which would overwrite the specific error message with a generic one
        tracingResult.span.setAttribute(DurableTaskAttributes.TASK_STATUS, "Failed");
      }

      const failureDetails = pbh.newFailureDetails(error);

      const actions = [
        pbh.newCompleteOrchestrationAction(
          -1,
          pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
          undefined,
          failureDetails,
        ),
      ];

      res = new pb.OrchestratorResponse();
      res.setInstanceid(req.getInstanceid());
      res.setCompletiontoken(completionToken);
      res.setActionsList(actions);
    } finally {
      // Always end the orchestration span, regardless of success or failure.
      // Status (OK/Error) is set in the respective try/catch branches above.
      endSpan(tracingResult?.span);
    }

    try {
      await callWithMetadata(stub.completeOrchestratorTask.bind(stub), res, this._metadataGenerator);
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
        req.getInput()?.getValue() ?? "",
      );

      const s = new StringValue();
      s.setValue(result ?? "");

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
   * This method looks up the entity by name, creates a TaskEntityShim, executes the batch,
   * and sends the result back to the sidecar.
   */
  private async _executeEntityInternal(
    req: pb.EntityBatchRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
    operationInfos?: pb.OperationInfo[],
  ): Promise<void> {
    const instanceIdString = req.getInstanceid();

    if (!instanceIdString) {
      throw new Error("Entity request does not contain an instance id");
    }

    // Parse the entity instance ID (format: @name@key)
    let entityId: EntityInstanceId;
    try {
      entityId = EntityInstanceId.fromString(instanceIdString);
    } catch (e: any) {
      WorkerLogs.entityInstanceIdParseError(this._logger, instanceIdString, e);
      // Return error result for all operations
      const batchResult = this._createEntityNotFoundResult(
        req,
        completionToken,
        `Invalid entity instance id format: '${instanceIdString}'`,
      );
      await this._sendEntityResult(batchResult, stub);
      return;
    }

    let batchResult: pb.EntityBatchResult;

    try {
      // Look up the entity factory by name
      const factory = this._registry.getEntity(entityId.name);

      if (factory) {
        // Create the entity instance and execute the batch
        const entity = factory();
        const shim = new TaskEntityShim(entity, entityId);
        batchResult = await shim.executeAsync(req);
        batchResult.setCompletiontoken(completionToken);
      } else {
        // Entity not found - return error result for all operations
        WorkerLogs.entityNotFound(this._logger, entityId.name);
        batchResult = this._createEntityNotFoundResult(
          req,
          completionToken,
          `No entity task named '${entityId.name}' was found.`,
        );
      }
    } catch (e: any) {
      // Framework-level error - return result with failure details
      // This will cause the batch to be abandoned and retried
      WorkerLogs.entityExecutionFailed(this._logger, entityId.name, e);

      const failureDetails = pbh.newFailureDetails(e);

      batchResult = new pb.EntityBatchResult();
      batchResult.setCompletiontoken(completionToken);
      batchResult.setFailuredetails(failureDetails);
    }

    // Add V2 operationInfos if provided (used by DTS backend)
    if (operationInfos && operationInfos.length > 0) {
      // Take only as many operationInfos as there are results.
      // Use resultsCount directly (not `resultsCount || operationInfos.length`)
      // because 0 is a valid count when a framework-level error produces zero
      // individual results; the falsy-OR would incorrectly include all infos.
      const resultsCount = batchResult.getResultsList().length;
      const infosToInclude = operationInfos.slice(0, resultsCount);
      batchResult.setOperationinfosList(infosToInclude);
    }

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
   * This method handles the V2 entity request format which uses HistoryEvent
   * instead of OperationRequest. It converts the V2 format to V1 format
   * (EntityBatchRequest) and delegates to the existing execution logic.
   */
  private async _executeEntityV2Internal(
    req: pb.EntityRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
  ): Promise<void> {
    // Convert EntityRequest (V2) to EntityBatchRequest (V1) format
    const batchRequest = new pb.EntityBatchRequest();
    batchRequest.setInstanceid(req.getInstanceid());

    // Copy entity state
    const entityState = req.getEntitystate();
    if (entityState) {
      batchRequest.setEntitystate(entityState);
    }

    // Convert HistoryEvent operations to OperationRequest format
    // Also build the operationInfos list for V2 responses
    const historyEvents = req.getOperationrequestsList();
    const operations: pb.OperationRequest[] = [];
    const operationInfos: pb.OperationInfo[] = [];

    for (const event of historyEvents) {
      const eventType = event.getEventtypeCase();

      if (eventType === pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONSIGNALED) {
        const signaled = event.getEntityoperationsignaled();
        if (signaled) {
          const opRequest = new pb.OperationRequest();
          opRequest.setOperation(signaled.getOperation());
          opRequest.setRequestid(signaled.getRequestid());
          const input = signaled.getInput();
          if (input) {
            opRequest.setInput(input);
          }
          operations.push(opRequest);

          // Build OperationInfo for signaled operations (no response destination)
          const opInfo = new pb.OperationInfo();
          opInfo.setRequestid(signaled.getRequestid());
          // Signals don't send a response, so responseDestination is null
          operationInfos.push(opInfo);
        }
      } else if (eventType === pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONCALLED) {
        const called = event.getEntityoperationcalled();
        if (called) {
          const opRequest = new pb.OperationRequest();
          opRequest.setOperation(called.getOperation());
          opRequest.setRequestid(called.getRequestid());
          const input = called.getInput();
          if (input) {
            opRequest.setInput(input);
          }
          operations.push(opRequest);

          // Build OperationInfo for called operations (with response destination)
          const opInfo = new pb.OperationInfo();
          opInfo.setRequestid(called.getRequestid());

          // Called operations send responses to the parent orchestration
          const parentInstanceId = called.getParentinstanceid();
          const parentExecutionId = called.getParentexecutionid();
          if (parentInstanceId || parentExecutionId) {
            const responseDestination = new pb.OrchestrationInstance();
            if (parentInstanceId) {
              responseDestination.setInstanceid(parentInstanceId.getValue());
            }
            if (parentExecutionId) {
              // executionId needs to be wrapped in a StringValue
              const execIdValue = new StringValue();
              execIdValue.setValue(parentExecutionId.getValue());
              responseDestination.setExecutionid(execIdValue);
            }
            opInfo.setResponsedestination(responseDestination);
          }
          operationInfos.push(opInfo);
        }
      } else {
        WorkerLogs.entityUnknownOperationEventType(this._logger, eventType.toString());
      }
    }

    batchRequest.setOperationsList(operations);

    // Delegate to the V1 execution logic with V2 operationInfos
    await this._executeEntityInternal(batchRequest, completionToken, stub, operationInfos);
  }

  /**
   * Creates an EntityBatchResult for when an entity is not found.
   *
   * @remarks
   * Returns a non-retriable error for each operation in the batch.
   */
  private _createEntityNotFoundResult(
    req: pb.EntityBatchRequest,
    completionToken: string,
    errorMessage: string,
  ): pb.EntityBatchResult {
    const batchResult = new pb.EntityBatchResult();
    batchResult.setCompletiontoken(completionToken);

    // State is unmodified - return the original state
    const originalState = req.getEntitystate();
    if (originalState) {
      batchResult.setEntitystate(originalState);
    }

    // Create a failure result for each operation in the batch
    const operations = req.getOperationsList();
    const results: pb.OperationResult[] = [];

    for (let i = 0; i < operations.length; i++) {
      const result = new pb.OperationResult();
      const failure = new pb.OperationResultFailure();
      const failureDetails = new pb.TaskFailureDetails();

      failureDetails.setErrortype("EntityTaskNotFound");
      failureDetails.setErrormessage(errorMessage);
      failureDetails.setIsnonretriable(true);

      failure.setFailuredetails(failureDetails);
      result.setFailure(failure);
      results.push(result);
    }

    batchResult.setResultsList(results);
    batchResult.setActionsList([]);

    return batchResult;
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

/**
 * A minimal in-process stand-in for the TaskHubSidecarService client that captures the
 * completion payload instead of sending it over gRPC.
 *
 * @remarks
 * This lets host integrations reuse the worker's existing execution path for a single work
 * item (see {@link TaskHubGrpcWorker.processOrchestratorRequest} and
 * {@link TaskHubGrpcWorker.processEntityBatchRequest}) without opening a gRPC channel. Only the
 * completion/abandon methods used by those execution paths are implemented.
 */
class CapturingSidecarStub {
  orchestratorResponse?: pb.OrchestratorResponse;
  entityResult?: pb.EntityBatchResult;
  /** Set when the execution path abandons the work item (e.g. a version mismatch) rather than completing it. */
  abandoned = false;

  completeOrchestratorTask(
    request: pb.OrchestratorResponse,
    _metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: Empty) => void,
  ): void {
    this.orchestratorResponse = request;
    callback(null, new Empty());
  }

  completeEntityTask(
    request: pb.EntityBatchResult,
    _metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: Empty) => void,
  ): void {
    this.entityResult = request;
    callback(null, new Empty());
  }

  abandonTaskOrchestratorWorkItem(
    _request: pb.AbandonOrchestrationTaskRequest,
    _metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: Empty) => void,
  ): void {
    // Abandon is a no-op for the single-work-item host path: the version-mismatch abandon branch
    // in _executeOrchestratorInternal calls this, but processOrchestratorRequest only surfaces a
    // completion response. Record it so the caller can distinguish an abandoned work item from a
    // genuine "no response produced" failure.
    this.abandoned = true;
    callback(null, new Empty());
  }
}
