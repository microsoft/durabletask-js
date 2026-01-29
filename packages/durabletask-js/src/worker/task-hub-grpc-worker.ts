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

  /**
   * Creates a new TaskHubGrpcWorker instance.
   *
   * @param hostAddress The host address to connect to. Defaults to "localhost:4001".
   * @param options gRPC channel options.
   * @param useTLS Whether to use TLS. Defaults to false.
   * @param credentials Optional pre-configured channel credentials. If provided, useTLS is ignored.
   * @param metadataGenerator Optional function to generate per-call metadata (for taskhub, auth tokens, etc.).
   */
  constructor(
    hostAddress?: string,
    options?: grpc.ChannelOptions,
    useTLS?: boolean,
    credentials?: grpc.ChannelCredentials,
    metadataGenerator?: MetadataGenerator,
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
   *
   * Dotnet reference: src/Worker/Core/DurableTaskFactory.cs
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
   *
   * Dotnet reference: src/Worker/Core/DurableTaskFactory.cs
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

    // do not await so it runs in the background
    this.internalRunWorker(client);

    this._isRunning = true;
  }

  async internalRunWorker(client: GrpcClient, isRetry: boolean = false): Promise<void> {
    try {
      // send a "Hello" message to the sidecar to ensure that it's listening
      await callWithMetadata(client.stub.hello.bind(client.stub), new Empty(), this._metadataGenerator);

      // Stream work items from the sidecar (pass metadata for insecure connections)
      const metadata = await this._getMetadata();
      const stream = client.stub.getWorkItems(new pb.GetWorkItemsRequest(), metadata);
      this._responseStream = stream;

      console.log(`Successfully connected to ${this._hostAddress}. Waiting for work items...`);

      // Wait for a work item to be received
      stream.on("data", (workItem: pb.WorkItem) => {
        const completionToken = workItem.getCompletiontoken();
        if (workItem.hasOrchestratorrequest()) {
          console.log(
            `Received "Orchestrator Request" work item with instance id '${workItem
              ?.getOrchestratorrequest()
              ?.getInstanceid()}'`,
          );
          this._executeOrchestrator(workItem.getOrchestratorrequest() as any, completionToken, client.stub);
        } else if (workItem.hasActivityrequest()) {
          console.log(`Received "Activity Request" work item`);
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
          console.log(`Received unknown type of work item `);
        }
      });

      // Wait for the stream to end or error
      stream.on("end", async () => {
        stream.cancel();
        stream.destroy();
        if (this._stopWorker) {
          console.log("Stream ended");
          return;
        }
        console.log("Stream abruptly closed, will retry the connection...");
        // TODO consider exponential backoff
        await sleep(5000);
        // do not await
        this.internalRunWorker(client, true);
      });

      stream.on("error", (err: Error) => {
        // Ignore cancellation errors when the worker is being stopped intentionally
        if (this._stopWorker) {
          return;
        }
        console.log("Stream error", err);
      });
    } catch (err) {
      if (this._stopWorker) {
        // ignoring the error because the worker has been stopped
        return;
      }
      console.log(`Error on grpc stream: ${err}`);
      if (!isRetry) {
        throw err;
      }
      console.log("Connection will be retried...");
      // TODO consider exponential backoff
      await sleep(5000);
      this.internalRunWorker(client, true);
      return;
    }
  }

  /**
   * Stop the worker and wait for any pending work items to complete
   */
  async stop(): Promise<void> {
    if (!this._isRunning) {
      throw new Error("The worker is not running.");
    }

    this._stopWorker = true;

    this._responseStream?.cancel();
    this._responseStream?.destroy();

    this._stub?.close();

    this._isRunning = false;

    // Wait a bit to let the async operations finish
    // https://github.com/grpc/grpc-node/issues/1563#issuecomment-829483711
    await sleep(1000);
  }

  /**
   *
   */
  private async _executeOrchestrator(
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
      const executor = new OrchestrationExecutor(this._registry);
      const actions = await executor.execute(req.getInstanceid(), req.getPasteventsList(), req.getNeweventsList());

      res = new pb.OrchestratorResponse();
      res.setInstanceid(req.getInstanceid());
      res.setCompletiontoken(completionToken);
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
      res.setCompletiontoken(completionToken);
      res.setActionsList(actions);
    }

    try {
      await callWithMetadata(stub.completeOrchestratorTask.bind(stub), res, this._metadataGenerator);
    } catch (e: any) {
      console.error(`An error occurred while trying to complete instance '${req.getInstanceid()}': ${e?.message}`);
    }
  }

  /**
   *
   */
  private async _executeActivity(
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
      res.setCompletiontoken(completionToken);
      res.setResult(s);
    } catch (e: any) {
      console.error(e);
      console.log(`An error occurred while trying to execute activity '${req.getName()}': ${e.message}`);

      const failureDetails = pbh.newFailureDetails(e);

      res = new pb.ActivityResponse();
      res.setTaskid(req.getTaskid());
      res.setCompletiontoken(completionToken);
      res.setFailuredetails(failureDetails);
    }

    try {
      await callWithMetadata(stub.completeActivityTask.bind(stub), res, this._metadataGenerator);
    } catch (e: any) {
      console.error(
        `Failed to deliver activity response for '${req.getName()}#${req.getTaskid()}' of orchestration ID '${instanceId}' to sidecar: ${
          e?.message
        }`,
      );
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
   * This method mirrors dotnet's OnRunEntityBatchAsync in GrpcDurableTaskWorker.Processor.cs.
   * It looks up the entity by name, creates a TaskEntityShim, executes the batch,
   * and sends the result back to the sidecar.
   *
   * Dotnet reference: src/Worker/Grpc/GrpcDurableTaskWorker.Processor.cs lines 852-915
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
    // Dotnet reference: src/Worker/Grpc/GrpcDurableTaskWorker.Processor.cs lines 858-861
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
      // Dotnet reference: src/Worker/Grpc/GrpcDurableTaskWorker.Processor.cs lines 869-870
      const factory = this._registry.getEntity(entityId.name);

      if (factory) {
        // Create the entity instance and execute the batch
        // Dotnet reference: src/Worker/Grpc/GrpcDurableTaskWorker.Processor.cs lines 873-875
        const entity = factory();
        const shim = new TaskEntityShim(entity, entityId);
        batchResult = await shim.executeAsync(req);
        batchResult.setCompletiontoken(completionToken);
      } else {
        // Entity not found - return error result for all operations
        // Dotnet reference: src/Worker/Grpc/GrpcDurableTaskWorker.Processor.cs lines 877-894
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
      // Dotnet reference: src/Worker/Grpc/GrpcDurableTaskWorker.Processor.cs lines 896-903
      console.error(e);
      console.log(`An error occurred while trying to execute entity '${entityId.name}': ${e.message}`);

      const failureDetails = pbh.newFailureDetails(e);

      batchResult = new pb.EntityBatchResult();
      batchResult.setCompletiontoken(completionToken);
      batchResult.setFailuredetails(failureDetails);
    }

    // Add V2 operationInfos if provided (used by DTS backend)
    // Dotnet reference: src/Worker/Grpc/ProtoUtils.cs ToEntityBatchResult
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
   *
   * Dotnet reference: src/Worker/Grpc/ProtoUtils.cs ToEntityBatchRequest
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
   * Dotnet reference: src/Worker/Grpc/GrpcDurableTaskWorker.Processor.cs lines 877-894
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
