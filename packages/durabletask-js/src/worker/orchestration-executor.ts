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
import { OrchestrationStateError } from "../task/exception/orchestration-state-error";
import { RetryableTask } from "../task/retryable-task";
import { RetryTimerTask } from "../task/retry-timer-task";
import { TOrchestrator } from "../types/orchestrator.type";
import { enumValueToKey } from "../utils/enum.util";
import { getOrchestrationStatusStr, isEmpty } from "../utils/pb-helper.util";
import { OrchestratorNotRegisteredError } from "./exception/orchestrator-not-registered-error";
import { StopIterationError } from "./exception/stop-iteration-error";
import { Registry } from "./registry";
import { RuntimeOrchestrationContext } from "./runtime-orchestration-context";

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

  constructor(registry: Registry, logger?: Logger) {
    this._registry = registry;
    this._generator = undefined;
    this._isSuspended = false;
    this._suspendedEvents = [];
    this._logger = logger ?? new ConsoleLogger();
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
      this._logger.info(`${instanceId}: Rebuilding local state with ${oldEvents.length} history event...`);
      ctx._isReplaying = true;

      for (const oldEvent of oldEvents) {
        await this.processEvent(ctx, oldEvent);
      }

      // Get new actions by executing newly received events into the orchestrator function
      const summary = getNewEventSummary(newEvents);
      this._logger.info(`${instanceId}: Processing ${newEvents.length} new history event(s): ${summary}`);
      ctx._isReplaying = false;

      for (const newEvent of newEvents) {
        await this.processEvent(ctx, newEvent);
      }
    } catch (e: any) {
      ctx.setFailed(e);
    }

    if (!ctx._isComplete) {
      const taskCount = Object.keys(ctx._pendingTasks).length;
      const eventCount = Object.keys(ctx._pendingEvents).length;
      this._logger.info(`${instanceId}: Waiting for ${taskCount} task(s) and ${eventCount} event(s) to complete...`);
    } else if (
      ctx._completionStatus &&
      ctx._completionStatus !== pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW
    ) {
      const completionStatusStr = getOrchestrationStatusStr(ctx._completionStatus);
      this._logger.info(`${instanceId}: Orchestration completed with status ${completionStatusStr}`);
    }

    const actions = ctx.getActions();
    this._logger.info(`${instanceId}: Returning ${actions.length} action(s)`);

    return {
      actions,
      customStatus: ctx.getCustomStatus(),
    };
  }

  private async processEvent(ctx: RuntimeOrchestrationContext, event: pb.HistoryEvent): Promise<void> {
    // Check if we are suspended to see if we need to buffer the event until we are resumed
    if (this._isSuspended && isSuspendable(event)) {
      this._logger.info("Suspended, buffering event");
      this._suspendedEvents.push(event);
      return;
    }

    const eventType = event.getEventtypeCase();
    const eventTypeName = enumValueToKey(pb.HistoryEvent.EventtypeCase, eventType);

    this._logger.debug(`Processing event type ${eventTypeName} (${event.getEventtypeCase()})`);

    // Process the event type
    try {
      switch (eventType) {
        case pb.HistoryEvent.EventtypeCase.ORCHESTRATORSTARTED:
          ctx._currentUtcDatetime = event.getTimestamp()?.toDate() ?? ctx._currentUtcDatetime;
          break;
        case pb.HistoryEvent.EventtypeCase.EXECUTIONSTARTED:
          {
            // TODO: Check if we already started the orchestration
            const executionStartedEvent = event.getExecutionstarted();
            const fn = this._registry.getOrchestrator(
              executionStartedEvent ? executionStartedEvent.getName() : undefined,
            );

            if (!fn) {
              throw new OrchestratorNotRegisteredError(executionStartedEvent?.getName());
            }

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
            let input = undefined;

            if (executionStartedEvent?.getInput() && executionStartedEvent?.getInput()?.toString() !== "") {
              input = JSON.parse(executionStartedEvent.getInput()?.toString() || "{}");
            }

            // This does not execute the generator, it creates it
            // since we create an async iterator, we await the creation (so we can use await in the generator itself beside yield)
            const result = await fn(ctx, input);

            const isAsyncGenerator = typeof result?.[Symbol.asyncIterator] === "function";
            if (isAsyncGenerator) {
              // Start the orchestrator's generator function
              await ctx.run(result);
            } else {
              const resultType = Object.prototype.toString.call(result);
            this._logger.info(`An orchestrator was returned that doesn't schedule any tasks (type = ${resultType})`);

              // This is an orchestrator that doesn't schedule any tasks
              ctx.setComplete(result, pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
            }
          }
          break;
        case pb.HistoryEvent.EventtypeCase.TIMERCREATED:
          // This history event confirms that the timer was successfully scheduled. Remove the timerCreated event from the pending action list so we don't schedule it again.
          {
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
          break;
        case pb.HistoryEvent.EventtypeCase.TIMERFIRED:
          {
            const timerFiredEvent = event.getTimerfired();
            const timerId = timerFiredEvent ? timerFiredEvent.getTimerid() : undefined;

            if (timerId === undefined) {
              if (!ctx._isReplaying) {
                this._logger.warn(`${ctx._instanceId}: Ignoring timerFired event with undefined ID`);
              }
              return;
            }

            const timerTask = ctx._pendingTasks[timerId];
            delete ctx._pendingTasks[timerId];

            if (!timerTask) {
              // TODO: Should this be an error? When would it ever happen?
              if (!ctx._isReplaying) {
                this._logger.warn(`${ctx._instanceId}: Ignoring unexpected timerFired event with ID = ${timerId}`);
              }
              return;
            }

            // Check if this is a retry timer
            if (timerTask instanceof RetryTimerTask) {
              // Get the retryable parent task and reschedule it
              const retryableTask = timerTask.retryableParent;
              // Reschedule the original action - this will add it back to pendingActions
              ctx.rescheduleRetryableTask(retryableTask);
              // Don't resume the orchestrator - we're just rescheduling the task
              return;
            }

            timerTask.complete(undefined);
            await ctx.resume();
          }
          break;
        // This history event confirms that the activity execution was successfully scheduled. Remove the taskscheduled event from the pending action list so we don't schedule it again.
        case pb.HistoryEvent.EventtypeCase.TASKSCHEDULED:
          {
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

          break;
        // This history event contains the result of a completed activity task
        case pb.HistoryEvent.EventtypeCase.TASKCOMPLETED:
          {
            const taskCompletedEvent = event.getTaskcompleted();
            const taskId = taskCompletedEvent ? taskCompletedEvent.getTaskscheduledid() : undefined;

            let activityTask;

            if (taskId) {
              activityTask = ctx._pendingTasks[taskId];
              delete ctx._pendingTasks[taskId];
            }

            if (!activityTask) {
              // TODO: Should this be an error? When would it ever happen?
              if (!ctx._isReplaying) {
                this._logger.warn(`${ctx._instanceId}: Ignoring unexpected taskCompleted event with ID = ${taskId}`);
              }

              return;
            }

            let result;

            if (!isEmpty(event.getTaskcompleted()?.getResult())) {
              result = JSON.parse(event.getTaskcompleted()?.getResult()?.toString() || "");
            }

            activityTask.complete(result);
            await ctx.resume();
          }
          break;
        case pb.HistoryEvent.EventtypeCase.TASKFAILED:
          {
            const taskFailedEvent = event.getTaskfailed();
            const taskId = taskFailedEvent ? taskFailedEvent.getTaskscheduledid() : undefined;

            if (taskId === undefined) {
              if (!ctx._isReplaying) {
                this._logger.warn(`${ctx._instanceId}: Ignoring taskFailed event with undefined ID`);
              }
              return;
            }

            const failureDetails = event.getTaskfailed()?.getFailuredetails();
            const errorMessage = failureDetails?.getErrormessage() || "Unknown error";

            // Get the task (don't delete yet - we might retry)
            const activityTask = ctx._pendingTasks[taskId];

            if (!activityTask) {
              if (!ctx._isReplaying) {
                this._logger.warn(`${ctx._instanceId}: Ignoring unexpected taskFailed event with ID = ${taskId}`);
              }
              return;
            }

            // Check if this is a retryable task and if we should retry
            if (activityTask instanceof RetryableTask) {
              activityTask.recordFailure(errorMessage, failureDetails);
              const nextDelayMs = activityTask.computeNextDelayInMilliseconds(ctx._currentUtcDatetime);

              if (nextDelayMs !== undefined) {
                // Schedule a retry timer
                activityTask.incrementAttemptCount();
                ctx.createRetryTimer(activityTask, nextDelayMs);
                // Remove from pendingTasks - the task will be re-added with a new ID when rescheduled
                delete ctx._pendingTasks[taskId];
                return;
              }
            }

            // No retry - fail the task
            delete ctx._pendingTasks[taskId];

            activityTask.fail(
              `Activity task #${taskId} failed: ${errorMessage}`,
              failureDetails,
            );

            await ctx.resume();
          }
          break;
        // This history event confirms that the sub-orcehstration execution was successfully scheduled. Remove the subOrchestrationInstanceCreated event from the pending action list so we don't schedule it again.
        case pb.HistoryEvent.EventtypeCase.SUBORCHESTRATIONINSTANCECREATED:
          {
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
                action.getCreatesuborchestration()?.getName(),
                action.getCreatesuborchestration()?.getName(),
              );
            }
          }
          break;
        case pb.HistoryEvent.EventtypeCase.SUBORCHESTRATIONINSTANCECOMPLETED:
          {
            const subOrchestrationInstanceCompletedEvent = event.getSuborchestrationinstancecompleted();
            const taskId = subOrchestrationInstanceCompletedEvent
              ? subOrchestrationInstanceCompletedEvent.getTaskscheduledid()
              : undefined;

            let subOrchTask;

            if (taskId) {
              subOrchTask = ctx._pendingTasks[taskId];
              delete ctx._pendingTasks[taskId];
            }

            let result;

            if (!isEmpty(event.getSuborchestrationinstancecompleted()?.getResult())) {
              result = JSON.parse(event.getSuborchestrationinstancecompleted()?.getResult()?.toString() || "");
            }

            if (subOrchTask) {
              subOrchTask.complete(result);
            }

            await ctx.resume();
          }
          break;
        case pb.HistoryEvent.EventtypeCase.SUBORCHESTRATIONINSTANCEFAILED:
          {
            const subOrchestrationInstanceFailedEvent = event.getSuborchestrationinstancefailed();
            const taskId = subOrchestrationInstanceFailedEvent
              ? subOrchestrationInstanceFailedEvent.getTaskscheduledid()
              : undefined;

            if (taskId === undefined) {
              if (!ctx._isReplaying) {
                this._logger.warn(`${ctx._instanceId}: Ignoring subOrchestrationInstanceFailed event with undefined ID`);
              }
              return;
            }

            const failureDetails = event.getSuborchestrationinstancefailed()?.getFailuredetails();
            const errorMessage = failureDetails?.getErrormessage() || "Unknown error";

            // Get the task (don't delete yet - we might retry)
            const subOrchTask = ctx._pendingTasks[taskId];

            if (!subOrchTask) {
              if (!ctx._isReplaying) {
                this._logger.warn(
                  `${ctx._instanceId}: Ignoring unexpected subOrchestrationInstanceFailed event with ID = ${taskId}`,
                );
              }
              return;
            }

            // Check if this is a retryable task and if we should retry
            if (subOrchTask instanceof RetryableTask) {
              subOrchTask.recordFailure(errorMessage, failureDetails);
              const nextDelayMs = subOrchTask.computeNextDelayInMilliseconds(ctx._currentUtcDatetime);

              if (nextDelayMs !== undefined) {
                // Schedule a retry timer
                subOrchTask.incrementAttemptCount();
                ctx.createRetryTimer(subOrchTask, nextDelayMs);
                // Remove from pendingTasks - the task will be re-added with a new ID when rescheduled
                delete ctx._pendingTasks[taskId];
                return;
              }
            }

            // No retry - fail the task
            delete ctx._pendingTasks[taskId];

            subOrchTask.fail(
              `Sub-orchestration task #${taskId} failed: ${errorMessage}`,
              failureDetails,
            );

            await ctx.resume();
          }
          break;
        case pb.HistoryEvent.EventtypeCase.EVENTRAISED:
          {
            // Event names are case-insensitive
            const eventName = event.getEventraised()?.getName()?.toLowerCase();

            if (!ctx._isReplaying) {
              this._logger.info(`${ctx._instanceId}: Event raised: ${eventName}`);
            }

            let taskList;

            if (eventName) {
              taskList = ctx._pendingEvents[eventName];
            }

            let decodedResult;

            if (taskList) {
              const eventTask = taskList.shift();

              if (!isEmpty(event.getEventraised()?.getInput())) {
                decodedResult = JSON.parse(event.getEventraised()?.getInput()?.toString() || "");
              }

              if (eventTask) {
                eventTask.complete(decodedResult);
              }

              if (!taskList && eventName) {
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

              if (!isEmpty(event.getEventraised()?.getInput())) {
                decodedResult = JSON.parse(event.getEventraised()?.getInput()?.toString() || "");
              }

              eventList?.push(decodedResult);

              if (!ctx._isReplaying) {
                this._logger.info(
                  `${ctx._instanceId}: Event ${eventName} has been buffered as there are no tasks waiting for it.`,
                );
              }
            }
          }
          break;
        case pb.HistoryEvent.EventtypeCase.EXECUTIONSUSPENDED:
          {
            if (!this._isSuspended && !ctx._isReplaying) {
              this._logger.info(`${ctx._instanceId}: Execution suspended`);
            }

            this._isSuspended = true;
          }
          break;
        case pb.HistoryEvent.EventtypeCase.EXECUTIONRESUMED:
          if (!this._isSuspended) {
            return;
          }

          this._isSuspended = false;

          for (const e of this._suspendedEvents) {
            await this.processEvent(ctx, e);
          }

          this._suspendedEvents = [];
          break;
        case pb.HistoryEvent.EventtypeCase.EXECUTIONTERMINATED: {
          if (!ctx._isReplaying) {
            this._logger.info(`${ctx._instanceId}: Execution terminated`);
          }

          let encodedOutput;

          if (!isEmpty(event.getExecutionterminated()?.getInput())) {
            encodedOutput = event.getExecutionterminated()?.getInput()?.getValue();
          }

          ctx.setComplete(encodedOutput, pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED, true);
          break;
        }
        default:
          this._logger.info(`Unknown history event type: ${eventTypeName} (value: ${eventType}), skipping...`);
        // throw new OrchestrationStateError(`Unknown history event type: ${eventTypeName} (value: ${eventType})`);
      }
    } catch (e: any) {
      // StopIteration is thrown when the generator is finished and didn't return a task as its next action
      if (e instanceof StopIterationError) {
        ctx.setComplete(e.value, pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
        return;
      }

      // For the rest we don't do anything
      // Else we throw it upwards
      this._logger.error(`Could not process the event ${eventTypeName} due to error ${e}`);
      throw e;
    }
  }
}
