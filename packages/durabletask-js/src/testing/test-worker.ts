// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Registry } from "../worker/registry";
import { OrchestrationExecutor } from "../worker/orchestration-executor";
import { ActivityExecutor } from "../worker/activity-executor";
import { TOrchestrator } from "../types/orchestrator.type";
import { TActivity } from "../types/activity.type";
import { TInput } from "../types/input.type";
import { TOutput } from "../types/output.type";
import { InMemoryOrchestrationBackend, OrchestrationInstance, ActivityWorkItem } from "./in-memory-backend";
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
      const result = await executor.execute(instanceId, instance.history, instance.pendingEvents);

      this.backend.completeOrchestration(instanceId, completionToken, result.actions, result.customStatus);
    } catch (error: any) {
      console.error(`Error executing orchestration '${instanceId}':`, error);

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
    } catch (error: any) {
      console.error(`Error executing activity '${name}':`, error);
      this.backend.completeActivity(instanceId, taskId, undefined, error);
    }
  }

  /**
   * Yields control to the event loop to allow timers and I/O to process.
   */
  private yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
  }
}
