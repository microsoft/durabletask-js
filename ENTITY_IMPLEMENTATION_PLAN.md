# Durable Entities Parity Plan for durabletask-js

## Document Metadata
- **Source Repository:** durabletask-dotnet (C#)
- **Target Repository:** durabletask-js (TypeScript/JavaScript)
- **Created:** January 24, 2026
- **Purpose:** Provide an iterative implementation plan for adding Durable Entity support to durabletask-js with exact behavior parity to durabletask-dotnet

---

# 1) Executive Summary

## What Durable Entities Are (as encoded in .NET)

Durable Entities are a programming abstraction in the Durable Task Framework that enables developers to define small pieces of state ("entities") that can be addressed by a unique identifier (composed of an entity name and a key). Each entity instance:

- Has its own persistent state
- Executes operations one at a time (single-threaded execution model per entity)
- Can be signaled (fire-and-forget) or called (request/response) from orchestrations and external clients
- Can signal other entities or start new orchestrations
- Supports distributed locking (critical sections) across multiple entities

**Source References:**
- Entity concept: [TaskEntity.cs](src/Abstractions/Entities/TaskEntity.cs) - `class TaskEntity<TState> : ITaskEntity`
- Entity ID format: [EntityInstanceId.cs](src/Abstractions/Entities/EntityInstanceId.cs) - `@{name}@{key}` string format

## User-Facing Scenarios Enabled

1. **Stateful Singletons**: Counter, shopping cart, game session state
2. **Distributed Locks / Critical Sections**: Coordinating access across multiple entities from an orchestration
3. **Actor-like Patterns**: Independent addressable units with encapsulated state
4. **Entity-to-Entity Communication**: Entities signaling other entities
5. **Client-to-Entity Communication**: External clients signaling entities without going through orchestrations

## What the JS SDK Will Need to Expose (High-Level)

1. **Entity Definition API**: Mechanism to define entity classes/functions with operations
2. **Entity Context API**: Context provided to entity operations for signaling other entities, scheduling orchestrations
3. **Orchestration Entity Feature API**: Methods on orchestration context for `callEntity`, `signalEntity`, `lockEntities`
4. **Entity Client API**: Client methods for `signalEntity`, `getEntity`, `queryEntities`, `cleanEntityStorage`
5. **Worker Entity Support**: Ability to register entities and process entity work items

---

# 2) Dotnet Feature Inventory (Source-of-truth)

## 2.1 Entity Instance ID

| Attribute | Value |
|-----------|-------|
| **What** | Unique identifier for an entity instance, composed of name and key |
| **Why** | Provides addressable identity for each entity instance |
| **Where** | [src/Abstractions/Entities/EntityInstanceId.cs](src/Abstractions/Entities/EntityInstanceId.cs) - `record struct EntityInstanceId` |
| **Observable Behavior** | Format: `@{name}@{key}`. Name is normalized to lowercase. Key is case-preserved. Serialized as compact string in JSON. |

## 2.2 Entity Interface (ITaskEntity)

| Attribute | Value |
|-----------|-------|
| **What** | Core interface that all entities must implement |
| **Why** | Defines the contract for entity operation execution |
| **Where** | [src/Abstractions/Entities/TaskEntity.cs](src/Abstractions/Entities/TaskEntity.cs) - `interface ITaskEntity` |
| **Observable Behavior** | Single method: `RunAsync(TaskEntityOperation operation)` returns `ValueTask<object?>` |

## 2.3 Base Entity Class (TaskEntity<TState>)

| Attribute | Value |
|-----------|-------|
| **What** | Abstract base class providing dispatch-by-reflection to public methods |
| **Why** | Simplifies entity development by auto-routing operations to methods |
| **Where** | [src/Abstractions/Entities/TaskEntity.cs](src/Abstractions/Entities/TaskEntity.cs) - `abstract class TaskEntity<TState> : ITaskEntity` |
| **Observable Behavior** | Hydrates `State` property, dispatches by operation name (case-insensitive), supports implicit "delete" operation, persists state after each operation |

## 2.4 Entity Operation Descriptor (TaskEntityOperation)

| Attribute | Value |
|-----------|-------|
| **What** | Describes a single operation request to an entity |
| **Why** | Encapsulates operation name, input, context, and state access |
| **Where** | [src/Abstractions/Entities/TaskEntityOperation.cs](src/Abstractions/Entities/TaskEntityOperation.cs) - `abstract class TaskEntityOperation` |
| **Observable Behavior** | Properties: `Name`, `Context`, `State`, `HasInput`. Method: `GetInput<T>()` |

## 2.5 Entity State Abstraction (TaskEntityState)

| Attribute | Value |
|-----------|-------|
| **What** | Represents the persisted state of an entity |
| **Why** | Provides abstraction for getting/setting state with serialization |
| **Where** | [src/Abstractions/Entities/TaskEntityState.cs](src/Abstractions/Entities/TaskEntityState.cs) - `abstract class TaskEntityState` |
| **Observable Behavior** | `HasState` property, `GetState<T>()` method, `SetState(object?)` method. Setting null deletes state. |

## 2.6 Entity Context (TaskEntityContext)

| Attribute | Value |
|-----------|-------|
| **What** | Context available to entities for scheduling work |
| **Why** | Allows entities to signal other entities and start orchestrations |
| **Where** | [src/Abstractions/Entities/TaskEntityContext.cs](src/Abstractions/Entities/TaskEntityContext.cs) - `abstract class TaskEntityContext` |
| **Observable Behavior** | Properties: `Id`. Methods: `SignalEntity()`, `ScheduleNewOrchestration()` |

## 2.7 Orchestration Entity Feature (TaskOrchestrationEntityFeature)

| Attribute | Value |
|-----------|-------|
| **What** | Feature for interacting with entities from an orchestration |
| **Why** | Enables orchestrations to call, signal, and lock entities |
| **Where** | [src/Abstractions/Entities/TaskOrchestrationEntityFeature.cs](src/Abstractions/Entities/TaskOrchestrationEntityFeature.cs) - `abstract class TaskOrchestrationEntityFeature` |
| **Observable Behavior** | Methods: `CallEntityAsync<TResult>()`, `SignalEntityAsync()`, `LockEntitiesAsync()`, `InCriticalSection()` |

## 2.8 Entity Signal Options (SignalEntityOptions)

| Attribute | Value |
|-----------|-------|
| **What** | Options for signaling an entity |
| **Why** | Allows scheduling signals for future delivery |
| **Where** | [src/Abstractions/Entities/CallEntityOptions.cs](src/Abstractions/Entities/CallEntityOptions.cs) - `record SignalEntityOptions` |
| **Observable Behavior** | `SignalTime` property for scheduled delivery |

## 2.9 Entity Call Options (CallEntityOptions)

| Attribute | Value |
|-----------|-------|
| **What** | Options for calling an entity (request/response) |
| **Why** | Reserved for future extensibility |
| **Where** | [src/Abstractions/Entities/CallEntityOptions.cs](src/Abstractions/Entities/CallEntityOptions.cs) - `record CallEntityOptions` |
| **Observable Behavior** | Currently empty, placeholder for future options |

## 2.10 Entity Operation Failed Exception

| Attribute | Value |
|-----------|-------|
| **What** | Exception thrown when an entity operation fails |
| **Why** | Provides detailed failure information to callers |
| **Where** | [src/Abstractions/Entities/EntityOperationFailedException.cs](src/Abstractions/Entities/EntityOperationFailedException.cs) - `sealed class EntityOperationFailedException` |
| **Observable Behavior** | Contains `EntityId`, `OperationName`, `FailureDetails` |

## 2.11 Durable Entity Client

| Attribute | Value |
|-----------|-------|
| **What** | Client for interacting with entities from outside orchestrations |
| **Why** | Enables external systems to signal and query entities |
| **Where** | [src/Client/Core/Entities/DurableEntityClient.cs](src/Client/Core/Entities/DurableEntityClient.cs) - `abstract class DurableEntityClient` |
| **Observable Behavior** | Methods: `SignalEntityAsync()`, `GetEntityAsync()`, `GetAllEntitiesAsync()`, `CleanEntityStorageAsync()` |

## 2.12 Entity Metadata

| Attribute | Value |
|-----------|-------|
| **What** | Metadata describing an entity instance |
| **Why** | Used for querying entity state and status |
| **Where** | [src/Client/Core/Entities/EntityMetadata.cs](src/Client/Core/Entities/EntityMetadata.cs) - `class EntityMetadata<TState>` |
| **Observable Behavior** | Properties: `Id`, `LastModifiedTime`, `BacklogQueueSize`, `LockedBy`, `State`, `IncludesState` |

## 2.13 Entity Query

| Attribute | Value |
|-----------|-------|
| **What** | Query parameters for fetching entities |
| **Why** | Enables filtering and pagination of entity queries |
| **Where** | [src/Client/Core/Entities/EntityQuery.cs](src/Client/Core/Entities/EntityQuery.cs) - `record EntityQuery` |
| **Observable Behavior** | Properties: `InstanceIdStartsWith`, `LastModifiedFrom`, `LastModifiedTo`, `IncludeState`, `IncludeTransient`, `PageSize`, `ContinuationToken` |

## 2.14 Clean Entity Storage

| Attribute | Value |
|-----------|-------|
| **What** | API for cleaning up orphaned entity state |
| **Why** | Maintenance operation for removing empty entities and releasing orphaned locks |
| **Where** | [src/Client/Core/Entities/CleanEntityStorage.cs](src/Client/Core/Entities/CleanEntityStorage.cs) |
| **Observable Behavior** | Request has `RemoveEmptyEntities`, `ReleaseOrphanedLocks`. Result has counts and continuation token. |

## 2.15 Entity Shim (TaskEntityShim)

| Attribute | Value |
|-----------|-------|
| **What** | Bridge between DurableTask.Core entity model and SDK abstractions |
| **Why** | Implements batch execution, state commit/rollback, action collection |
| **Where** | [src/Worker/Core/Shims/TaskEntityShim.cs](src/Worker/Core/Shims/TaskEntityShim.cs) - `class TaskEntityShim` |
| **Observable Behavior** | Executes operations transactionally - rolls back state and actions on exception |

## 2.16 Orchestration Entity Context (TaskOrchestrationEntityContext)

| Attribute | Value |
|-----------|-------|
| **What** | Implementation of entity feature for orchestrations |
| **Why** | Handles entity messaging, lock acquisition, response correlation |
| **Where** | [src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) - `sealed class TaskOrchestrationEntityContext` |
| **Observable Behavior** | Uses deterministic GUIDs for request IDs, waits for external events for responses, manages critical section state |

## 2.17 GrpcEntityRunner

| Attribute | Value |
|-----------|-------|
| **What** | Helper for invoking entities directly (used by Azure Functions) |
| **Why** | Enables entity execution without full worker setup |
| **Where** | [src/Worker/Grpc/GrpcEntityRunner.cs](src/Worker/Grpc/GrpcEntityRunner.cs) - `static class GrpcEntityRunner` |
| **Observable Behavior** | Takes base64-encoded protobuf request, returns base64-encoded protobuf result |

## 2.18 GrpcDurableEntityClient

| Attribute | Value |
|-----------|-------|
| **What** | gRPC implementation of the entity client |
| **Why** | Communicates with sidecar for entity operations |
| **Where** | [src/Client/Grpc/GrpcDurableEntityClient.cs](src/Client/Grpc/GrpcDurableEntityClient.cs) - `class GrpcDurableEntityClient` |
| **Observable Behavior** | Uses protobuf messages for SignalEntity, GetEntity, QueryEntities, CleanEntityStorage RPCs |

## 2.19 Protocol Messages (Protobuf)

| Message | Purpose | Where |
|---------|---------|-------|
| `EntityInstanceId` | N/A - represented as string `@name@key` | Throughout |
| `EntityBatchRequest` | Batch of operations to execute | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L619-624 |
| `EntityBatchResult` | Result of batch execution | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L626-635 |
| `OperationRequest` | Single operation in batch | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L649-653 |
| `OperationResult` | Result of single operation | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L655-660 |
| `OperationAction` | Action taken by entity (signal, start orch) | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L672-678 |
| `SendSignalAction` | Signal another entity | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L680-687 |
| `EntityOperationSignaledEvent` | History event for signal | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L179-185 |
| `EntityOperationCalledEvent` | History event for call | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L187-195 |
| `EntityOperationCompletedEvent` | Response from entity call | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L204-207 |
| `EntityOperationFailedEvent` | Failure from entity call | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L209-212 |
| `EntityLockRequestedEvent` | Lock acquisition request | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L196-201 |
| `EntityLockGrantedEvent` | Lock acquired | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L220-222 |
| `EntityUnlockSentEvent` | Lock release message | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L214-218 |
| `SendEntityMessageAction` | Orchestrator action to send entity message | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L306-312 |
| `SignalEntityRequest` | Client RPC to signal entity | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L552-559 |
| `GetEntityRequest/Response` | Client RPC to get entity | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L564-571 |
| `EntityQuery` | Query parameters | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L573-580 |
| `EntityMetadata` | Entity metadata in responses | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) L594-600 |

