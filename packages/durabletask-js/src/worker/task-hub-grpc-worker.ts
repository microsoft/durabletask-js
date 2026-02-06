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
import { ExponentialBackoff, sleep, withTimeout } from "../utils/backoff.util";
import { VersioningOptions, VersionMatchStrategy, VersionFailureStrategy } from "./versioning-options";
import { compareVersions } from "../utils/versioning.util";
import * as WorkerLogs from "./logs";
import {
  startSpanForOrchestrationExecution,
  startSpanForTaskExecution,
  processActionsForTracing,
  createOrchestrationTraceContextPb,
  setSpanError,
  setSpanOk,
  endSpan,
} from "../tracing";

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
      const stream = client.stub.getWorkItems(new pb.GetWorkItemsRequest(), metadata);
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
          console.log(`Received "Entity Request" work item for entity '${entityRequest.getInstanceid()}'`);
          this._executeEntity(entityRequest, completionToken, client.stub);
        } else if (workItem.hasEntityrequestv2()) {
          const entityRequestV2 = workItem.getEntityrequestv2() as pb.EntityRequest;
          console.log(`Received "Entity Request V2" work item for entity '${entityRequestV2.getInstanceid()}'`);
          this._executeEntityV2(entityRequestV2, completionToken, client.stub);
        } else if (workItem.hasHealthping()) {
          // Health ping - no-op, just a keep-alive message from the server
        } else {
          WorkerLogs.unknownWorkItem(this._logger);
        }
      });

      // Wait for the stream to end or error
      stream.on("end", async () => {
        if (this._stopWorker) {
          WorkerLogs.streamEnded(this._logger);
          stream.removeAllListeners();
          stream.destroy();
          return;
        }
        // Stream ended unexpectedly - clean up and retry
        stream.removeAllListeners();
        stream.destroy();
        WorkerLogs.streamRetry(this._logger, this._backoff.peekNextDelay());
        await this._createNewClientAndRetry();
      });

      stream.on("error", (err: Error) => {
        // Ignore cancellation errors when the worker is being stopped intentionally
        if (this._stopWorker) {
          return;
        }
        WorkerLogs.streamErrorInfo(this._logger, err);
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

  /**
   * Executes an orchestrator request and tracks it as a pending work item.
   */
  private _executeOrchestrator(
    req: pb.OrchestratorRequest,
    completionToken: string,
    stub: stubs.TaskHubSidecarServiceClient,
  ): void {
    const workPromise = this._executeOrchestratorInternal(req, completionToken, stub);
    this._pendingWorkItems.add(workPromise);
    workPromise.finally(() => {
      this._pendingWorkItems.delete(workPromise);
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
          await callWithMetadata(stub.abandonTaskOrchestratorWorkItem.bind(stub), abandonRequest, this._metadataGenerator);
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

    let res;

    try {
      const executor = new OrchestrationExecutor(this._registry, this._logger);
      const result = await executor.execute(req.getInstanceid(), req.getPasteventsList(), req.getNeweventsList());

      // Process actions to inject trace context into scheduled tasks, sub-orchestrations, etc.
      if (tracingResult) {
        const orchName = executionStartedProtoEvent?.getName() ?? "";
        processActionsForTracing(tracingResult.span, result.actions, orchName);
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

        setSpanOk(tracingResult.span);
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      WorkerLogs.executionError(this._logger, req.getInstanceid(), error);

      // Record the failure on the tracing span
      if (tracingResult) {
        setSpanError(tracingResult.span, error);
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
    this._pendingWorkItems.add(workPromise);
    workPromise.finally(() => {
      this._pendingWorkItems.delete(workPromise);
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
   * Executes an entity batch request.
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
  private async _executeEntity(
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
      console.error(`Failed to parse entity instance id '${instanceIdString}': ${e.message}`);
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
        console.log(`No entity named '${entityId.name}' was found.`);
        batchResult = this._createEntityNotFoundResult(
          req,
          completionToken,
          `No entity task named '${entityId.name}' was found.`,
        );
      }
    } catch (e: any) {
      // Framework-level error - return result with failure details
      // This will cause the batch to be abandoned and retried
      console.error(e);
      console.log(`An error occurred while trying to execute entity '${entityId.name}': ${e.message}`);

      const failureDetails = pbh.newFailureDetails(e);

      batchResult = new pb.EntityBatchResult();
      batchResult.setCompletiontoken(completionToken);
      batchResult.setFailuredetails(failureDetails);
    }

    // Add V2 operationInfos if provided (used by DTS backend)
    if (operationInfos && operationInfos.length > 0) {
      // Take only as many operationInfos as there are results
      const resultsCount = batchResult.getResultsList().length;
      const infosToInclude = operationInfos.slice(0, resultsCount || operationInfos.length);
      batchResult.setOperationinfosList(infosToInclude);
    }

    await this._sendEntityResult(batchResult, stub);
  }

  /**
   * Executes an entity request (V2 format).
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
  private async _executeEntityV2(
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
        console.log(`Skipping unknown entity operation event type: ${eventType}`);
      }
    }

    batchRequest.setOperationsList(operations);

    // Delegate to the V1 execution logic with V2 operationInfos
    await this._executeEntity(batchRequest, completionToken, stub, operationInfos);
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
      console.error(`Failed to deliver entity response to sidecar: ${e?.message}`);
    }
  }
}
