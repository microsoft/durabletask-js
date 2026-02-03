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

/** Default timeout in milliseconds for graceful shutdown. */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30000;

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
   */
  constructor(
    hostAddress?: string,
    options?: grpc.ChannelOptions,
    useTLS?: boolean,
    credentials?: grpc.ChannelCredentials,
    metadataGenerator?: MetadataGenerator,
    logger?: Logger,
    shutdownTimeoutMs?: number,
  ) {
    this._registry = new Registry();
    this._hostAddress = hostAddress;
    this._tls = useTLS;
    this._grpcChannelOptions = options;
    this._grpcChannelCredentials = credentials;
    this._metadataGenerator = metadataGenerator;
    this._responseStream = null;
    this._isRunning = false;
    this._stopWorker = false;
    this._stub = null;
    this._logger = logger ?? new ConsoleLogger();
    this._pendingWorkItems = new Set();
    this._shutdownTimeoutMs = shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
    this._backoff = new ExponentialBackoff({
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      multiplier: 2,
    });
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
        this._logger.error(`Worker error: ${err}`);
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
        await this._backoff.wait();
        // Create a new client for the retry to avoid stale channel issues
        const newClient = new GrpcClient(
          this._hostAddress,
          this._grpcChannelOptions,
          this._tls,
          this._grpcChannelCredentials,
        );
        this._stub = newClient.stub;
        // do not await
        this.internalRunWorker(newClient, true).catch((err) => {
          if (!this._stopWorker) {
            this._logger.error(`Worker error: ${err}`);
          }
        });
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
      await this._backoff.wait();
      // Create a new client for the retry
      const newClient = new GrpcClient(
        this._hostAddress,
        this._grpcChannelOptions,
        this._tls,
        this._grpcChannelCredentials,
      );
      this._stub = newClient.stub;
      this.internalRunWorker(newClient, true).catch((retryErr) => {
        if (!this._stopWorker) {
          this._logger.error(`Worker error: ${retryErr}`);
        }
      });
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

    this._stub?.close();
    this._isRunning = false;

    // Brief pause to allow gRPC cleanup
    // https://github.com/grpc/grpc-node/issues/1563#issuecomment-829483711
    await sleep(1000);
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
      this._logger.error(e);
      this._logger.info(`An error occurred while trying to execute instance '${req.getInstanceid()}': ${e.message}`);

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
      this._logger.error(e);
      this._logger.info(`An error occurred while trying to execute activity '${req.getName()}': ${e.message}`);

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
