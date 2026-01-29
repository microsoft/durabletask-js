// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { getName } from "../task";
import { OrchestrationContext } from "../task/context/orchestration-context";
import * as pb from "../proto/orchestrator_service_pb";
import * as ph from "../utils/pb-helper.util";
import { CompletableTask } from "../task/completable-task";
import { TActivity } from "../types/activity.type";
import { TOrchestrator } from "../types/orchestrator.type";
import { Task } from "../task/task";
import { StopIterationError } from "./exception/stop-iteration-error";
import {
  OrchestrationEntityFeature,
  CriticalSectionInfo,
  LockHandle,
} from "../entities/orchestration-entity-feature";
import { EntityInstanceId } from "../entities/entity-instance-id";
import { SignalEntityOptions, CallEntityOptions } from "../entities/signal-entity-options";

export class RuntimeOrchestrationContext extends OrchestrationContext {
  _generator?: Generator<Task<any>, any, any>;
  _previousTask?: Task<any>;
  _isReplaying: boolean;
  _isComplete: boolean;
  _result: any;
  _pendingActions: Record<number, pb.OrchestratorAction>;
  _commitActions: pb.OrchestratorAction[]; // Actions that should always be included (e.g., unlock messages)
  _pendingTasks: Record<number, CompletableTask<any>>;
  _sequenceNumber: any;
  _currentUtcDatetime: any;
  _instanceId: string;
  _executionId?: string;
  _completionStatus?: pb.OrchestrationStatus;
  _receivedEvents: Record<string, any[]>;
  _pendingEvents: Record<string, CompletableTask<any>[]>;
  _newInput?: any;
  _saveEvents: any;
  _entityFeature: RuntimeOrchestrationEntityFeature;

  constructor(instanceId: string) {
    super();

    this._generator = undefined;
    this._isReplaying = true;
    this._isComplete = false;
    this._result = undefined;
    this._pendingActions = {};
    this._commitActions = [];
    this._pendingTasks = {};
    this._sequenceNumber = 0;
    this._currentUtcDatetime = new Date(1000, 0, 1);
    this._instanceId = instanceId;
    this._completionStatus = undefined;
    this._receivedEvents = {};
    this._pendingEvents = {};
    this._newInput = undefined;
    this._saveEvents = false;
    this._entityFeature = new RuntimeOrchestrationEntityFeature(this);
  }

  get instanceId(): string {
    return this._instanceId;
  }

  get currentUtcDateTime(): Date {
    return this._currentUtcDatetime;
  }

  get isReplaying(): boolean {
    return this._isReplaying;
  }

  get entities(): OrchestrationEntityFeature {
    return this._entityFeature;
  }

