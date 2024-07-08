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
import { promisify } from "util";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import * as pbh from "../utils/pb-helper.util";
import { OrchestrationExecutor } from "./orchestration-executor";
import { ActivityExecutor } from "./activity-executor";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";

export class TaskHubGrpcWorker {
  private _responseStream: grpc.ClientReadableStream<pb.WorkItem> | null;
  private _registry: Registry;
  private _hostAddress?: string;
  private _tls?: boolean;
  private _grpcChannelOptions?: grpc.ChannelOptions;
  private _isRunning: boolean;
  private _stub: stubs.TaskHubSidecarServiceClient | null;

  constructor(hostAddress?: string, options?: grpc.ChannelOptions, useTLS?: boolean) {
    this._registry = new Registry();
    this._hostAddress = hostAddress;
    this._tls = useTLS;
    this._grpcChannelOptions = options;
    this._responseStream = null;
    this._isRunning = false;
    this._stub = null;
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
    const client = new GrpcClient(this._hostAddress, this._grpcChannelOptions, this._tls);

    if (this._isRunning) {
      throw new Error("The worker is already running.");
    }

    // send a "Hello" message to the sidecar to ensure that it's listening
    const prom = promisify(client.stub.hello.bind(client.stub));
    await prom(new Empty());

    // Stream work items from the sidecar
    const stubGetWorkItemsReq = new pb.GetWorkItemsRequest();
    this._stub = client.stub;
    this._responseStream = client.stub.getWorkItems(stubGetWorkItemsReq);

    console.log(`Successfully connected to ${this._hostAddress}. Waiting for work items...`);

    // Wait for a work item to be received
    this._responseStream.on("data", (workItem: pb.WorkItem) => {
      if (workItem.hasOrchestratorrequest()) {
        console.log(
          `Received "Orchestrator Request" work item with instance id '${workItem
            ?.getOrchestratorrequest()
            ?.getInstanceid()}'`,
        );
        this._executeOrchestrator(workItem.getOrchestratorrequest() as any, client.stub);
      } else if (workItem.hasActivityrequest()) {
        console.log(`Received "Activity Request" work item`);
        this._executeActivity(workItem.getActivityrequest() as any, client.stub);
      } else {
        console.log(`Received unknown work item`);
      }
    });

    // Wait for the stream to end or error
    this._responseStream.on("end", () => {
      console.log("Stream ended");
    });

    this._responseStream.on("error", (err: Error) => {
      console.log("Stream error", err);
    });

    this._isRunning = true;
  }

  /**
   * Stop the worker and wait for any pending work items to complete
   */
  async stop(): Promise<void> {
    if (!this._isRunning) {
      throw new Error("The worker is not running.");
    }

    this._responseStream?.cancel();
    this._responseStream?.destroy();

    this._stub?.close();

    this._isRunning = false;

    // Wait a bit to let the async operations finish
    // https://github.com/grpc/grpc-node/issues/1563#issuecomment-829483711
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   *
   */
  private async _executeOrchestrator(
    req: pb.OrchestratorRequest,
    stub: stubs.TaskHubSidecarServiceClient,
  ): Promise<void> {
    const instanceId = req.getInstanceid();

    if (!instanceId) {
      throw new Error(`Could not execute the orchestrator as the instanceId was not provided (${instanceId})`);
    }

    let res;

    try {
      const executor = new OrchestrationExecutor(this._registry);
      const actions = await executor.execute(req.getInstanceid(), req.getPasteventsList(), req.getNeweventsList());

      res = new pb.OrchestratorResponse();
      res.setInstanceid(req.getInstanceid());
      res.setActionsList(actions);
    } catch (e: any) {
      console.error(e);
      console.log(`An error occurred while trying to execute instance '${req.getInstanceid()}': ${e.message}`);

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
      res.setActionsList(actions);
    }

    try {
      const stubCompleteOrchestratorTask = promisify(stub.completeOrchestratorTask.bind(stub));
      await stubCompleteOrchestratorTask(res);
    } catch (e: any) {
      console.error(`An error occurred while trying to complete instance '${req.getInstanceid()}': ${e?.message}`);
    }
  }

  /**
   *
   */
  private async _executeActivity(req: pb.ActivityRequest, stub: stubs.TaskHubSidecarServiceClient): Promise<void> {
    const instanceId = req.getOrchestrationinstance()?.getInstanceid();

    if (!instanceId) {
      throw new Error("Activity request does not contain an orchestration instance id");
    }

    let res;

    try {
      const executor = new ActivityExecutor(this._registry);
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
      res.setResult(s);
    } catch (e: any) {
      console.error(e);
      console.log(`An error occurred while trying to execute activity '${req.getName()}': ${e.message}`);

      const failureDetails = pbh.newFailureDetails(e);

      res = new pb.ActivityResponse();
      res.setTaskid(req.getTaskid());
      res.setFailuredetails(failureDetails);
    }

    try {
      const stubCompleteActivityTask = promisify(stub.completeActivityTask.bind(stub));
      await stubCompleteActivityTask(res);
    } catch (e: any) {
      console.error(
        `Failed to deliver activity response for '${req.getName()}#${req.getTaskid()}' of orchestration ID '${instanceId}' to sidecar: ${
          e?.message
        }`,
      );
    }
  }
}