## 2.20 Concurrency / Ordering / Locking Semantics

| Attribute | Value |
|-----------|-------|
| **What** | Entity operations execute one at a time; orchestrations can acquire multi-entity locks |
| **Why** | Ensures consistency without explicit locking in user code |
| **Where** | [TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) - `LockEntitiesAsync`, `InCriticalSection`, `ExitCriticalSection` |
| **Observable Behavior** | Lock set is sorted, messages are routed to first entity in set, lock is "passed" along entities, orchestration waits for grant event |

## 2.21 Error Handling and Rollback

| Attribute | Value |
|-----------|-------|
| **What** | Entity operations are transactional - exception rolls back state and actions |
| **Why** | Prevents partial state changes on failure |
| **Where** | [TaskEntityShim.cs](src/Worker/Core/Shims/TaskEntityShim.cs) - `ExecuteOperationBatchAsync`, `StateShim.Rollback`, `ContextShim.Rollback` |
| **Observable Behavior** | On unhandled exception: state reverts to pre-operation value, any signals/orchestrations scheduled during that operation are discarded |

## 2.22 Tests Validating Entities

| Test File | What It Asserts |
|-----------|-----------------|
| [GrpcEntityRunnerTests.cs](test/Worker/Grpc.Tests/GrpcEntityRunnerTests.cs) | Entity batch execution, state caching (extended sessions), empty state handling, state persistence |
| [EntityTaskEntityTests.cs](test/Abstractions.Tests/Entities/EntityTaskEntityTests.cs) | Operation dispatch by reflection, parameter binding, return value unwrapping, async operation support, implicit delete |
| [EntityMetadataTests.cs](test/Client/Core.Tests/Entities/EntityMetadataTests.cs) | Metadata serialization, state inclusion behavior |
| [ShimDurableEntityClientTests.cs](test/Client/OrchestrationServiceClientShim.Tests/ShimDurableEntityClientTests.cs) | Client signal, query, clean operations |

---

# 3) End-to-End Flow Walkthroughs (From dotnet code)

## Flow A: Orchestrator Calls an Entity (Request/Response Style)

| Step | Caller | Action | Artifact | Next Step | Dotnet Symbol |
|------|--------|--------|----------|-----------|---------------|
| 1 | Orchestrator code | Calls `ctx.Entities.CallEntityAsync<T>(id, op, input)` | N/A | 2 | `TaskOrchestrationEntityFeature.CallEntityAsync` |
| 2 | TaskOrchestrationEntityContext | Validates state (`ValidateOperationTransition`) | N/A | 3 | `TaskOrchestrationEntityContext.CallEntityInternalAsync` |
| 3 | TaskOrchestrationEntityContext | Generates deterministic GUID for request ID | `Guid requestId` | 4 | `wrapper.NewGuid()` |
| 4 | TaskOrchestrationEntityContext | Serializes input using data converter | `string serializedInput` | 5 | `DataConverter.Serialize` |
| 5 | TaskOrchestrationEntityContext | Creates `EntityMessageEvent` with operation details | `EntityMessageEvent` | 6 | `EntityContext.EmitRequestMessage` |
| 6 | TaskOrchestrationEntityContext | Sends event via inner context | External event to target entity | 7 | `innerContext.SendEvent` |
| 7 | TaskOrchestrationEntityContext | Awaits external event with request ID as name | Blocked on `WaitForExternalEvent<OperationResult>` | 8 | `wrapper.WaitForExternalEvent<OperationResult>` |
| 8 | Backend | Routes message to entity, entity executes | `EntityBatchResult` | 9 | Backend infrastructure |
| 9 | Backend | Sends response event back to orchestrator | `EntityOperationCompletedEvent` or `EntityOperationFailedEvent` | 10 | Backend infrastructure |
| 10 | TaskOrchestrationEntityContext | Receives response, deserializes result or throws | `TResult` or `EntityOperationFailedException` | 11 | `CallEntityInternalAsync` continuation |
| 11 | TaskOrchestrationEntityContext | If in critical section, restores lock state | N/A | End | `EntityContext.RecoverLockAfterCall` |

