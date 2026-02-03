// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Client and Worker
export { TaskHubGrpcClient, TaskHubGrpcClientOptions, MetadataGenerator } from "./client/client";
export { TaskHubGrpcWorker, TaskHubGrpcWorkerOptions } from "./worker/task-hub-grpc-worker";

// Contexts
export { OrchestrationContext } from "./task/context/orchestration-context";
export { ActivityContext } from "./task/context/activity-context";

// Orchestration types and utilities
export { PurgeInstanceCriteria } from "./orchestration/orchestration-purge-criteria";
export { PurgeInstanceOptions } from "./orchestration/orchestration-purge-options";
export { TerminateInstanceOptions } from "./orchestration/orchestration-terminate-options";
export { OrchestrationStatus } from "./orchestration/enum/orchestration-status.enum";
export { OrchestrationState } from "./orchestration/orchestration-state";

// Query types
export { OrchestrationQuery, ListInstanceIdsOptions, DEFAULT_PAGE_SIZE } from "./orchestration/orchestration-query";
export { Page, AsyncPageable, createAsyncPageable } from "./orchestration/page";

// History event types
export {
  HistoryEvent,
  HistoryEventType,
  HistoryEventBase,
  ExecutionStartedEvent,
  ExecutionCompletedEvent,
  ExecutionTerminatedEvent,
  ExecutionSuspendedEvent,
  ExecutionResumedEvent,
  ExecutionRewoundEvent,
  TaskScheduledEvent,
  TaskCompletedEvent,
  TaskFailedEvent,
  SubOrchestrationInstanceCreatedEvent,
  SubOrchestrationInstanceCompletedEvent,
  SubOrchestrationInstanceFailedEvent,
  TimerCreatedEvent,
  TimerFiredEvent,
  OrchestratorStartedEvent,
  OrchestratorCompletedEvent,
  EventSentEvent,
  EventRaisedEvent,
  GenericEvent,
  HistoryStateEvent,
  ContinueAsNewEvent,
  OrchestrationInstance,
  ParentInstanceInfo,
  TraceContext,
  EntityOperationSignaledEvent,
  EntityOperationCalledEvent,
  EntityOperationCompletedEvent,
  EntityOperationFailedEvent,
  EntityLockRequestedEvent,
  EntityLockGrantedEvent,
  EntityUnlockSentEvent,
} from "./orchestration/history-event";

// Proto types (for advanced usage)
export { OrchestrationStatus as ProtoOrchestrationStatus } from "./proto/orchestrator_service_pb";

// Task utilities
export { getName, whenAll, whenAny } from "./task";
export { Task } from "./task/task";

// Retry policies and task options
export { RetryPolicy, RetryPolicyOptions } from "./task/retry";
export {
  TaskOptions,
  SubOrchestrationOptions,
  StartOrchestrationOptions,
  taskOptionsFromRetryPolicy,
  subOrchestrationOptionsFromRetryPolicy,
} from "./task/options";

// Types
export { TOrchestrator } from "./types/orchestrator.type";
export { TActivity } from "./types/activity.type";
export { TInput } from "./types/input.type";
export { TOutput } from "./types/output.type";

// Logger
export { Logger, ConsoleLogger, NoOpLogger } from "./types/logger.type";
export { ReplaySafeLogger, ReplayContext } from "./types/replay-safe-logger";

// Versioning utilities
export { compareVersions } from "./utils/versioning.util";
