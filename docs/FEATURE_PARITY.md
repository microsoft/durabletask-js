# Feature Parity: durabletask-js vs durabletask-dotnet

This document tracks the feature parity between the JavaScript/TypeScript SDK (`durabletask-js`) and the .NET SDK (`durabletask-dotnet`).

**Last Updated**: January 28, 2026

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented |
| ⚠️ | Partially implemented |
| ❌ | Not implemented |
| 🔄 | In progress |
| N/A | Not applicable |

---

## Orchestration Context Features

Features available within an orchestrator function.

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| `instanceId` | ✅ | ✅ | Get current instance ID |
| `currentUtcDateTime` | ✅ | ✅ | Deterministic timestamp |
| `isReplaying` | ✅ | ✅ | Check if replaying history |
| `name` | ❌ | ✅ | Get orchestrator name |
| `parent` | ❌ | ✅ | Get parent orchestration instance |
| `version` | ❌ | ✅ | Get orchestration version |
| `properties` | ❌ | ✅ | Configuration settings dictionary |
| `getInput<T>()` | ⚠️ | ✅ | Input passed via orchestrator function parameter in JS |
| `callActivity()` | ✅ | ✅ | Call an activity function |
| `callSubOrchestrator()` | ✅ | ✅ | Call a sub-orchestration |
| `createTimer()` | ✅ | ✅ | Create a durable timer |
| `waitForExternalEvent()` | ✅ | ✅ | Wait for an external event |
| `waitForExternalEvent() with timeout` | ❌ | ✅ | Wait with timeout support |
| `sendEvent()` | ❌ | ✅ | Send event to another orchestration from within orchestrator |
| `setCustomStatus()` | ❌ | ✅ | Set custom status on orchestration |
| `continueAsNew()` | ✅ | ✅ | Restart orchestration with new input |
| `newGuid()` | ❌ | ✅ | Generate deterministic GUID |
| `createReplaySafeLogger()` | ❌ | ✅ | Logger that only logs when not replaying |
| `compareVersionTo()` | ❌ | ✅ | Compare orchestration versions |
| **Entity Features** | | | |
| `entities.callEntityAsync()` | ❌ | ✅ | Call entity and wait for result |
| `entities.signalEntityAsync()` | ❌ | ✅ | Signal entity (fire-and-forget) |
| `entities.lockEntitiesAsync()` | ❌ | ✅ | Acquire entity locks |
| `entities.inCriticalSection()` | ❌ | ✅ | Check if in critical section |

---

## Task Options & Retry Policies

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| `TaskOptions` | ❌ | ✅ | Options for controlling task execution |
| `RetryPolicy` | ❌ | ✅ | Declarative retry policy |
| `TaskRetryOptions` | ❌ | ✅ | Retry options wrapper |
| `RetryHandler` | ❌ | ✅ | Custom retry handler callback |
| `AsyncRetryHandler` | ❌ | ✅ | Async custom retry handler |
| `SubOrchestrationOptions` | ❌ | ✅ | Options for sub-orchestrations (instance ID, etc.) |
| Activity retry with policy | ❌ | ✅ | Automatic retry on activity failure |
| Sub-orchestration retry | ❌ | ✅ | Automatic retry on sub-orchestration failure |

---

## Client Features

Features available on the `DurableTaskClient` / `TaskHubGrpcClient`.

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| `scheduleNewOrchestration()` | ✅ | ✅ | Start a new orchestration |
| `getOrchestrationState()` / `getInstance()` | ✅ | ✅ | Get orchestration metadata |
| `waitForOrchestrationStart()` | ✅ | ✅ | Wait for orchestration to start |
| `waitForOrchestrationCompletion()` | ✅ | ✅ | Wait for orchestration to complete |
| `raiseOrchestrationEvent()` | ✅ | ✅ | Send event to orchestration |
| `terminateOrchestration()` | ✅ | ✅ | Terminate an orchestration |
| `terminateOrchestration() recursive` | ❌ | ✅ | Terminate with sub-orchestrations |
| `suspendOrchestration()` | ✅ | ✅ | Suspend an orchestration |
| `resumeOrchestration()` | ✅ | ✅ | Resume a suspended orchestration |
| `purgeOrchestration()` | ✅ | ✅ | Purge single orchestration |
| `purgeOrchestration() with criteria` | ⚠️ | ✅ | Purge by filter (partial in JS) |
| `purgeAllInstances()` | ❌ | ✅ | Purge multiple orchestrations |
| `getAllInstances()` / query | ❌ | ✅ | Query orchestration instances |
| `restartAsync()` | ❌ | ✅ | Restart an orchestration |
| `rewindInstanceAsync()` | ❌ | ✅ | Rewind failed orchestration |
| `getOrchestrationHistory()` | ❌ | ✅ | Get orchestration history events |
| `listInstanceIds()` | ❌ | ✅ | List instance IDs with pagination |
| **Entity Client** | | | |
| `entities.signalEntity()` | ❌ | ✅ | Signal an entity |
| `entities.getEntity()` | ❌ | ✅ | Get entity state |
| `entities.getEntities()` / query | ❌ | ✅ | Query entities |
| `entities.cleanEntityStorage()` | ❌ | ✅ | Clean entity storage |