## Flow B: Orchestrator Signals an Entity (One-Way Style)

| Step | Caller | Action | Artifact | Next Step | Dotnet Symbol |
|------|--------|--------|----------|-----------|---------------|
| 1 | Orchestrator code | Calls `ctx.Entities.SignalEntityAsync(id, op, input)` | N/A | 2 | `TaskOrchestrationEntityFeature.SignalEntityAsync` |
| 2 | TaskOrchestrationEntityContext | Validates state (`ValidateOperationTransition`, oneWay=true) | N/A | 3 | `SendOperationMessage` |
| 3 | TaskOrchestrationEntityContext | Generates deterministic GUID for request ID | `Guid requestId` | 4 | `wrapper.NewGuid()` |
| 4 | TaskOrchestrationEntityContext | Serializes input | `string serializedInput` | 5 | `DataConverter.Serialize` |
| 5 | TaskOrchestrationEntityContext | Creates `EntityMessageEvent` with oneWay flag | `EntityMessageEvent` | 6 | `EntityContext.EmitRequestMessage` |
| 6 | TaskOrchestrationEntityContext | Sends event via inner context | External event to target entity | End | `innerContext.SendEvent` |
| 7 | Method returns | Returns `Task.CompletedTask` immediately | N/A | End | `SignalEntityAsync` return |

## Flow C: Entity Execution Loop (State Changes + Persistence)

| Step | Caller | Action | Artifact | Next Step | Dotnet Symbol |
|------|--------|--------|----------|-----------|---------------|
| 1 | Worker Processor | Receives `EntityBatchRequest` work item | `EntityBatchRequest` | 2 | `GrpcDurableTaskWorker.Processor` |
| 2 | Worker Processor | Looks up entity implementation by name | `ITaskEntity` | 3 | `IDurableTaskFactory2.TryCreateEntity` |
| 3 | Worker Processor | Creates `TaskEntityShim` with entity and ID | `TaskEntityShim` | 4 | `DurableTaskShimFactory.CreateEntity` |
| 4 | TaskEntityShim | Initializes state from request, commits checkpoint | `StateShim.CurrentState` | 5 | `ExecuteOperationBatchAsync` |
| 5 | TaskEntityShim | For each operation in batch: | N/A | 6 | Loop in `ExecuteOperationBatchAsync` |
| 6 | TaskEntityShim | Sets operation name and input on OperationShim | N/A | 7 | `OperationShim.SetNameAndInput` |
| 7 | TaskEntityShim | Calls `taskEntity.RunAsync(operation)` | N/A | 8 | `ITaskEntity.RunAsync` |
| 8 | TaskEntity<TState> | Hydrates State property from operation state | `this.State` | 9 | `RunAsync` implementation |
| 9 | TaskEntity<TState> | Dispatches to method by operation name | Method invocation | 10 | `operation.TryDispatch(this, ...)` |
| 10 | User method | Executes, may modify State, may call context methods | Modified state, signals/orchestrations | 11 | User code |
| 11 | TaskEntity<TState> | Unwraps async result, sets state | `TaskEntityState.SetState` | 12 | `TaskEntityHelpers.UnwrapAsync` |
| 12 | TaskEntityShim | On success: commits state and context actions | Checkpoint updated | 13 | `state.Commit()`, `context.Commit()` |
| 12b | TaskEntityShim | On exception: rolls back state and context | Checkpoint restored | 13 | `state.Rollback()`, `context.Rollback()` |
| 13 | TaskEntityShim | Records `OperationResult` (success or failure) | `OperationResult` in results list | 5 (next op) | Result collection |
| 14 | TaskEntityShim | After all operations: builds `EntityBatchResult` | `EntityBatchResult` | 15 | `ExecuteOperationBatchAsync` return |
| 15 | Worker Processor | Converts to protobuf, sends `CompleteEntityTask` | RPC response | End | `client.CompleteEntityTaskAsync` |

---

# 4) JS Delta Assessment (Current durabletask-js State)

## 4.1 What Already Exists That Could Support Entities

| Component | Location | Reuse Potential |
|-----------|----------|-----------------|
| **Proto definitions** | [internal/protocol/protos/orchestrator_service.proto](internal/protocol/protos/orchestrator_service.proto) | Full - all entity messages already defined (EntityBatchRequest, EntityBatchResult, OperationRequest, etc.) |
| **Generated proto code** | [packages/durabletask-js/src/proto/](packages/durabletask-js/src/proto/) | Full - protobuf classes should already be generated |
| **gRPC client infrastructure** | [packages/durabletask-js/src/client/client-grpc.ts](packages/durabletask-js/src/client/client-grpc.ts) | High - can add entity methods to existing client |
| **Worker infrastructure** | [packages/durabletask-js/src/worker/task-hub-grpc-worker.ts](packages/durabletask-js/src/worker/task-hub-grpc-worker.ts) | High - already handles work item streaming, can add entity case |
| **Registry pattern** | [packages/durabletask-js/src/worker/registry.ts](packages/durabletask-js/src/worker/registry.ts) | High - can extend to register entities |
| **Orchestration context base** | [packages/durabletask-js/src/task/context/orchestration-context.ts](packages/durabletask-js/src/task/context/orchestration-context.ts) | Medium - need to add entity methods |
| **Runtime context** | [packages/durabletask-js/src/worker/runtime-orchestration-context.ts](packages/durabletask-js/src/worker/runtime-orchestration-context.ts) | Medium - need to implement entity message handling |
| **Completable tasks** | [packages/durabletask-js/src/task/completable-task.ts](packages/durabletask-js/src/task/completable-task.ts) | Full - can use for entity call responses |
| **Failure details** | [packages/durabletask-js/src/task/failure-details.ts](packages/durabletask-js/src/task/failure-details.ts) | Full - already have TaskFailureDetails |
| **Data serialization (JSON)** | Scattered, uses `JSON.stringify/parse` | Full - consistent with entity state serialization |

## 4.2 What Is Missing

| Component | Description | Likely Location in JS |
|-----------|-------------|----------------------|
| **EntityInstanceId type** | Value type for `@name@key` format | New: `packages/durabletask-js/src/entities/entity-instance-id.ts` |
| **ITaskEntity interface** | Entity execution contract | New: `packages/durabletask-js/src/entities/task-entity.ts` |
| **TaskEntityOperation class** | Operation descriptor | New: `packages/durabletask-js/src/entities/task-entity-operation.ts` |
| **TaskEntityState class** | State wrapper | New: `packages/durabletask-js/src/entities/task-entity-state.ts` |
| **TaskEntityContext class** | Entity context for signaling | New: `packages/durabletask-js/src/entities/task-entity-context.ts` |
| **Entity executor** | Like OrchestrationExecutor but for entities | New: `packages/durabletask-js/src/worker/entity-executor.ts` |
| **Entity work item handling** | Case in worker for entityRequest | Modify: `packages/durabletask-js/src/worker/task-hub-grpc-worker.ts` |
| **Entity registration** | Registry methods for entities | Modify: `packages/durabletask-js/src/worker/registry.ts` |
| **OrchestrationEntityFeature** | Entity methods on orchestration context | New: `packages/durabletask-js/src/entities/orchestration-entity-feature.ts` |
| **Orchestration entity context implementation** | Call/signal/lock from orchestrations | Modify: `packages/durabletask-js/src/worker/runtime-orchestration-context.ts` |
| **SendEntityMessageAction handling** | New action type in orchestrator response | Modify: `packages/durabletask-js/src/utils/pb-helper.util.ts` |
| **Entity response event handling** | EntityOperationCompleted/Failed events | Modify: `packages/durabletask-js/src/worker/orchestration-executor.ts` |
| **DurableEntityClient** | Client for entity operations | New: `packages/durabletask-js/src/client/entity-client.ts` |
| **EntityMetadata type** | Entity query result type | New: `packages/durabletask-js/src/entities/entity-metadata.ts` |
| **EntityQuery type** | Query parameters | New: `packages/durabletask-js/src/entities/entity-query.ts` |
| **EntityOperationFailedException** | Exception for failed calls | New: `packages/durabletask-js/src/entities/exceptions/entity-operation-failed.ts` |

