// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { FailureDetails } from "../task/failure-details";

/**
 * Enumeration of all possible history event types.
 */
export enum HistoryEventType {
  ExecutionStarted = "ExecutionStarted",
  ExecutionCompleted = "ExecutionCompleted",
  ExecutionTerminated = "ExecutionTerminated",
  ExecutionSuspended = "ExecutionSuspended",
  ExecutionResumed = "ExecutionResumed",
  ExecutionRewound = "ExecutionRewound",
  TaskScheduled = "TaskScheduled",
  TaskCompleted = "TaskCompleted",
  TaskFailed = "TaskFailed",
  SubOrchestrationInstanceCreated = "SubOrchestrationInstanceCreated",
  SubOrchestrationInstanceCompleted = "SubOrchestrationInstanceCompleted",
  SubOrchestrationInstanceFailed = "SubOrchestrationInstanceFailed",
  TimerCreated = "TimerCreated",
  TimerFired = "TimerFired",
  OrchestratorStarted = "OrchestratorStarted",
  OrchestratorCompleted = "OrchestratorCompleted",
  EventSent = "EventSent",
  EventRaised = "EventRaised",
  GenericEvent = "GenericEvent",
  HistoryState = "HistoryState",
  ContinueAsNew = "ContinueAsNew",
  EntityOperationSignaled = "EntityOperationSignaled",
  EntityOperationCalled = "EntityOperationCalled",
  EntityOperationCompleted = "EntityOperationCompleted",
  EntityOperationFailed = "EntityOperationFailed",
  EntityLockRequested = "EntityLockRequested",
  EntityLockGranted = "EntityLockGranted",
  EntityUnlockSent = "EntityUnlockSent",
}

/**
 * Represents an orchestration instance identifier.
 */
export interface OrchestrationInstance {
  instanceId: string;
  executionId?: string;
}

/**
 * Represents parent instance information for sub-orchestrations.
 */
export interface ParentInstanceInfo {
  name?: string;
  version?: string;
  taskScheduledId: number;
  orchestrationInstance?: OrchestrationInstance;
}

/**
 * Represents trace context for distributed tracing.
 */
export interface TraceContext {
  traceParent: string;
  /** @deprecated Use traceParent instead */
  spanId?: string;
  traceState?: string;
}

/**
 * Base interface for all history events.
 */
export interface HistoryEventBase {
  /** The unique identifier for this event within the orchestration history. */
  eventId: number;
  /** The timestamp when this event occurred. */
  timestamp: Date;
  /** The type of history event. */
  type: HistoryEventType;
}

/**
 * Event that marks the start of an orchestration execution.
 */
export interface ExecutionStartedEvent extends HistoryEventBase {
  type: HistoryEventType.ExecutionStarted;
  name: string;
  version?: string;
  input?: string;
  orchestrationInstance?: OrchestrationInstance;
  parentInstance?: ParentInstanceInfo;
  scheduledStartTimestamp?: Date;
  tags?: Record<string, string>;
}

/**
 * Event that marks the completion of an orchestration execution.
 */
export interface ExecutionCompletedEvent extends HistoryEventBase {
  type: HistoryEventType.ExecutionCompleted;
  orchestrationStatus: string;
  result?: string;
  failureDetails?: FailureDetails;
}

/**
 * Event that marks the termination of an orchestration execution.
 */
export interface ExecutionTerminatedEvent extends HistoryEventBase {
  type: HistoryEventType.ExecutionTerminated;
  input?: string;
  recurse?: boolean;
}

/**
 * Event that marks the suspension of an orchestration execution.
 */
export interface ExecutionSuspendedEvent extends HistoryEventBase {
  type: HistoryEventType.ExecutionSuspended;
  input?: string;
}

/**
 * Event that marks the resumption of an orchestration execution.
 */
export interface ExecutionResumedEvent extends HistoryEventBase {
  type: HistoryEventType.ExecutionResumed;
  input?: string;
}

/**
 * Event that marks the rewind of an orchestration execution.
 */
export interface ExecutionRewoundEvent extends HistoryEventBase {
  type: HistoryEventType.ExecutionRewound;
  reason?: string;
  parentExecutionId?: string;
  instanceId?: string;
  parentTraceContext?: TraceContext;
  name?: string;
  version?: string;
  input?: string;
  parentInstance?: ParentInstanceInfo;
  tags?: Record<string, string>;
}

/**
 * Event that marks the scheduling of an activity task.
 */
export interface TaskScheduledEvent extends HistoryEventBase {
  type: HistoryEventType.TaskScheduled;
  name: string;
  version?: string;
  input?: string;
  tags?: Record<string, string>;
}

/**
 * Event that marks the completion of an activity task.
 */
export interface TaskCompletedEvent extends HistoryEventBase {
  type: HistoryEventType.TaskCompleted;
  taskScheduledId: number;
  result?: string;
}

/**
 * Event that marks the failure of an activity task.
 */
export interface TaskFailedEvent extends HistoryEventBase {
  type: HistoryEventType.TaskFailed;
  taskScheduledId: number;
  failureDetails?: FailureDetails;
}

/**
 * Event that marks the creation of a sub-orchestration instance.
 */
export interface SubOrchestrationInstanceCreatedEvent extends HistoryEventBase {
  type: HistoryEventType.SubOrchestrationInstanceCreated;
  name: string;
  version?: string;
  instanceId?: string;
  input?: string;
  tags?: Record<string, string>;
}

