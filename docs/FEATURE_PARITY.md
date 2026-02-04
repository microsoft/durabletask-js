# Feature Parity: durabletask-js vs durabletask-dotnet

This document provides a comprehensive comparison between the **durabletask-js** (JavaScript/TypeScript) SDK and the **durabletask-dotnet** (.NET) SDK, highlighting features that are missing or incomplete in the JavaScript implementation.

> **Last Updated:** February 2026  
> **Comparison Basis:** `main` branches of both repositories

---

## Table of Contents

- [Summary](#summary)
- [Feature Comparison Matrix](#feature-comparison-matrix)
- [Detailed Feature Analysis](#detailed-feature-analysis)
  - [1. Durable Entities](#1-durable-entities)
  - [2. Scheduled Tasks](#2-scheduled-tasks)
  - [3. Orchestration Context Features](#3-orchestration-context-features)
  - [4. Activity Context Features](#4-activity-context-features)
  - [5. Client Features](#5-client-features)
  - [6. Retry Mechanisms](#6-retry-mechanisms)
  - [7. StartOrchestrationOptions](#7-startorchestrationoptions)
  - [8. OrchestrationMetadata / OrchestrationState](#8-orchestrationmetadata--orchestrationstate)
  - [9. Terminate and Purge Options](#9-terminate-and-purge-options)
  - [10. Data Serialization](#10-data-serialization)
  - [11. Logging and Diagnostics](#11-logging-and-diagnostics)
  - [12. Developer Experience](#12-developer-experience)
  - [13. Testing Infrastructure](#13-testing-infrastructure)
  - [14. Extensions](#14-extensions)
- [Implementation Priority Recommendations](#implementation-priority-recommendations)

---

## Summary

| Category | .NET Features | JS Features | Parity % |
|----------|--------------|-------------|----------|
| Core Orchestrations | 15 | 13 | ~87% |
| Durable Entities | 12 | 0 | 0% |
| Scheduled Tasks | 8 | 0 | 0% |
| Client APIs | 18 | 14 | ~78% |
| Retry Mechanisms | 4 | 1 | 25% |
| Developer Tools | 4 | 0 | 0% |
| **Overall** | **61** | **28** | **~46%** |

---

## Feature Comparison Matrix

### Legend
- ✅ Fully Implemented
- ⚠️ Partially Implemented
- ❌ Not Implemented
- N/A Not Applicable

| Feature | .NET | JS | Notes |
|---------|------|----|----- |
| **Core Orchestration** |
| Orchestrations | ✅ | ✅ | |
| Activities | ✅ | ✅ | |
| Sub-orchestrations | ✅ | ✅ | |
| Durable Timers | ✅ | ✅ | |
| External Events | ✅ | ✅ | |
| ContinueAsNew | ✅ | ✅ | |
| Custom Status | ✅ | ✅ | |
| SendEvent (orch-to-orch) | ✅ | ✅ | |
| NewGuid (deterministic) | ✅ | ✅ | |
| IsReplaying flag | ✅ | ✅ | |
| CurrentUtcDateTime | ✅ | ✅ | |
| Timer Cancellation | ✅ | ❌ | No CancellationToken support |
| WaitForExternalEvent with Timeout | ✅ | ❌ | |
| Parent Orchestration Info | ✅ | ✅ | Implemented in v0.1.0-alpha.2 |
| Orchestration Version | ✅ | ❌ | |
| Context Properties | ✅ | ❌ | |
| Replay-Safe Logger | ✅ | ❌ | |
| **Durable Entities** |
| Entity Client | ✅ | ❌ | |
| TaskEntity / ITaskEntity | ✅ | ❌ | |
| TaskEntityContext | ✅ | ❌ | |
| SignalEntity | ✅ | ❌ | |
| CallEntity | ✅ | ❌ | |
| LockEntitiesAsync | ✅ | ❌ | |
| InCriticalSection | ✅ | ❌ | |
| EntityInstanceId | ✅ | ❌ | |
| EntityQuery | ✅ | ❌ | |
| CleanEntityStorage | ✅ | ❌ | |
| Entity from Orchestration | ✅ | ❌ | |
| Entity State Management | ✅ | ❌ | |
| **Scheduled Tasks** |
| ScheduledTaskClient | ✅ | ❌ | |
| ScheduleClient | ✅ | ❌ | |
| CreateSchedule | ✅ | ❌ | |
| UpdateSchedule | ✅ | ❌ | |
| DeleteSchedule | ✅ | ❌ | |
| PauseSchedule | ✅ | ❌ | |
| ResumeSchedule | ✅ | ❌ | |
| ListSchedules | ✅ | ❌ | |
| **Client APIs** |
| ScheduleNewOrchestration | ✅ | ✅ | |
| GetOrchestrationState | ✅ | ✅ | |
| WaitForInstanceStart | ✅ | ✅ | |
| WaitForInstanceCompletion | ✅ | ✅ | |
| RaiseEvent | ✅ | ✅ | |
| Terminate | ✅ | ✅ | |
| Suspend/Resume | ✅ | ✅ | |
| Purge Instance | ✅ | ✅ | |
| Query Instances | ✅ | ✅ | |
| List Instance IDs | ✅ | ✅ | |
| Restart Orchestration | ✅ | ✅ | |
| Rewind Instance | ✅ | ✅ | |
| Get Orchestration History | ✅ | ❌ | |
| Recursive Termination | ✅ | ❌ | |
| Recursive Purge | ✅ | ❌ | |
| CancellationToken Support | ✅ | ❌ | |
| Suspend/Resume with Reason | ✅ | ⚠️ | JS has no reason parameter |
| **Retry Mechanisms** |
| Declarative RetryPolicy | ✅ | ✅ | |
| RetryHandler (Custom) | ✅ | ❌ | |
| AsyncRetryHandler | ✅ | ❌ | |
| RetryContext | ✅ | ❌ | |
| HandleFailure Delegate | ✅ | ❌ | |
| **Data Serialization** |
| DataConverter (Abstract) | ✅ | ❌ | JS uses JSON.stringify only |
| JsonDataConverter | ✅ | ❌ | |
| Custom Serializers | ✅ | ❌ | |
| ReadInputAs<T> | ✅ | ❌ | |
| ReadOutputAs<T> | ✅ | ❌ | |
| ReadCustomStatusAs<T> | ✅ | ❌ | |
| **Developer Tools** |
| Source Generators | ✅ | ❌ | |
| Roslyn Analyzers | ✅ | ❌ | |
| In-Process Test Host | ✅ | ❌ | |
| DI Integration | ✅ | ❌ | |
| **Extensions** |
| Azure Blob Payloads | ✅ | ❌ | |
| Export History | ✅ | ❌ | |
| Azure Functions Integration | ✅ | ❌ | Separate package exists |

---

## Detailed Feature Analysis

### 1. Durable Entities

**Status: ❌ Not Implemented**

Durable Entities provide a programming model for managing stateful objects in a distributed environment. This is a major feature gap.

#### .NET Implementation

```csharp
// Entity Definition
[DurableTask(nameof(Counter))]
public class Counter : TaskEntity<int>
{
    public void Add(int amount) => this.State += amount;
    public void Reset() => this.State = 0;
    public int Get() => this.State;
}

// From Orchestration
await context.Entities.CallEntityAsync<int>(
    new EntityInstanceId("Counter", "myCounter"),
    "Add",
    5);

// Entity Locking
await using (await context.Entities.LockEntitiesAsync(entity1, entity2))
{
    // Critical section with locked entities
}
```

#### Missing in JS

| Component | Description |
|-----------|-------------|
| `DurableEntityClient` | Client for signaling and querying entities |
| `TaskEntity<TState>` | Base class for entity implementations |
| `TaskEntityContext` | Context passed to entity operations |
| `EntityInstanceId` | Typed identifier for entities |
| `SignalEntityAsync` | Fire-and-forget entity operations |
| `CallEntityAsync` | Request-response entity operations |
| `LockEntitiesAsync` | Distributed locking via entities |
| `InCriticalSection` | Check if locks are held |
| `GetEntityAsync` | Query entity state |
| `GetAllEntitiesAsync` | Query multiple entities |
| `CleanEntityStorageAsync` | Cleanup orphaned entities |

---

### 2. Scheduled Tasks

**Status: ❌ Not Implemented**

Scheduled Tasks provide CRON-based scheduling of orchestrations.

#### .NET Implementation

```csharp
// Create a schedule
var scheduleClient = scheduledTaskClient.GetScheduleClient("mySchedule");
await scheduleClient.CreateAsync(new ScheduleCreationOptions
{
    OrchestrationName = "MyOrchestrator",
    Schedule = "0 * * * *", // Every hour
    Input = new { foo = "bar" }
});

// Manage schedule lifecycle
await scheduleClient.PauseAsync();
await scheduleClient.ResumeAsync();
await scheduleClient.DeleteAsync();
```

#### Missing in JS

| Component | Description |
|-----------|-------------|
| `ScheduledTaskClient` | Client for managing schedules |
| `ScheduleClient` | Handle to individual schedule |
| `ScheduleCreationOptions` | Options for creating schedules |
| `ScheduleDescription` | Metadata about a schedule |
| `ScheduleQuery` | Filter for listing schedules |
| CRUD Operations | Create, Read, Update, Delete schedules |
| Lifecycle Management | Pause, Resume schedules |

---

### 3. Orchestration Context Features

#### Missing Features

##### 3.1 Timer Cancellation

**Status: ❌ Not Implemented**

```csharp
// .NET - Timer with cancellation
using var cts = new CancellationTokenSource();
var timerTask = context.CreateTimer(TimeSpan.FromMinutes(5), cts.Token);
var eventTask = context.WaitForExternalEvent<string>("approval");

var winner = await Task.WhenAny(timerTask, eventTask);
if (winner == eventTask)
{
    cts.Cancel(); // Cancel the timer
}
```

```typescript
// JS - No cancellation support
const timerTask = ctx.createTimer(Date.now() + 5 * 60 * 1000);
const eventTask = ctx.waitForExternalEvent("approval");
// Cannot cancel timer if event arrives first
```

##### 3.2 WaitForExternalEvent with Timeout

**Status: ❌ Not Implemented**

```csharp
// .NET - Built-in timeout support
var result = await context.WaitForExternalEvent<string>("approval", TimeSpan.FromMinutes(30));
```

```typescript
// JS - Must implement manually with whenAny
const eventTask = ctx.waitForExternalEvent("approval");
const timeoutTask = ctx.createTimer(Date.now() + 30 * 60 * 1000);
const winner = yield whenAny([eventTask, timeoutTask]);
```

##### 3.3 Parent Orchestration Instance

**Status: ✅ Implemented (v0.1.0-alpha.2)**

```csharp
// .NET
public record ParentOrchestrationInstance(TaskName Name, string InstanceId);

// Access in orchestration
if (context.Parent != null)
{
    logger.LogInformation("Parent: {Name} ({Id})", context.Parent.Name, context.Parent.InstanceId);
}
```

```typescript
// JS - Now available!
import { ParentOrchestrationInstance, OrchestrationContext } from "@microsoft/durabletask-js";

const myOrchestrator = async (ctx: OrchestrationContext) => {
  if (ctx.parent) {
    console.log(`Parent: ${ctx.parent.name} (${ctx.parent.instanceId})`);
    // ctx.parent.taskScheduledId is also available
  }
  return "done";
};
```

##### 3.4 Orchestration Version

**Status: ❌ Not Implemented**

```csharp
// .NET
public virtual string Version => string.Empty;

// Usage
if (context.CompareVersionTo("2.0") < 0)
{
    // Legacy behavior for older versions
}
```

##### 3.5 Context Properties

**Status: ❌ Not Implemented**

```csharp
// .NET - Extensible properties dictionary
public virtual IReadOnlyDictionary<string, object?> Properties { get; }
```

##### 3.6 Replay-Safe Logger

**Status: ❌ Not Implemented**

```csharp
// .NET
var logger = context.CreateReplaySafeLogger<MyOrchestrator>();
logger.LogInformation("This only logs when not replaying");
```

```typescript
// JS - Manual check required
if (!ctx.isReplaying) {
    console.log("This only logs when not replaying");
}
```

---

### 4. Activity Context Features

#### Missing Features

| Feature | .NET | JS | Description |
|---------|------|----|----|
| `Name` | ✅ | ❌ | Name of the activity being executed |
| `InstanceId` | ✅ | ⚠️ | JS has `orchestrationId` instead |

```csharp
// .NET TaskActivityContext
public abstract TaskName Name { get; }
public abstract string InstanceId { get; }
```

```typescript
// JS ActivityContext
get orchestrationId(): string;
get taskId(): number;
// Missing: name property
```

---

### 5. Client Features

#### Missing Features

##### 5.1 Get Orchestration History

**Status: ❌ Not Implemented**

```csharp
// .NET
IList<HistoryEvent> history = await client.GetOrchestrationHistoryAsync(instanceId);
```

##### 5.2 Recursive Termination

**Status: ❌ Not Implemented**

```csharp
// .NET
await client.TerminateInstanceAsync(instanceId, new TerminateInstanceOptions
{
    Output = "Terminated by admin",
    Recursive = true  // Also terminate sub-orchestrations
});
```

```typescript
// JS
await client.terminateOrchestration(instanceId, output);
// Cannot terminate sub-orchestrations recursively
```

##### 5.3 Suspend/Resume with Reason

**Status: ⚠️ Partially Implemented**

```csharp
// .NET
await client.SuspendInstanceAsync(instanceId, "Maintenance window");
await client.ResumeInstanceAsync(instanceId, "Maintenance complete");
```

```typescript
// JS - No reason parameter
await client.suspendOrchestration(instanceId);
await client.resumeOrchestration(instanceId);
```

##### 5.4 CancellationToken Support

**Status: ❌ Not Implemented**

All .NET client methods accept `CancellationToken` for request cancellation. JS has no equivalent (could use `AbortSignal`).

---

### 6. Retry Mechanisms

#### Missing Features

##### 6.1 Custom Retry Handler

**Status: ❌ Not Implemented**

```csharp
// .NET - Full control over retry logic
public delegate bool RetryHandler(RetryContext retryContext);
public delegate Task<bool> AsyncRetryHandler(RetryContext retryContext);

var options = TaskOptions.FromRetryHandler(ctx =>
{
    if (ctx.LastFailure.ErrorType == "TransientError")
    {
        return ctx.LastAttemptNumber < 5;
    }
    return false; // Don't retry other errors
});
```

##### 6.2 RetryContext

**Status: ❌ Not Implemented**

```csharp
// .NET
public record RetryContext(
    TaskOrchestrationContext OrchestrationContext,
    int LastAttemptNumber,
    TaskFailureDetails LastFailure,
    TimeSpan TotalRetryTime,
    CancellationToken CancellationToken);
```

##### 6.3 HandleFailure Delegate

**Status: ❌ Not Implemented**

```csharp
// .NET - Filter retries based on failure details
var policy = new RetryPolicy(maxAttempts: 5, firstRetryInterval: TimeSpan.FromSeconds(1))
{
    HandleFailure = failure => failure.ErrorType != "FatalError"
};
```

---

### 7. StartOrchestrationOptions

| Property | .NET | JS | Status |
|----------|------|----|----|
| `InstanceId` | ✅ | ✅ | ✅ Implemented |
| `StartAt` | ✅ | ✅ | ✅ Implemented |
| `Version` | ✅ | ❌ | ❌ Not Implemented |
| `Tags` | ✅ | ❌ | ❌ Not Implemented |
| `DedupeStatuses` | ✅ | ❌ | ❌ Not Implemented |

```csharp
// .NET
public record StartOrchestrationOptions
{
    public string? InstanceId { get; init; }
    public DateTimeOffset? StartAt { get; init; }
    public TaskVersion? Version { get; init; }
    public IReadOnlyDictionary<string, string> Tags { get; init; }
    public IReadOnlyList<string>? DedupeStatuses { get; init; }
}
```

```typescript
// JS - Current implementation
interface StartOrchestrationOptions {
    instanceId?: string;
    startAt?: Date;
    // Missing: version, tags, dedupeStatuses
}
```

---

### 8. OrchestrationMetadata / OrchestrationState

| Property/Method | .NET | JS | Status |
|----------|------|----|----|
| `InstanceId` | ✅ | ✅ | ✅ |
| `Name` | ✅ | ✅ | ✅ |
| `RuntimeStatus` | ✅ | ✅ | ✅ |
| `CreatedAt` | ✅ | ✅ | ✅ |
| `LastUpdatedAt` | ✅ | ✅ | ✅ |
| `SerializedInput` | ✅ | ✅ | ✅ |
| `SerializedOutput` | ✅ | ✅ | ✅ |
| `SerializedCustomStatus` | ✅ | ✅ | ✅ |
| `FailureDetails` | ✅ | ✅ | ✅ |
| `Tags` | ✅ | ❌ | ❌ Not Implemented |
| `DataConverter` | ✅ | ❌ | ❌ |
| `IsRunning` | ✅ | ❌ | ❌ Helper property |
| `IsCompleted` | ✅ | ❌ | ❌ Helper property |
| `ReadInputAs<T>()` | ✅ | ❌ | ❌ Type-safe deserialization |
| `ReadOutputAs<T>()` | ✅ | ❌ | ❌ Type-safe deserialization |
| `ReadCustomStatusAs<T>()` | ✅ | ❌ | ❌ Type-safe deserialization |
| `raiseIfFailed()` | ❌ | ✅ | JS has this, .NET doesn't |

---

### 9. Terminate and Purge Options

#### TerminateInstanceOptions

| Property | .NET | JS | Status |
|----------|------|----|----|
| `Output` | ✅ | ✅ | ✅ |
| `Recursive` | ✅ | ❌ | ❌ Not Implemented |

#### PurgeInstanceOptions

| Property | .NET | JS | Status |
|----------|------|----|----|
| `Recursive` | ✅ | ❌ | ❌ Not Implemented |

---

### 10. Data Serialization

**Status: ❌ Not Implemented**

.NET provides an extensible data serialization layer that JS lacks.

```csharp
// .NET - Abstract DataConverter
public abstract class DataConverter
{
    public abstract string? Serialize(object? value);
    public abstract object? Deserialize(string? data, Type targetType);
    public virtual T? Deserialize<T>(string? data);
}

// Custom implementation example
public class MessagePackDataConverter : DataConverter
{
    // Custom serialization logic
}
```

```typescript
// JS - Hardcoded JSON.stringify/JSON.parse
JSON.stringify(input)
JSON.parse(serializedOutput)
```

---

### 11. Logging and Diagnostics

| Feature | .NET | JS | Status |
|----------|------|----|----|
| Logger Interface | ✅ | ✅ | ✅ |
| ConsoleLogger | ✅ | ✅ | ✅ |
| NoOpLogger | ✅ | ✅ | ✅ |
| Replay-Safe Logger | ✅ | ❌ | ❌ |
| ILoggerFactory Integration | ✅ | ❌ | ❌ |
| Structured Logging | ✅ | ⚠️ | Partial |

---

### 12. Developer Experience

#### Source Generators

**Status: ❌ Not Implemented**

.NET has Roslyn source generators that provide:
- Type-safe orchestration/activity invocation methods
- Compile-time validation
- IntelliSense support

```csharp
// Generated extension method
await context.CallSayHelloAsync("World"); // Type-safe, no string names
```

#### Roslyn Analyzers

**Status: ❌ Not Implemented**

.NET has analyzers that detect:
- Orchestrator determinism violations
- Incorrect API usage
- Best practice violations

#### DI Integration

**Status: ❌ Not Implemented**

```csharp
// .NET - Full DI support
services.AddDurableTaskClient();
services.AddDurableTaskWorker(builder =>
{
    builder.AddTasks<MyActivities>();
});
```

---

### 13. Testing Infrastructure

| Feature | .NET | JS | Status |
|----------|------|----|----|
| In-Process Test Host | ✅ | ❌ | ❌ |
| Mock Contexts | ✅ | ❌ | ❌ |
| Unit Test Utilities | ✅ | ❌ | ❌ |

```csharp
// .NET - In-process testing without sidecar
await using var host = new DurableTaskTestHost();
await host.StartAsync();

var client = host.Client;
var instanceId = await client.ScheduleNewOrchestrationInstanceAsync(nameof(MyOrchestration));
```

---

### 14. Extensions

#### Azure Blob Payloads

**Status: ❌ Not Implemented**

Large message offloading to Azure Blob Storage.

#### Export History

**Status: ❌ Not Implemented**

Export orchestration history to external systems.

---

## Implementation Priority Recommendations

### Priority 1: High Impact, Common Use Cases

1. **Tags Support** - Simple to implement, commonly needed for filtering
2. **Parent Orchestration Info** - Important for debugging sub-orchestrations
3. **Timer Cancellation** - Essential for proper resource cleanup
4. **WaitForExternalEvent with Timeout** - Common pattern, error-prone without it
5. **Suspend/Resume with Reason** - Simple enhancement

### Priority 2: Advanced Scenarios

1. **Custom Retry Handler** - Enables sophisticated error handling
2. **RetryContext** - Required for custom retry handlers
3. **Activity Name Property** - Minor but useful for logging
4. **Recursive Termination** - Important for managing sub-orchestrations
5. **Version Support** - Important for production deployments

### Priority 3: Enterprise Features

1. **Durable Entities** - Major feature for stateful patterns
2. **Scheduled Tasks** - Important for CRON-based workflows
3. **Get Orchestration History** - Useful for debugging
4. **Custom DataConverter** - Enables alternative serialization

### Priority 4: Developer Experience

1. **Replay-Safe Logger** - Quality of life improvement
2. **In-Process Test Host** - Enables faster testing
3. **Helper Properties (IsRunning, IsCompleted)** - Convenience methods
4. **Type-safe Deserialization (ReadInputAs<T>)** - TypeScript could benefit

---

## Contributing

If you'd like to help close these feature gaps, please:

1. Check existing issues for the feature you want to implement
2. Open a new issue if one doesn't exist
3. Reference this document in your PR

---

## References

- [durabletask-dotnet Repository](https://github.com/microsoft/durabletask-dotnet)
- [durabletask-js Repository](https://github.com/microsoft/durabletask-js)
- [Durable Task Framework](https://github.com/Azure/durabletask)
- [Azure Durable Functions Documentation](https://docs.microsoft.com/azure/azure-functions/durable/)