## 4.3 Where Changes Would Be Needed

| File | Type of Change |
|------|----------------|
| `packages/durabletask-js/src/worker/task-hub-grpc-worker.ts` | Add `entityRequest` handling in work item switch |
| `packages/durabletask-js/src/worker/registry.ts` | Add `addEntity`, `getEntity` methods |
| `packages/durabletask-js/src/worker/runtime-orchestration-context.ts` | Add entity feature, implement entity methods |
| `packages/durabletask-js/src/worker/orchestration-executor.ts` | Handle entity response events |
| `packages/durabletask-js/src/task/context/orchestration-context.ts` | Add `entities` property for entity feature |
| `packages/durabletask-js/src/client/client.ts` | Add entity client methods or separate class |
| `packages/durabletask-js/src/utils/pb-helper.util.ts` | Add helpers for entity-related proto messages |
| `packages/durabletask-js/src/index.ts` | Export new entity types |

---

# 5) Iterative Implementation Plan (Step-by-step, reviewable)

## Step 1: Core Entity Types (No Runtime Yet)

### Dotnet source requirements:
- `EntityInstanceId` format and behavior -> [EntityInstanceId.cs](src/Abstractions/Entities/EntityInstanceId.cs)
- `EntityInstanceId.FromString` parsing -> [EntityInstanceId.cs](src/Abstractions/Entities/EntityInstanceId.cs) L45-58
- `EntityInstanceId.ToString()` format -> [EntityInstanceId.cs](src/Abstractions/Entities/EntityInstanceId.cs) L61

### JS work items (no code yet):
- Create `packages/durabletask-js/src/entities/` directory
- Create `entity-instance-id.ts` with class/type
- Implement constructor with name (lowercase) and key
- Implement `fromString()` static method
- Implement `toString()` method
- Add validation (no '@' in name)
- Export from index

### Expected API surface change:
```typescript
class EntityInstanceId {
  readonly name: string;  // lowercased
  readonly key: string;
  constructor(name: string, key: string);
  static fromString(instanceId: string): EntityInstanceId;
  toString(): string;  // "@{name}@{key}"
}
```

### Tests to add (names and intent):
- `EntityInstanceId.constructor.normalizesName` - verify name is lowercased
- `EntityInstanceId.constructor.preservesKey` - verify key case is preserved
- `EntityInstanceId.constructor.rejectsAtInName` - verify validation
- `EntityInstanceId.fromString.parsesValidFormat` - verify parsing
- `EntityInstanceId.fromString.throwsOnInvalidFormat` - verify error handling
- `EntityInstanceId.toString.returnsCorrectFormat` - verify format

### Success criteria:
- [x] `EntityInstanceId` class exists and is exported
- [x] Name normalization matches dotnet (lowercase)
- [x] String format matches dotnet (`@name@key`)
- [x] Parsing handles edge cases (empty key, special characters)

### Verification checklist:
- [x] Create instance with mixed-case name, verify `name` property is lowercase
- [x] Create instance, call `toString()`, verify format
- [x] Parse valid string, verify name and key extracted correctly
- [x] Attempt to parse invalid string (no @, single @), verify error thrown

**STATUS: ✅ COMPLETE** (January 26, 2026)
- Implementation: `packages/durabletask-js/src/entities/entity-instance-id.ts`
- Tests: `packages/durabletask-js/test/entity-instance-id.spec.ts` (30 tests passing)
- Export: Added to `packages/durabletask-js/src/index.ts`

---

## Step 2: Entity Metadata and Query Types (Client-Side Types)

### Dotnet source requirements:
- `EntityMetadata<T>` structure -> [EntityMetadata.cs](src/Client/Core/Entities/EntityMetadata.cs)
- `EntityQuery` parameters -> [EntityQuery.cs](src/Client/Core/Entities/EntityQuery.cs)
- `CleanEntityStorageRequest/Result` -> [CleanEntityStorage.cs](src/Client/Core/Entities/CleanEntityStorage.cs)
- Query string prefix normalization -> [EntityQuery.cs](src/Client/Core/Entities/EntityQuery.cs) L27-54

### JS work items (no code yet):
- Create `entity-metadata.ts` with EntityMetadata interface/class
- Create `entity-query.ts` with EntityQuery interface
- Create `clean-entity-storage.ts` with request/result types
- Implement prefix normalization logic for query

### Expected API surface change:
```typescript
interface EntityMetadata<T = unknown> {
  id: EntityInstanceId;
  lastModifiedTime: Date;
  backlogQueueSize: number;
  lockedBy?: string;
  state?: T;
  includesState: boolean;
}

interface EntityQuery {
  instanceIdStartsWith?: string;
  lastModifiedFrom?: Date;
  lastModifiedTo?: Date;
  includeState?: boolean;
  includeTransient?: boolean;
  pageSize?: number;
  continuationToken?: string;
}

interface CleanEntityStorageRequest {
  removeEmptyEntities?: boolean;
  releaseOrphanedLocks?: boolean;
  continuationToken?: string;
}

interface CleanEntityStorageResult {
  emptyEntitiesRemoved: number;
  orphanedLocksReleased: number;
  continuationToken?: string;
}
```

### Tests to add (names and intent):
- `EntityQuery.instanceIdStartsWith.normalizesPrefix` - verify name portion is lowercased
- `EntityMetadata.state.throwsWhenNotIncluded` - verify state access behavior

### Success criteria:
- [x] All client-side entity types defined
- [x] Query prefix normalization matches dotnet behavior
- [x] Types are JSON-serializable

### Verification checklist:
- [x] Create EntityQuery with mixed-case prefix, verify normalization
- [x] Verify EntityMetadata can hold various state types

**STATUS: ✅ COMPLETE** (January 26, 2026)
- Implementation: 
  - `packages/durabletask-js/src/entities/entity-metadata.ts`
  - `packages/durabletask-js/src/entities/entity-query.ts`
  - `packages/durabletask-js/src/entities/clean-entity-storage.ts`
  - `packages/durabletask-js/src/entities/index.ts`
- Tests: 
  - `packages/durabletask-js/test/entity-metadata.spec.ts` (16 tests passing)
  - `packages/durabletask-js/test/entity-query.spec.ts` (17 tests passing)
  - `packages/durabletask-js/test/clean-entity-storage.spec.ts` (tests passing)
- Export: Added to `packages/durabletask-js/src/index.ts`

---

## Step 3: Entity Operation Types (Worker-Side Types)

### Dotnet source requirements:
- `TaskEntityOperation` abstract class -> [TaskEntityOperation.cs](src/Abstractions/Entities/TaskEntityOperation.cs)
- `TaskEntityState` abstract class -> [TaskEntityState.cs](src/Abstractions/Entities/TaskEntityState.cs)
- `TaskEntityContext` abstract class -> [TaskEntityContext.cs](src/Abstractions/Entities/TaskEntityContext.cs)
- `SignalEntityOptions` -> [CallEntityOptions.cs](src/Abstractions/Entities/CallEntityOptions.cs)

### JS work items (no code yet):
- Create `task-entity-operation.ts` with operation interface
- Create `task-entity-state.ts` with state wrapper
- Create `task-entity-context.ts` with context interface
- Create `signal-entity-options.ts` with options type

