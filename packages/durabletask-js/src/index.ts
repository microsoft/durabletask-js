// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Client and Worker
export { TaskHubGrpcClient } from "./client/client";
export { MetadataGenerator } from "./utils/grpc-helper.util";
export { TaskHubGrpcWorker } from "./worker/task-hub-grpc-worker";
export { AsyncPageable, Page } from "./utils/async-pageable";

// Contexts
export { OrchestrationContext } from "./task/context/orchestration-context";
export { ActivityContext } from "./task/context/activity-context";

// Orchestration types and utilities
export { PurgeInstanceCriteria } from "./orchestration/orchestration-purge-criteria";
export { OrchestrationStatus } from "./orchestration/enum/orchestration-status.enum";

// Proto types (for advanced usage)
export { OrchestrationStatus as ProtoOrchestrationStatus } from "./proto/orchestrator_service_pb";

// Task utilities
export { getName, whenAll, whenAny } from "./task";
export { Task } from "./task/task";

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
export { TaskEntityContext, StartOrchestrationOptions } from "./entities/task-entity-context";
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