  /**
   * This is the main entry point for the orchestrator. It will run the generator
   * and return the first task to be executed. It is typically executed from the
   * orchestrator executor.
   *
   * @param generator
   */
  async run(generator: Generator<Task<any>, any, any>) {
    this._generator = generator;

    // TODO: do something with this task
    // start the generator
    const { value, done } = await this._generator.next();

    // if the generator finished, complete the orchestration.
    if (done) {
      this.setComplete(value, pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      return;
    }

    // TODO: check if the task is null?
    this._previousTask = value;
  }

  async resume() {
    // This is never expected unless maybe there's an issue with the history
    if (!this._generator) {
      throw new Error("The orchestrator generator is not initialized! Was the orchestration history corrupted?");
    }

    // We can resume the generator only if the previously yielded task
    // has reached a completed state. The only time this won't be the
    // case is if the user yielded on a WhenAll task and there are still
    // outstanding child tasks that need to be completed.
    if (this._previousTask) {
      if (this._previousTask.isFailed) {
        // Raise the failure as an exception to the generator. The orchestrator can then either
        // handle the exception or allow it to fail the orchestration.
        await this._generator.throw(this._previousTask._exception);
      } else if (this._previousTask.isComplete) {
        while (true) {
          // Resume the generator. This will either return a Task or raise StopIteration if it's done.
          // @todo: Should we check for possible infinite loops here?
          // python: next_task = self._generator.send(self._previous_task.get_result())

          // This returns a Promise that we will not await yet
          // the generator will return an IteratorResult with its next value
          // note that we are working with an AsyncGenerator, so we should await
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator/next
          const { done, value } = await this._generator.next(this._previousTask._result);

          // If we are done, raise StopIteration
          if (done) {
            throw new StopIterationError(value);
          }

          if (!(value instanceof Task)) {
            throw new Error("The orchestrator generator yielded a non-Task object");
          }

          this._previousTask = value;

          // If a completed task was returned, then we can keep running the generator function.
          // TODO: What about the done from the generator?
          if (!this._previousTask.isComplete) {
            break;
          }
        }
      }
    }
  }

  setComplete(result: any, status: pb.OrchestrationStatus, isResultEncoded: boolean = false) {
    if (this._isComplete) {
      return;
    }

    this._isComplete = true;
    this._completionStatus = status;
    this._pendingActions = {}; // Clear any pending actions

    this._result = result;

    let resultJson;

    if (result) {
      resultJson = isResultEncoded ? result : JSON.stringify(result);
    }

    const action = ph.newCompleteOrchestrationAction(this.nextSequenceNumber(), status, resultJson);
    this._pendingActions[action.getId()] = action;
  }

  setFailed(e: Error) {
    // should allow orchestration to fail, even it's completed.
    // if (this._isComplete) {
    //   return;
    // }

    this._isComplete = true;
    this._completionStatus = pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED;
    this._pendingActions = {}; // Cancel any pending actions

    const action = ph.newCompleteOrchestrationAction(
      this.nextSequenceNumber(),
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      undefined,
      ph.newFailureDetails(e),
    );
    this._pendingActions[action.getId()] = action;
  }

  setContinuedAsNew(newInput: any, saveEvents: boolean) {
    if (this._isComplete) {
      return;
    }

    this._isComplete = true;
    this._pendingActions = {}; // Clear any pending actions
    this._completionStatus = pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW;
    this._newInput = newInput;
    this._saveEvents = saveEvents;
  }

  getActions(): pb.OrchestratorAction[] {
    if (this._completionStatus === pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW) {
      // Only return the single completion actions when continuing-as-new
      let carryoverEvents: pb.HistoryEvent[] | null = null;

      if (this._saveEvents) {
        carryoverEvents = [];

        // We need to save the current sent of pending events so that they can be
        // replayed when the new instance starts
        for (const [eventName, values] of Object.entries(this._receivedEvents)) {
          for (const eventValue of values) {
            const encodedValue = eventValue ? JSON.stringify(eventValue) : undefined;
            carryoverEvents.push(ph.newEventRaisedEvent(eventName, encodedValue));
          }
        }
      }

      const action = ph.newCompleteOrchestrationAction(
        this.nextSequenceNumber(),
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW,
        this._newInput ? JSON.stringify(this._newInput) : undefined,
        undefined,
        carryoverEvents,
      );

      return [action];
    }

    // Include both commit actions and pending actions
    return [...this._commitActions, ...Object.values(this._pendingActions)];
  }

  nextSequenceNumber(): number {
    return ++this._sequenceNumber;
  }

  /**
   * Create a timer
   *
   * @param fireAt number Amount of seconds between now and when the timer should fire
   * @param fireAt Date The date when the timer should fire
   * @returns
   */
  createTimer(fireAt: number | Date): Task<any> {
    const id = this.nextSequenceNumber();

    // If a number is passed, we use it as the number of seconds to wait
    // we use instanceof Date as number is not a native Javascript type
    if (!(fireAt instanceof Date)) {
      fireAt = new Date(Date.now() + fireAt * 1000);
    }

    const action = ph.newCreateTimerAction(id, fireAt);
    this._pendingActions[action.getId()] = action;

    const timerTask = new CompletableTask();
    this._pendingTasks[id] = timerTask;

    return timerTask;
  }

  callActivity<TInput, TOutput>(
    activity: TActivity<TInput, TOutput> | string,
    input?: TInput | undefined,
  ): Task<TOutput> {
    const id = this.nextSequenceNumber();
    const name = typeof activity === "string" ? activity : getName(activity);
    const encodedInput = input ? JSON.stringify(input) : undefined;
    const action = ph.newScheduleTaskAction(id, name, encodedInput);
    this._pendingActions[action.getId()] = action;

    const task = new CompletableTask<TOutput>();
    this._pendingTasks[id] = task;
    return task;
  }

  callSubOrchestrator<TInput, TOutput>(
    orchestrator: TOrchestrator | string,
    input?: TInput | undefined,
    instanceId?: string | undefined,
  ): Task<TOutput> {
    let name;
    if (typeof orchestrator === "string") {
      name = orchestrator;
    } else {
      name = getName(orchestrator);
    }
    const id = this.nextSequenceNumber();

    // Create a deterministic instance ID based on the parent instance ID
    // use the instanceId and apprent the id to it in hexadecimal with 4 digits (e.g. 0001)
    if (!instanceId) {
      const instanceIdSuffix = id.toString(16).padStart(4, "0");
      instanceId = `${this._instanceId}:${instanceIdSuffix}`;
    }

    const encodedInput = input ? JSON.stringify(input) : undefined;
    const action = ph.newCreateSubOrchestrationAction(id, name, instanceId, encodedInput);
    this._pendingActions[action.getId()] = action;

    const task = new CompletableTask<TOutput>();
    this._pendingTasks[id] = task;
    return task;
  }

  waitForExternalEvent<T>(name: string): Task<T> {
    // Check to see if this event has already been received, in which case we
    // can return it immediately. Otherwise, record out intent to receive an
    // event with the given name so that we can resume the generator when it
    // arrives. If there are multiple events with the same name, we return
    // them in the order they were received.
    const externalEventTask = new CompletableTask<T>();
    const eventName = name.toLocaleLowerCase();
    const eventList = this._receivedEvents[eventName];

    if (eventList?.length) {
      const eventData = eventList.shift();

      if (!eventList?.length) {
        delete this._receivedEvents[eventName];
      }

      externalEventTask.complete(eventData);
    } else {
      let taskList = this._pendingEvents[eventName];

      if (!taskList?.length) {
        taskList = [];
        this._pendingEvents[eventName] = taskList;
      }

      taskList.push(externalEventTask);
    }

    return externalEventTask;
  }

  /**
   * Orchestrations can be continued as new. This API allows an  orchestration to restart itself from scratch, optionally with a new input.
   */
  continueAsNew(newInput: any, saveEvents: boolean = false) {
    if (this._isComplete) {
      return;
    }

    this.setContinuedAsNew(newInput, saveEvents);
  }

  /**
   * Generates a deterministic GUID for entity operations.
   *
   * @remarks
   * This is used for generating request IDs that are deterministically replayable.
   * Uses the instance ID and sequence number to create a unique, reproducible ID.
   */
  newGuid(): string {
    const id = this.nextSequenceNumber();
    // Create a deterministic GUID based on instance ID and sequence number
    // Format: instanceId:sequenceNumber (hex padded to 8 digits)
    const suffix = id.toString(16).padStart(8, "0");
    return `${this._instanceId}:${suffix}`;
  }
}

/**
 * Implementation of OrchestrationEntityFeature for interacting with entities from orchestrations.
 *
 * @remarks
 * This class provides the entity feature for the RuntimeOrchestrationContext.
 * It allows orchestrations to call entities (request/response), signal entities (one-way),
 * and acquire locks on entities for critical sections.
 */
class RuntimeOrchestrationEntityFeature implements OrchestrationEntityFeature {
  private readonly context: RuntimeOrchestrationContext;
  /**
   * Tracks pending entity calls by requestId.
   * Used to correlate responses (EntityOperationCompleted/Failed) with the original call.
   */
  readonly pendingEntityCalls: Map<
    string,
    { task: CompletableTask<any>; entityId: EntityInstanceId; operationName: string }
  >;

