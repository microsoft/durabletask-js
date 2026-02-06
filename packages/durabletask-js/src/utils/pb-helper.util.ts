// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import * as pb from "../proto/orchestrator_service_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";

export function newOrchestratorStartedEvent(timestamp?: Date | null): pb.HistoryEvent {
  const ts = new Timestamp();

  if (timestamp) {
    ts.fromDate(timestamp);
  }

  const orchestratorStartEvent = new pb.OrchestratorStartedEvent();

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setOrchestratorstarted(orchestratorStartEvent);

  return event;
}

export function newExecutionStartedEvent(name: string, instanceId: string, encodedInput?: string, parentInstance?: { name: string; instanceId: string; taskScheduledId: number }): pb.HistoryEvent {
  const ts = new Timestamp();

  const orchestrationInstance = new pb.OrchestrationInstance();
  orchestrationInstance.setInstanceid(instanceId);

  const executionStartedEvent = new pb.ExecutionStartedEvent();
  executionStartedEvent.setName(name);
  executionStartedEvent.setInput(getStringValue(encodedInput));
  executionStartedEvent.setOrchestrationinstance(orchestrationInstance);

  // Set parent instance info if provided (for sub-orchestrations)
  if (parentInstance) {
    const parentOrchestrationInstance = new pb.OrchestrationInstance();
    parentOrchestrationInstance.setInstanceid(parentInstance.instanceId);

    const parentInstanceInfo = new pb.ParentInstanceInfo();
    parentInstanceInfo.setName(getStringValue(parentInstance.name));
    parentInstanceInfo.setOrchestrationinstance(parentOrchestrationInstance);
    parentInstanceInfo.setTaskscheduledid(parentInstance.taskScheduledId);

    executionStartedEvent.setParentinstance(parentInstanceInfo);
  }

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setExecutionstarted(executionStartedEvent);

  return event;
}

export function newTimerCreatedEvent(timerId: number, fireAt: Date): pb.HistoryEvent {
  const ts = new Timestamp();
  ts.fromDate(fireAt);

  const timerCreatedEvent = new pb.TimerCreatedEvent();
  timerCreatedEvent.setFireat(ts);

  const event = new pb.HistoryEvent();
  event.setEventid(timerId);
  event.setTimestamp(ts);
  event.setTimercreated(timerCreatedEvent);

  return event;
}

export function newTimerFiredEvent(timerId: number, fireAt: Date): pb.HistoryEvent {
  const ts = new Timestamp();
  ts.fromDate(fireAt);

  const timerFiredEvent = new pb.TimerFiredEvent();
  timerFiredEvent.setTimerid(timerId);
  timerFiredEvent.setFireat(ts);

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setTimerfired(timerFiredEvent);

  return event;
}

export function newTaskScheduledEvent(eventId: number, name: string, encodedInput?: string): pb.HistoryEvent {
  const ts = new Timestamp();

  const taskScheduledEvent = new pb.TaskScheduledEvent();
  taskScheduledEvent.setName(name);
  taskScheduledEvent.setInput(getStringValue(encodedInput));

  const event = new pb.HistoryEvent();
  event.setEventid(eventId);
  event.setTimestamp(ts);
  event.setTaskscheduled(taskScheduledEvent);

  return event;
}

export function newTaskCompletedEvent(eventId: number, encodedOutput?: string): pb.HistoryEvent {
  const ts = new Timestamp();

  const taskCompletedEvent = new pb.TaskCompletedEvent();
  taskCompletedEvent.setResult(getStringValue(encodedOutput));
  taskCompletedEvent.setTaskscheduledid(eventId);

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setTaskcompleted(taskCompletedEvent);

  return event;
}

export function newTaskFailedEvent(eventId: number, ex: Error): pb.HistoryEvent {
  const ts = new Timestamp();

  const taskFailedEvent = new pb.TaskFailedEvent();
  taskFailedEvent.setFailuredetails(newFailureDetails(ex));
  taskFailedEvent.setTaskscheduledid(eventId);

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setTaskfailed(taskFailedEvent);

  return event;
}

export function newSubOrchestrationCreatedEvent(
  eventId: number,
  name: string,
  instanceId: string,
  encodedInput?: string,
): pb.HistoryEvent {
  const ts = new Timestamp();

  const subOrchestrationInstanceCreatedEvent = new pb.SubOrchestrationInstanceCreatedEvent();
  subOrchestrationInstanceCreatedEvent.setName(name);
  subOrchestrationInstanceCreatedEvent.setInput(getStringValue(encodedInput));
  subOrchestrationInstanceCreatedEvent.setInstanceid(instanceId);

  const event = new pb.HistoryEvent();
  event.setEventid(eventId);
  event.setTimestamp(ts);
  event.setSuborchestrationinstancecreated(subOrchestrationInstanceCreatedEvent);

  return event;
}

