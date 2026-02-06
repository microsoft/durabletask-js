// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Client and Worker
export { TaskHubGrpcClient, TaskHubGrpcClientOptions, MetadataGenerator } from "./client/client";
export { TaskHubGrpcWorker, TaskHubGrpcWorkerOptions } from "./worker/task-hub-grpc-worker";
export { VersioningOptions, VersionMatchStrategy, VersionFailureStrategy } from "./worker/versioning-options";

// Contexts
export { OrchestrationContext } from "./task/context/orchestration-context";
export { ActivityContext } from "./task/context/activity-context";

// Orchestration types and utilities
export { PurgeInstanceCriteria } from "./orchestration/orchestration-purge-criteria";
export { PurgeInstanceOptions } from "./orchestration/orchestration-purge-options";
export { TerminateInstanceOptions, terminateOptions, isTerminateInstanceOptions, TERMINATE_OPTIONS_SYMBOL } from "./orchestration/orchestration-terminate-options";
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

// Entity types - Core identity (Step 1)
export { EntityInstanceId } from "./entities/entity-instance-id";

// Entity types - Client-side types (Step 2)
export {
  EntityMetadata,
  createEntityMetadata,
  createEntityMetadataWithoutState,
} from "./entities/entity-metadata";
export {
  EntityQuery,
  normalizeInstanceIdPrefix,
  createEntityQuery,
} from "./entities/entity-query";
export {
  CleanEntityStorageRequest,
  CleanEntityStorageResult,
  defaultCleanEntityStorageRequest,
} from "./entities/clean-entity-storage";

// Entity types - Worker-side operation types (Step 3)
export { SignalEntityOptions, CallEntityOptions } from "./entities/signal-entity-options";
export { TaskEntityState } from "./entities/task-entity-state";
export { TaskEntityContext } from "./entities/task-entity-context";
export { TaskEntityOperation } from "./entities/task-entity-operation";

// Entity interface and base class (Step 4)
export { ITaskEntity, EntityFactory, TaskEntity } from "./entities/task-entity";

// Entity executor and state management (Step 5)
export { TaskEntityShim, EntityAction } from "./worker/entity-executor";

// Orchestration entity feature (Step 7)
export {
  OrchestrationEntityFeature,
  LockHandle,
  CriticalSectionInfo,
} from "./entities/orchestration-entity-feature";
// Testing utilities
export { InMemoryOrchestrationBackend, TestOrchestrationClient, TestOrchestrationWorker } from "./testing";
export { ParentOrchestrationInstance } from "./types/parent-orchestration-instance.type";

// Logger
export { Logger, ConsoleLogger, NoOpLogger, StructuredLogger, LogEvent, isStructuredLogger, createLogEventHandler } from "./types/logger.type";
export { ReplaySafeLogger, ReplayContext } from "./types/replay-safe-logger";

// Versioning utilities
export { compareVersions } from "./utils/versioning.util";

// Distributed Tracing (OpenTelemetry)
export {
  TRACER_NAME,
  DurableTaskAttributes,
  TaskType,
  createSpanName,
  createTimerSpanName,
} from "./tracing";
