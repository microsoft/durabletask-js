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
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Logger, ConsoleLogger } from "../types/logger.type";
import { ExponentialBackoff, sleep, withTimeout } from "../utils/backoff.util";
import { VersioningOptions, VersionMatchStrategy, VersionFailureStrategy } from "./versioning-options";
import { compareVersions } from "../utils/versioning.util";

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
        this._logger.error("Worker error:", err);
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
        this._logger.error("Worker error:", err);
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

      this._logger.info(`Successfully connected to ${this._hostAddress}. Waiting for work items...`);

      // Wait for a work item to be received
      stream.on("data", (workItem: pb.WorkItem) => {
        const completionToken = workItem.getCompletiontoken();
        if (workItem.hasOrchestratorrequest()) {
          this._logger.info(
            `Received "Orchestrator Request" work item with instance id '${workItem
              ?.getOrchestratorrequest()
              ?.getInstanceid()}'`,
          );
          this._executeOrchestrator(workItem.getOrchestratorrequest() as any, completionToken, client.stub);
        } else if (workItem.hasActivityrequest()) {
          this._logger.info(`Received "Activity Request" work item`);
          this._executeActivity(workItem.getActivityrequest() as any, completionToken, client.stub);
        } else if (workItem.hasHealthping()) {
          // Health ping - no-op, just a keep-alive message from the server
        } else {
          this._logger.info(`Received unknown type of work item `);
        }
      });

      // Wait for the stream to end or error
      stream.on("end", async () => {
        if (this._stopWorker) {
          this._logger.info("Stream ended");
          stream.removeAllListeners();
          stream.destroy();
          return;
        }
        // Stream ended unexpectedly - clean up and retry
        stream.removeAllListeners();
        stream.destroy();
        this._logger.info(`Stream abruptly closed, will retry in ${this._backoff.peekNextDelay()}ms...`);
        await this._createNewClientAndRetry();
      });

      stream.on("error", (err: Error) => {
        // Ignore cancellation errors when the worker is being stopped intentionally
        if (this._stopWorker) {
          return;
        }
        this._logger.info("Stream error", err);
      });
    } catch (err) {
      if (this._stopWorker) {
        // ignoring the error because the worker has been stopped
        return;
      }
      this._logger.error(`Error on grpc stream: ${err}`);
      if (!isRetry) {
        throw err;
      }
      this._logger.info(`Connection will be retried in ${this._backoff.peekNextDelay()}ms...`);
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
      this._logger.info(`Waiting for ${this._pendingWorkItems.size} pending work item(s) to complete...`);
      try {
        await withTimeout(
          Promise.all(this._pendingWorkItems),
          this._shutdownTimeoutMs,
          `Shutdown timed out after ${this._shutdownTimeoutMs}ms waiting for pending work items`,
        );
        this._logger.info("All pending work items completed.");
      } catch (e) {
        this._logger.warn(`${(e as Error).message}. Forcing shutdown.`);
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
        this._logger.warn(
          `${versionCheckResult.errorType} for instance '${instanceId}': ${versionCheckResult.errorMessage}. Failing orchestration.`,
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
        } catch (e: any) {
          this._logger.error(`An error occurred while trying to complete instance '${instanceId}': ${e?.message}`);
        }
        return;
      } else {
        // Reject the work item - explicitly abandon it so it can be picked up by another worker
        this._logger.info(
          `${versionCheckResult.errorType} for instance '${instanceId}': ${versionCheckResult.errorMessage}. Abandoning work item.`,
        );

        try {
          const abandonRequest = new pb.AbandonOrchestrationTaskRequest();
          abandonRequest.setCompletiontoken(completionToken);
          await callWithMetadata(stub.abandonTaskOrchestratorWorkItem.bind(stub), abandonRequest, this._metadataGenerator);
        } catch (e: any) {
          this._logger.error(`An error occurred while trying to abandon work item for instance '${instanceId}': ${e?.message}`);
        }
        return;
      }
    }

    let res;

    try {
      const executor = new OrchestrationExecutor(this._registry, this._logger);
      const result = await executor.execute(req.getInstanceid(), req.getPasteventsList(), req.getNeweventsList());

      res = new pb.OrchestratorResponse();
      res.setInstanceid(req.getInstanceid());
      res.setCompletiontoken(completionToken);
      res.setActionsList(result.actions);
      if (result.customStatus !== undefined) {
        res.setCustomstatus(pbh.getStringValue(result.customStatus));
      }
    } catch (e: any) {
      this._logger.error(
        `An error occurred while trying to execute instance '${req.getInstanceid()}':`,
        e,
      );

      const failureDetails = pbh.newFailureDetails(e);

      const actions = [
        pbh.newCompleteOrchestrationAction(
          -1,
          pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
          failureDetails?.toString(),
        ),
      ];

      res = new pb.OrchestratorResponse();
      res.setInstanceid(req.getInstanceid());
      res.setCompletiontoken(completionToken);
      res.setActionsList(actions);
    }

    try {
      await callWithMetadata(stub.completeOrchestratorTask.bind(stub), res, this._metadataGenerator);
    } catch (e: any) {
      this._logger.error(`An error occurred while trying to complete instance '${req.getInstanceid()}': ${e?.message}`);
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
    } catch (e: any) {
      this._logger.error(`An error occurred while trying to execute activity '${req.getName()}':`, e);

      const failureDetails = pbh.newFailureDetails(e);

      res = new pb.ActivityResponse();
      res.setTaskid(req.getTaskid());
      res.setCompletiontoken(completionToken);
      res.setFailuredetails(failureDetails);
    }

    try {
      await callWithMetadata(stub.completeActivityTask.bind(stub), res, this._metadataGenerator);
    } catch (e: any) {
      this._logger.error(
        `Failed to deliver activity response for '${req.getName()}#${req.getTaskid()}' of orchestration ID '${instanceId}' to sidecar: ${
          e?.message
        }`,
      );
    }
  }
}
