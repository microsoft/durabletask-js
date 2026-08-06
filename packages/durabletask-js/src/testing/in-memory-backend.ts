// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import * as pbh from "../utils/pb-helper.util";
import { OrchestrationStatus as ClientOrchestrationStatus } from "../orchestration/enum/orchestration-status.enum";
import { ParentOrchestrationInstance } from "../types/parent-orchestration-instance.type";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { randomUUID } from "crypto";
import { validateDedupeStatusesForReplacement } from "../orchestration/orchestration-id-reuse-policy";
import { OrchestrationAlreadyExistsError } from "../orchestration/exception/orchestration-already-exists-error";

/** Mints a fresh per-execution ID (DTFx `Guid.ToString("N")` idiom: 32 hex chars, no dashes). */
function newExecutionId(): string {
  return randomUUID().replace(/-/g, "");
}

/**
 * Internal orchestration instance state stored by the in-memory backend.
 */
export interface OrchestrationInstance {
  instanceId: string;
  executionId: string;
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
  executionId: string;
  name: string;
  taskId: number;
  input?: string;
  completionToken: number;
}

/**
 * Internal entity state stored by the in-memory backend.
 */
export interface EntityState {
  instanceId: string;
  serializedState?: string;
  lastModifiedAt: Date;
  /** Orchestration instance currently holding the lock, if any. */
  lockedBy?: string;
  /** Execution of the orchestration that owns the current critical section. */
  lockOwnerExecutionId?: string;
  /** Critical section ID used to correlate the matching unlock action. */
  lockCriticalSectionId?: string;
  /** Operations queued but not yet dispatched to a worker. */
  pendingOperations: pb.HistoryEvent[];
  /** Operations handed to a worker and awaiting a batch result. */
  dispatchedOperations: pb.HistoryEvent[];
  completionToken: number;
}

/**
 * Pending lock request from an orchestration that could not be granted immediately.
 */
interface PendingLockRequest {
  criticalSectionId: string;
  parentInstanceId: string;
  parentExecutionId: string;
  lockSet: string[];
  sequenceNumber: number;
}

interface RewindSnapshotEntry {
  executionId: string;
  completionToken: number;
}

type RewindSnapshot = Map<string, RewindSnapshotEntry>;

/**
 * Entity work item that needs to be executed.
 */
export interface EntityWorkItem {
  instanceId: string;
  entityState?: string;
  operations: pb.HistoryEvent[];
  completionToken: number;
}

/**
 * Promise resolver for waiting on orchestration state changes.
 */
interface StateWaiter {
  resolve: (instance: OrchestrationInstance | undefined) => void;
  reject: (error: Error) => void;
  predicate: (instance: OrchestrationInstance) => boolean;
  subOrchestrationWatcher?: SubOrchestrationWatcher;
}