  /**
   * Tracks pending lock acquisitions by criticalSectionId.
   * Used to correlate EntityLockGranted events with the original lock request.
   */
  readonly pendingLockRequests: Map<
    string,
    { task: CompletableTask<LockHandle>; lockSet: EntityInstanceId[] }
  >;

  /**
   * Current critical section state. Null if not in a critical section.
   */
  private criticalSection: {
    id: string;
    lockedEntities: EntityInstanceId[];
    availableEntities: Set<string>; // Entity IDs available for calls (not currently in a call)
  } | null = null;

  /**
   * Whether a lock acquisition is pending (lock request sent but not yet granted).
   * This is used to prevent calling entities before the lock is granted.
   */
  private lockAcquisitionPending = false;

  constructor(context: RuntimeOrchestrationContext) {
    this.context = context;
    this.pendingEntityCalls = new Map();
    this.pendingLockRequests = new Map();
    this.criticalSection = null;
    this.lockAcquisitionPending = false;
  }

  /**
   * Whether this orchestration is currently inside a critical section.
   */
  get isInsideCriticalSection(): boolean {
    return this.criticalSection !== null;
  }

  /**
   * The ID of the current critical section, or undefined if not in a critical section.
   */
  get currentCriticalSectionId(): string | undefined {
    return this.criticalSection?.id;
  }