### Expected API surface change:
```typescript
interface TaskEntityOperation {
  readonly name: string;
  readonly context: TaskEntityContext;
  readonly state: TaskEntityState;
  readonly hasInput: boolean;
  getInput<T>(): T | undefined;
}

interface TaskEntityState {
  readonly hasState: boolean;
  getState<T>(): T | undefined;
  setState(state: unknown): void;
}

interface TaskEntityContext {
  readonly id: EntityInstanceId;
  signalEntity(id: EntityInstanceId, operationName: string, input?: unknown, options?: SignalEntityOptions): void;
  scheduleNewOrchestration(name: string, input?: unknown, options?: StartOrchestrationOptions): string;
}

interface SignalEntityOptions {
  signalTime?: Date;
}
```

### Tests to add (names and intent):
- `TaskEntityState.getState.returnsUndefinedWhenNoState` - verify no-state behavior
- `TaskEntityState.setState.null.deletesState` - verify deletion semantics

### Success criteria:
- [ ] All worker-side entity types defined
- [ ] Types align with dotnet abstractions
- [ ] State null/undefined deletion semantic is documented

### Verification checklist:
- [ ] Verify interface definitions match dotnet method signatures
- [ ] Verify SignalEntityOptions has signalTime property

---

## Step 4: Entity Interface and Base Class

### Dotnet source requirements:
- `ITaskEntity` interface -> [TaskEntity.cs](src/Abstractions/Entities/TaskEntity.cs) L17-25
- `TaskEntity<TState>` dispatch logic -> [TaskEntity.cs](src/Abstractions/Entities/TaskEntity.cs) L84-147
- Operation dispatch by reflection -> [TaskEntityOperationExtensions.cs](src/Abstractions/Entities/TaskEntityOperationExtensions.cs)
- Implicit "delete" operation -> [TaskEntity.cs](src/Abstractions/Entities/TaskEntity.cs) L162-171

### JS work items (no code yet):
- Create `task-entity.ts` with ITaskEntity interface
- Create base class or helper for method dispatch
- Implement operation name matching (case-insensitive)
- Implement implicit delete operation
- Handle async/promise return types

### Expected API surface change:
```typescript
interface ITaskEntity {
  run(operation: TaskEntityOperation): Promise<unknown>;
}

// Or class-based approach
abstract class TaskEntity<TState> implements ITaskEntity {
  protected state: TState;
  protected context: TaskEntityContext;
  run(operation: TaskEntityOperation): Promise<unknown>;
  protected initializeState(): TState;
}
```

### Tests to add (names and intent):
- `TaskEntity.dispatch.matchesMethodCaseInsensitive` - verify case-insensitive matching
- `TaskEntity.dispatch.throwsOnUnknownOperation` - verify error for missing method
- `TaskEntity.implicitDelete.deletesState` - verify delete operation
- `TaskEntity.dispatch.handlesAsyncMethods` - verify Promise handling

### Success criteria:
- [ ] Entity interface defined
- [ ] Operation dispatch works for simple cases
- [ ] Case-insensitive method matching
- [ ] Implicit delete operation supported

### Verification checklist:
- [ ] Create entity with Add method, dispatch "add" and "ADD" operations
- [ ] Dispatch "delete" without explicit delete method, verify state cleared
- [ ] Dispatch unknown operation, verify error thrown

---

## Step 5: Entity Executor and State Management

### Dotnet source requirements:
- `TaskEntityShim.ExecuteOperationBatchAsync` -> [TaskEntityShim.cs](src/Worker/Core/Shims/TaskEntityShim.cs) L47-106
- State commit/rollback -> [TaskEntityShim.cs](src/Worker/Core/Shims/TaskEntityShim.cs) L110-149
- Context action collection -> [TaskEntityShim.cs](src/Worker/Core/Shims/TaskEntityShim.cs) L151-196
- OperationResult structure -> Proto OperationResult, OperationResultSuccess, OperationResultFailure

### JS work items (no code yet):
- Create `entity-executor.ts` with batch execution logic
- Implement state checkpoint and rollback
- Implement context action collection and rollback
- Convert results to proto format
- Handle exceptions per-operation (not per-batch)

### Expected API surface change:
```typescript
class EntityExecutor {
  async executeBatch(
    entity: ITaskEntity,
    request: EntityBatchRequest
  ): Promise<EntityBatchResult>;
}
```

### Tests to add (names and intent):
- `EntityExecutor.executeBatch.executesAllOperations` - verify all ops run
- `EntityExecutor.executeBatch.rollsBackOnException` - verify state rollback
- `EntityExecutor.executeBatch.discardActionsOnException` - verify action rollback
- `EntityExecutor.executeBatch.continuesAfterException` - verify batch continues
- `EntityExecutor.executeBatch.returnsCorrectResults` - verify result per operation

### Success criteria:
- [ ] Batch execution runs all operations
- [ ] State is checkpointed before each operation
- [ ] State is rolled back on exception
- [ ] Actions (signals, orchestrations) are rolled back on exception
- [ ] Results contain success or failure per operation

### Verification checklist:
- [ ] Execute batch with 3 operations, verify all run and results returned
- [ ] Execute batch where op 2 throws, verify op 1 state persisted, op 2 rolled back, op 3 runs
- [ ] Execute batch with signal in op that fails, verify signal not in actions

---

## Step 6: Worker Entity Registration and Work Item Handling

### Dotnet source requirements:
- Work item handling for EntityRequest -> [GrpcDurableTaskWorker.Processor.cs](src/Worker/Grpc/GrpcDurableTaskWorker.Processor.cs) L297-302
- Entity lookup by name -> [GrpcDurableTaskWorker.Processor.cs](src/Worker/Grpc/GrpcDurableTaskWorker.Processor.cs) L869-870
- CompleteEntityTask RPC -> Proto CompleteEntityTask

### JS work items (no code yet):
- Add `addEntity(fn)` and `addNamedEntity(name, fn)` to Registry
- Add `getEntity(name)` to Registry
- Add entity request case in worker's work item handler
- Call EntityExecutor for entity work items
- Send CompleteEntityTask response

### Expected API surface change:
```typescript
// On TaskHubGrpcWorker
addEntity<TState>(entity: new () => TaskEntity<TState>): string;
addNamedEntity<TState>(name: string, entity: new () => TaskEntity<TState>): string;
```

### Tests to add (names and intent):
- `Registry.addEntity.registersEntity` - verify registration
- `Registry.getEntity.returnsEntity` - verify lookup
- `Worker.entityRequest.executesEntity` - verify end-to-end

### Success criteria:
- [ ] Entities can be registered with worker
- [ ] Entity work items are recognized and handled
- [ ] Entity executor is invoked
- [ ] Response is sent to backend

### Verification checklist:
- [ ] Register entity, verify it appears in registry
- [ ] Simulate entity work item, verify executor called
- [ ] Verify CompleteEntityTask RPC is called with result

---

## Step 7: Orchestration Entity Feature (SignalEntity)

### Dotnet source requirements:
- `TaskOrchestrationEntityFeature.SignalEntityAsync` -> [TaskOrchestrationEntityFeature.cs](src/Abstractions/Entities/TaskOrchestrationEntityFeature.cs) L65-76
- Signal implementation -> [TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) L114-118
- SendEntityMessageAction -> Proto SendEntityMessageAction, EntityOperationSignaledEvent

### JS work items (no code yet):
- Add `entities` property to OrchestrationContext
- Create `orchestration-entity-feature.ts` interface
- Implement `signalEntity` in RuntimeOrchestrationContext
- Create SendEntityMessageAction in pb-helper
- Add action to pending actions

### Expected API surface change:
```typescript
// On OrchestrationContext
get entities(): OrchestrationEntityFeature;

interface OrchestrationEntityFeature {
  signalEntity(id: EntityInstanceId, operationName: string, input?: unknown, options?: SignalEntityOptions): void;
}
```

### Tests to add (names and intent):
- `OrchestrationContext.entities.signalEntity.createsAction` - verify action created
- `OrchestrationContext.entities.signalEntity.withScheduledTime` - verify scheduled signal

### Success criteria:
- [ ] `signalEntity` method available on orchestration context
- [ ] SendEntityMessageAction created with correct format
- [ ] Scheduled signals set scheduledTime in proto