interface SubOrchestrationWatcher {
  parentInstanceId: string;
  parentExecutionId: string;
  taskId: number;
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
  private readonly entities: Map<string, EntityState> = new Map();
  private readonly entityQueue: string[] = [];
  private readonly entityQueueSet: Set<string> = new Set();
  private readonly entityInFlight: Set<string> = new Set();
  private readonly entityOperationSequence: WeakMap<pb.HistoryEvent, number> = new WeakMap();
  private pendingLockRequests: PendingLockRequest[] = [];
  private readonly stateWaiters: Map<string, StateWaiter[]> = new Map();
  private readonly pendingTimers: Set<ReturnType<typeof setTimeout>> = new Set();
  private readonly instanceTimers: Map<string, Set<ReturnType<typeof setTimeout>>> = new Map();
  private readonly rewindSnapshots: Map<string, RewindSnapshot> = new Map();
  private nextCompletionToken: number = 1;
  private nextEntityMessageSequence: number = 1;
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
      throw new OrchestrationAlreadyExistsError(`An orchestration with instance ID '${instanceId}' already exists`);
    }

    const now = new Date();
    const startTime = scheduledStartTime && scheduledStartTime > now ? scheduledStartTime : now;

    // A fresh per-execution ID. On continue-as-new a new one is minted (see completeOrchestration),
    // which is what keeps default-derived child instance IDs unique across generations.
    const executionId = newExecutionId();

    const instance: OrchestrationInstance = {
      instanceId,
      executionId,
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
    const executionStarted = pbh.newExecutionStartedEvent(name, instanceId, input, parentInstance, executionId);

    instance.pendingEvents.push(orchestratorStarted);
    instance.pendingEvents.push(executionStarted);

    this.instances.set(instanceId, instance);
    this.enqueueOrchestration(instanceId);

    return instanceId;
  }

  /**
   * Creates a client-scheduled orchestration using the same status-based reuse semantics as the .NET test host.
   */
  async createOrchestrationInstance(
    instanceId: string,
    name: string,
    input?: string,
    scheduledStartTime?: Date,
    dedupeStatuses?: readonly ClientOrchestrationStatus[],
  ): Promise<string> {
    if (dedupeStatuses !== undefined) {
      validateDedupeStatusesForReplacement(dedupeStatuses);
    }

    const existingInstance = this.instances.get(instanceId);
    if (existingInstance) {
      const existingStatus = this.toClientStatus(existingInstance.status);
      if (dedupeStatuses?.includes(existingStatus) === true) {
        throw this.newAlreadyExistsError(instanceId, existingStatus);
      }

      const existingExecutionId = existingInstance.executionId;
      if (this.isRunningStatus(existingInstance.status)) {
        const dedupeDescription =
          dedupeStatuses === undefined
            ? "undefined (all statuses reusable)"
            : dedupeStatuses.length === 0
              ? "[] (all statuses reusable)"
              : `[${dedupeStatuses.join(", ")}]`;
        const terminationReason =
          `A new instance creation request has been issued for instance ${instanceId} which currently has status ` +
          `${this.formatStatus(existingStatus)}. Since the dedupe statuses of the creation request, ` +
          `${dedupeDescription}, do not contain the orchestration's status, the orchestration has been terminated ` +
          "and a new instance with the same instance ID will be created.";

        const encodedTerminationReason = JSON.stringify(terminationReason);
        this.terminate(instanceId, encodedTerminationReason);
        this.completeOrchestration(instanceId, existingInstance.completionToken, [
          pbh.newCompleteOrchestrationAction(
            -1,
            pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED,
            encodedTerminationReason,
          ),
        ]);
        await this.waitForState(
          instanceId,
          (instance) => instance.executionId === existingExecutionId && this.isTerminalStatus(instance.status),
          0,
        );
      }

      const currentInstance = this.instances.get(instanceId);
      if (currentInstance?.executionId === existingExecutionId) {
        const currentStatus = this.toClientStatus(currentInstance.status);
        if (dedupeStatuses?.includes(currentStatus) === true) {
          throw this.newAlreadyExistsError(instanceId, currentStatus);
        }
        this.removeInstanceForReplacement(instanceId);
      }
    }

    return this.createInstance(instanceId, name, input, scheduledStartTime);
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

    this.cleanupLocksForExecution(instance.instanceId, instance.executionId);
    this.clearRewindSnapshot(instanceId);
    this.instances.delete(instanceId);
    this.orchestrationQueueSet.delete(instanceId);
    const queueIndex = this.orchestrationQueue.indexOf(instanceId);
    if (queueIndex >= 0) {
      this.orchestrationQueue.splice(queueIndex, 1);
    }
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

    const snapshot: RewindSnapshot = new Map();
    this.validateRewindLockState(instance, snapshot);
    this.prepareRewind(instance, reason, snapshot);
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
   * Gets the next entity work item to process, if any.
   *
   * Drains all operations queued for the entity into a single batch and marks the
   * entity in-flight so it is not dispatched again until the batch completes.
   */
  getNextEntityWorkItem(): EntityWorkItem | undefined {
    const skipped: string[] = [];
    let workItem: EntityWorkItem | undefined;

    while (this.entityQueue.length > 0) {
      const entityId = this.entityQueue.shift()!;
      this.entityQueueSet.delete(entityId);

      const entity = this.entities.get(entityId);
      if (!entity || entity.pendingOperations.length === 0) {
        continue;
      }

      // Already executing a batch; re-queue so it is picked up after completion.
      if (this.entityInFlight.has(entityId)) {
        skipped.push(entityId);
        continue;
      }

      const dispatchableOperations: pb.HistoryEvent[] = [];
      const blockedOperations: pb.HistoryEvent[] = [];
      for (const operation of entity.pendingOperations) {
        if (this.canDispatchEntityOperation(entity, operation)) {
          dispatchableOperations.push(operation);
        } else {
          blockedOperations.push(operation);
        }
      }

      if (dispatchableOperations.length === 0) {
        continue;
      }

      this.entityInFlight.add(entityId);
      entity.dispatchedOperations = dispatchableOperations;
      entity.pendingOperations = blockedOperations;

      workItem = {
        instanceId: entity.instanceId,
        entityState: entity.serializedState,
        operations: entity.dispatchedOperations,
        completionToken: entity.completionToken,
      };
      break;
    }

    for (const entityId of skipped) {
      this.enqueueEntity(entityId);
    }

    return workItem;
  }

  /**
   * Completes an entity batch execution: persists the new state, delivers operation
   * results back to calling orchestrations, and applies entity side-effect actions.
   */
  completeEntityTask(instanceId: string, completionToken: number, result: pb.EntityBatchResult): void {
    const entity = this.entities.get(instanceId);
    if (!entity || entity.completionToken !== completionToken) {
      return; // Entity was reset/purged, or this is a stale completion
    }

    const dispatched = entity.dispatchedOperations;

    entity.serializedState = result.getEntitystate()?.getValue() ?? undefined;
    entity.lastModifiedAt = new Date();
    entity.dispatchedOperations = [];
    entity.completionToken = this.nextCompletionToken++;
    this.entityInFlight.delete(instanceId);

    // Deliver results to callers. Results are index-aligned with the dispatched
    // operations because the executor pushes exactly one result per operation.
    const results = result.getResultsList();
    for (let i = 0; i < dispatched.length; i++) {
      this.deliverEntityOperationResult(dispatched[i], results[i]);
    }

    for (const action of result.getActionsList()) {
      this.processEntityAction(action);
    }

    // An entity that was busy when a lock was requested may now be available.
    this.tryGrantPendingLocks();

    // A batch may have produced signals for this same entity, or the entity may have
    // been signalled while its batch was running.
    if (entity.pendingOperations.some((operation) => this.canDispatchEntityOperation(entity, operation))) {
      this.enqueueEntity(instanceId);
    }
  }

  /**
   * Delivers a single entity operation result back to the orchestration that called it.
   * Signals are fire-and-forget and produce no response.
   */
  private deliverEntityOperationResult(operation: pb.HistoryEvent, result?: pb.OperationResult): void {
    const called = operation.getEntityoperationcalled();
    if (!called || !result) {
      return;
    }

    const parentInstanceId = called.getParentinstanceid()?.getValue();
    if (!parentInstanceId) {
      return;
    }

    const parent = this.instances.get(parentInstanceId);
    if (!parent || parent.executionId !== called.getParentexecutionid()?.getValue()) {
      return;
    }

    const event = new pb.HistoryEvent();
    event.setEventid(-1);
    event.setTimestamp(pbh.newTimestamp(new Date()));

    const success = result.getSuccess();
    const failure = result.getFailure();

    if (success) {
      const completed = new pb.EntityOperationCompletedEvent();
      completed.setRequestid(called.getRequestid());
      const output = success.getResult();
      if (output) {
        completed.setOutput(output);
      }
      event.setEntityoperationcompleted(completed);
    } else if (failure) {
      const failed = new pb.EntityOperationFailedEvent();
      failed.setRequestid(called.getRequestid());
      const details = failure.getFailuredetails();
      if (details) {
        failed.setFailuredetails(details);
      }
      event.setEntityoperationfailed(failed);
    } else {
      return;
    }

    parent.pendingEvents.push(event);
    parent.lastUpdatedAt = new Date();
    this.enqueueOrchestration(parentInstanceId);
  }

  /**
   * Applies a side-effect action produced by an entity operation.
   */
  private processEntityAction(action: pb.OperationAction): void {
    const sendSignal = action.getSendsignal();
    if (sendSignal) {
      this.signalEntityInternal(sendSignal.getInstanceid(), sendSignal.getName(), sendSignal.getInput()?.getValue());
      return;
    }

    const startNew = action.getStartneworchestration();
    if (startNew) {
      const instanceId = startNew.getInstanceid() || randomUUID().replace(/-/g, "");
      if (!this.instances.has(instanceId)) {
        this.createInstance(instanceId, startNew.getName(), startNew.getInput()?.getValue());
      }
    }
  }

  /**
   * Signals an entity from outside an orchestration (client-initiated, fire-and-forget).
   *
   * @param entityId The entity instance ID, in `@name@key` form.
   * @param operation The operation name to invoke.
   * @param input Optional serialized operation input.
   */
  signalEntity(entityId: string, operation: string, input?: string): void {
    this.signalEntityInternal(entityId, operation, input);
  }

  /**
   * Gets the current state of an entity, if it exists. Intended for test assertions.
   */
  getEntity(instanceId: string): EntityState | undefined {
    return this.entities.get(instanceId);
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
      return; // Instance may have been purged or the backend reset
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
      instance.history.push(pbh.newExecutionCompletedEvent(instance.status, instance.output, instance.failureDetails));
    }

    // Update completion token for next execution
    instance.completionToken = this.nextCompletionToken++;

    // Notify waiters
    this.notifyWaiters(instanceId);
  }

  /**
   * Completes an activity execution.
   */
  completeActivity(instanceId: string, executionId: string, taskId: number, result?: string, error?: Error): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return; // Instance may have been purged
    }
    if (instance.executionId !== executionId) {
      return; // Completion belongs to a replaced or continued-as-new execution
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
    return this.waitForStateInternal(instanceId, predicate, timeoutMs);
  }

  private async waitForStateInternal(
    instanceId: string,
    predicate: (instance: OrchestrationInstance) => boolean,
    timeoutMs: number,
    subOrchestrationWatcher?: SubOrchestrationWatcher,
  ): Promise<OrchestrationInstance | undefined> {
    const instance = this.instances.get(instanceId);
    if (instance && predicate(instance)) {
      return instance;
    }

    return new Promise((resolve, reject) => {
      // When timeoutMs is 0, no timeout is applied — the waiter will only be
      // resolved by a matching state change or rejected by lifecycle cleanup.
      // `waiter` is declared before the timer so the timeout callback can find it by
      // object identity; the waiter reads `timer` only when invoked, by which point
      // it has been assigned.
      let timer: ReturnType<typeof setTimeout> | undefined;

      const waiter: StateWaiter = {
        resolve: (result) => {
          if (timer !== undefined) {
            clearTimeout(timer);
            this.pendingTimers.delete(timer);
          }
          resolve(result);
        },
        reject: (error) => {
          if (timer !== undefined) {
            clearTimeout(timer);
            this.pendingTimers.delete(timer);
          }
          reject(error);
        },
        predicate,
        subOrchestrationWatcher,
      };

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          if (timer !== undefined) {
            this.pendingTimers.delete(timer);
          }
          const waiters = this.stateWaiters.get(instanceId);
          if (waiters) {
            const index = waiters.indexOf(waiter);
            if (index >= 0) {
              waiters.splice(index, 1);
            }
            if (waiters.length === 0) {
              this.stateWaiters.delete(instanceId);
            }
          }
          reject(new Error(`Timeout waiting for orchestration '${instanceId}'`));
        }, timeoutMs);
        this.pendingTimers.add(timer);
      }

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
    return this.orchestrationQueue.length > 0 || this.activityQueue.length > 0 || this.entityQueue.length > 0;
  }

  /**
   * Resets the backend, clearing all state.
   */
  reset(): void {
    this.instances.clear();
    this.orchestrationQueue.length = 0;
    this.orchestrationQueueSet.clear();
    this.activityQueue.length = 0;
    this.entities.clear();
    this.entityQueue.length = 0;
    this.entityQueueSet.clear();
    this.entityInFlight.clear();
    this.pendingLockRequests = [];
    this.nextEntityMessageSequence = 1;
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
    this.rewindSnapshots.clear();
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
      case pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED:
        return ClientOrchestrationStatus.CANCELED;
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

  private removeInstanceForReplacement(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }

    this.cancelInstanceTimers(instanceId);
    this.cancelSubOrchestrationWatchers(
      instanceId,
      instance.executionId,
      new Error(`Parent orchestration instance '${instanceId}' was replaced by a new execution`),
    );
    this.rejectStateWaitersForReplacement(
      instanceId,
      new Error(`Orchestration instance '${instanceId}' was replaced by a new execution`),
    );
    this.instances.delete(instanceId);
    this.orchestrationQueueSet.delete(instanceId);

    const orchestrationQueueIndex = this.orchestrationQueue.indexOf(instanceId);
    if (orchestrationQueueIndex >= 0) {
      this.orchestrationQueue.splice(orchestrationQueueIndex, 1);
    }

    for (let i = this.activityQueue.length - 1; i >= 0; i--) {
      if (this.activityQueue[i].instanceId === instanceId) {
        this.activityQueue.splice(i, 1);
      }
    }
  }

  private rejectStateWaitersForReplacement(instanceId: string, error: Error): void {
    const waiters = this.stateWaiters.get(instanceId);
    if (!waiters) {
      return;
    }

    this.stateWaiters.delete(instanceId);
    for (const waiter of waiters) {
      if (waiter.subOrchestrationWatcher) {
        this.failSubOrchestrationWatcher(
          waiter.subOrchestrationWatcher,
          new Error(`Sub-orchestration instance '${instanceId}' was replaced by a new execution`),
        );
      }
      waiter.reject(error);
    }
  }

  private cancelSubOrchestrationWatchers(parentInstanceId: string, parentExecutionId: string, error: Error): void {
    for (const [instanceId, waiters] of this.stateWaiters) {
      const cancelledWaiters = waiters.filter(
        (waiter) =>
          waiter.subOrchestrationWatcher?.parentInstanceId === parentInstanceId &&
          waiter.subOrchestrationWatcher.parentExecutionId === parentExecutionId,
      );
      if (cancelledWaiters.length === 0) {
        continue;
      }

      const remainingWaiters = waiters.filter((waiter) => !cancelledWaiters.includes(waiter));
      if (remainingWaiters.length === 0) {
        this.stateWaiters.delete(instanceId);
      } else {
        this.stateWaiters.set(instanceId, remainingWaiters);
      }
      for (const waiter of cancelledWaiters) {
        waiter.reject(error);
      }
    }
  }

  private failSubOrchestrationWatcher(watcher: SubOrchestrationWatcher, error: Error): void {
    const parentInstance = this.instances.get(watcher.parentInstanceId);
    if (
      !parentInstance ||
      parentInstance.executionId !== watcher.parentExecutionId ||
      this.isTerminalStatus(parentInstance.status)
    ) {
      return;
    }

    parentInstance.pendingEvents.push(pbh.newSubOrchestrationFailedEvent(watcher.taskId, error));
    parentInstance.lastUpdatedAt = new Date();
    this.enqueueOrchestration(watcher.parentInstanceId);
  }

  private newAlreadyExistsError(
    instanceId: string,
    status: ClientOrchestrationStatus,
  ): OrchestrationAlreadyExistsError {
    return new OrchestrationAlreadyExistsError(
      `An orchestration with instance ID '${instanceId}' and status '${this.formatStatus(status)}' already exists`,
    );
  }

  private formatStatus(status: ClientOrchestrationStatus): string {
    const name = ClientOrchestrationStatus[status].toLowerCase();
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private isRunningStatus(status: pb.OrchestrationStatus): boolean {
    return (
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING ||
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING ||
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED
    );
  }

  private isTerminalStatus(status: pb.OrchestrationStatus): boolean {
    return (
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED ||
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED ||
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED ||
      status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED
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
      case pb.OrchestratorAction.OrchestratoractiontypeCase.SENDENTITYMESSAGE:
        this.processSendEntityMessageAction(instance, action);
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
    if (this.isTerminalStatus(status) || status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW) {
      this.cleanupLocksForExecution(instance.instanceId, instance.executionId);
      this.clearRewindSnapshot(instance.instanceId);
    }

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

      // Cancel timers still pending from the previous iteration. Their timer IDs are
      // sequence numbers that restart at 1 in the new iteration, so a leaked timer
      // would fire a TimerFired event that completes an unrelated task.
      this.cancelInstanceTimers(instance.instanceId);

      // Reset instance state
      instance.history = [];
      instance.input = newInput;
      instance.output = undefined;
      instance.customStatus = undefined;
      instance.failureDetails = undefined;
      instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING;
      // Mint a NEW execution ID for the next generation. This mirrors DTFx
      // (TaskOrchestrationDispatcher mints ExecutionId = Guid.NewGuid() on continue-as-new) and is
      // the crux of the default child instance ID fix: because the parent instance ID and the
      // per-work-item sequence number both repeat every generation, the executionId is the only
      // input that varies, so it is what stops generation N+1 from re-deriving generation N's child
      // IDs and colliding in createInstance.
      instance.executionId = newExecutionId();

      // Add new execution started events first, then carryover events.
      // This matches the real sidecar behavior where OrchestratorStarted and
      // ExecutionStarted always precede any carryover events (buffered external
      // events from the previous iteration). OrchestratorStarted must come first
      // because it sets currentUtcDateTime, and ExecutionStarted must come before
      // carryover events because it initializes the orchestrator generator.
      const orchestratorStarted = pbh.newOrchestratorStartedEvent(new Date());
      const executionStarted = pbh.newExecutionStartedEvent(
        instance.name,
        instance.instanceId,
        newInput,
        undefined,
        instance.executionId,
      );
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
      executionId: instance.executionId,
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
    const executionId = instance.executionId;

    const timerHandle = setTimeout(() => {
      this.pendingTimers.delete(timerHandle);
      this.removeInstanceTimer(instance.instanceId, timerHandle);
      const currentInstance = this.instances.get(instance.instanceId);
      if (
        currentInstance &&
        currentInstance.executionId === executionId &&
        !this.isTerminalStatus(currentInstance.status)
      ) {
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
      this.watchSubOrchestration(instance.instanceId, instance.executionId, subInstanceId, taskId);
    } catch (error: unknown) {
      // Sub-orchestration creation failed
      const err = error instanceof Error ? error : new Error(String(error));
      const failedEvent = pbh.newSubOrchestrationFailedEvent(taskId, err);
      instance.pendingEvents.push(failedEvent);
      this.enqueueOrchestration(instance.instanceId);
    }
  }

  private watchSubOrchestration(
    parentInstanceId: string,
    parentExecutionId: string,
    subInstanceId: string,
    taskId: number,
  ): void {
    // Use the stateWaiters mechanism instead of polling to avoid infinite loops
    // and unnecessary resource consumption
    this.waitForStateInternal(
      subInstanceId,
      (inst) => this.isTerminalStatus(inst.status),
      0, // No timeout — sub-orchestration will eventually complete, fail, or be terminated
      { parentInstanceId, parentExecutionId, taskId },
    )
      .then((subInstance) => {
        const parentInstance = this.instances.get(parentInstanceId);

        // If parent or sub no longer exists, nothing to do
        if (!subInstance || !parentInstance || parentInstance.executionId !== parentExecutionId) {
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
        // The watcher was cancelled by reset or parent/child replacement.
      });
  }

  private prepareRewind(instance: OrchestrationInstance, reason?: string, snapshot?: RewindSnapshot): void {
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
    if (snapshot) {
      const expected = snapshot.get(instance.instanceId);
      if (!expected) {
        throw new Error(`Cannot prepare unvalidated orchestration '${instance.instanceId}' for rewind`);
      }
      expected.completionToken = instance.completionToken;
      this.rewindSnapshots.set(instance.instanceId, snapshot);
    }
    this.enqueueOrchestration(instance.instanceId);
  }

  private processRewindOrchestrationAction(
    instance: OrchestrationInstance,
    rewindAction: pb.RewindOrchestrationAction,
  ): void {
    const snapshot = this.rewindSnapshots.get(instance.instanceId);
    const expectedInstance = snapshot?.get(instance.instanceId);
    if (
      !snapshot ||
      !expectedInstance ||
      expectedInstance.executionId !== instance.executionId ||
      expectedInstance.completionToken !== instance.completionToken
    ) {
      throw new Error(`Cannot apply stale rewind for orchestration '${instance.instanceId}'`);
    }

    const newHistory = rewindAction.getNewhistoryList();
    const executionId = newHistory
      .find((event) => event.hasExecutionstarted())
      ?.getExecutionstarted()
      ?.getOrchestrationinstance()
      ?.getExecutionid()
      ?.getValue();
    if (!executionId) {
      throw new Error(
        `Cannot apply rewind for orchestration '${instance.instanceId}': the rewritten history has no execution ID`,
      );
    }

    // Replace the history with the SDK-computed clean version.
    instance.history = newHistory;
    instance.executionId = executionId;
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
        const expectedSubInstance = snapshot.get(subInstanceId);
        if (
          expectedSubInstance?.executionId === subInstance.executionId &&
          expectedSubInstance.completionToken === subInstance.completionToken
        ) {
          this.prepareRewind(subInstance, reason, snapshot);
        }
      }
      this.watchSubOrchestration(instance.instanceId, instance.executionId, subInstanceId, taskId);
    }

    // Re-enqueue so the orchestration replays with the clean history. The executionRewound
    // event is already present in the clean history (kept by buildRewindResult), so it must
    // NOT be re-sent as a pending event — doing so would duplicate it. A lone orchestratorStarted
    // is enough to make the instance dispatchable; the worker replays normally because
    // executionCompleted is no longer in the history.
    instance.pendingEvents = [pbh.newOrchestratorStartedEvent(new Date())];
    instance.completionToken = this.nextCompletionToken++;
    this.clearRewindSnapshot(instance.instanceId);
    this.enqueueOrchestration(instance.instanceId);
  }

  /**
   * Handles an entity message emitted by an orchestration.
   *
   * Mirrors the Python in-memory backend: each outbound message is echoed into the
   * orchestration history (so replay validation sees the confirmation) and then routed
   * to the target entity or the lock manager.
   */
  private processSendEntityMessageAction(instance: OrchestrationInstance, action: pb.OrchestratorAction): void {
    const entityMessage = action.getSendentitymessage()!;
    const actionId = action.getId();
    const messageTypeCase = pb.SendEntityMessageAction.EntitymessagetypeCase;

    switch (entityMessage.getEntitymessagetypeCase()) {
      case messageTypeCase.ENTITYOPERATIONSIGNALED: {
        const signaled = entityMessage.getEntityoperationsignaled()!;
        this.appendEntityHistoryEvent(instance, actionId, (e) => e.setEntityoperationsignaled(signaled));

        const targetId = signaled.getTargetinstanceid()?.getValue();
        if (targetId) {
          const queued = new pb.HistoryEvent();
          queued.setEventid(-1);
          queued.setTimestamp(pbh.newTimestamp(new Date()));
          queued.setEntityoperationsignaled(signaled);
          this.queueEntityOperation(targetId, queued);
        }
        break;
      }
      case messageTypeCase.ENTITYOPERATIONCALLED: {
        const called = entityMessage.getEntityoperationcalled()!;
        this.appendEntityHistoryEvent(instance, actionId, (e) => e.setEntityoperationcalled(called));

        if (instance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING) {
          instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
        }

        const targetId = called.getTargetinstanceid()?.getValue();
        if (targetId) {
          const queued = new pb.HistoryEvent();
          queued.setEventid(-1);
          queued.setTimestamp(pbh.newTimestamp(new Date()));
          queued.setEntityoperationcalled(called);
          this.queueEntityOperation(targetId, queued);
        }
        break;
      }
      case messageTypeCase.ENTITYLOCKREQUESTED: {
        const lockRequested = entityMessage.getEntitylockrequested()!;
        this.appendEntityHistoryEvent(instance, actionId, (e) => e.setEntitylockrequested(lockRequested));

        if (instance.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING) {
          instance.status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
        }

        const parentId = lockRequested.getParentinstanceid()?.getValue();
        if (parentId) {
          this.tryGrantLock({
            criticalSectionId: lockRequested.getCriticalsectionid(),
            parentInstanceId: parentId,
            parentExecutionId: instance.executionId,
            lockSet: lockRequested.getLocksetList().slice(),
            sequenceNumber: this.nextEntityMessageSequence++,
          });
        }
        break;
      }
      case messageTypeCase.ENTITYUNLOCKSENT: {
        const unlock = entityMessage.getEntityunlocksent()!;
        this.appendEntityHistoryEvent(instance, actionId, (e) => e.setEntityunlocksent(unlock));

        const targetId = unlock.getTargetinstanceid()?.getValue();
        const parentId = unlock.getParentinstanceid()?.getValue();
        if (targetId) {
          const entity = this.entities.get(targetId);
          if (
            entity &&
            entity.lockCriticalSectionId === unlock.getCriticalsectionid() &&
            entity.lockedBy === parentId &&
            entity.lockOwnerExecutionId === instance.executionId
          ) {
            entity.lockedBy = undefined;
            entity.lockOwnerExecutionId = undefined;
            entity.lockCriticalSectionId = undefined;
            if (entity.pendingOperations.length > 0) {
              this.enqueueEntity(targetId);
            }
          }
        }

        this.tryGrantPendingLocks();
        break;
      }
      default:
        throw new Error(
          `Unknown entity message type '${entityMessage.getEntitymessagetypeCase()}' for orchestration ` +
            `'${instance.instanceId}'. This likely means the in-memory backend needs to be updated to handle ` +
            `a newly introduced entity message type.`,
        );
    }
  }

  /**
   * Appends the confirmation event for an outbound entity message to the orchestration history.
   * The event ID must be the originating action ID so replay validation can match it.
   */
  private appendEntityHistoryEvent(
    instance: OrchestrationInstance,
    actionId: number,
    populate: (event: pb.HistoryEvent) => void,
  ): void {
    const event = new pb.HistoryEvent();
    event.setEventid(actionId);
    event.setTimestamp(pbh.newTimestamp(new Date()));
    populate(event);
    instance.history.push(event);
  }

  /**
   * Gets (or lazily creates) the state record for an entity.
   */
  private getOrCreateEntity(entityId: string): EntityState {
    let entity = this.entities.get(entityId);
    if (!entity) {
      entity = {
        instanceId: entityId,
        lastModifiedAt: new Date(),
        pendingOperations: [],
        dispatchedOperations: [],
        completionToken: this.nextCompletionToken++,
      };
      this.entities.set(entityId, entity);
    }
    return entity;
  }

  private queueEntityOperation(entityId: string, event: pb.HistoryEvent): void {
    const entity = this.getOrCreateEntity(entityId);
    this.entityOperationSequence.set(event, this.nextEntityMessageSequence++);
    entity.pendingOperations.push(event);
    this.enqueueEntity(entityId);
  }

  private enqueueEntity(entityId: string): void {
    if (!this.entityQueueSet.has(entityId)) {
      this.entityQueue.push(entityId);
      this.entityQueueSet.add(entityId);
    }
  }

  private canDispatchEntityOperation(entity: EntityState, operation: pb.HistoryEvent): boolean {
    if (entity.lockedBy !== undefined) {
      const called = operation.getEntityoperationcalled();
      return (
        called?.getParentinstanceid()?.getValue() === entity.lockedBy &&
        called?.getParentexecutionid()?.getValue() === entity.lockOwnerExecutionId
      );
    }

    const lockBarrier = this.getNextLockBarrier(entity.instanceId);
    if (lockBarrier === undefined) {
      return true;
    }

    const operationSequence = this.entityOperationSequence.get(operation);
    return operationSequence !== undefined && operationSequence < lockBarrier;
  }

  private getNextLockBarrier(entityId: string): number | undefined {
    let barrier: number | undefined;
    for (const pending of this.pendingLockRequests) {
      if (pending.lockSet.includes(entityId) && (barrier === undefined || pending.sequenceNumber < barrier)) {
        barrier = pending.sequenceNumber;
      }
    }
    return barrier;
  }

  private operationPrecedesLock(operation: pb.HistoryEvent, pending: PendingLockRequest): boolean {
    const operationSequence = this.entityOperationSequence.get(operation);
    return operationSequence === undefined || operationSequence < pending.sequenceNumber;
  }

  /**
   * Signals an entity as a side effect of another entity's operation.
   */
  private signalEntityInternal(entityId: string, operation: string, input?: string): void {
    const signaled = new pb.EntityOperationSignaledEvent();
    signaled.setRequestid(randomUUID().replace(/-/g, ""));
    signaled.setOperation(operation);
    if (input !== undefined) {
      const value = new StringValue();
      value.setValue(input);
      signaled.setInput(value);
    }
    const target = new StringValue();
    target.setValue(entityId);
    signaled.setTargetinstanceid(target);

    const event = new pb.HistoryEvent();
    event.setEventid(-1);
    event.setTimestamp(pbh.newTimestamp(new Date()));
    event.setEntityoperationsignaled(signaled);

    this.queueEntityOperation(entityId, event);
  }

  private canGrantLock(pending: PendingLockRequest): boolean {
    return !pending.lockSet.some((entityId) => {
      const entity = this.entities.get(entityId);
      return (
        entity?.lockedBy !== undefined ||
        this.entityInFlight.has(entityId) ||
        entity?.pendingOperations.some((operation) => this.operationPrecedesLock(operation, pending))
      );
    });
  }

  private hasEarlierOverlappingLockRequest(pending: PendingLockRequest): boolean {
    const lockSet = new Set(pending.lockSet);
    return this.pendingLockRequests.some(
      (earlier) =>
        earlier.sequenceNumber < pending.sequenceNumber &&
        this.getActiveLockRequestParent(earlier) !== undefined &&
        earlier.lockSet.some((entityId) => lockSet.has(entityId)),
    );
  }

  private getActiveLockRequestParent(pending: PendingLockRequest): OrchestrationInstance | undefined {
    const parent = this.instances.get(pending.parentInstanceId);
    if (!parent || parent.executionId !== pending.parentExecutionId || this.isTerminalStatus(parent.status)) {
      return undefined;
    }
    return parent;
  }

  /**
   * Grants a lock to every entity in the lock set and notifies the parent orchestration.
   * Assumes availability was already verified via {@link canGrantLock}.
   */
  private grantLock(pending: PendingLockRequest, parent: OrchestrationInstance): void {
    for (const entityId of pending.lockSet) {
      const entity = this.getOrCreateEntity(entityId);
      entity.lockedBy = pending.parentInstanceId;
      entity.lockOwnerExecutionId = pending.parentExecutionId;
      entity.lockCriticalSectionId = pending.criticalSectionId;
    }

    const granted = new pb.EntityLockGrantedEvent();
    granted.setCriticalsectionid(pending.criticalSectionId);

    const event = new pb.HistoryEvent();
    event.setEventid(-1);
    event.setTimestamp(pbh.newTimestamp(new Date()));
    event.setEntitylockgranted(granted);

    parent.pendingEvents.push(event);
    parent.lastUpdatedAt = new Date();
    this.enqueueOrchestration(pending.parentInstanceId);
  }

  private tryGrantLock(pending: PendingLockRequest): void {
    const parent = this.getActiveLockRequestParent(pending);
    if (!parent) {
      return;
    }

    if (this.hasEarlierOverlappingLockRequest(pending) || !this.canGrantLock(pending)) {
      this.pendingLockRequests.push(pending);
      return;
    }
    this.grantLock(pending, parent);
  }

  private tryGrantPendingLocks(): void {
    const stillPending: PendingLockRequest[] = [];
    for (const pending of this.pendingLockRequests) {
      const parent = this.getActiveLockRequestParent(pending);
      if (!parent) {
        this.enqueuePendingEntityOperations(pending.lockSet);
        continue;
      }

      if (!this.hasEarlierOverlappingLockRequest(pending) && this.canGrantLock(pending)) {
        this.grantLock(pending, parent);
      } else {
        stillPending.push(pending);
      }
    }
    this.pendingLockRequests = stillPending;
  }

  private cleanupLocksForExecution(instanceId: string, executionId: string): void {
    const retainedLockRequests: PendingLockRequest[] = [];
    for (const pending of this.pendingLockRequests) {
      if (pending.parentInstanceId === instanceId && pending.parentExecutionId === executionId) {
        this.enqueuePendingEntityOperations(pending.lockSet);
      } else {
        retainedLockRequests.push(pending);
      }
    }
    this.pendingLockRequests = retainedLockRequests;

    for (const [entityId, entity] of this.entities) {
      if (entity.lockedBy !== instanceId || entity.lockOwnerExecutionId !== executionId) {
        continue;
      }

      entity.lockedBy = undefined;
      entity.lockOwnerExecutionId = undefined;
      entity.lockCriticalSectionId = undefined;
      if (entity.pendingOperations.length > 0) {
        this.enqueueEntity(entityId);
      }
    }

    this.tryGrantPendingLocks();
  }

  private enqueuePendingEntityOperations(entityIds: string[]): void {
    for (const entityId of entityIds) {
      if ((this.entities.get(entityId)?.pendingOperations.length ?? 0) > 0) {
        this.enqueueEntity(entityId);
      }
    }
  }

  private hasUnreleasedEntityLock(history: pb.HistoryEvent[]): boolean {
    const remainingLockSets = new Map<string, Set<string>>();

    for (const event of history) {
      const lockRequested = event.getEntitylockrequested();
      if (lockRequested) {
        remainingLockSets.set(lockRequested.getCriticalsectionid(), new Set(lockRequested.getLocksetList()));
        continue;
      }

      const unlock = event.getEntityunlocksent();
      const targetId = unlock?.getTargetinstanceid()?.getValue();
      if (!unlock || !targetId) {
        continue;
      }

      const remaining = remainingLockSets.get(unlock.getCriticalsectionid());
      if (!remaining) {
        continue;
      }

      remaining.delete(targetId);
      if (remaining.size === 0) {
        remainingLockSets.delete(unlock.getCriticalsectionid());
      }
    }

    return remainingLockSets.size > 0;
  }

  private validateRewindLockState(instance: OrchestrationInstance, snapshot: RewindSnapshot): void {
    if (snapshot.has(instance.instanceId)) {
      return;
    }
    snapshot.set(instance.instanceId, {
      executionId: instance.executionId,
      completionToken: instance.completionToken,
    });

    if (this.hasUnreleasedEntityLock(instance.history)) {
      throw new Error(`Cannot rewind an orchestration with an unreleased entity lock: '${instance.instanceId}'`);
    }

    const completedSubOrchestrationTaskIds = new Set<number>();
    const createdSubOrchestrations = new Map<number, string>();
    for (const event of instance.history) {
      const created = event.getSuborchestrationinstancecreated();
      if (created) {
        createdSubOrchestrations.set(event.getEventid(), created.getInstanceid());
        continue;
      }

      const completed = event.getSuborchestrationinstancecompleted();
      if (completed) {
        completedSubOrchestrationTaskIds.add(completed.getTaskscheduledid());
      }
    }

    for (const [taskId, subInstanceId] of createdSubOrchestrations) {
      if (completedSubOrchestrationTaskIds.has(taskId)) {
        continue;
      }

      const subInstance = this.instances.get(subInstanceId);
      if (subInstance?.status === pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED) {
        this.validateRewindLockState(subInstance, snapshot);
      }
    }
  }

  private clearRewindSnapshot(instanceId: string): void {
    const snapshot = this.rewindSnapshots.get(instanceId);
    this.rewindSnapshots.delete(instanceId);
    snapshot?.delete(instanceId);
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
