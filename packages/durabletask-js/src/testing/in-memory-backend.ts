// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import * as pbh from "../utils/pb-helper.util";
import { OrchestrationStatus as ClientOrchestrationStatus } from "../orchestration/enum/orchestration-status.enum";

/**
 * Internal orchestration instance state stored by the in-memory backend.
 */
export interface OrchestrationInstance {
  instanceId: string;
  name: string;
  status: pb.OrchestrationStatus;
  input?: string;
  output?: string;
  customStatus?: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  failureDetails?: pb.TaskFailureDetails;
  history: pb.HistoryEvent[];
  pendingEvents: pb.HistoryEvent[];
  completionToken: number;
}

/**
 * Activity work item that needs to be executed.
 */
export interface ActivityWorkItem {
  instanceId: string;
  name: string;
  taskId: number;
  input?: string;
  completionToken: number;
}

/**
 * Promise resolver for waiting on orchestration state changes.
 */
interface StateWaiter {
  resolve: (instance: OrchestrationInstance | undefined) => void;
  reject: (error: Error) => void;
  predicate: (instance: OrchestrationInstance) => boolean;
}

/**
 * In-memory backend for durable orchestrations suitable for testing.
 * 
 * This backend stores all orchestration state in memory and processes
 * work items synchronously within the same process. It is designed for
 * unit testing and integration testing scenarios where a sidecar process
 * or external storage is not desired.
 * 
 * Thread-safety: All state mutations are performed synchronously via
 * the event loop. The backend uses a simple work queue pattern to ensure
 * that orchestration and activity processing happens in a predictable order.
 */
export class InMemoryOrchestrationBackend {
  private readonly instances: Map<string, OrchestrationInstance> = new Map();
  private readonly orchestrationQueue: string[] = [];
  private readonly activityQueue: ActivityWorkItem[] = [];
  private readonly stateWaiters: Map<string, StateWaiter[]> = new Map();
  private nextCompletionToken: number = 1;
  private readonly maxHistorySize: number;

  /**
   * Creates a new in-memory backend.
   * @param maxHistorySize Maximum number of history events per orchestration (default 10000)
   */
  constructor(maxHistorySize: number = 10000) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Creates a new orchestration instance.
   */
  createInstance(
    instanceId: string,
    name: string,
    input?: string,
    scheduledStartTime?: Date,
  ): string {
    if (this.instances.has(instanceId)) {
      throw new Error(`Orchestration instance '${instanceId}' already exists`);
    }

    const now = new Date();
    const startTime = scheduledStartTime && scheduledStartTime > now ? scheduledStartTime : now;

    const instance: OrchestrationInstance = {
      instanceId,
      name,
      status: pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING,
      input,
      createdAt: now,
      lastUpdatedAt: now,
      history: [],
      pendingEvents: [],
      completionToken: this.nextCompletionToken++,
    };

    // Add initial events to start the orchestration
    const orchestratorStarted = pbh.newOrchestratorStartedEvent(startTime);
    const executionStarted = pbh.newExecutionStartedEvent(name, instanceId, input);

    instance.pendingEvents.push(orchestratorStarted);
    instance.pendingEvents.push(executionStarted);

    this.instances.set(instanceId, instance);
    this.enqueueOrchestration(instanceId);

    return instanceId;
  }