### Verification checklist:
- [ ] Call signalEntity, verify action in pending actions
- [ ] Verify action has correct instanceId, operation, input
- [ ] Call with signalTime, verify timestamp in action

---

## Step 8: Orchestration Entity Feature (CallEntity)

### Dotnet source requirements:
- `TaskOrchestrationEntityFeature.CallEntityAsync` -> [TaskOrchestrationEntityFeature.cs](src/Abstractions/Entities/TaskOrchestrationEntityFeature.cs) L15-35
- Call implementation -> [TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) L89-112
- Response handling -> [TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) L167-180
- EntityOperationCompletedEvent, EntityOperationFailedEvent -> Proto
- EntityOperationFailedException -> [EntityOperationFailedException.cs](src/Abstractions/Entities/EntityOperationFailedException.cs)

### JS work items (no code yet):
- Implement `callEntity<T>` in RuntimeOrchestrationContext
- Generate deterministic request ID (using existing NewGuid pattern)
- Create SendEntityMessageAction with EntityOperationCalledEvent
- Wait for external event with request ID
- Handle EntityOperationCompletedEvent in orchestration executor
- Handle EntityOperationFailedEvent, throw EntityOperationFailedException
- Create `entity-operation-failed-exception.ts`

### Expected API surface change:
```typescript
interface OrchestrationEntityFeature {
  callEntity<T>(id: EntityInstanceId, operationName: string, input?: unknown, options?: CallEntityOptions): Task<T>;
}

class EntityOperationFailedException extends Error {
  entityId: EntityInstanceId;
  operationName: string;
  failureDetails: TaskFailureDetails;
}
```

### Tests to add (names and intent):
- `OrchestrationContext.entities.callEntity.createsActionAndTask` - verify action and task created
- `OrchestrationContext.entities.callEntity.completesOnResponse` - verify task completes
- `OrchestrationContext.entities.callEntity.throwsOnFailure` - verify exception thrown
- `EntityOperationFailedException.containsDetails` - verify exception properties

### Success criteria:
- [ ] `callEntity` method available on orchestration context
- [ ] Request ID is deterministic (replays produce same ID)
- [ ] Task completes when response event received
- [ ] Exception thrown for failed operations

### Verification checklist:
- [ ] Call entity, verify action created with parentInstanceId
- [ ] Simulate success response, verify task completes with result
- [ ] Simulate failure response, verify exception thrown with details

---

## Step 9: Entity Response Event Handling in Orchestration Executor

### Dotnet source requirements:
- EntityOperationCompletedEvent handling -> [EntityConversions.cs](src/Shared/Grpc/EntityConversions.cs) L176-187
- EntityOperationFailedEvent handling -> [EntityConversions.cs](src/Shared/Grpc/EntityConversions.cs) L200-220
- Event correlation by requestId -> Response name matches requestId

### JS work items (no code yet):
- Add case for EntityOperationCompletedEvent in orchestration executor
- Add case for EntityOperationFailedEvent in orchestration executor
- Extract requestId from event, correlate with pending task
- Complete or fail the task accordingly

### Expected API surface change:
None - internal changes only

### Tests to add (names and intent):
- `OrchestrationExecutor.entityOperationCompleted.completesTask` - verify task completion
- `OrchestrationExecutor.entityOperationFailed.failsTask` - verify task failure

### Success criteria:
- [ ] EntityOperationCompletedEvent is handled
- [ ] EntityOperationFailedEvent is handled
- [ ] Pending tasks are completed correctly

### Verification checklist:
- [ ] Process orchestrator request with EntityOperationCompletedEvent, verify task completed
- [ ] Process orchestrator request with EntityOperationFailedEvent, verify task failed

---

## Step 10: Client Entity Methods (Signal, Get, Query)

### Dotnet source requirements:
- `DurableEntityClient.SignalEntityAsync` -> [DurableEntityClient.cs](src/Client/Core/Entities/DurableEntityClient.cs) L31-41
- `DurableEntityClient.GetEntityAsync` -> [DurableEntityClient.cs](src/Client/Core/Entities/DurableEntityClient.cs) L76-82
- `DurableEntityClient.GetAllEntitiesAsync` -> [DurableEntityClient.cs](src/Client/Core/Entities/DurableEntityClient.cs) L117-119
- gRPC implementation -> [GrpcDurableEntityClient.cs](src/Client/Grpc/GrpcDurableEntityClient.cs)
- SignalEntityRequest, GetEntityRequest, QueryEntitiesRequest -> Proto

### JS work items (no code yet):
- Create `entity-client.ts` or add methods to existing client
- Implement `signalEntity` using SignalEntity RPC
- Implement `getEntity` using GetEntity RPC
- Implement `getEntities` using QueryEntities RPC with pagination
- Convert proto responses to EntityMetadata

### Expected API surface change:
```typescript
// On TaskHubGrpcClient or separate class
signalEntity(id: EntityInstanceId, operationName: string, input?: unknown, options?: SignalEntityOptions): Promise<void>;
getEntity<T>(id: EntityInstanceId, includeState?: boolean): Promise<EntityMetadata<T> | undefined>;
getEntities<T>(query?: EntityQuery): AsyncIterable<EntityMetadata<T>>;
```

### Tests to add (names and intent):
- `EntityClient.signalEntity.sendsRequest` - verify RPC called
- `EntityClient.getEntity.returnsMetadata` - verify response mapping
- `EntityClient.getEntity.returnsUndefinedWhenNotFound` - verify not-found handling
- `EntityClient.getEntities.paginates` - verify pagination

### Success criteria:
- [ ] All client entity methods implemented
- [ ] Proto conversion is correct
- [ ] Pagination works for queries

### Verification checklist:
- [ ] Call signalEntity, verify SignalEntityRequest sent
- [ ] Call getEntity, verify response converted to EntityMetadata
- [ ] Call getEntities with page size, verify multiple pages fetched

---

## Step 11: Entity Locking (Critical Sections)

### Dotnet source requirements:
- `TaskOrchestrationEntityFeature.LockEntitiesAsync` -> [TaskOrchestrationEntityFeature.cs](src/Abstractions/Entities/TaskOrchestrationEntityFeature.cs) L87-99
- Lock implementation -> [TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) L47-81
- InCriticalSection -> [TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) L120-130
- ExitCriticalSection -> [TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) L137-152
- EntityLockRequestedEvent, EntityLockGrantedEvent, EntityUnlockSentEvent -> Proto
- Lock set sorting -> Entities are sorted before lock request

### JS work items (no code yet):
- Implement `lockEntities` in RuntimeOrchestrationContext
- Sort entity IDs before sending lock request
- Generate deterministic critical section ID
- Send EntityLockRequestedEvent to first entity
- Wait for EntityLockGrantedEvent
- Track critical section state
- Implement `inCriticalSection` method
- Implement lock releaser (IAsyncDisposable equivalent)
- Send EntityUnlockSentEvent on dispose

### Expected API surface change:
```typescript
interface OrchestrationEntityFeature {
  lockEntities(...entityIds: EntityInstanceId[]): Task<AsyncDisposable>;
  inCriticalSection(): { inSection: boolean; lockedEntities?: EntityInstanceId[] };
}

interface AsyncDisposable {
  dispose(): void;
}
```

### Tests to add (names and intent):
- `OrchestrationContext.entities.lockEntities.sortsEntities` - verify sorting
- `OrchestrationContext.entities.lockEntities.sendsLockRequest` - verify action
- `OrchestrationContext.entities.lockEntities.completesOnGrant` - verify task completes
- `OrchestrationContext.entities.lockRelease.sendsUnlock` - verify release
- `OrchestrationContext.entities.inCriticalSection.returnsCorrectState` - verify state

### Success criteria:
- [ ] Lock acquisition works
- [ ] Lock release works
- [ ] Critical section state tracked correctly
- [ ] Entity IDs are sorted for determinism

### Verification checklist:
- [ ] Lock [B, A], verify request goes to A first (sorted)
- [ ] Receive grant, verify inCriticalSection returns true
- [ ] Dispose lock, verify unlock sent to all entities

---

