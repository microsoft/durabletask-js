// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createHash } from "crypto";
import { getName } from "../task";
import { OrchestrationContext } from "../task/context/orchestration-context";
import { ParentOrchestrationInstance } from "../types/parent-orchestration-instance.type";
import * as pb from "../proto/orchestrator_service_pb";
import * as ph from "../utils/pb-helper.util";
import { CompletableTask } from "../task/completable-task";
import { RetryTaskBase, RetryTaskType } from "../task/retry-task-base";
import { RetryableTask } from "../task/retryable-task";
import { RetryHandlerTask } from "../task/retry-handler-task";
import { RetryTimerTask } from "../task/retry-timer-task";
import { TaskOptions, SubOrchestrationOptions, isRetryPolicy, isAsyncRetryHandler } from "../task/options";
import { TActivity } from "../types/activity.type";
import { TOrchestrator } from "../types/orchestrator.type";
import { Task } from "../task/task";
import { StopIterationError } from "./exception/stop-iteration-error";
import { mapToRecord } from "../utils/tags.util";

export class RuntimeOrchestrationContext extends OrchestrationContext {
  _generator?: Generator<Task<any>, any, any>;
  _previousTask?: Task<any>;
  _isReplaying: boolean;
  _isComplete: boolean;
  _result: any;
  _pendingActions: Record<number, pb.OrchestratorAction>;
  _pendingTasks: Record<number, CompletableTask<any>>;
  _sequenceNumber: number;
  _newGuidCounter: number;
  _currentUtcDatetime: Date;
  _instanceId: string;
  _version: string;
  _parent?: ParentOrchestrationInstance;
  _completionStatus?: pb.OrchestrationStatus;
  _receivedEvents: Record<string, any[]>;
  _pendingEvents: Record<string, CompletableTask<any>[]>;
  _newInput?: any;
  _saveEvents: boolean;
  _customStatus?: any;

  constructor(instanceId: string) {
    super();

    this._generator = undefined;
    this._isReplaying = true;
    this._isComplete = false;
    this._result = undefined;
    this._pendingActions = {};
    this._pendingTasks = {};
    this._sequenceNumber = 0;
    this._newGuidCounter = 0;
    this._currentUtcDatetime = new Date(1000, 0, 1);
    this._instanceId = instanceId;
    this._version = "";
    this._parent = undefined;
    this._completionStatus = undefined;
    this._receivedEvents = {};
    this._pendingEvents = {};
    this._newInput = undefined;
    this._saveEvents = false;
    this._customStatus = undefined;
  }

  get instanceId(): string {
    return this._instanceId;
  }

  get parent(): ParentOrchestrationInstance | undefined {
    return this._parent;
  }

  get currentUtcDateTime(): Date {
    return this._currentUtcDatetime;
  }

  get isReplaying(): boolean {
    return this._isReplaying;
  }

  get version(): string {
    return this._version;
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
        const throwResult = await this._generator.throw(this._previousTask._exception);

        // If the generator caught the exception and completed, signal completion
        if (throwResult.done) {
          throw new StopIterationError(throwResult.value);
        }

        // If the generator yielded a new task after catching the exception
        if (throwResult.value instanceof Task) {
          this._previousTask = throwResult.value;
          // If the new task is already complete, continue processing
          if (this._previousTask.isComplete) {
            await this.resume();
          }
          return;
        }
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
    // Note: Do NOT clear pending actions here - fire-and-forget actions like sendEvent
    // must be preserved and returned alongside the complete action

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
    // Note: Do NOT clear pending actions here - fire-and-forget actions like sendEvent
    // must be preserved and returned alongside the complete action

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

    return Object.values(this._pendingActions);
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
    options?: TaskOptions,
  ): Task<TOutput> {
    const id = this.nextSequenceNumber();
    const name = typeof activity === "string" ? activity : getName(activity);
    const encodedInput = input ? JSON.stringify(input) : undefined;
    const action = ph.newScheduleTaskAction(id, name, encodedInput, options?.tags, options?.version);
    this._pendingActions[action.getId()] = action;

    const task = this.createRetryTaskOrDefault<TOutput>(action, id, options, "activity");
    return task;
  }