  /**
   * Gets an orchestration instance by ID.
   */
  getInstance(instanceId: string): OrchestrationInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Raises an external event for an orchestration instance.
   */
  raiseEvent(instanceId: string, eventName: string, input?: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Orchestration instance '${instanceId}' not found`);
    }

    const event = pbh.newEventRaisedEvent(eventName, input);
    instance.pendingEvents.push(event);
    instance.lastUpdatedAt = new Date();

    // Ensure instance is queued for processing
    if (!this.orchestrationQueue.includes(instanceId)) {
      this.enqueueOrchestration(instanceId);
    }
  }

  /**
   * Terminates an orchestration instance.
   */
  terminate(instanceId: string, output?: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Orchestration instance '${instanceId}' not found`);
    }

    if (this.isTerminalStatus(instance.status)) {
      return; // Already terminated
    }

    const event = pbh.newTerminatedEvent(output);
    instance.pendingEvents.push(event);
    instance.lastUpdatedAt = new Date();

    if (!this.orchestrationQueue.includes(instanceId)) {
      this.enqueueOrchestration(instanceId);
    }
  }

  /**
   * Suspends an orchestration instance.
   */
  suspend(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Orchestration instance '${instanceId}' not found`);
    }

    if (instance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED) {
      return;
    }

    const event = pbh.newSuspendEvent();
    instance.pendingEvents.push(event);
    instance.lastUpdatedAt = new Date();

    if (!this.orchestrationQueue.includes(instanceId)) {
      this.enqueueOrchestration(instanceId);
    }
  }

  /**
   * Resumes a suspended orchestration instance.
   */
  resume(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Orchestration instance '${instanceId}' not found`);
    }

    const event = pbh.newResumeEvent();
    instance.pendingEvents.push(event);
    instance.lastUpdatedAt = new Date();

    if (!this.orchestrationQueue.includes(instanceId)) {
      this.enqueueOrchestration(instanceId);
    }
  }

  /**
   * Purges an orchestration instance from the store.
   */
  purge(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return false;
    }

    if (!this.isTerminalStatus(instance.status)) {
      return false;
    }

    this.instances.delete(instanceId);
    this.stateWaiters.delete(instanceId);
    return true;
  }

  /**
   * Gets the next orchestration work item to process, if any.
   */
  getNextOrchestrationWorkItem(): OrchestrationInstance | undefined {
    while (this.orchestrationQueue.length > 0) {
      const instanceId = this.orchestrationQueue.shift()!;
      const instance = this.instances.get(instanceId);
      
      if (instance && instance.pendingEvents.length > 0) {
        return instance;
      }
    }
    return undefined;
  }

  /**
   * Gets the next activity work item to process, if any.
   */
  getNextActivityWorkItem(): ActivityWorkItem | undefined {
    return this.activityQueue.shift();
  }

  /**
   * Completes an orchestration execution with the given actions.
   */
  completeOrchestration(
    instanceId: string,
    completionToken: number,
    actions: pb.OrchestratorAction[],
    customStatus?: string,
  ): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Orchestration instance '${instanceId}' not found`);
    }

    if (instance.completionToken !== completionToken) {
      // Stale completion - ignore
      return;
    }

    // Move pending events to history
    instance.history.push(...instance.pendingEvents);
    instance.pendingEvents = [];
    instance.lastUpdatedAt = new Date();

    if (customStatus !== undefined) {
      instance.customStatus = customStatus;
    }

    // Check history size limit
    if (instance.history.length > this.maxHistorySize) {
      throw new Error(`Orchestration '${instanceId}' exceeded maximum history size of ${this.maxHistorySize}`);
    }

    // Transition to RUNNING once the orchestration has been processed for the first time
    if (instance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING) {
      instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
    }

    // Process actions
    for (const action of actions) {
      this.processAction(instance, action);
    }

    // Update completion token for next execution
    instance.completionToken = this.nextCompletionToken++;

    // Notify waiters
    this.notifyWaiters(instanceId);
  }

  /**
   * Completes an activity execution.
   */
  completeActivity(
    instanceId: string,
    taskId: number,
    result?: string,
    error?: Error,
  ): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return; // Instance may have been purged
    }

    let event: pb.HistoryEvent;
    if (error) {
      event = pbh.newTaskFailedEvent(taskId, error);
    } else {
      event = pbh.newTaskCompletedEvent(taskId, result);
    }

    instance.pendingEvents.push(event);
    instance.lastUpdatedAt = new Date();
    this.enqueueOrchestration(instanceId);
  }

  /**
   * Waits for an orchestration to reach a state matching the predicate.
   */
  async waitForState(
    instanceId: string,
    predicate: (instance: OrchestrationInstance) => boolean,
    timeoutMs: number = 30000,
  ): Promise<OrchestrationInstance | undefined> {
    const instance = this.instances.get(instanceId);
    if (instance && predicate(instance)) {
      return instance;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const waiters = this.stateWaiters.get(instanceId);
        if (waiters) {
          const index = waiters.findIndex((w) => w.resolve === resolve);
          if (index >= 0) {
            waiters.splice(index, 1);
          }
        }
        reject(new Error(`Timeout waiting for orchestration '${instanceId}'`));
      }, timeoutMs);

      const waiter: StateWaiter = {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
        predicate,
      };

      let waiters = this.stateWaiters.get(instanceId);
      if (!waiters) {
        waiters = [];
        this.stateWaiters.set(instanceId, waiters);
      }
      waiters.push(waiter);
    });
  }

  /**
   * Checks if there are any pending work items.
   */
  hasPendingWork(): boolean {
    return this.orchestrationQueue.length > 0 || this.activityQueue.length > 0;
  }

  /**
   * Resets the backend, clearing all state.
   */
  reset(): void {
    this.instances.clear();
    this.orchestrationQueue.length = 0;
    this.activityQueue.length = 0;
    for (const waiters of this.stateWaiters.values()) {
      for (const waiter of waiters) {
        waiter.reject(new Error("Backend was reset"));
      }
    }
    this.stateWaiters.clear();
  }

  /**
   * Converts internal status to client status.
   */
  toClientStatus(status: pb.OrchestrationStatus): ClientOrchestrationStatus {
    switch (status) {
      case pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING:
        return ClientOrchestrationStatus.PENDING;
      case pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING:
        return ClientOrchestrationStatus.RUNNING;
      case pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED:
        return ClientOrchestrationStatus.COMPLETED;
      case pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED:
        return ClientOrchestrationStatus.FAILED;
      case pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED:
        return ClientOrchestrationStatus.TERMINATED;
      case pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED:
        return ClientOrchestrationStatus.SUSPENDED;
      case pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW:
        // Continued-as-new is transient, should show as running
        return ClientOrchestrationStatus.RUNNING;
      default:
        return ClientOrchestrationStatus.RUNNING;
    }
  }

  private enqueueOrchestration(instanceId: string): void {
    if (!this.orchestrationQueue.includes(instanceId)) {
      this.orchestrationQueue.push(instanceId);
    }
  }

  private isTerminalStatus(status: pb.OrchestrationStatus): boolean {
    return (
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED ||
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED ||
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED
    );
  }

  private processAction(instance: OrchestrationInstance, action: pb.OrchestratorAction): void {
    const actionType = action.getOrchestratoractiontypeCase();

    switch (actionType) {
      case pb.OrchestratorAction.OrchestratoractiontypeCase.COMPLETEORCHESTRATION:
        this.processCompleteOrchestrationAction(instance, action.getCompleteorchestration()!);
        break;
      case pb.OrchestratorAction.OrchestratoractiontypeCase.SCHEDULETASK:
        this.processScheduleTaskAction(instance, action);
        break;
      case pb.OrchestratorAction.OrchestratoractiontypeCase.CREATETIMER:
        this.processCreateTimerAction(instance, action);
        break;
      case pb.OrchestratorAction.OrchestratoractiontypeCase.CREATESUBORCHESTRATION:
        this.processCreateSubOrchestrationAction(instance, action);
        break;
      case pb.OrchestratorAction.OrchestratoractiontypeCase.SENDEVENT:
        this.processSendEventAction(action.getSendevent()!);
        break;
      default:
        console.warn(`Unknown action type: ${actionType}`);
    }
  }

  private processCompleteOrchestrationAction(
    instance: OrchestrationInstance,
    completeAction: pb.CompleteOrchestrationAction,
  ): void {
    const status = completeAction.getOrchestrationstatus();
    instance.status = status;
    instance.output = completeAction.getResult()?.getValue();
    instance.failureDetails = completeAction.getFailuredetails();

    if (status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW) {
      // Handle continue-as-new
      const newInput = completeAction.getResult()?.getValue();
      const carryoverEvents = completeAction.getCarryovereventsList();

      // Reset instance state
      instance.history = [];
      instance.input = newInput;
      instance.output = undefined;
      instance.failureDetails = undefined;
      instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING;

      // Add carryover events
      instance.pendingEvents = [...carryoverEvents];

      // Add new execution started events
      const orchestratorStarted = pbh.newOrchestratorStartedEvent(new Date());
      const executionStarted = pbh.newExecutionStartedEvent(instance.name, instance.instanceId, newInput);
      instance.pendingEvents.push(orchestratorStarted);
      instance.pendingEvents.push(executionStarted);

      this.enqueueOrchestration(instance.instanceId);
    }
  }

  private processScheduleTaskAction(instance: OrchestrationInstance, action: pb.OrchestratorAction): void {
    const scheduleTask = action.getScheduletask()!;
    const taskId = action.getId();
    const taskName = scheduleTask.getName();
    const input = scheduleTask.getInput()?.getValue();

    // Add TaskScheduled event to history
    const event = pbh.newTaskScheduledEvent(taskId, taskName, input);
    instance.history.push(event);

    // Mark instance as running
    if (instance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING) {
      instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
    }

    // Queue activity for execution
    this.activityQueue.push({
      instanceId: instance.instanceId,
      name: taskName,
      taskId,
      input,
      completionToken: instance.completionToken,
    });
  }

  private processCreateTimerAction(instance: OrchestrationInstance, action: pb.OrchestratorAction): void {
    const createTimer = action.getCreatetimer()!;
    const timerId = action.getId();
    const fireAt = createTimer.getFireat()?.toDate() ?? new Date();

    // Add TimerCreated event to history
    const timerCreatedEvent = pbh.newTimerCreatedEvent(timerId, fireAt);
    instance.history.push(timerCreatedEvent);

    // Mark instance as running
    if (instance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING) {
      instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
    }

    // Schedule timer firing
    const now = new Date();
    const delay = Math.max(0, fireAt.getTime() - now.getTime());

    setTimeout(() => {
      const currentInstance = this.instances.get(instance.instanceId);
      if (currentInstance && !this.isTerminalStatus(currentInstance.status)) {
        const timerFiredEvent = pbh.newTimerFiredEvent(timerId, fireAt);
        currentInstance.pendingEvents.push(timerFiredEvent);
        currentInstance.lastUpdatedAt = new Date();
        this.enqueueOrchestration(instance.instanceId);
      }
    }, delay);
  }

  private processCreateSubOrchestrationAction(instance: OrchestrationInstance, action: pb.OrchestratorAction): void {
    const createSubOrch = action.getCreatesuborchestration()!;
    const taskId = action.getId();
    const name = createSubOrch.getName();
    const subInstanceId = createSubOrch.getInstanceid();
    const input = createSubOrch.getInput()?.getValue();

    // Add SubOrchestrationInstanceCreated event to history
    const event = pbh.newSubOrchestrationCreatedEvent(taskId, name, subInstanceId, input);
    instance.history.push(event);

    // Mark instance as running
    if (instance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING) {
      instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
    }

    // Create the sub-orchestration
    try {
      this.createInstance(subInstanceId, name, input);

      // Watch for sub-orchestration completion
      this.watchSubOrchestration(instance.instanceId, subInstanceId, taskId);
    } catch (error: any) {
      // Sub-orchestration creation failed
      const failedEvent = pbh.newSubOrchestrationFailedEvent(taskId, error);
      instance.pendingEvents.push(failedEvent);
      this.enqueueOrchestration(instance.instanceId);
    }
  }

  private watchSubOrchestration(parentInstanceId: string, subInstanceId: string, taskId: number): void {
    const checkCompletion = (): void => {
      const subInstance = this.instances.get(subInstanceId);
      const parentInstance = this.instances.get(parentInstanceId);

      if (!subInstance || !parentInstance) {
        return;
      }

      if (this.isTerminalStatus(parentInstance.status)) {
        return;
      }

      if (this.isTerminalStatus(subInstance.status)) {
        let event: pb.HistoryEvent;
        if (subInstance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED) {
          event = pbh.newSubOrchestrationCompletedEvent(taskId, subInstance.output);
        } else {
          const error = new Error(subInstance.failureDetails?.getErrormessage() || "Sub-orchestration failed");
          event = pbh.newSubOrchestrationFailedEvent(taskId, error);
        }
        parentInstance.pendingEvents.push(event);
        parentInstance.lastUpdatedAt = new Date();
        this.enqueueOrchestration(parentInstanceId);
      } else {
        // Check again later
        setImmediate(checkCompletion);
      }
    };

    setImmediate(checkCompletion);
  }

  private processSendEventAction(sendEvent: pb.SendEventAction): void {
    const targetInstanceId = sendEvent.getInstance()?.getInstanceid();
    const eventName = sendEvent.getName();
    const eventData = sendEvent.getData()?.getValue();

    if (targetInstanceId) {
      try {
        this.raiseEvent(targetInstanceId, eventName, eventData);
      } catch {
        // Target instance may not exist - ignore
      }
    }
  }

  private notifyWaiters(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    const waiters = this.stateWaiters.get(instanceId);

    if (!waiters || waiters.length === 0 || !instance) {
      return;
    }

    // Find and notify matching waiters
    const matchingWaiters = waiters.filter((w) => w.predicate(instance));
    for (const waiter of matchingWaiters) {
      waiter.resolve(instance);
    }

    // Remove notified waiters
    const remainingWaiters = waiters.filter((w) => !matchingWaiters.includes(w));
    if (remainingWaiters.length === 0) {
      this.stateWaiters.delete(instanceId);
    } else {
      this.stateWaiters.set(instanceId, remainingWaiters);
    }
  }
}