## Step 12: Entity Actions (SignalEntity and ScheduleOrchestration from Entity)

### Dotnet source requirements:
- `TaskEntityContext.SignalEntity` -> [TaskEntityContext.cs](src/Abstractions/Entities/TaskEntityContext.cs) L25-34
- `TaskEntityContext.ScheduleNewOrchestration` -> [TaskEntityContext.cs](src/Abstractions/Entities/TaskEntityContext.cs) L43-51
- Context implementation -> [TaskEntityShim.cs](src/Worker/Core/Shims/TaskEntityShim.cs) L225-255
- OperationAction -> Proto OperationAction, SendSignalAction, StartNewOrchestrationAction

### JS work items (no code yet):
- Implement `signalEntity` on entity context
- Implement `scheduleNewOrchestration` on entity context
- Add actions to action list
- Include actions in EntityBatchResult

### Expected API surface change:
Already defined in Step 3

### Tests to add (names and intent):
- `EntityContext.signalEntity.addsAction` - verify action added
- `EntityContext.scheduleOrchestration.addsAction` - verify action added
- `EntityExecutor.actionsIncludedInResult` - verify result contains actions

### Success criteria:
- [ ] Entities can signal other entities
- [ ] Entities can start orchestrations
- [ ] Actions are included in batch result

### Verification checklist:
- [ ] Entity operation signals another entity, verify action in result
- [ ] Entity operation starts orchestration, verify action in result

---

## Step 13: Clean Entity Storage Client Method

### Dotnet source requirements:
- `DurableEntityClient.CleanEntityStorageAsync` -> [DurableEntityClient.cs](src/Client/Core/Entities/DurableEntityClient.cs) L129-137
- gRPC implementation -> [GrpcDurableEntityClient.cs](src/Client/Grpc/GrpcDurableEntityClient.cs) L98-126
- CleanEntityStorageRequest/Response -> Proto

### JS work items (no code yet):
- Implement `cleanEntityStorage` on client
- Support continuation token for large cleanups
- Support `continueUntilComplete` option

### Expected API surface change:
```typescript
cleanEntityStorage(
  request?: CleanEntityStorageRequest,
  continueUntilComplete?: boolean
): Promise<CleanEntityStorageResult>;
```

### Tests to add (names and intent):
- `EntityClient.cleanEntityStorage.sendsRequest` - verify RPC
- `EntityClient.cleanEntityStorage.handlesContuation` - verify pagination

### Success criteria:
- [ ] Clean operation works
- [ ] Continuation works for large datasets

### Verification checklist:
- [ ] Call cleanEntityStorage, verify RPC sent
- [ ] Verify result contains counts

---

## Step 14: Documentation and Examples

### Dotnet source requirements:
- Sample entity: [Counter.cs](samples/AzureFunctionsApp/Entities/Counter.cs)
- Entity usage patterns in orchestrations

### JS work items (no code yet):
- Add JSDoc to all public entity APIs
- Create example entity (Counter)
- Create example orchestration using entity
- Create example client usage
- Update README with entity section

### Expected API surface change:
None - documentation only

### Tests to add (names and intent):
- Integration test with simple entity scenario

### Success criteria:
- [ ] All public APIs documented
- [ ] Working example exists
- [ ] README updated

### Verification checklist:
- [ ] Run example end-to-end
- [ ] Verify documentation renders correctly

---

# 6) Parity Map (Dotnet -> JS)

| Dotnet Symbol | Dotnet Location | JS Module | JS Symbol | Status |
|---------------|-----------------|-----------|-----------|--------|
| `EntityInstanceId` | `src/Abstractions/Entities/EntityInstanceId.cs` | `src/entities/entity-instance-id.ts` | `EntityInstanceId` | TBD |
| `ITaskEntity` | `src/Abstractions/Entities/TaskEntity.cs` | `src/entities/task-entity.ts` | `ITaskEntity` | TBD |
| `TaskEntity<T>` | `src/Abstractions/Entities/TaskEntity.cs` | `src/entities/task-entity.ts` | `TaskEntity<T>` | TBD |
| `TaskEntityOperation` | `src/Abstractions/Entities/TaskEntityOperation.cs` | `src/entities/task-entity-operation.ts` | `TaskEntityOperation` | TBD |
| `TaskEntityState` | `src/Abstractions/Entities/TaskEntityState.cs` | `src/entities/task-entity-state.ts` | `TaskEntityState` | TBD |
| `TaskEntityContext` | `src/Abstractions/Entities/TaskEntityContext.cs` | `src/entities/task-entity-context.ts` | `TaskEntityContext` | TBD |
| `TaskOrchestrationEntityFeature` | `src/Abstractions/Entities/TaskOrchestrationEntityFeature.cs` | `src/entities/orchestration-entity-feature.ts` | `OrchestrationEntityFeature` | TBD |
| `SignalEntityOptions` | `src/Abstractions/Entities/CallEntityOptions.cs` | `src/entities/signal-entity-options.ts` | `SignalEntityOptions` | TBD |
| `CallEntityOptions` | `src/Abstractions/Entities/CallEntityOptions.cs` | `src/entities/call-entity-options.ts` | `CallEntityOptions` | TBD |
| `EntityOperationFailedException` | `src/Abstractions/Entities/EntityOperationFailedException.cs` | `src/entities/exceptions/entity-operation-failed.ts` | `EntityOperationFailedException` | TBD |
| `DurableEntityClient` | `src/Client/Core/Entities/DurableEntityClient.cs` | `src/client/entity-client.ts` | `DurableEntityClient` | TBD |
| `EntityMetadata<T>` | `src/Client/Core/Entities/EntityMetadata.cs` | `src/entities/entity-metadata.ts` | `EntityMetadata<T>` | TBD |
| `EntityQuery` | `src/Client/Core/Entities/EntityQuery.cs` | `src/entities/entity-query.ts` | `EntityQuery` | TBD |
| `CleanEntityStorageRequest` | `src/Client/Core/Entities/CleanEntityStorage.cs` | `src/entities/clean-entity-storage.ts` | `CleanEntityStorageRequest` | TBD |
| `CleanEntityStorageResult` | `src/Client/Core/Entities/CleanEntityStorage.cs` | `src/entities/clean-entity-storage.ts` | `CleanEntityStorageResult` | TBD |
| `TaskEntityShim` | `src/Worker/Core/Shims/TaskEntityShim.cs` | `src/worker/entity-executor.ts` | `EntityExecutor` | TBD - Different name, same purpose |
| `TaskOrchestrationEntityContext` | `src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs` | `src/worker/runtime-orchestration-context.ts` | Part of `RuntimeOrchestrationContext` | TBD - Integrated into existing class |
| `GrpcDurableEntityClient` | `src/Client/Grpc/GrpcDurableEntityClient.cs` | `src/client/client.ts` or `src/client/entity-client.ts` | Part of `TaskHubGrpcClient` or separate | TBD - Architecture decision |
| `GrpcEntityRunner` | `src/Worker/Grpc/GrpcEntityRunner.cs` | TBD | TBD | TBD - May not be needed if not supporting Azure Functions trigger model |