---

## Worker Features

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| Register orchestrators | ✅ | ✅ | Add orchestrator functions |
| Register activities | ✅ | ✅ | Add activity functions |
| Register entities | ❌ | ✅ | Add entity functions |
| Named orchestrators | ✅ | ✅ | Register with explicit name |
| Named activities | ✅ | ✅ | Register with explicit name |
| Start/Stop worker | ✅ | ✅ | Control worker lifecycle |
| Reconnection logic | ✅ | ✅ | Auto-reconnect on disconnect |

---

## Durable Entities

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| Entity definition | ❌ | ✅ | `TaskEntity` base class |
| Entity context | ❌ | ✅ | `TaskEntityContext` |
| Entity operations | ❌ | ✅ | `TaskEntityOperation` |
| Entity state management | ❌ | ✅ | `TaskEntityState` |
| Entity instance ID | ❌ | ✅ | `EntityInstanceId` |
| Entity locking | ❌ | ✅ | Critical sections |
| Entity signals from orchestrator | ❌ | ✅ | Signal entity from orchestration |
| Entity calls from orchestrator | ❌ | ✅ | Call entity from orchestration |

---

## Scheduled Tasks

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| Scheduled task definitions | ❌ | ✅ | Define recurring tasks |
| Scheduled task orchestrations | ❌ | ✅ | Orchestrations for scheduled tasks |
| Scheduled task client | ❌ | ✅ | Manage scheduled tasks |

---

## Export History

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| Export history jobs | ❌ | ✅ | Export orchestration history |
| History export orchestrations | ❌ | ✅ | |
| History export models | ❌ | ✅ | |

---

## Azure Blob Payloads

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| Large payload support | ❌ | ✅ | Store large payloads in blob storage |

---

## Task Utilities

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| `whenAll()` | ✅ | ✅ | Wait for all tasks |
| `whenAny()` | ✅ | ✅ | Wait for any task |
| `Task` class | ✅ | ✅ | Completable task wrapper |
| Cancellation tokens | ❌ | ✅ | Cancel pending operations |

---

## Data Conversion & Serialization

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| Custom DataConverter | ❌ | ✅ | Pluggable serialization |
| JSON serialization | ✅ | ✅ | Default JSON handling |

---

## Analyzers & Generators

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| Roslyn analyzers | N/A | ✅ | Static code analysis |
| Source generators | N/A | ✅ | Code generation |

---

## Azure Managed Backend

Features specific to Azure-managed Durable Task Scheduler (DTS).

| Feature | JS SDK | .NET SDK | Notes |
|---------|--------|----------|-------|
| DTS Client | ✅ | ✅ | Connect to DTS |
| DTS Worker | ✅ | ✅ | Process work items from DTS |
| Token authentication | ✅ | ✅ | Azure identity support |
| Connection string | ✅ | ✅ | Configure via connection string |

---

## Summary

### High Priority Missing Features

1. **Durable Entities** - Full entity support including definition, state management, and orchestrator integration
2. **Retry Policies** - `TaskOptions`, `RetryPolicy` for activities and sub-orchestrations
3. **Query APIs** - `getAllInstances()`, `listInstanceIds()` for querying orchestrations
4. **Orchestration Context** - `setCustomStatus()`, `sendEvent()`, `newGuid()`
5. **Client Features** - `restartAsync()`, `rewindInstanceAsync()`, `getOrchestrationHistory()`

### Medium Priority Missing Features

1. **Cancellation Tokens** - Ability to cancel pending operations
2. **Custom DataConverter** - Pluggable serialization
3. **WaitForExternalEvent with timeout** - Built-in timeout support
4. **Recursive termination** - Terminate sub-orchestrations with parent

### Lower Priority / Advanced Features

1. **Scheduled Tasks** - Recurring task support
2. **Export History** - History export functionality
3. **Azure Blob Payloads** - Large payload support
4. **Replay-safe Logger** - Logger integration

---

## Contributing

When implementing a missing feature:

1. Update this document to reflect the new status
2. Follow the patterns established in the .NET SDK
3. Add appropriate unit tests
4. Update the main README with any new API documentation
