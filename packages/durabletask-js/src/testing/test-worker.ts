// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Registry } from "../worker/registry";
import { OrchestrationExecutor } from "../worker/orchestration-executor";
import { ActivityExecutor } from "../worker/activity-executor";
import { TaskEntityShim } from "../worker/entity-executor";
import { EntityInstanceId } from "../entities/entity-instance-id";
import { EntityFactory } from "../entities/task-entity";
import { TOrchestrator } from "../types/orchestrator.type";
import { TActivity } from "../types/activity.type";
import { TInput } from "../types/input.type";
import { TOutput } from "../types/output.type";
import {
  InMemoryOrchestrationBackend,
  OrchestrationInstance,
  ActivityWorkItem,
  EntityWorkItem,
} from "./in-memory-backend";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import * as pb from "../proto/orchestrator_service_pb";
import * as pbh from "../utils/pb-helper.util";

/**
 * Worker that processes orchestrations and activities from the in-memory backend.
 * 
 * This worker runs in the same process as the test and processes work items
 * synchronously in the Node.js event loop, avoiding the need for a separate
 * sidecar process.
 */
export class TestOrchestrationWorker {
  private readonly registry: Registry;
  private readonly backend: InMemoryOrchestrationBackend;
  private isRunning: boolean = false;
  private processingPromise: Promise<void> | null = null;
  private stopRequested: boolean = false;

  constructor(backend: InMemoryOrchestrationBackend) {
    this.registry = new Registry();
    this.backend = backend;
  }

  /**
   * Registers an orchestrator function with the worker.
   */
  addOrchestrator(fn: TOrchestrator): string {
    if (this.isRunning) {
      throw new Error("Cannot add orchestrator while worker is running.");
    }
    return this.registry.addOrchestrator(fn);
  }

  /**
   * Registers a named orchestrator function with the worker.
   */
  addNamedOrchestrator(name: string, fn: TOrchestrator): string {
    if (this.isRunning) {
      throw new Error("Cannot add orchestrator while worker is running.");
    }
    this.registry.addNamedOrchestrator(name, fn);
    return name;
  }

  /**
   * Registers an activity function with the worker.
   */
  addActivity(fn: TActivity<TInput, TOutput>): string {
    if (this.isRunning) {
      throw new Error("Cannot add activity while worker is running.");
    }
    return this.registry.addActivity(fn);
  }

  /**
   * Registers a named activity function with the worker.
   */
  addNamedActivity(name: string, fn: TActivity<TInput, TOutput>): string {
    if (this.isRunning) {
      throw new Error("Cannot add activity while worker is running.");
    }
    this.registry.addNamedActivity(name, fn);
    return name;
  }

  /**
   * Registers an entity with the worker.
   */
  addEntity(factory: EntityFactory): string {
    if (this.isRunning) {
      throw new Error("Cannot add entity while worker is running.");
    }
    return this.registry.addEntity(factory);
  }

  /**
   * Registers a named entity function with the worker.
   */
  addNamedEntity(name: string, factory: EntityFactory): string {
    if (this.isRunning) {
      throw new Error("Cannot add entity while worker is running.");
    }
    this.registry.addNamedEntity(name, factory);
    return name;
  }

  /**
   * Starts the worker processing loop.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("The worker is already running.");
    }

    this.isRunning = true;
    this.stopRequested = false;
    this.processingPromise = this.runProcessingLoop();
  }

  /**
   * Stops the worker. This method is idempotent and can be safely called
   * even if the worker is not running.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return; // Already stopped, nothing to do
    }

    this.stopRequested = true;
    this.isRunning = false;

    // Wait for the processing loop to finish
    if (this.processingPromise) {
      await this.processingPromise;
      this.processingPromise = null;
    }
  }

  /**
   * Main processing loop that continuously processes work items.
   */
  private async runProcessingLoop(): Promise<void> {
    while (!this.stopRequested) {
      let processedAny = false;

      // Process orchestrations first
      const orchestration = this.backend.getNextOrchestrationWorkItem();
      if (orchestration) {
        await this.processOrchestration(orchestration);
        processedAny = true;
      }

      // Then process activities
      const activity = this.backend.getNextActivityWorkItem();
      if (activity) {
        await this.processActivity(activity);
        processedAny = true;
      }

      // Then process entities
      const entity = this.backend.getNextEntityWorkItem();
      if (entity) {
        await this.processEntity(entity);
        processedAny = true;
      }

      // If nothing was processed, yield to allow other async operations
      if (!processedAny) {
        await this.yieldToEventLoop();
      }
    }
  }