export function newSubOrchestrationCompletedEvent(eventId: number, encodedOutput?: string): pb.HistoryEvent {
  const ts = new Timestamp();

  const subOrchestrationInstanceCompletedEvent = new pb.SubOrchestrationInstanceCompletedEvent();
  subOrchestrationInstanceCompletedEvent.setResult(getStringValue(encodedOutput));
  subOrchestrationInstanceCompletedEvent.setTaskscheduledid(eventId);

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setSuborchestrationinstancecompleted(subOrchestrationInstanceCompletedEvent);

  return event;
}

export function newSubOrchestrationFailedEvent(eventId: number, ex: Error): pb.HistoryEvent {
  const ts = new Timestamp();

  const subOrchestrationInstanceFailedEvent = new pb.SubOrchestrationInstanceFailedEvent();
  subOrchestrationInstanceFailedEvent.setFailuredetails(newFailureDetails(ex));
  subOrchestrationInstanceFailedEvent.setTaskscheduledid(eventId);

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setSuborchestrationinstancefailed(subOrchestrationInstanceFailedEvent);

  return event;
}

export function newFailureDetails(e: unknown): pb.TaskFailureDetails {
  const failure = new pb.TaskFailureDetails();

  if (e instanceof Error) {
    failure.setErrortype(e.constructor.name);
    failure.setErrormessage(e.message);

    const stringValueStackTrace = new StringValue();
    stringValueStackTrace.setValue(e.stack ?? "");
    failure.setStacktrace(stringValueStackTrace);
  } else {
    failure.setErrortype("UnknownError");
    failure.setErrormessage(String(e));

    let stack = "";
    if (typeof e === "object" && e !== null && "stack" in e) {
      const possibleStack = (e as { stack?: unknown }).stack;
      stack = possibleStack != null ? String(possibleStack) : "";
    }

    const stringValueStackTrace = new StringValue();
    stringValueStackTrace.setValue(stack);
    failure.setStacktrace(stringValueStackTrace);
  }

  return failure;
}

/**
 * Creates a TaskFailureDetails for version mismatch errors.
 * These errors are non-retriable as the version mismatch is deterministic.
 *
 * @param errorType The type of version error (e.g., "VersionMismatch", "VersionError")
 * @param errorMessage The error message describing the version mismatch
 * @returns A TaskFailureDetails with IsNonRetriable set to true
 */
export function newVersionMismatchFailureDetails(errorType: string, errorMessage: string): pb.TaskFailureDetails {
  const failure = new pb.TaskFailureDetails();
  failure.setErrortype(errorType);
  failure.setErrormessage(errorMessage);
  failure.setIsnonretriable(true);
  return failure;
}

export function newEventRaisedEvent(name: string, encodedInput?: string): pb.HistoryEvent {
  const ts = new Timestamp();

  const eventRaised = new pb.EventRaisedEvent();
  eventRaised.setName(name);
  eventRaised.setInput(getStringValue(encodedInput));

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setEventraised(eventRaised);

  return event;
}

export function newSuspendEvent(): pb.HistoryEvent {
  const ts = new Timestamp();

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setExecutionsuspended(new pb.ExecutionSuspendedEvent());

  return event;
}

export function newResumeEvent(): pb.HistoryEvent {
  const ts = new Timestamp();

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setExecutionresumed(new pb.ExecutionResumedEvent());

  return event;
}

export function newTerminatedEvent(encodedOutput?: string): pb.HistoryEvent {
  const executionTerminatedEvent = new pb.ExecutionTerminatedEvent();
  executionTerminatedEvent.setInput(getStringValue(encodedOutput));

  const ts = new Timestamp();

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setExecutionterminated(executionTerminatedEvent);

  return event;
}

export function getStringValue(val?: string): StringValue | undefined {
  if (!val) {
    return;
  }

  const stringValue = new StringValue();
  stringValue.setValue(val);

  return stringValue;
}

/**
 * Populates a tag map with the provided tags.
 *
 * Copies all key-value pairs from the optional {@link tags} object into the given
 * {@link tagsMap} by invoking its `set` method for each entry. If no tags are
 * provided, this function is a no-op.
 *
 * @param tagsMap - A map-like object that exposes a `set(key, value)` method used
 *   to store tag key-value pairs.
 * @param tags - An optional record of tag key-value pairs to add to the map.
 */
