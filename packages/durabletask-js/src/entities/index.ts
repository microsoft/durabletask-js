// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Core identity types
export { EntityInstanceId } from "./entity-instance-id";

// Client-side types (Step 2)
export {
  EntityMetadata,
  createEntityMetadata,
  createEntityMetadataWithoutState,
} from "./entity-metadata";
export {
  EntityQuery,
  normalizeInstanceIdPrefix,
  createEntityQuery,
} from "./entity-query";
export {
  CleanEntityStorageRequest,
  CleanEntityStorageResult,
  defaultCleanEntityStorageRequest,
} from "./clean-entity-storage";

// Worker-side entity operation types (Step 3)
export { SignalEntityOptions, CallEntityOptions } from "./signal-entity-options";
export { TaskEntityState } from "./task-entity-state";
export { TaskEntityContext, StartOrchestrationOptions } from "./task-entity-context";
export { TaskEntityOperation } from "./task-entity-operation";

// Entity interface and base class (Step 4)
export { ITaskEntity, EntityFactory, TaskEntity } from "./task-entity";

// Orchestration entity feature (Step 7, 8)
export { OrchestrationEntityFeature } from "./orchestration-entity-feature";
export {
  EntityOperationFailedException,
  TaskFailureDetails,
  createTaskFailureDetails,
} from "./entity-operation-failed-exception";