  /**
   * Calls an operation on an entity and waits for it to complete.
   *
   * @param id - The target entity instance ID.
   * @param operationName - The name of the operation to invoke.
   * @param input - Optional input to pass to the operation.
   * @param options - Optional call options.
   * @returns A task that completes when the entity operation finishes.
   *
   * @remarks
   * This creates a SendEntityMessageAction with an EntityOperationCalledEvent.
   * The orchestration waits for EntityOperationCompletedEvent or EntityOperationFailedEvent.
   */
  callEntity<TResult = void>(
    id: EntityInstanceId,
    operationName: string,
    input?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: CallEntityOptions,
  ): Task<TResult> {
    // Validate the transition if in a critical section
    if (this.criticalSection) {
      // Check if lock acquisition is still pending
      if (this.lockAcquisitionPending) {
        throw new Error(
          "Must await the completion of the lock request prior to calling any entity.",
        );
      }

      const entityIdStr = id.toString();
      if (!this.criticalSection.availableEntities.has(entityIdStr)) {
        // Check if this entity is even in the lock set
        const isLocked = this.criticalSection.lockedEntities.some(
          (e) => e.toString() === entityIdStr,
        );
        if (isLocked) {
          throw new Error(
            "Must not call an entity from a critical section while a prior call to the same entity is still pending.",
          );
        } else {
          throw new Error(
            "Must not call an entity from a critical section if it is not one of the locked entities.",
          );
        }
      }
      // Mark entity as unavailable until call completes
      this.criticalSection.availableEntities.delete(entityIdStr);
    }

    const actionId = this.context.nextSequenceNumber();
    const requestId = this.context.newGuid();
    const encodedInput = input !== undefined ? JSON.stringify(input) : undefined;
    const instanceIdString = id.toString();
    const parentInstanceId = this.context.instanceId;
    const parentExecutionId = this.context._executionId;

    const action = ph.newSendEntityMessageCallAction(
      actionId,
      instanceIdString,
      operationName,
      requestId,
      parentInstanceId,
      parentExecutionId,
      encodedInput,
    );

    this.context._pendingActions[action.getId()] = action;

    // Create a completable task that will be completed when the response arrives
    const task = new CompletableTask<TResult>();

    // Track this pending call so we can correlate the response by requestId
    this.pendingEntityCalls.set(requestId, { task, entityId: id, operationName });

    return task;
  }

  /**
   * Called after an entity call within a critical section completes.
   * Makes the entity available for calls again.
   */
  recoverLockAfterCall(entityId: EntityInstanceId): void {
    if (this.criticalSection) {
      this.criticalSection.availableEntities.add(entityId.toString());
    }
  }

  /**
   * Signals an operation on an entity without waiting for a response.
   *
   * @param id - The target entity instance ID.
   * @param operationName - The name of the operation to invoke.
   * @param input - Optional input to pass to the operation.
   * @param options - Optional signal options (e.g., scheduled time).
   *
   * @remarks
   * This creates a SendEntityMessageAction with an EntityOperationSignaledEvent.
   * The orchestration does not wait for the entity to process the operation.
   */
  signalEntity(
    id: EntityInstanceId,
    operationName: string,
    input?: unknown,
    options?: SignalEntityOptions,
  ): void {
    // Validate: cannot signal a locked entity from within a critical section
    if (this.criticalSection) {
      const entityIdStr = id.toString();
      const isLocked = this.criticalSection.lockedEntities.some(
        (e) => e.toString() === entityIdStr,
      );
      if (isLocked) {
        throw new Error("Must not signal a locked entity from a critical section.");
      }
    }

    const actionId = this.context.nextSequenceNumber();
    const requestId = this.context.newGuid();
    const encodedInput = input !== undefined ? JSON.stringify(input) : undefined;
    const instanceIdString = id.toString();

    const action = ph.newSendEntityMessageSignalAction(
      actionId,
      instanceIdString,
      operationName,
      requestId,
      encodedInput,
      options?.signalTime,
    );

    this.context._pendingActions[action.getId()] = action;
  }