  /**
   * Processes a single orchestration work item.
   */
  private async processOrchestration(instance: OrchestrationInstance): Promise<void> {
    const instanceId = instance.instanceId;
    const completionToken = instance.completionToken;

    try {
      const executor = new OrchestrationExecutor(this.registry);
      const result = await executor.execute(instanceId, instance.history, instance.pendingEvents, instance.executionId);

      this.backend.completeOrchestration(instanceId, completionToken, result.actions, result.customStatus);
    } catch (error: unknown) {
      // Create a failure action
      const failureDetails = pbh.newFailureDetails(error);
      const failAction = pbh.newCompleteOrchestrationAction(
        -1,
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        failureDetails,
      );

      this.backend.completeOrchestration(instanceId, completionToken, [failAction]);
    }
  }

  /**
   * Processes a single activity work item.
   */
  private async processActivity(workItem: ActivityWorkItem): Promise<void> {
    const { instanceId, name, taskId, input } = workItem;

    try {
      const executor = new ActivityExecutor(this.registry);
      const result = await executor.execute(instanceId, name, taskId, input);
      this.backend.completeActivity(instanceId, taskId, result);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.backend.completeActivity(instanceId, taskId, undefined, err);
    }
  }

  /**
   * Processes a single entity work item by executing the batch of queued operations.
   */
  private async processEntity(workItem: EntityWorkItem): Promise<void> {
    const { instanceId, completionToken } = workItem;

    const batchResult = await this.executeEntityBatch(workItem);
    this.backend.completeEntityTask(instanceId, completionToken, batchResult);
  }

  /**
   * Builds an EntityBatchRequest from the work item and runs it through the entity shim.
   * Any failure is converted into a per-operation failure so callers are never left hanging.
   */
  private async executeEntityBatch(workItem: EntityWorkItem): Promise<pb.EntityBatchResult> {
    const { instanceId, entityState, operations } = workItem;

    try {
      const entityId = EntityInstanceId.fromString(instanceId);
      const factory = this.registry.getEntity(entityId.name);

      if (!factory) {
        return this.createEntityFailureResult(operations, new Error(`No entity task named '${entityId.name}' was found.`));
      }

      const request = new pb.EntityBatchRequest();
      request.setInstanceid(instanceId);
      if (entityState !== undefined) {
        const state = new StringValue();
        state.setValue(entityState);
        request.setEntitystate(state);
      }
      request.setOperationsList(operations.map((op) => this.toOperationRequest(op)));

      const shim = new TaskEntityShim(factory(), entityId);
      return await shim.executeAsync(request);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return this.createEntityFailureResult(operations, err);
    }
  }

  /**
   * Converts a queued entity operation history event into the OperationRequest the shim expects.
   */
  private toOperationRequest(event: pb.HistoryEvent): pb.OperationRequest {
    const request = new pb.OperationRequest();
    const called = event.getEntityoperationcalled();
    const signaled = event.getEntityoperationsignaled();

    if (called) {
      request.setOperation(called.getOperation());
      request.setRequestid(called.getRequestid());
      const input = called.getInput();
      if (input) {
        request.setInput(input);
      }
    } else if (signaled) {
      request.setOperation(signaled.getOperation());
      request.setRequestid(signaled.getRequestid());
      const input = signaled.getInput();
      if (input) {
        request.setInput(input);
      }
    }

    return request;
  }

  /**
   * Builds a batch result that fails every operation in the batch with the same error.
   */
  private createEntityFailureResult(operations: pb.HistoryEvent[], error: Error): pb.EntityBatchResult {
    const batchResult = new pb.EntityBatchResult();
    const failureDetails = pbh.newFailureDetails(error);

    batchResult.setResultsList(
      operations.map(() => {
        const failure = new pb.OperationResultFailure();
        failure.setFailuredetails(failureDetails);
        const result = new pb.OperationResult();
        result.setFailure(failure);
        return result;
      }),
    );

    return batchResult;
  }

  /**
   * Yields control to the event loop to allow timers and I/O to process.
   */
  private yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
  }
}
