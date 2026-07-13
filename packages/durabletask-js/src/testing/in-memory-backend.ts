// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import * as pbh from "../utils/pb-helper.util";
import { OrchestrationStatus as ClientOrchestrationStatus } from "../orchestration/enum/orchestration-status.enum";
import { ParentOrchestrationInstance } from "../types/parent-orchestration-instance.type";

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
  private readonly orchestrationQueueSet: Set<string> = new Set();
  private readonly activityQueue: ActivityWorkItem[] = [];
  private readonly stateWaiters: Map<string, StateWaiter[]> = new Map();
  private readonly pendingTimers: Set<ReturnType<typeof setTimeout>> = new Set();
  private readonly instanceTimers: Map<string, Set<ReturnType<typeof setTimeout>>> = new Map();
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
    parentInstance?: ParentOrchestrationInstance,
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
    const executionStarted = pbh.newExecutionStartedEvent(name, instanceId, input, parentInstance);

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
    if (!this.orchestrationQueueSet.has(instanceId)) {
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

    if (!this.orchestrationQueueSet.has(instanceId)) {
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

    if (this.isTerminalStatus(instance.status)) {
      return; // Cannot suspend a completed/failed/terminated instance
    }

    if (instance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED) {
      return;
    }

    // Update status immediately to match real sidecar behavior, where the
    // suspend RPC transitions the orchestration to SUSPENDED right away.
    instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED;

    const event = pbh.newSuspendEvent();
    instance.pendingEvents.push(event);
    instance.lastUpdatedAt = new Date();

    if (!this.orchestrationQueueSet.has(instanceId)) {
      this.enqueueOrchestration(instanceId);
    }

    this.notifyWaiters(instanceId);
  }

  /**
   * Resumes a suspended orchestration instance.
   */
  resume(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Orchestration instance '${instanceId}' not found`);
    }

    // No-op for terminal or non-suspended instances
    if (this.isTerminalStatus(instance.status)) {
      return;
    }

    if (instance.status !== pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED) {
      return;
    }

    // Transition from SUSPENDED back to RUNNING to match real sidecar behavior.
    instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;

    const event = pbh.newResumeEvent();
    instance.pendingEvents.push(event);
    instance.lastUpdatedAt = new Date();

    if (!this.orchestrationQueueSet.has(instanceId)) {
      this.enqueueOrchestration(instanceId);
    }

    this.notifyWaiters(instanceId);
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
    this.cancelInstanceTimers(instanceId);
    return true;
  }

  /**
   * Rewinds a failed orchestration instance.
   *
   * Validates the instance is in a failed state, then appends an ExecutionRewoundEvent to the
   * pending events, resets the status to RUNNING, and re-enqueues the orchestration so the
   * worker can replay it and produce a RewindOrchestrationAction with the corrected history.
   * The actual history rewrite is performed by the SDK worker (see buildRewindResult); this
   * backend merely applies the result. Any change to that rewrite must be mirrored here.
   *
   * @param instanceId The instance to rewind.
   * @param reason Optional human-readable reason for the rewind.
   * @throws Error with a "not found" message if the instance does not exist.
   * @throws Error with a "not in a failed state" message if the instance is not FAILED.
   */
  rewindInstance(instanceId: string, reason?: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Orchestration instance '${instanceId}' not found`);
    }

    if (instance.status !== pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED) {
      throw new Error(`Orchestration instance '${instanceId}' is not in a failed state`);
    }

    this.prepareRewind(instance, reason);
    this.notifyWaiters(instanceId);
  }

  /**
   * Gets the next orchestration work item to process, if any.
   */
  getNextOrchestrationWorkItem(): OrchestrationInstance | undefined {
    while (this.orchestrationQueue.length > 0) {
      const instanceId = this.orchestrationQueue.shift()!;
      this.orchestrationQueueSet.delete(instanceId);
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

    // Check history size limit before adding events
    const projectedSize = instance.history.length + instance.pendingEvents.length;
    if (projectedSize > this.maxHistorySize) {
      throw new Error(
        `Orchestration '${instanceId}' would exceed maximum history size of ${this.maxHistorySize} ` +
          `(current: ${instance.history.length}, pending: ${instance.pendingEvents.length})`,
      );
    }

    // Move pending events to history
    instance.history.push(...instance.pendingEvents);
    instance.pendingEvents = [];
    instance.lastUpdatedAt = new Date();

    if (customStatus !== undefined) {
      instance.customStatus = customStatus;
    }

    // Transition to RUNNING once the orchestration has been processed for the first time
    if (instance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING) {
      instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
    }

    // Process actions
    for (const action of actions) {
      this.processAction(instance, action);
    }

    // Bookend a terminal orchestration with an executionCompleted event so the committed
    // history records the terminal result.
    //
    // REQUIRED — do NOT remove this as an "optimization". It is also the precondition that lets
    // the worker detect a rewind: the executor only short-circuits into buildRewindResult when an
    // executionCompleted event is present in the committed (old) history
    // (see OrchestrationExecutor.execute). Without this bookend, a rewind dispatch would silently
    // fall through to plain replay and never produce a RewindOrchestrationAction.
    //
    // Continue-as-new resets status to PENDING and rewind resets it to RUNNING, so neither is
    // terminal here and neither gets a bookend.
    if (this.isTerminalStatus(instance.status)) {
      instance.history.push(
        pbh.newExecutionCompletedEvent(instance.status, instance.output, instance.failureDetails),
      );
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
      // When timeoutMs is 0, no timeout is applied — the waiter will only be
      // resolved by a matching state change or rejected by reset().
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          const waiters = this.stateWaiters.get(instanceId);
          if (waiters) {
            const index = waiters.findIndex((w) => w.resolve === resolve);
            if (index >= 0) {
              waiters.splice(index, 1);
            }
          }
          reject(new Error(`Timeout waiting for orchestration '${instanceId}'`));
        }, timeoutMs);
      }

      const waiter: StateWaiter = {
        resolve: (result) => {
          if (timer !== undefined) clearTimeout(timer);
          resolve(result);
        },
        reject: (error) => {
          if (timer !== undefined) clearTimeout(timer);
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
    this.orchestrationQueueSet.clear();
    this.activityQueue.length = 0;
    for (const waiters of this.stateWaiters.values()) {
      for (const waiter of waiters) {
        waiter.reject(new Error("Backend was reset"));
      }
    }
    this.stateWaiters.clear();
    for (const timer of this.pendingTimers) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();
    this.instanceTimers.clear();
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
    if (!this.orchestrationQueueSet.has(instanceId)) {
      this.orchestrationQueue.push(instanceId);
      this.orchestrationQueueSet.add(instanceId);
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
      case pb.OrchestratorAction.OrchestratoractiontypeCase.REWINDORCHESTRATION:
        this.processRewindOrchestrationAction(instance, action.getRewindorchestration()!);
        break;
      default:
        throw new Error(
          `Unknown orchestrator action type '${actionType}' for orchestration '${instance.instanceId}'. ` +
            `This likely means the in-memory backend needs to be updated to handle a newly introduced action type.`,
        );
    }
  }

  private processCompleteOrchestrationAction(
    instance: OrchestrationInstance,
    completeAction: pb.CompleteOrchestrationAction,
  ): void {
    const status = completeAction.getOrchestrationstatus();
    instance.status = status;
    instance.output = completeAction.getResult()?.getValue();
    // Use an explicit presence check: a protobuf singular message accessor may materialize an
    // empty message, so only record failureDetails when the action actually carries them. This
    // keeps the bookended executionCompleted event clean for successful completions.
    instance.failureDetails = completeAction.hasFailuredetails() ? completeAction.getFailuredetails() : undefined;

    if (status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW) {
      // Handle continue-as-new
      const newInput = completeAction.getResult()?.getValue();
      const carryoverEvents = completeAction.getCarryovereventsList();

      // Reset instance state
      instance.history = [];
      instance.input = newInput;
      instance.output = undefined;
      instance.customStatus = undefined;
      instance.failureDetails = undefined;
      instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING;

      // Add new execution started events first, then carryover events.
      // This matches the real sidecar behavior where OrchestratorStarted and
      // ExecutionStarted always precede any carryover events (buffered external
      // events from the previous iteration). OrchestratorStarted must come first
      // because it sets currentUtcDateTime, and ExecutionStarted must come before
      // carryover events because it initializes the orchestrator generator.
      const orchestratorStarted = pbh.newOrchestratorStartedEvent(new Date());
      const executionStarted = pbh.newExecutionStartedEvent(instance.name, instance.instanceId, newInput);
      instance.pendingEvents = [orchestratorStarted, executionStarted, ...carryoverEvents];

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

    const timerHandle = setTimeout(() => {
      this.pendingTimers.delete(timerHandle);
      this.removeInstanceTimer(instance.instanceId, timerHandle);
      const currentInstance = this.instances.get(instance.instanceId);
      if (currentInstance && !this.isTerminalStatus(currentInstance.status)) {
        const timerFiredEvent = pbh.newTimerFiredEvent(timerId, fireAt);
        currentInstance.pendingEvents.push(timerFiredEvent);
        currentInstance.lastUpdatedAt = new Date();
        this.enqueueOrchestration(instance.instanceId);
      }
    }, delay);
    this.pendingTimers.add(timerHandle);
    this.addInstanceTimer(instance.instanceId, timerHandle);
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

    // Create the sub-orchestration with parent instance info
    try {
      this.createInstance(subInstanceId, name, input, undefined, {
        name: instance.name,
        instanceId: instance.instanceId,
        taskScheduledId: taskId,
      });

      // Watch for sub-orchestration completion
      this.watchSubOrchestration(instance.instanceId, subInstanceId, taskId);
    } catch (error: unknown) {
      // Sub-orchestration creation failed
      const err = error instanceof Error ? error : new Error(String(error));
      const failedEvent = pbh.newSubOrchestrationFailedEvent(taskId, err);
      instance.pendingEvents.push(failedEvent);
      this.enqueueOrchestration(instance.instanceId);
    }
  }

  private watchSubOrchestration(parentInstanceId: string, subInstanceId: string, taskId: number): void {
    // Use the stateWaiters mechanism instead of polling to avoid infinite loops
    // and unnecessary resource consumption
    this.waitForState(
      subInstanceId,
      (inst) => this.isTerminalStatus(inst.status),
      0, // No timeout — sub-orchestration will eventually complete, fail, or be terminated
    )
      .then((subInstance) => {
        const parentInstance = this.instances.get(parentInstanceId);

        // If parent or sub no longer exists, nothing to do
        if (!subInstance || !parentInstance) {
          return;
        }

        // If parent already terminated, don't deliver the completion event
        if (this.isTerminalStatus(parentInstance.status)) {
          return;
        }

        // Deliver the sub-orchestration completion/failure event to parent
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
      })
      .catch(() => {
        // Reset — sub-orchestration watcher cancelled, nothing to do
      });
  }

  private prepareRewind(instance: OrchestrationInstance, reason?: string): void {
    // Reset instance state so it can be re-processed.
    instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
    instance.output = undefined;
    instance.failureDetails = undefined;
    instance.lastUpdatedAt = new Date();

    // Seed the pending events with exactly [orchestratorStarted, executionRewound]. The worker
    // splits (history, pendingEvents) into (oldEvents, newEvents); buildRewindResult requires
    // newEvents to be exactly those two events (orchestratorStarted followed by the
    // executionRewound marker). Unlike the real sidecar, this backend does not auto-prepend an
    // orchestratorStarted per dispatch, so it is supplied here.
    instance.pendingEvents = [pbh.newOrchestratorStartedEvent(new Date()), pbh.newExecutionRewoundEvent(reason)];

    // Refresh the completion token and enqueue.
    instance.completionToken = this.nextCompletionToken++;
    this.enqueueOrchestration(instance.instanceId);
  }

  private processRewindOrchestrationAction(
    instance: OrchestrationInstance,
    rewindAction: pb.RewindOrchestrationAction,
  ): void {
    const newHistory = rewindAction.getNewhistoryList();

    // Replace the history with the SDK-computed clean version.
    instance.history = newHistory;
    instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
    instance.output = undefined;
    instance.failureDetails = undefined;
    instance.lastUpdatedAt = new Date();

    // Identify sub-orchestrations that were created but did not complete successfully — they
    // need to be recursively rewound (buildRewindResult keeps subOrchestrationInstanceCreated
    // and removes subOrchestrationInstanceFailed, so a "created but not completed" sub is a
    // failed one).
    const completedSubOrchTaskIds = new Set<number>();
    const createdSubOrchEvents = new Map<number, pb.HistoryEvent>();
    for (const event of newHistory) {
      if (event.hasSuborchestrationinstancecreated()) {
        createdSubOrchEvents.set(event.getEventid(), event);
      } else if (event.hasSuborchestrationinstancecompleted()) {
        completedSubOrchTaskIds.add(event.getSuborchestrationinstancecompleted()!.getTaskscheduledid());
      }
    }

    // Extract the rewind reason from the last executionRewound event.
    let reason: string | undefined;
    for (let i = newHistory.length - 1; i >= 0; i--) {
      const event = newHistory[i];
      if (event.hasExecutionrewound()) {
        const rewound = event.getExecutionrewound()!;
        reason = rewound.hasReason() ? rewound.getReason()!.getValue() : undefined;
        break;
      }
    }

    // Recursively rewind failed sub-orchestrations. If the sub was purged (no longer tracked),
    // re-create it from the subOrchestrationInstanceCreated event so it runs fresh.
    for (const [taskId, event] of createdSubOrchEvents) {
      if (completedSubOrchTaskIds.has(taskId)) {
        continue;
      }
      const subInfo = event.getSuborchestrationinstancecreated()!;
      const subInstanceId = subInfo.getInstanceid();
      const subInstance = this.instances.get(subInstanceId);
      if (!subInstance) {
        // Sub-orchestration was purged — re-create it so it runs fresh. Pass the parent
        // metadata (mirroring processCreateSubOrchestrationAction) so the re-created sub keeps
        // its parentInstance link and can route its completion back to this orchestration.
        this.createInstance(subInstanceId, subInfo.getName(), subInfo.getInput()?.getValue(), undefined, {
          name: instance.name,
          instanceId: instance.instanceId,
          taskScheduledId: taskId,
        });
      } else if (subInstance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED) {
        this.prepareRewind(subInstance, reason);
      }
      this.watchSubOrchestration(instance.instanceId, subInstanceId, taskId);
    }

    // Re-enqueue so the orchestration replays with the clean history. The executionRewound
    // event is already present in the clean history (kept by buildRewindResult), so it must
    // NOT be re-sent as a pending event — doing so would duplicate it. A lone orchestratorStarted
    // is enough to make the instance dispatchable; the worker replays normally because
    // executionCompleted is no longer in the history.
    instance.pendingEvents = [pbh.newOrchestratorStartedEvent(new Date())];
    instance.completionToken = this.nextCompletionToken++;
    this.enqueueOrchestration(instance.instanceId);
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

  private addInstanceTimer(instanceId: string, timerHandle: ReturnType<typeof setTimeout>): void {
    let timers = this.instanceTimers.get(instanceId);
    if (!timers) {
      timers = new Set();
      this.instanceTimers.set(instanceId, timers);
    }
    timers.add(timerHandle);
  }

  private removeInstanceTimer(instanceId: string, timerHandle: ReturnType<typeof setTimeout>): void {
    const timers = this.instanceTimers.get(instanceId);
    if (timers) {
      timers.delete(timerHandle);
      if (timers.size === 0) {
        this.instanceTimers.delete(instanceId);
      }
    }
  }

  private cancelInstanceTimers(instanceId: string): void {
    const timers = this.instanceTimers.get(instanceId);
    if (timers) {
      for (const timer of timers) {
        clearTimeout(timer);
        this.pendingTimers.delete(timer);
      }
      this.instanceTimers.delete(instanceId);
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