  /**
   * Acquires locks on one or more entities for a critical section.
   *
   * @param entityIds - The entities to lock.
   * @returns A task that completes when all locks are acquired, with a handle to release the locks.
   *
   * @remarks
   * Entities are sorted before lock acquisition to prevent deadlocks.
   * Duplicates are removed automatically.
   */
  lockEntities(...entityIds: EntityInstanceId[]): Task<LockHandle> {
    if (entityIds.length === 0) {
      throw new Error("The list of entities to lock must not be empty.");
    }

    if (this.criticalSection) {
      throw new Error("Must not enter another critical section from within a critical section.");
    }

    // Sort entities for deterministic ordering (prevents deadlocks)
    // Use the string representation for consistent ordering
    const sortedEntities = [...entityIds].sort((a, b) => a.toString().localeCompare(b.toString()));

    // Remove duplicates
    const uniqueEntities: EntityInstanceId[] = [];
    for (const entity of sortedEntities) {
      const entityStr = entity.toString();
      if (
        uniqueEntities.length === 0 ||
        uniqueEntities[uniqueEntities.length - 1].toString() !== entityStr
      ) {
        uniqueEntities.push(entity);
      }
    }

    const actionId = this.context.nextSequenceNumber();
    const criticalSectionId = this.context.newGuid();
    const lockSet = uniqueEntities.map((e) => e.toString());
    const parentInstanceId = this.context.instanceId;

    const action = ph.newSendEntityMessageLockAction(
      actionId,
      criticalSectionId,
      lockSet,
      parentInstanceId,
    );

    this.context._pendingActions[action.getId()] = action;

    // Initialize critical section state (availableEntities is empty until lock is granted)
    this.criticalSection = {
      id: criticalSectionId,
      lockedEntities: uniqueEntities,
      availableEntities: new Set<string>(), // Empty until lock is granted
    };

    // Mark that we're waiting for the lock to be granted
    this.lockAcquisitionPending = true;

    // Create a completable task that will be completed when the lock is granted
    const task = new CompletableTask<LockHandle>();

    // Track this pending lock request
    this.pendingLockRequests.set(criticalSectionId, { task, lockSet: uniqueEntities });

    return task;
  }

  /**
   * Called when EntityLockGrantedEvent is received.
   * Completes the pending lock request and returns the lock handle.
   */
  completeLockAcquisition(criticalSectionId: string): void {
    const pendingRequest = this.pendingLockRequests.get(criticalSectionId);
    if (pendingRequest) {
      this.pendingLockRequests.delete(criticalSectionId);

      // Now that lock is granted, populate availableEntities and clear pending flag
      if (this.criticalSection) {
        this.criticalSection.availableEntities = new Set(
          pendingRequest.lockSet.map((e) => e.toString()),
        );
      }
      this.lockAcquisitionPending = false;

      // Create the lock releaser
      const lockHandle = new EntityLockReleaser(this.context, this, criticalSectionId);
      pendingRequest.task.complete(lockHandle);
    }
  }

  /**
   * Checks whether the orchestration is currently inside a critical section.
   *
   * @returns Information about the current critical section state.
   */
  isInCriticalSection(): CriticalSectionInfo {
    if (this.criticalSection) {
      return {
        inSection: true,
        lockedEntities: [...this.criticalSection.lockedEntities],
      };
    } else {
      return {
        inSection: false,
      };
    }
  }

  /**
   * Exits the critical section, releasing all locks.
   *
   * @param criticalSectionId - Optional: only exit if the ID matches.
   */
  exitCriticalSection(criticalSectionId?: string): void {
    if (!this.criticalSection) {
      return;
    }

    if (criticalSectionId && criticalSectionId !== this.criticalSection.id) {
      return;
    }

    // Send unlock messages to all locked entities
    // Use _commitActions so they aren't cleared when the orchestration completes
    for (const entity of this.criticalSection.lockedEntities) {
      const actionId = this.context.nextSequenceNumber();
      const action = ph.newSendEntityMessageUnlockAction(
        actionId,
        this.criticalSection.id,
        entity.toString(),
        this.context.instanceId,
      );
      this.context._commitActions.push(action);
    }

    // Clear critical section state
    this.criticalSection = null;
  }
}

/**
 * Lock releaser that exits the critical section when released.
 */
class EntityLockReleaser implements LockHandle {
  private readonly context: RuntimeOrchestrationContext;
  private readonly entityFeature: RuntimeOrchestrationEntityFeature;
  private readonly criticalSectionId: string;
  private released = false;

  constructor(
    context: RuntimeOrchestrationContext,
    entityFeature: RuntimeOrchestrationEntityFeature,
    criticalSectionId: string,
  ) {
    this.context = context;
    this.entityFeature = entityFeature;
    this.criticalSectionId = criticalSectionId;
  }

  /**
   * Releases all entity locks held by this lock handle.
   */
  release(): void {
    if (this.released) {
      return; // Already released
    }

    this.released = true;
    this.entityFeature.exitCriticalSection(this.criticalSectionId);
  }
}