  callSubOrchestrator<TInput, TOutput>(
    orchestrator: TOrchestrator | string,
    input?: TInput | undefined,
    options?: SubOrchestrationOptions,
  ): Task<TOutput> {
    let name;
    if (typeof orchestrator === "string") {
      name = orchestrator;
    } else {
      name = getName(orchestrator);
    }
    const id = this.nextSequenceNumber();

    // Get instance ID from options or generate a deterministic one
    let instanceId = options?.instanceId;

    // Create a deterministic instance ID based on the parent instance ID
    // use the instanceId and append the id to it in hexadecimal with 4 digits (e.g. 0001)
    if (!instanceId) {
      const instanceIdSuffix = id.toString(16).padStart(4, "0");
      instanceId = `${this._instanceId}:${instanceIdSuffix}`;
    }

    const encodedInput = input ? JSON.stringify(input) : undefined;
    const action = ph.newCreateSubOrchestrationAction(id, name, instanceId, encodedInput, options?.tags, options?.version);
    this._pendingActions[action.getId()] = action;

    const task = this.createRetryTaskOrDefault<TOutput>(action, id, options, "subOrchestration");
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
   * Sets a custom status value for the current orchestration instance.
   */
  setCustomStatus(customStatus: any): void {
    this._customStatus = customStatus;
  }

  /**
   * Gets the encoded custom status value for the current orchestration instance.
   * This is used internally when building the orchestrator response.
   */
  getCustomStatus(): string | undefined {
    if (this._customStatus === undefined || this._customStatus === null) {
      return undefined;
    }
    return JSON.stringify(this._customStatus);
  }

  /**
   * Sends an event to another orchestration instance.
   */
  sendEvent(instanceId: string, eventName: string, eventData?: any): void {
    const id = this.nextSequenceNumber();
    const encodedData = eventData !== undefined ? JSON.stringify(eventData) : undefined;
    const action = ph.newSendEventAction(id, instanceId, eventName, encodedData);
    this._pendingActions[action.getId()] = action;
  }

  /**
   * Creates a new deterministic UUID that is safe for replay within an orchestration.
   *
   * Uses UUID v5 (name-based with SHA-1) per RFC 4122 §4.3.
   * The generated GUID is deterministic based on instanceId, currentUtcDateTime, and a counter,
   * ensuring the same value is produced during replay.
   */
  newGuid(): string {
    const NAMESPACE_UUID = "9e952958-5e33-4daf-827f-2fa12937b875";

    // Build the name string: instanceId_datetime_counter
    const guidNameValue = `${this._instanceId}_${this._currentUtcDatetime.toISOString()}_${this._newGuidCounter}`;
    this._newGuidCounter++;

    return this.generateDeterministicGuid(NAMESPACE_UUID, guidNameValue);
  }

  /**
   * Generates a deterministic GUID using UUID v5 algorithm.
   * The output format is compatible with other Durable Task SDKs.
   */
  private generateDeterministicGuid(namespace: string, name: string): string {
    // Parse namespace UUID string to bytes (big-endian/network order)
    const namespaceBytes = this.parseUuidToBytes(namespace);

    // Convert name to UTF-8 bytes
    const nameBytes = Buffer.from(name, "utf-8");

    // Compute SHA-1 hash of namespace + name
    const hash = createHash("sha1");
    hash.update(namespaceBytes);
    hash.update(nameBytes);
    const hashBytes = hash.digest();

    // Take first 16 bytes of hash
    const guidBytes = Buffer.alloc(16);
    hashBytes.copy(guidBytes, 0, 0, 16);

    // Set version to 5 (UUID v5)
    guidBytes[6] = (guidBytes[6] & 0x0f) | 0x50;

    // Set variant to RFC 4122
    guidBytes[8] = (guidBytes[8] & 0x3f) | 0x80;

    // Convert to GUID byte order for formatting
    this.swapGuidBytes(guidBytes);

    return this.formatGuidBytes(guidBytes);
  }

  /**
   * Swaps bytes to convert between UUID (big-endian) and GUID (mixed-endian) byte order.
   * GUIDs store the first 3 components (Data1, Data2, Data3) in little-endian format.
   */
  private swapGuidBytes(bytes: Buffer): void {
    [bytes[0], bytes[3]] = [bytes[3], bytes[0]];
    [bytes[1], bytes[2]] = [bytes[2], bytes[1]];
    [bytes[4], bytes[5]] = [bytes[5], bytes[4]];
    [bytes[6], bytes[7]] = [bytes[7], bytes[6]];
  }

  /**
   * Parses a UUID string to a byte buffer in big-endian (network) order.
   */
  private parseUuidToBytes(uuid: string): Buffer {
    const hex = uuid.replace(/-/g, "");
    return Buffer.from(hex, "hex");
  }

  /**
   * Formats a GUID byte buffer as a string in standard GUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
   */
  private formatGuidBytes(bytes: Buffer): string {
    const data1 = bytes.slice(0, 4).reverse().toString("hex");
    const data2 = bytes.slice(4, 6).reverse().toString("hex");
    const data3 = bytes.slice(6, 8).reverse().toString("hex");
    const data4 = bytes.slice(8, 10).toString("hex");
    const data5 = bytes.slice(10, 16).toString("hex");

    return `${data1}-${data2}-${data3}-${data4}-${data5}`;
  }
  /**
   * Creates a retry timer for a retryable task.
   * The timer will be associated with the retryable task so that when it fires,
   * the original task can be rescheduled.
   *
   * @param retryableTask - The retryable task to create a timer for
   * @param delayMs - The delay in milliseconds before the timer fires
   * @returns The timer task
   */
  createRetryTimer(retryableTask: RetryableTask<any>, delayMs: number): RetryTimerTask<any> {
    const timerId = this.nextSequenceNumber();
    const fireAt = new Date(this._currentUtcDatetime.getTime() + delayMs);
    const timerAction = ph.newCreateTimerAction(timerId, fireAt);
    this._pendingActions[timerAction.getId()] = timerAction;

    // Create a RetryTimerTask that holds a reference to the retryable task
    const retryTimerTask = new RetryTimerTask(retryableTask);
    this._pendingTasks[timerId] = retryTimerTask;

    return retryTimerTask;
  }

  /**
   * Creates the appropriate retry task or a plain CompletableTask based on the options.
   *
   * @param action - The orchestrator action
   * @param id - The sequence ID for task tracking
   * @param options - The task options (may contain retry configuration)
   * @param taskType - Whether this is an activity or sub-orchestration
   * @returns The created task
   */
  private createRetryTaskOrDefault<TOutput>(
    action: pb.OrchestratorAction,
    id: number,
    options: TaskOptions | SubOrchestrationOptions | undefined,
    taskType: RetryTaskType
  ): CompletableTask<TOutput> {
    if (options?.retry && isRetryPolicy(options.retry)) {
      const retryableTask = new RetryableTask<TOutput>(
        options.retry,
        action,
        this._currentUtcDatetime,
        taskType,
      );
      this._pendingTasks[id] = retryableTask;
      return retryableTask;
    }

    if (options?.retry && isAsyncRetryHandler(options.retry)) {
      const retryHandlerTask = new RetryHandlerTask<TOutput>(
        options.retry,
        action,
        this._currentUtcDatetime,
        taskType,
      );
      this._pendingTasks[id] = retryHandlerTask;
      return retryHandlerTask;
    }

    const task = new CompletableTask<TOutput>();
    this._pendingTasks[id] = task;
    return task;
  }

  /**
   * Reschedules a retry task for retry by creating a new action with a new ID.
   * This is called when a retry timer fires or a retry handler returns true.
   *
   * @param retryTask - The retry task to reschedule (RetryableTask or RetryHandlerTask)
   */
  rescheduleRetryTask(retryTask: RetryTaskBase<any>): void {
    const originalAction = retryTask.action;
    const newId = this.nextSequenceNumber();

    let newAction: pb.OrchestratorAction;

    if (retryTask.taskType === "activity") {
      // Reschedule an activity task
      const scheduleTask = originalAction.getScheduletask();
      if (!scheduleTask) {
        throw new Error("Expected ScheduleTaskAction on activity retry task");
      }
      const name = scheduleTask.getName();
      const input = scheduleTask.getInput()?.getValue();
      const tags = mapToRecord(scheduleTask.getTagsMap());
      newAction = ph.newScheduleTaskAction(newId, name, input, tags);
    } else {
      // Reschedule a sub-orchestration task
      const subOrch = originalAction.getCreatesuborchestration();
      if (!subOrch) {
        throw new Error("Expected CreateSubOrchestrationAction on sub-orchestration retry task");
      }
      const name = subOrch.getName();
      const instanceId = subOrch.getInstanceid();
      const input = subOrch.getInput()?.getValue();
      const tags = mapToRecord(subOrch.getTagsMap());
      newAction = ph.newCreateSubOrchestrationAction(newId, name, instanceId, input, tags);
    }

    // Register the new action
    this._pendingActions[newAction.getId()] = newAction;

    // Map the retry task to the new action ID
    this._pendingTasks[newId] = retryTask;
  }
}