/**
 * Event that marks the completion of a sub-orchestration instance.
 */
export interface SubOrchestrationInstanceCompletedEvent extends HistoryEventBase {
  type: HistoryEventType.SubOrchestrationInstanceCompleted;
  taskScheduledId: number;
  result?: string;
}

/**
 * Event that marks the failure of a sub-orchestration instance.
 */
export interface SubOrchestrationInstanceFailedEvent extends HistoryEventBase {
  type: HistoryEventType.SubOrchestrationInstanceFailed;
  taskScheduledId: number;
  failureDetails?: FailureDetails;
}

/**
 * Event that marks the creation of a timer.
 */
export interface TimerCreatedEvent extends HistoryEventBase {
  type: HistoryEventType.TimerCreated;
  fireAt: Date;
}

/**
 * Event that marks the firing of a timer.
 */
export interface TimerFiredEvent extends HistoryEventBase {
  type: HistoryEventType.TimerFired;
  fireAt: Date;
  timerId: number;
}

/**
 * Event that marks the start of an orchestrator replay.
 */
export interface OrchestratorStartedEvent extends HistoryEventBase {
  type: HistoryEventType.OrchestratorStarted;
}

/**
 * Event that marks the completion of an orchestrator replay.
 */
export interface OrchestratorCompletedEvent extends HistoryEventBase {
  type: HistoryEventType.OrchestratorCompleted;
}

/**
 * Event that marks the sending of an event to another orchestration.
 */
export interface EventSentEvent extends HistoryEventBase {
  type: HistoryEventType.EventSent;
  name: string;
  instanceId?: string;
  input?: string;
}

/**
 * Event that marks the receiving of an external event.
 */
export interface EventRaisedEvent extends HistoryEventBase {
  type: HistoryEventType.EventRaised;
  name: string;
  input?: string;
}

/**
 * Generic event for extensibility.
 */
export interface GenericEvent extends HistoryEventBase {
  type: HistoryEventType.GenericEvent;
  data?: string;
}

/**
 * Event that captures the history state.
 */
export interface HistoryStateEvent extends HistoryEventBase {
  type: HistoryEventType.HistoryState;
}

/**
 * Event that marks continue-as-new.
 */
export interface ContinueAsNewEvent extends HistoryEventBase {
  type: HistoryEventType.ContinueAsNew;
  input?: string;
}

/**
 * Event for entity operation signaled.
 */
export interface EntityOperationSignaledEvent extends HistoryEventBase {
  type: HistoryEventType.EntityOperationSignaled;
  requestId: string;
  operation: string;
  targetInstanceId?: string;
  scheduledTime?: Date;
  input?: string;
}

/**
 * Event for entity operation called.
 */
export interface EntityOperationCalledEvent extends HistoryEventBase {
  type: HistoryEventType.EntityOperationCalled;
  requestId: string;
  operation: string;
  targetInstanceId?: string;
  parentInstanceId?: string;
  scheduledTime?: Date;
  input?: string;
}

/**
 * Event for entity operation completed.
 */
export interface EntityOperationCompletedEvent extends HistoryEventBase {
  type: HistoryEventType.EntityOperationCompleted;
  requestId: string;
  output?: string;
}

/**
 * Event for entity operation failed.
 */
export interface EntityOperationFailedEvent extends HistoryEventBase {
  type: HistoryEventType.EntityOperationFailed;
  requestId: string;
  failureDetails?: FailureDetails;
}

/**
 * Event for entity lock requested.
 */
export interface EntityLockRequestedEvent extends HistoryEventBase {
  type: HistoryEventType.EntityLockRequested;
  criticalSectionId: string;
  lockSet: string[];
  position: number;
  parentInstanceId?: string;
}

/**
 * Event for entity lock granted.
 */
export interface EntityLockGrantedEvent extends HistoryEventBase {
  type: HistoryEventType.EntityLockGranted;
  criticalSectionId: string;
}

/**
 * Event for entity unlock sent.
 */
export interface EntityUnlockSentEvent extends HistoryEventBase {
  type: HistoryEventType.EntityUnlockSent;
  criticalSectionId: string;
  parentInstanceId?: string;
  targetInstanceId?: string;
}

/**
 * Union type of all history events.
 */
export type HistoryEvent =
  | ExecutionStartedEvent
  | ExecutionCompletedEvent
  | ExecutionTerminatedEvent
  | ExecutionSuspendedEvent
  | ExecutionResumedEvent
  | ExecutionRewoundEvent
  | TaskScheduledEvent
  | TaskCompletedEvent
  | TaskFailedEvent
  | SubOrchestrationInstanceCreatedEvent
  | SubOrchestrationInstanceCompletedEvent
  | SubOrchestrationInstanceFailedEvent
  | TimerCreatedEvent
  | TimerFiredEvent
  | OrchestratorStartedEvent
  | OrchestratorCompletedEvent
  | EventSentEvent
  | EventRaisedEvent
  | GenericEvent
  | HistoryStateEvent
  | ContinueAsNewEvent
  | EntityOperationSignaledEvent
  | EntityOperationCalledEvent
  | EntityOperationCompletedEvent
  | EntityOperationFailedEvent
  | EntityLockRequestedEvent
  | EntityLockGrantedEvent
  | EntityUnlockSentEvent;
