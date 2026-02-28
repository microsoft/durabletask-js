// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  getNewEventSummary,
  getNonDeterminismError,
  getWrongActionNameError,
  getWrongActionTypeError,
  isSuspendable,
} from ".";
import * as pb from "../proto/orchestrator_service_pb";
import { Logger, ConsoleLogger } from "../types/logger.type";
import { getName } from "../task";
import * as WorkerLogs from "./logs";
import { OrchestrationStateError } from "../task/exception/orchestration-state-error";
import { CompletableTask } from "../task/completable-task";
import { RetryableTask } from "../task/retryable-task";
import { RetryHandlerTask } from "../task/retry-handler-task";
import { RetryTimerTask } from "../task/retry-timer-task";
import { TOrchestrator } from "../types/orchestrator.type";
import { enumValueToKey } from "../utils/enum.util";
import { isEmpty, parseJsonField } from "../utils/pb-helper.util";
import type { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { OrchestratorNotRegisteredError } from "./exception/orchestrator-not-registered-error";
import { StopIterationError } from "./exception/stop-iteration-error";
import { Registry } from "./registry";
import { RuntimeOrchestrationContext } from "./runtime-orchestration-context";
import {
  EntityOperationFailedException,
  createTaskFailureDetails,
} from "../entities/entity-operation-failed-exception";

/**
 * Result of orchestration execution containing actions and optional custom status.
 */
export interface OrchestrationExecutionResult {
  actions: pb.OrchestratorAction[];
  customStatus?: string;
}

export class OrchestrationExecutor {
  private _generator?: TOrchestrator;
  private _registry: Registry;
  private _isSuspended: boolean;
  private _suspendedEvents: pb.HistoryEvent[];
  private _logger: Logger;
  private _orchestratorName: string;

  constructor(registry: Registry, logger?: Logger) {
    this._registry = registry;
    this._generator = undefined;
    this._isSuspended = false;
    this._suspendedEvents = [];
    this._logger = logger ?? new ConsoleLogger();
    this._orchestratorName = "(unknown)";
  }

  async execute(
    instanceId: string,
    oldEvents: pb.HistoryEvent[],
    newEvents: pb.HistoryEvent[],
  ): Promise<OrchestrationExecutionResult> {
    if (!newEvents?.length) {
      throw new OrchestrationStateError("The new history event list must have at least one event in it");
    }

    const ctx = new RuntimeOrchestrationContext(instanceId);

    try {
      // Rebuild the local state by replaying the history events into the orchestrator function
      WorkerLogs.orchestrationRebuilding(this._logger, instanceId, oldEvents.length);
      ctx._isReplaying = true;

      for (const oldEvent of oldEvents) {
        await this.processEvent(ctx, oldEvent);
      }

      // Get new actions by executing newly received events into the orchestrator function
      const summary = getNewEventSummary(newEvents);
      WorkerLogs.orchestrationProcessing(this._logger, instanceId, newEvents.length, summary);
      ctx._isReplaying = false;

      for (const newEvent of newEvents) {
        await this.processEvent(ctx, newEvent);
      }
    } catch (e: unknown) {
      ctx.setFailed(e instanceof Error ? e : new Error(String(e)));
    }

    if (!ctx._isComplete) {
      const taskCount = Object.keys(ctx._pendingTasks).length;
      const eventCount = Object.keys(ctx._pendingEvents).length;
      WorkerLogs.orchestrationWaiting(this._logger, instanceId, taskCount, eventCount);
    } else if (
      ctx._completionStatus &&
      ctx._completionStatus !== pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW
    ) {
      if (ctx._completionStatus === pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED) {
        WorkerLogs.orchestrationFailed(this._logger, instanceId, this._orchestratorName);
      } else if (ctx._completionStatus === pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED) {
        WorkerLogs.orchestrationTerminated(this._logger, instanceId);
      } else {
        WorkerLogs.orchestrationCompleted(this._logger, instanceId, this._orchestratorName);
      }
    }

    const actions = ctx.getActions();
    WorkerLogs.orchestrationReturningActions(this._logger, instanceId, actions.length);

    return {
      actions,
      customStatus: ctx.getCustomStatus(),
    };
  }

  private async processEvent(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    // Check if we are suspended to see if we need to buffer the event until we are resumed
    if (this._isSuspended && isSuspendable(event)) {
      WorkerLogs.orchestrationSuspendedBuffering(this._logger);
      this._suspendedEvents.push(event);
      return;
    }

    const eventType = event.getEventtypeCase();
    const eventTypeName = enumValueToKey(pb.HistoryEvent.EventtypeCase, eventType) ?? "Unknown";

    WorkerLogs.orchestrationProcessingEvent(this._logger, eventTypeName, event.getEventtypeCase());

    // Process the event type
    try {
      switch (eventType) {
        case pb.HistoryEvent.EventtypeCase.ORCHESTRATORSTARTED:
          await this.handleOrchestratorStarted(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.EXECUTIONSTARTED:
          await this.handleExecutionStarted(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.TIMERCREATED:
          await this.handleTimerCreated(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.TIMERFIRED:
          await this.handleTimerFired(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.TASKSCHEDULED:
          await this.handleTaskScheduled(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.TASKCOMPLETED:
          await this.handleTaskCompleted(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.TASKFAILED:
          await this.handleTaskFailed(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.SUBORCHESTRATIONINSTANCECREATED:
          await this.handleSubOrchestrationCreated(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.SUBORCHESTRATIONINSTANCECOMPLETED:
          await this.handleSubOrchestrationCompleted(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.SUBORCHESTRATIONINSTANCEFAILED:
          await this.handleSubOrchestrationFailed(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.EVENTRAISED:
          await this.handleEventRaised(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.EXECUTIONSUSPENDED:
          await this.handleExecutionSuspended(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.EXECUTIONRESUMED:
          await this.handleExecutionResumed(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.EXECUTIONTERMINATED:
          await this.handleExecutionTerminated(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONCALLED:
          await this.handleEntityOperationCalled(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONSIGNALED:
          await this.handleEntityOperationSignaled(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.ENTITYLOCKREQUESTED:
          await this.handleEntityLockRequested(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONCOMPLETED:
          await this.handleEntityOperationCompleted(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONFAILED:
          await this.handleEntityOperationFailed(ctx, event);
          break;
        case pb.HistoryEvent.EventtypeCase.ENTITYLOCKGRANTED:
          await this.handleEntityLockGranted(ctx, event);
          break;
        default:
          WorkerLogs.orchestrationUnknownEvent(this._logger, eventTypeName, eventType);
      }
    } catch (e: unknown) {
      // StopIteration is thrown when the generator is finished and didn't return a task as its next action
      if (e instanceof StopIterationError) {
        ctx.setComplete(e.value, pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
        return;
      }

      // For the rest we don't do anything
      // Else we throw it upwards
      WorkerLogs.orchestrationEventError(this._logger, eventTypeName, e);
      throw e;
    }
  }

  private async handleOrchestratorStarted(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    ctx._currentUtcDatetime = event.getTimestamp()?.toDate() ?? ctx._currentUtcDatetime;
  }

  private async handleExecutionStarted(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    // TODO: Check if we already started the orchestration
    const executionStartedEvent = event.getExecutionstarted();
    const fn = this._registry.getOrchestrator(
      executionStartedEvent ? executionStartedEvent.getName() : undefined,
    );

    if (!fn) {
      throw new OrchestratorNotRegisteredError(executionStartedEvent?.getName());
    }

    // Set the execution ID from the orchestration instance
    const executionId = executionStartedEvent?.getOrchestrationinstance()?.getExecutionid()?.getValue();
    if (executionId) {
      ctx._executionId = executionId;
    }

    // Track the orchestrator name for lifecycle logs
    this._orchestratorName = executionStartedEvent?.getName() ?? "(unknown)";

    // Log orchestration start (EventId 600)
    WorkerLogs.orchestrationStarted(this._logger, ctx._instanceId, this._orchestratorName);

    // Set the version from the execution started event
    ctx._version = executionStartedEvent?.getVersion()?.getValue() ?? "";

    // Extract parent instance info if this is a sub-orchestration
    const parentInstance = executionStartedEvent?.getParentinstance();
    if (parentInstance) {
      const parentOrchestrationInstance = parentInstance.getOrchestrationinstance();
      ctx._parent = {
        name: parentInstance.getName()?.getValue() ?? "",
        instanceId: parentOrchestrationInstance?.getInstanceid() ?? "",
        taskScheduledId: parentInstance.getTaskscheduledid(),
      };
    }

    // Deserialize the input, if any
    const inputField = executionStartedEvent?.getInput();
    const input = isEmpty(inputField) ? undefined : parseJsonField(inputField);

    // This does not execute the generator, it creates it
    // since we create an async iterator, we await the creation (so we can use await in the generator itself beside yield)
    const result = await fn(ctx, input);

    const isAsyncGenerator = typeof result?.[Symbol.asyncIterator] === "function";
    if (isAsyncGenerator) {
      // Start the orchestrator's generator function
      await ctx.run(result);
    } else {
      const resultType = Object.prototype.toString.call(result);
      WorkerLogs.orchestrationNoTasks(this._logger, resultType);

      // This is an orchestrator that doesn't schedule any tasks
      ctx.setComplete(result, pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    }
  }

  private async handleTimerCreated(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    // This history event confirms that the timer was successfully scheduled. Remove the timerCreated event from the pending action list so we don't schedule it again.
    const timerId = event.getEventid();
    const action = ctx._pendingActions[timerId];

    // Delete it
    delete ctx._pendingActions[timerId];

    const isTimerAction = action?.getCreatetimer();

    if (!action) {
      throw getNonDeterminismError(timerId, getName(ctx.createTimer));
    } else if (!isTimerAction) {
      const expectedMethodName = getName(ctx.createTimer);
      throw getWrongActionTypeError(timerId, expectedMethodName, action);
    }
  }

  private async handleTimerFired(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    const timerFiredEvent = event.getTimerfired();
    const timerId = timerFiredEvent ? timerFiredEvent.getTimerid() : undefined;

    if (timerId === undefined) {
      if (!ctx._isReplaying) {
        WorkerLogs.orchestrationUnexpectedEvent(this._logger, ctx._instanceId, "timerFired");
      }
      return;
    }

    const timerTask = ctx._pendingTasks[timerId];
    delete ctx._pendingTasks[timerId];

    if (!timerTask) {
      // TODO: Should this be an error? When would it ever happen?
      if (!ctx._isReplaying) {
        WorkerLogs.orchestrationUnexpectedEvent(this._logger, ctx._instanceId, "timerFired", timerId);
      }
      return;
    }

    // Check if this is a retry timer
    if (timerTask instanceof RetryTimerTask) {
      // Get the parent retry task and reschedule it
      const retryTask = timerTask.retryableParent;
      // Reschedule the original action - this will add it back to pendingActions
      ctx.rescheduleRetryTask(retryTask);
      // Don't resume the orchestrator - we're just rescheduling the task
      return;
    }

    timerTask.complete(undefined);
    await ctx.resume();
  }

  private async handleTaskScheduled(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    // This history event confirms that the activity execution was successfully scheduled. Remove the taskscheduled event from the pending action list so we don't schedule it again.
    const taskId = event.getEventid();
    const action = ctx._pendingActions[taskId];
    delete ctx._pendingActions[taskId];

    const isScheduleTaskAction = action?.hasScheduletask();

    if (!action) {
      throw getNonDeterminismError(taskId, getName(ctx.callActivity));
    } else if (!isScheduleTaskAction) {
      const expectedMethodName = getName(ctx.callActivity);
      throw getWrongActionTypeError(taskId, expectedMethodName, action);
    } else if (action.getScheduletask()?.getName() != event.getTaskscheduled()?.getName()) {
      throw getWrongActionNameError(
        taskId,
        getName(ctx.callActivity),
        event.getTaskscheduled()?.getName(),
        action.getScheduletask()?.getName(),
      );
    }
  }

  private async handleTaskCompleted(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    const taskCompletedEvent = event.getTaskcompleted();
    const taskId = taskCompletedEvent ? taskCompletedEvent.getTaskscheduledid() : undefined;
    const result = taskCompletedEvent?.getResult();
    const normalizedResult = isEmpty(result) ? undefined : result;
    await this.handleCompletedTask(ctx, taskId, normalizedResult, "taskCompleted");
  }

  private async handleTaskFailed(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    const taskFailedEvent = event.getTaskfailed();
    const taskId = taskFailedEvent ? taskFailedEvent.getTaskscheduledid() : undefined;
    const failureDetails = taskFailedEvent?.getFailuredetails();
    await this.handleFailedTask(ctx, taskId, failureDetails, "taskFailed", "Activity task");
  }

  private async handleSubOrchestrationCreated(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    // This history event confirms that the sub-orchestration execution was successfully scheduled. Remove the subOrchestrationInstanceCreated event from the pending action list so we don't schedule it again.
    const taskId = event.getEventid();
    const action = ctx._pendingActions[taskId];
    delete ctx._pendingActions[taskId];

    const isCreateSubOrchestrationAction = action?.hasCreatesuborchestration();

    if (!action) {
      throw getNonDeterminismError(taskId, getName(ctx.callSubOrchestrator));
    } else if (!isCreateSubOrchestrationAction) {
      const expectedMethodName = getName(ctx.callSubOrchestrator);
      throw getWrongActionTypeError(taskId, expectedMethodName, action);
    } else if (
      action.getCreatesuborchestration()?.getName() != event.getSuborchestrationinstancecreated()?.getName()
    ) {
      throw getWrongActionNameError(
        taskId,
        getName(ctx.callSubOrchestrator),
        event.getSuborchestrationinstancecreated()?.getName(),
        action.getCreatesuborchestration()?.getName(),
      );
    }
  }

  private async handleSubOrchestrationCompleted(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    const subOrchestrationInstanceCompletedEvent = event.getSuborchestrationinstancecompleted();
    const taskId = subOrchestrationInstanceCompletedEvent
      ? subOrchestrationInstanceCompletedEvent.getTaskscheduledid()
      : undefined;

    let subOrchTask;

    if (taskId) {
      subOrchTask = ctx._pendingTasks[taskId];
      delete ctx._pendingTasks[taskId];
    }

    const result = parseJsonField(subOrchestrationInstanceCompletedEvent?.getResult());

    if (subOrchTask) {
      subOrchTask.complete(result);
    }

    await ctx.resume();
  }

  private async handleSubOrchestrationFailed(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    const subOrchestrationInstanceFailedEvent = event.getSuborchestrationinstancefailed();
    const taskId = subOrchestrationInstanceFailedEvent
      ? subOrchestrationInstanceFailedEvent.getTaskscheduledid()
      : undefined;
    const failureDetails = subOrchestrationInstanceFailedEvent?.getFailuredetails();
    await this.handleFailedTask(ctx, taskId, failureDetails, "subOrchestrationInstanceFailed", "Sub-orchestration task");
  }

  private async handleEventRaised(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    // Event names are case-insensitive
    const eventName = event.getEventraised()?.getName()?.toLowerCase();

    if (!ctx._isReplaying) {
      WorkerLogs.orchestrationEventRaised(this._logger, ctx._instanceId, eventName!);
    }

    let taskList;

    if (eventName) {
      taskList = ctx._pendingEvents[eventName];
    }

    let decodedResult;

    if (taskList) {
      const eventTask = taskList.shift();

      decodedResult = parseJsonField(event.getEventraised()?.getInput());

      if (eventTask) {
        eventTask.complete(decodedResult);
      }

      if ((taskList?.length ?? 0) === 0 && eventName) {
        delete ctx._pendingEvents[eventName];
      }

      await ctx.resume();
    } else {
      // Buffer the event
      let eventList: any[] | undefined = [];

      if (eventName) {
        eventList = ctx._receivedEvents[eventName];

        if (!eventList?.length) {
          eventList = [];
          ctx._receivedEvents[eventName] = eventList;
        }
      }

      decodedResult = parseJsonField(event.getEventraised()?.getInput());

      eventList?.push(decodedResult);

      if (!ctx._isReplaying) {
        WorkerLogs.orchestrationEventBuffered(this._logger, ctx._instanceId, eventName!);
      }
    }
  }

  private async handleExecutionSuspended(ctx: RuntimeOrchestrationContext, _event: pb.HistoryEvent): Promise<void> {
    if (!this._isSuspended && !ctx._isReplaying) {
      WorkerLogs.orchestrationSuspended(this._logger, ctx._instanceId);
    }

    this._isSuspended = true;
  }

  private async handleExecutionResumed(ctx: RuntimeOrchestrationContext, _event: pb.HistoryEvent): Promise<void> {
    if (!this._isSuspended) {
      return;
    }

    this._isSuspended = false;

    for (const e of this._suspendedEvents) {
      await this.processEvent(ctx, e);
    }

    this._suspendedEvents = [];
  }

  private async handleExecutionTerminated(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    if (!ctx._isReplaying) {
      WorkerLogs.orchestrationTerminated(this._logger, ctx._instanceId);
    }

    let encodedOutput;

    if (!isEmpty(event.getExecutionterminated()?.getInput())) {
      encodedOutput = event.getExecutionterminated()?.getInput()?.getValue();
    }

    ctx.setComplete(encodedOutput, pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED, true);
  }

  private async handleEntityOperationCalled(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    this.validateEntityAction(
      ctx,
      event,
      "callEntity",
      (msg) => msg.hasEntityoperationcalled(),
      "callEntity (EntityOperationCalled)",
    );
  }

  private async handleEntityOperationSignaled(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    this.validateEntityAction(
      ctx,
      event,
      "signalEntity",
      (msg) => msg.hasEntityoperationsignaled(),
      "signalEntity (EntityOperationSignaled)",
    );
  }

  private async handleEntityLockRequested(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    this.validateEntityAction(
      ctx,
      event,
      "lockEntities",
      (msg) => msg.hasEntitylockrequested(),
      "lockEntities (EntityLockRequested)",
    );
  }

  private async handleEntityOperationCompleted(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    const completedEvent = event.getEntityoperationcompleted();
    const requestId = completedEvent?.getRequestid();

    if (!requestId) {
      WorkerLogs.entityEventIgnored(
        this._logger,
        ctx._instanceId,
        "EntityOperationCompletedEvent",
        "no requestId",
      );
      return;
    }

    // Find the pending entity call by requestId
    const pendingCall = ctx._entityFeature.pendingEntityCalls.get(requestId);
    if (!pendingCall) {
      // This could happen during replay or if the call was already processed
      if (!ctx._isReplaying) {
        WorkerLogs.entityEventIgnored(
          this._logger,
          ctx._instanceId,
          "EntityOperationCompletedEvent",
          `unexpected requestId = ${requestId}`,
        );
      }
      return;
    }

    // Remove from pending calls
    ctx._entityFeature.pendingEntityCalls.delete(requestId);

    // If in a critical section, recover the lock for this entity
    ctx._entityFeature.recoverLockAfterCall(pendingCall.entityId);

    // Parse the result and complete the task
    const result = parseJsonField(completedEvent?.getOutput());

    pendingCall.task.complete(result);
    await ctx.resume();
  }

  private async handleEntityOperationFailed(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    const failedEvent = event.getEntityoperationfailed();
    const requestId = failedEvent?.getRequestid();

    if (!requestId) {
      WorkerLogs.entityEventIgnored(
        this._logger,
        ctx._instanceId,
        "EntityOperationFailedEvent",
        "no requestId",
      );
      return;
    }

    // Find the pending entity call by requestId
    const pendingCall = ctx._entityFeature.pendingEntityCalls.get(requestId);
    if (!pendingCall) {
      // This could happen during replay or if the call was already processed
      if (!ctx._isReplaying) {
        WorkerLogs.entityEventIgnored(
          this._logger,
          ctx._instanceId,
          "EntityOperationFailedEvent",
          `unexpected requestId = ${requestId}`,
        );
      }
      return;
    }

    // Remove from pending calls
    ctx._entityFeature.pendingEntityCalls.delete(requestId);

    // If in a critical section, recover the lock for this entity
    ctx._entityFeature.recoverLockAfterCall(pendingCall.entityId);

    // Convert failure details and throw EntityOperationFailedException
    const failureDetails = createTaskFailureDetails(failedEvent?.getFailuredetails());
    if (!failureDetails) {
      pendingCall.task.fail(
        `Entity operation '${pendingCall.operationName}' failed with unknown error`,
      );
    } else {
      const exception = new EntityOperationFailedException(
        pendingCall.entityId,
        pendingCall.operationName,
        failureDetails,
      );
      pendingCall.task.fail(exception.message, failedEvent?.getFailuredetails());
    }

    await ctx.resume();
  }

  private async handleEntityLockGranted(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    const lockGrantedEvent = event.getEntitylockgranted();
    const criticalSectionId = lockGrantedEvent?.getCriticalsectionid();

    if (!criticalSectionId) {
      WorkerLogs.entityEventIgnored(
        this._logger,
        ctx._instanceId,
        "EntityLockGrantedEvent",
        "no criticalSectionId",
      );
      return;
    }

    // Find the pending lock request by criticalSectionId
    const pendingRequest = ctx._entityFeature.pendingLockRequests.get(criticalSectionId);
    if (!pendingRequest) {
      // This could happen during replay or if the lock was already acquired
      if (!ctx._isReplaying) {
        WorkerLogs.entityEventIgnored(
          this._logger,
          ctx._instanceId,
          "EntityLockGrantedEvent",
          `unexpected criticalSectionId = ${criticalSectionId}`,
        );
      }
      return;
    }

    // Complete the lock acquisition
    ctx._entityFeature.completeLockAcquisition(criticalSectionId);
    await ctx.resume();
  }

  private validateEntityAction(
    ctx: RuntimeOrchestrationContext,
    event: pb.HistoryEvent,
    operationName: string,
    hasEventCheck: (msg: pb.SendEntityMessageAction) => boolean,
    detailedName: string,
  ): void {
    const eventId = event.getEventid();
    const action = ctx._pendingActions[eventId];
    delete ctx._pendingActions[eventId];

    const isSendEntityMessageAction = action?.hasSendentitymessage();

    if (!action) {
      throw getNonDeterminismError(eventId, operationName);
    } else if (!isSendEntityMessageAction) {
      throw getWrongActionTypeError(eventId, operationName, action);
    } else if (!hasEventCheck(action.getSendentitymessage()!)) {
      throw getWrongActionTypeError(eventId, detailedName, action);
    }
  }

  private async handleCompletedTask(
    ctx: RuntimeOrchestrationContext,
    taskId: number | undefined,
    result: StringValue | undefined,
    eventName: string,
  ): Promise<void> {
    let task;

    if (taskId) {
      task = ctx._pendingTasks[taskId];
      delete ctx._pendingTasks[taskId];
    }

    if (!task) {
      // TODO: Should this be an error? When would it ever happen?
      if (!ctx._isReplaying) {
        WorkerLogs.orchestrationUnexpectedEvent(this._logger, ctx._instanceId, eventName, taskId);
      }

      return;
    }

    const parsedResult = parseJsonField(result);

    task.complete(parsedResult);
    await ctx.resume();
  }

  private async handleFailedTask(
    ctx: RuntimeOrchestrationContext,
    taskId: number | undefined,
    failureDetails: pb.TaskFailureDetails | undefined,
    eventName: string,
    taskLabel: string,
  ): Promise<void> {
    if (taskId === undefined) {
      if (!ctx._isReplaying) {
        WorkerLogs.orchestrationUnexpectedEvent(this._logger, ctx._instanceId, eventName);
      }
      return;
    }

    const errorMessage = failureDetails?.getErrormessage() || "Unknown error";

    // Get the task (don't delete yet - we might retry)
    const task = ctx._pendingTasks[taskId];

    if (!task) {
      if (!ctx._isReplaying) {
        WorkerLogs.orchestrationUnexpectedEvent(this._logger, ctx._instanceId, eventName, taskId);
      }
      return;
    }

    // Check if this task supports retry and handle it
    const retried = await this.tryHandleRetry(task, errorMessage, failureDetails, taskId, ctx);
    if (retried) {
      return;
    }

    // No retry - fail the task
    delete ctx._pendingTasks[taskId];

    task.fail(
      `${taskLabel} #${taskId} failed: ${errorMessage}`,
      failureDetails,
    );

    await ctx.resume();
  }


  /**
   * Checks if a failed task supports retry and handles the retry if applicable.
   * Supports both RetryableTask (policy-based with timer delay) and RetryHandlerTask
   * (handler-based: returns true for immediate reschedule, or a number for delayed retry via timer).
   *
   * @param task - The task that failed
   * @param errorMessage - The failure error message
   * @param failureDetails - The protobuf failure details
   * @param taskId - The task's sequence ID in pendingTasks
   * @param ctx - The orchestration context
   * @returns true if the task was retried, false otherwise
   */
  private async tryHandleRetry(
    task: CompletableTask<any>,
    errorMessage: string,
    failureDetails: pb.TaskFailureDetails | undefined,
    taskId: number,
    ctx: RuntimeOrchestrationContext,
  ): Promise<boolean> {
    if (task instanceof RetryableTask) {
      task.recordFailure(errorMessage, failureDetails);
      const nextDelayMs = task.computeNextDelayInMilliseconds(ctx._currentUtcDatetime);

      if (nextDelayMs !== undefined) {
        WorkerLogs.retryingTask(this._logger, ctx._instanceId, task.taskName, task.attemptCount);
        task.incrementAttemptCount();
        ctx.createRetryTimer(task, nextDelayMs);
        delete ctx._pendingTasks[taskId];
        return true;
      }
    } else if (task instanceof RetryHandlerTask) {
      task.recordFailure(errorMessage, failureDetails);
      const retryResult = await task.shouldRetry(ctx._currentUtcDatetime);

      if (retryResult !== false) {
        WorkerLogs.retryingTask(this._logger, ctx._instanceId, task.taskName, task.attemptCount);
        task.incrementAttemptCount();

        if (typeof retryResult === "number") {
          if (retryResult <= 0) {
            // Handler returned true — retry immediately
            ctx.rescheduleRetryTask(task);
          } else {
            // Handler returned a delay in milliseconds — use a timer
            ctx.createRetryTimer(task, retryResult);
          }
        } else {
          // Handler returned true — retry immediately
          ctx.rescheduleRetryTask(task);
        }

        delete ctx._pendingTasks[taskId];
        return true;
      }
    }

    return false;
  }
}