export function populateTagsMap(
  tagsMap: { set: (key: string, value: string) => void },
  tags?: Record<string, string>,
): void {
  if (!tags) {
    return;
  }

  for (const [key, value] of Object.entries(tags)) {
    tagsMap.set(key, value);
  }
}

export function newCompleteOrchestrationAction(
  id: number,
  status: pb.OrchestrationStatus,
  result?: string,
  failureDetails?: pb.TaskFailureDetails,
  carryoverEvents?: pb.HistoryEvent[] | null,
): pb.OrchestratorAction {
  const completeOrchestrationAction = new pb.CompleteOrchestrationAction();
  completeOrchestrationAction.setOrchestrationstatus(status);
  completeOrchestrationAction.setResult(getStringValue(result));
  completeOrchestrationAction.setFailuredetails(failureDetails);
  completeOrchestrationAction.setCarryovereventsList(carryoverEvents || []);

  const action = new pb.OrchestratorAction();
  action.setId(id);
  action.setCompleteorchestration(completeOrchestrationAction);

  return action;
}

export function newCreateTimerAction(id: number, fireAt: Date): pb.OrchestratorAction {
  const timestamp = new Timestamp();
  timestamp.fromDate(fireAt);

  const createTimerAction = new pb.CreateTimerAction();
  createTimerAction.setFireat(timestamp);

  const action = new pb.OrchestratorAction();
  action.setId(id);
  action.setCreatetimer(createTimerAction);

  return action;
}

export function newScheduleTaskAction(
  id: number,
  name: string,
  encodedInput?: string,
  tags?: Record<string, string>,
  version?: string,
): pb.OrchestratorAction {
  const scheduleTaskAction = new pb.ScheduleTaskAction();
  scheduleTaskAction.setName(name);
  scheduleTaskAction.setInput(getStringValue(encodedInput));
  populateTagsMap(scheduleTaskAction.getTagsMap(), tags);
  if (version) {
    scheduleTaskAction.setVersion(getStringValue(version));
  }

  const action = new pb.OrchestratorAction();
  action.setId(id);
  action.setScheduletask(scheduleTaskAction);

  return action;
}

export function newTimestamp(dt: Date): Timestamp {
  const timestamp = new Timestamp();
  timestamp.fromDate(dt);
  return timestamp;
}

export function newCreateSubOrchestrationAction(
  id: number,
  name: string,
  instanceId?: string | null,
  encodedInput?: string,
  tags?: Record<string, string>,
  version?: string,
): pb.OrchestratorAction {
  const createSubOrchestrationAction = new pb.CreateSubOrchestrationAction();
  createSubOrchestrationAction.setName(name);
  createSubOrchestrationAction.setInstanceid(instanceId || "");
  createSubOrchestrationAction.setInput(getStringValue(encodedInput));
  populateTagsMap(createSubOrchestrationAction.getTagsMap(), tags);
  if (version) {
    createSubOrchestrationAction.setVersion(getStringValue(version));
  }

  const action = new pb.OrchestratorAction();
  action.setId(id);
  action.setCreatesuborchestration(createSubOrchestrationAction);

  return action;
}

export function newSendEventAction(
  id: number,
  instanceId: string,
  eventName: string,
  encodedData?: string,
): pb.OrchestratorAction {
  const orchestrationInstance = new pb.OrchestrationInstance();
  orchestrationInstance.setInstanceid(instanceId);

  const sendEventAction = new pb.SendEventAction();
  sendEventAction.setInstance(orchestrationInstance);
  sendEventAction.setName(eventName);
  sendEventAction.setData(getStringValue(encodedData));

  const action = new pb.OrchestratorAction();
  action.setId(id);
  action.setSendevent(sendEventAction);

  return action;
}

export function isEmpty(v?: StringValue | null): boolean {
  return v == null || v.getValue() === "";
}

// Pre-built reverse map for O(1) orchestration status string lookups
const orchestrationStatusStrMap = new Map<number, string>();
for (const [name, value] of Object.entries(pb.OrchestrationStatus)) {
  if (typeof value === "number" && name.startsWith("ORCHESTRATION_STATUS_")) {
    orchestrationStatusStrMap.set(value, name.slice("ORCHESTRATION_STATUS_".length));
  }
}

/**
 * Get the orchestration status string by the enum value of the status
 *
 * @param status
 * @returns
 */
export function getOrchestrationStatusStr(status: number): string {
  return orchestrationStatusStrMap.get(status) ?? "UNKNOWN";
}