**TBD Justifications:**
- Most items are TBD because implementation hasn't started
- `TaskEntityShim` -> `EntityExecutor`: Different name in JS to align with existing `OrchestrationExecutor` naming
- `TaskOrchestrationEntityContext`: Integrated into `RuntimeOrchestrationContext` rather than separate class (JS doesn't have partial classes)
- `GrpcEntityRunner`: May not be needed if JS SDK only supports worker model (not Azure Functions out-of-process trigger model)

---

# 7) Risk & Confusion Points

## Risk 1: Deterministic Request ID Generation

| Aspect | Details |
|--------|---------|
| **Why it's risky** | Entity calls from orchestrations require deterministic GUIDs for replay. If IDs are not deterministic, replays will fail to correlate responses. |
| **How to detect incorrect behavior** | Replaying an orchestration that made entity calls will see duplicate calls or orphaned responses |
| **Which tests will catch it** | Integration test: run orchestration with entity call, terminate, restart - verify no duplicate calls |
| **Dotnet reference** | [TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) L170 - `wrapper.NewGuid()` |

## Risk 2: State Rollback on Exception

| Aspect | Details |
|--------|---------|
| **Why it's risky** | Entity operations are transactional. If state isn't properly rolled back on exception, partial state changes will persist. |
| **How to detect incorrect behavior** | Operation 1 succeeds (state A->B), Operation 2 fails (state B->C partial), next batch sees state C instead of B |
| **Which tests will catch it** | `EntityExecutor.executeBatch.rollsBackOnException` |
| **Dotnet reference** | [TaskEntityShim.cs](src/Worker/Core/Shims/TaskEntityShim.cs) L83-91 - rollback on catch |

## Risk 3: Action Rollback on Exception

| Aspect | Details |
|--------|---------|
| **Why it's risky** | If entity operation fails, any signals/orchestrations it scheduled should not be sent. Missing rollback causes spurious side effects. |
| **How to detect incorrect behavior** | Failed operation's scheduled orchestration runs anyway |
| **Which tests will catch it** | `EntityExecutor.executeBatch.discardActionsOnException` |
| **Dotnet reference** | [TaskEntityShim.cs](src/Worker/Core/Shims/TaskEntityShim.cs) L91 - `context.Rollback()` |

## Risk 4: Entity ID Format and Normalization

| Aspect | Details |
|--------|---------|
| **Why it's risky** | Entity names are case-normalized but keys are not. Wrong normalization causes entity mismatch. |
| **How to detect incorrect behavior** | Entity("Counter", "Key1") and Entity("counter", "Key1") treated as different entities |
| **Which tests will catch it** | `EntityInstanceId.constructor.normalizesName` |
| **Dotnet reference** | [EntityInstanceId.cs](src/Abstractions/Entities/EntityInstanceId.cs) L29 - `name.ToLowerInvariant()` |

## Risk 5: Lock Set Sorting

| Aspect | Details |
|--------|---------|
| **Why it's risky** | Lock requests must sort entity IDs to prevent deadlocks. Wrong ordering causes deadlocks in production. |
| **How to detect incorrect behavior** | Two orchestrations locking [A, B] and [B, A] deadlock |
| **Which tests will catch it** | `OrchestrationContext.entities.lockEntities.sortsEntities` |
| **Dotnet reference** | Lock set is sorted in `EmitAcquireMessage` (DurableTask.Core) |

## Risk 6: Case-Insensitive Operation Dispatch

| Aspect | Details |
|--------|---------|
| **Why it's risky** | Operations must match methods case-insensitively. Wrong matching causes NotSupportedException for valid operations. |
| **How to detect incorrect behavior** | Calling "add" doesn't match method "Add" |
| **Which tests will catch it** | `TaskEntity.dispatch.matchesMethodCaseInsensitive` |
| **Dotnet reference** | [TaskEntityOperationExtensions.cs](src/Abstractions/Entities/TaskEntityOperationExtensions.cs) L17 - `BindingFlags.IgnoreCase` |

## Risk 7: Async Operation Unwrapping

| Aspect | Details |
|--------|---------|
| **Why it's risky** | Operations can return Promise, Task-like objects. State must be persisted AFTER async completes, not before. |
| **How to detect incorrect behavior** | State is set, then async operation continues and sets different state, but first state was already persisted |
| **Which tests will catch it** | `TaskEntity.dispatch.handlesAsyncMethods` |
| **Dotnet reference** | [TaskEntityHelpers.cs](src/Abstractions/Entities/TaskEntityHelpers.cs) - `UnwrapAsync` |

## Risk 8: Proto Message Compatibility

| Aspect | Details |
|--------|---------|
| **Why it's risky** | Proto files must match between JS SDK and backend. Mismatched protos cause serialization failures. |
| **How to detect incorrect behavior** | RPC calls fail with deserialization errors |
| **Which tests will catch it** | Integration tests against real backend |
| **Dotnet reference** | [orchestrator_service.proto](src/Grpc/orchestrator_service.proto) - must match JS proto |

## Risk 9: Entity Response Correlation

| Aspect | Details |
|--------|---------|
| **Why it's risky** | Entity call responses come as external events named with requestId. Wrong correlation causes wrong results delivered to wrong callers. |
| **How to detect incorrect behavior** | Response from entity A delivered to caller waiting for entity B |
| **Which tests will catch it** | `OrchestrationExecutor.entityOperationCompleted.completesTask` - verify correct task completed |
| **Dotnet reference** | [TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) L175 - `WaitForExternalEvent<OperationResult>(requestId.ToString())` |

## Risk 10: Critical Section State Recovery After Entity Call

| Aspect | Details |
|--------|---------|
| **Why it's risky** | When orchestration calls entity while holding lock, it temporarily "gives up" the lock. State must be recovered after call returns. |
| **How to detect incorrect behavior** | After entity call, `inCriticalSection()` returns false even though lock should still be held |
| **Which tests will catch it** | Integration test: lock entity A, call entity B, verify still in critical section |
| **Dotnet reference** | [TaskOrchestrationEntityContext.cs](src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs) L179 - `RecoverLockAfterCall` |

---

# Appendix: File Reference Summary

## Dotnet Files Referenced

| Category | Files |
|----------|-------|
| **Abstractions** | `src/Abstractions/Entities/EntityInstanceId.cs`, `src/Abstractions/Entities/TaskEntity.cs`, `src/Abstractions/Entities/TaskEntityOperation.cs`, `src/Abstractions/Entities/TaskEntityState.cs`, `src/Abstractions/Entities/TaskEntityContext.cs`, `src/Abstractions/Entities/TaskOrchestrationEntityFeature.cs`, `src/Abstractions/Entities/CallEntityOptions.cs`, `src/Abstractions/Entities/EntityOperationFailedException.cs`, `src/Abstractions/Entities/TaskEntityHelpers.cs`, `src/Abstractions/Entities/TaskEntityOperationExtensions.cs` |
| **Client** | `src/Client/Core/Entities/DurableEntityClient.cs`, `src/Client/Core/Entities/EntityMetadata.cs`, `src/Client/Core/Entities/EntityQuery.cs`, `src/Client/Core/Entities/CleanEntityStorage.cs`, `src/Client/Grpc/GrpcDurableEntityClient.cs` |
| **Worker** | `src/Worker/Core/Shims/TaskEntityShim.cs`, `src/Worker/Core/Shims/TaskOrchestrationEntityContext.cs`, `src/Worker/Core/Shims/DurableTaskShimFactory.cs`, `src/Worker/Grpc/GrpcEntityRunner.cs`, `src/Worker/Grpc/GrpcDurableTaskWorker.Processor.cs` |
| **Shared** | `src/Shared/Grpc/EntityConversions.cs` |
| **Proto** | `src/Grpc/orchestrator_service.proto` |
| **Tests** | `test/Worker/Grpc.Tests/GrpcEntityRunnerTests.cs`, `test/Abstractions.Tests/Entities/EntityTaskEntityTests.cs`, `test/Client/Core.Tests/Entities/EntityMetadataTests.cs`, `test/Client/OrchestrationServiceClientShim.Tests/ShimDurableEntityClientTests.cs` |
| **Samples** | `samples/AzureFunctionsApp/Entities/Counter.cs` |

## JS Files to Create/Modify

| Action | Files |
|--------|-------|
| **Create** | `src/entities/entity-instance-id.ts`, `src/entities/task-entity.ts`, `src/entities/task-entity-operation.ts`, `src/entities/task-entity-state.ts`, `src/entities/task-entity-context.ts`, `src/entities/orchestration-entity-feature.ts`, `src/entities/entity-metadata.ts`, `src/entities/entity-query.ts`, `src/entities/signal-entity-options.ts`, `src/entities/call-entity-options.ts`, `src/entities/clean-entity-storage.ts`, `src/entities/exceptions/entity-operation-failed.ts`, `src/worker/entity-executor.ts`, `src/client/entity-client.ts` (optional), `src/entities/index.ts` |
| **Modify** | `src/worker/task-hub-grpc-worker.ts`, `src/worker/registry.ts`, `src/worker/runtime-orchestration-context.ts`, `src/worker/orchestration-executor.ts`, `src/task/context/orchestration-context.ts`, `src/client/client.ts`, `src/utils/pb-helper.util.ts`, `src/index.ts` |
