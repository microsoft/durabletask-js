# Durable Task SDK for JavaScript/TypeScript

[![Build status](https://github.com/microsoft/durabletask-js/actions/workflows/validate-build.yml/badge.svg)](https://github.com/microsoft/durabletask-js/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

This repo contains a JavaScript/TypeScript SDK for use with the [Azure Durable Task Scheduler](https://github.com/Azure/Durable-Task-Scheduler). With this SDK, you can define, schedule, and manage durable orchestrations using ordinary TypeScript/JavaScript code.

> Note that the core `@microsoft/durabletask-js` package does **not** provide the [Azure Durable Functions](https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-overview) programming model, decorators, or worker-indexing metadata — it exposes low-level TaskHubSidecarService gRPC/protobuf helpers that host integrations can reuse (Node.js 22+). For the Azure Durable Functions programming model on the gRPC core, this repository also contains the **`durable-functions`** provider package under [`packages/azure-functions-durable`](./packages/azure-functions-durable). The classic v3 (extension-HTTP) predecessor lives at [azure-functions-durable-js](https://github.com/Azure/azure-functions-durable-js).

## Low-level host integration APIs

Host integrations that already own trigger metadata and transport encoding can depend on the `@microsoft/durabletask-js` package directly. `TaskHubGrpcWorker` registers orchestrators, activities, and entities, and can process raw TaskHubSidecarService protobuf payloads without starting the long-running gRPC worker loop:

```typescript
const worker = new TaskHubGrpcWorker();
worker.addOrchestrator(myOrchestrator);
worker.addActivity(myActivity);
worker.addEntity(myEntity);

const orchestrationResponseBytes = await worker.processOrchestratorRequest(orchestrationRequestBytes);
const entityResponseBytes = await worker.processEntityBatchRequest(entityBatchRequestBytes);
```

`TaskHubGrpcClient` already exposes orchestration start/query/event/terminate/suspend/resume/purge APIs and entity signal/read/query/clean APIs through its existing `hostAddress` and `metadataGenerator` options. Host integrations that need task-hub routing metadata should provide it through `metadataGenerator`, keeping host-specific metadata policy outside the core client. Azure-managed scheduler connection strings remain in `@microsoft/durabletask-js-azuremanaged`.

## Long durable timers

`createTimer(Date | seconds)` has no SDK-imposed total-duration cap. Like the Python SDK,
core workers default to three-day backend segments, including durable retry delays. A ten-day
timer uses 3 + 3 + 3 + 1 day segments but remains one logical `TimerTask`.

| Entry point | Timer behavior |
| --- | --- |
| Core `TaskHubGrpcWorker` / `TestOrchestrationWorker` | Three-day default |
| Azure-managed worker builder | Explicitly native timers; DTS supports long timers |
| `durable-functions` worker / `runOrchestrator` | Inherits the core three-day default |

Core `TaskHubGrpcWorker({ maximumTimerIntervalMs })` and
`TestOrchestrationWorker(backend, { maximumTimerIntervalMs })` accept the Python-equivalent
interval override in milliseconds. Omit it for three days; `null`, zero, or negative values
disable segmentation. Values must be finite. Python's `timedelta` supports microseconds;
JavaScript `Date` supports milliseconds, so positive fractions are rounded up to whole milliseconds.
Functions exposes no timer configuration and also segments when connected to DTS, as in Python;
there is no backend detection. Native in-memory timers still have Node.js's approximately
24.9-day timeout limit when segmentation is disabled.

**Cancellation change:** `timer.cancel()` now returns `true` on first cancellation and `false`
when already terminal. It removes the current segment, marks the timer canceled and complete
(`isCanceled`, `isComplete`, `isCompleted`), and notifies its parent; cancellation is not failure.
`timer.getResult()` and `timer.result` throw `TaskCancelledError` after cancellation. For timers,
`result` now aliases `getResult()` even while pending or failed. A canceled timer can win `whenAny`;
inspect `isCanceled` before reading its result. `whenAll` counts cancellation as terminal and
propagates the error when collecting final child results, which can throw from `cancel()` or
a sibling's completion callback. Do not yield a canceled timer expecting success.
If that callback throws, do not catch it and reuse the `whenAll` group or its parents:
the group can already be marked complete without a result and without notifying its parent.
Like Python, `getResult()` rejects this uninitialized result instead of treating it as success.
Parent notification is not resumed after the callback exception.
Custom `Task` subclasses now have their completed `getResult()` accessor called on each yield
instead of reading the raw result field. Accessors must be replay-safe; thrown errors fail execution.

**Rollout:** both the core default and cancellation semantics intentionally change to match Python.
Existing single native timer histories replay at their recorded final deadline, but changed
cancellation branching can affect replay. Avoid mixed versions; drain affected instances or use
a new task hub before changing intervals, rolling back, or switching providers.

## npm packages

The following npm packages are available for download.

| Name             | Latest version                                                                                                                                              | Description                                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core SDK         | [![npm version](https://img.shields.io/npm/v/@microsoft/durabletask-js)](https://www.npmjs.com/package/@microsoft/durabletask-js)                           | Core Durable Task SDK for JavaScript/TypeScript.                                                                                                                                |
| AzureManaged SDK | [![npm version](https://img.shields.io/npm/v/@microsoft/durabletask-js-azuremanaged)](https://www.npmjs.com/package/@microsoft/durabletask-js-azuremanaged) | Azure-managed [Durable Task Scheduler](https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-task-scheduler) support for the Durable Task JavaScript SDK. |

## Prerequisites

- [Node.js](https://nodejs.org/) 22 or higher
- An [Azure Durable Task Scheduler](https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-task-scheduler) instance, or the [DTS Emulator](https://github.com/Azure/Durable-Task-Scheduler) for local development

## Usage with the Durable Task Scheduler

This SDK can be used with the [Durable Task Scheduler](https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-task-scheduler), a managed backend for running durable orchestrations in Azure.

To get started, install the npm packages:

```sh
npm install @microsoft/durabletask-js @microsoft/durabletask-js-azuremanaged
```

You can then use the following code to define a simple "Hello, cities" durable orchestration.

```typescript
import { ActivityContext, OrchestrationContext, TOrchestrator } from "@microsoft/durabletask-js";
import { createAzureManagedClient, createAzureManagedWorkerBuilder } from "@microsoft/durabletask-js-azuremanaged";

// Define an activity function
const sayHello = async (_: ActivityContext, name: string): Promise<string> => {
  return `Hello, ${name}!`;
};

// Define an orchestrator function
const helloCities: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const result1 = yield ctx.callActivity(sayHello, "Tokyo");
  const result2 = yield ctx.callActivity(sayHello, "London");
  const result3 = yield ctx.callActivity(sayHello, "Seattle");
  return [result1, result2, result3];
};

// Create client and worker using a connection string
const connectionString = process.env.DURABLE_TASK_SCHEDULER_CONNECTION_STRING!;
const client = createAzureManagedClient(connectionString);
const worker = createAzureManagedWorkerBuilder(connectionString)
  .addOrchestrator(helloCities)
  .addActivity(sayHello)
  .build();

// Start the worker and schedule an orchestration
await worker.start();
const id = await client.scheduleNewOrchestration(helloCities);
const state = await client.waitForOrchestrationCompletion(id, true, 60);
console.log(`Result: ${state?.serializedOutput}`);
```

### Cancelling client waits

`TaskHubGrpcClient.waitForOrchestrationStart()` and `waitForOrchestrationCompletion()` accept
an optional fourth `AbortSignal` argument:

```typescript
const controller = new AbortController();
const waiting = client.waitForOrchestrationCompletion(id, true, 60, controller.signal);
controller.abort(); // Cancel this wait, not the orchestration.
await waiting; // Rejects with controller.signal.reason (an AbortError by default).
```

The timeout is in seconds (default: 60) and includes metadata generation and all retry delays.
Timeouts reject with `TimeoutError` and cancel the pending RPC. Completion waits recover from
server `DEADLINE_EXCEEDED` responses with backoff, without resetting that total timeout;
start waits and other errors are not retried by this wait logic. A later wait can still observe
the orchestration's result after a previous wait was cancelled or timed out.

### Worker concurrency

Core workers can send independent orchestration, activity, and entity concurrency hints to
the backend:

```typescript
const worker = new TaskHubGrpcWorker({
  concurrency: {
    maximumConcurrentOrchestrationWorkItems: 10,
    maximumConcurrentActivityWorkItems: 20,
    maximumConcurrentEntityWorkItems: 5,
  },
});
```

The worker does not locally throttle handlers, and the backend may have more than the requested
number of work items in flight or prefetched. Current Azure DTS versions treat `0` as no limit, so
do not use `0` to disable a work-item kind.

Omitted values default to 100 times `os.availableParallelism()`. Values must be non-negative
safe integers; `0` is forwarded unchanged. Values above the protocol's signed 32-bit range
are capped at `2147483647` on the wire. The same three hints are sent on initial and
reconnected work-item streams.

You can find more samples in the [examples/azure-managed](./examples/azure-managed) directory.

### Worker response delivery

An activity can return `42` but fail to report that result because of a transient gRPC error.
Workers retry the same completion response and token instead of running the activity again.
If a resend is accepted, the backend can advance the workflow using the saved result.
This also applies to orchestration and entity responses, including version-rejection responses.

The policy follows the .NET worker: up to ten SDK sends for `UNAVAILABLE`, `UNKNOWN`,
`DEADLINE_EXCEEDED`, or `INTERNAL`, with backoff starting at 200 ms, doubling to a 15-second
cap before adding 0-20% jitter. Permanent errors and exhausted attempts use the existing
error logs. Configured gRPC transport retries remain enabled, so ten SDK sends can involve
more than ten network attempts.

`stop()` cancels all response RPCs, including the initial send, and retry backoff using
the worker run's signal captured when the work item was dispatched. This applies equally
to inline and streamed orchestrations, activities, entities, and version-failure/rejection
responses. Work finishing after stop cannot send its first response, even after a restart.
User code and metadata generation are not canceled; if metadata finishes after stop,
the response RPC is not started. Channel retirement and backend lock durations are unchanged.
Retries do not guarantee connection recovery, acceptance of expired tokens, or exactly-once execution.

### Inspecting nested failures

Task errors expose an optional, read-only `innerFailure` chain, with `errorType`, `message`,
and optional `stackTrace` at each level. For an activity failure
`OrderFailed -> PaymentFailed -> ConnectionTimeout`, orchestrator code can inspect:

```typescript
import { TaskFailedError } from "@microsoft/durabletask-js";

try {
  yield ctx.callActivity("placeOrder");
} catch (error) {
  if (error instanceof TaskFailedError) {
    const paymentFailure = error.details.innerFailure;
    const rootFailure = paymentFailure?.innerFailure;
    ctx.setCustomStatus({ rootErrorType: rootFailure?.errorType });
  }
  throw error;
}
```

The same chain is available as `context.lastFailure.innerFailure` in retry handlers and
`failure.innerFailure` in `RetryPolicy.handleFailure`. Inspecting nested failures does not
change retry decisions automatically. Client state and history also preserve the chain;
an uncaught or rethrown task error retains its `TaskFailedError` wrapper, with the original
task details under `state.failureDetails.innerFailure`.

Missing inner failures remain `undefined`; existing two- and three-argument
`FailureDetails` constructors still work, with an optional fourth argument for the inner
details. Remote failures are not reconstructed as JavaScript `Error.cause` objects.
The existing writer still limits ordinary `Error.cause` chains to ten inner levels;
reading or forwarding already-received failure details does not add a truncation limit.
If user code mutates received details into a cycle, forwarding preserves each unique
failure and ends the chain with `errorType: "CircularFailureDetails"` and
`message: "A circular innerFailure reference was detected."` rather than looping.

### Reusing orchestration instance IDs

Set the top-level `dedupeStatuses` start option when an instance ID may be reused. The list
contains the existing runtime statuses that must continue to produce an
`OrchestrationAlreadyExistsError`;
instances in every other supported runtime status are atomically replaced:

```typescript
import { OrchestrationStatus } from "@microsoft/durabletask-js";

await client.scheduleNewOrchestration(helloCities, undefined, {
  instanceId: "daily-greeting",
  dedupeStatuses: [OrchestrationStatus.RUNNING, OrchestrationStatus.PENDING],
});
```

For `TaskHubGrpcClient`, omitting `dedupeStatuses` preserves the backend's default duplicate-ID
behavior; passing `[]` makes every supported runtime status replaceable. The in-memory
`TestOrchestrationClient` mirrors the .NET shim, where omission also makes all statuses reusable.
`ValidDedupeStatuses` exports the seven supported statuses. The transient `CONTINUED_AS_NEW`
status is not replaceable. A list containing `TERMINATED` must also contain `RUNNING`, `PENDING`,
and `SUSPENDED`, because replacing a running instance first terminates it. The production client
forwards this validation to the backend and maps its `INVALID_ARGUMENT` response to `TypeError`;
the in-memory client validates it directly. The current shared protocol does not define a
no-op/`IGNORE` action: a matching dedupe status is an error, while a non-matching status is replaced.

## Supported patterns

The following orchestration patterns are supported.

### Function chaining

The getting-started example above demonstrates function chaining, where an orchestration calls a sequence of activities one after another. You can find the full sample at [examples/hello-world/activity-sequence.ts](./examples/hello-world/activity-sequence.ts).

### Fan-out/fan-in

An orchestration can fan-out a dynamic number of function calls in parallel and then fan-in the results:

```typescript
import { whenAll } from "@microsoft/durabletask-js";

const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const workItems = yield ctx.callActivity(getWorkItems);
  const tasks = [];
  for (const item of workItems) {
    tasks.push(ctx.callActivity(processWorkItem, item));
  }
  const results: number[] = yield whenAll(tasks);
  return results.reduce((sum, val) => sum + val, 0);
};
```

You can find the full sample at [examples/hello-world/fanout-fanin.ts](./examples/hello-world/fanout-fanin.ts).

### Human interaction and durable timers

An orchestration can wait for external events, such as a human approval, with optional timeout handling:

```typescript
import { whenAny } from "@microsoft/durabletask-js";

const purchaseOrderWorkflow: TOrchestrator = async function* (ctx: OrchestrationContext, order: Order): any {
  // Orders under $1000 are auto-approved
  if (order.cost < 1000) {
    return "Auto-approved";
  }

  // Orders of $1000 or more require manager approval
  yield ctx.callActivity(sendApprovalRequest, order);

  // Approvals must be received within 24 hours or they will be canceled
  const approvalEvent = ctx.waitForExternalEvent("approval_received");
  const timeoutEvent = ctx.createTimer(24 * 60 * 60);
  const winner = yield whenAny([approvalEvent, timeoutEvent]);

  if (winner == timeoutEvent) {
    return "Cancelled";
  }

  yield ctx.callActivity(placeOrder, order);
  const approvalDetails = approvalEvent.getResult();
  return `Approved by ${approvalDetails.approver}`;
};
```

You can find the full sample at [examples/hello-world/human_interaction.ts](./examples/hello-world/human_interaction.ts).

### Versioned registration and dispatch

One worker can host multiple implementations of the same orchestrator or activity name:

```typescript
import { TaskHubGrpcClient, TaskHubGrpcWorker } from "@microsoft/durabletask-js";

const worker = new TaskHubGrpcWorker({
  versioning: { defaultVersion: "v2" },
  workItemFilters: "auto",
});
worker.addNamedOrchestrator("Order", async function* (ctx) {
  yield ctx.callActivity("Price");
}, "v1");
worker.addNamedOrchestrator("Order", async function* (ctx) {
  yield ctx.callActivity("Price");
  yield ctx.callSubOrchestrator("Audit");
}, "v2");
worker.addNamedActivity("Price", () => 100, "v1");
worker.addNamedActivity("Price", () => 120, "v2");
worker.addNamedOrchestrator("Audit", () => "audited", "v2");
await worker.start();

const client = new TaskHubGrpcClient();
await client.scheduleNewOrchestration("Order", undefined, { version: "v1" });
await client.scheduleNewOrchestration("Order", undefined, { version: "v2" });
```

`addOrchestrator(fn, version?)` and `addActivity(fn, version?)` retain the function's native name;
the named variants accept `(name, fn, version?)`. These signatures also apply to
`TestOrchestrationWorker` and `DurableTaskAzureManagedWorkerBuilder`. Entities remain name-only.

Versions are case-insensitive opaque strings: `"V1"` equals `"v1"`, but `"1"` and `"1.0"` are
different registrations. Omitted, `undefined`, `null` (JavaScript), and `""` versions identify the
unversioned registration. Whitespace-only registration versions are rejected; other strings are
not trimmed. Duplicate name/version pairs throw. **Task names remain case-sensitive in JavaScript**,
unlike .NET; this preserves existing JavaScript identifiers and function-name behavior.
Backend constraints still apply: Azure DTS accepts numeric `Major[.Minor[.Patch]]` orchestration
versions, so use values such as `"1.0.0"` and `"2.0.0"` rather than `"v1"` and `"v2"` with that service.

Dispatch uses the recorded `ExecutionStarted.version` during both initial execution and replay,
and `ActivityRequest.version` for activities. Exact matches win. Following the
[.NET factory contract](https://github.com/microsoft/durabletask-dotnet/blob/92474e9e35c66d64de36cabd0a17652376d37873/src/Worker/Core/DurableTaskFactory.cs),
a name with **only an unversioned registration** can handle any request version. Adding any
versioned registration for that name disables this fallback: unknown versions fail with the
existing not-registered error (including the requested version), marked non-retriable. An
unversioned request never selects a versioned implementation.

| Scheduled work | When `options.version` is omitted | Explicit `version: ""` |
| --- | --- | --- |
| Activity | Current orchestration instance's `ctx.version` | Unversioned |
| Sub-orchestration | Worker's `versioning.defaultVersion`, or unversioned if unset | Unversioned |
| Top-level orchestration | Client's `defaultVersion`, or unversioned if unset | Unversioned |

An explicit nonempty version overrides these defaults. Activities do **not** inherit the worker
default, and children do **not** inherit the parent's version. Both policy and handler retries
retain the originally selected version. Worker defaults do not change `continueAsNew` behavior.
The in-memory client accepts the start `version` option; its worker accepts
`{ versioning: { defaultVersion: "v2" } }`, but does not emulate gRPC worker acceptance/rejection.

**Acceptance policy is separate from implementation lookup.** `Strict` and `CurrentOrOlder`
apply before dispatch to both orchestrations and activities; registrations cannot bypass them.
`Strict` with no worker version accepts only unversioned work. An omitted `matchStrategy` means
`None`. `Reject` abandons mismatched work; `Fail` returns an explicit non-retriable failure.
Auto filters contain one entry per logical name: all registered versions (including `""` for
mixed registrations), or a wildcard for unversioned-only names. Under `Strict`, filters use the
configured worker version, including `""`. Explicit filters are unchanged.

**Migration:** previous JavaScript workers ignored activity request versions and always scheduled
unspecified activities as unversioned. Versioned parents now pass their version to activities;
use `{ version: "" }` to keep an activity unversioned. Setting a worker child default now affects
unspecified child calls; use explicit child versions for stable routing. Keep implementations for
all in-flight versions, and drain affected instances before changing replay-sensitive defaults or
mixing old and new workers. Adding the first versioned registration removes the name's legacy
catch-all, so register every version that still needs to run.

Azure Functions `app.orchestration` / `app.activity` remain host registrations with unique function
names, not a multi-version host-routing API. The embedded `DurableFunctionsWorker` inherits core
version dispatch and child defaults for integrations that supply versioned protobuf requests.

### Continue as new

Long-running orchestrations can restart with fresh history and optionally move to a new
orchestration version:

```typescript
const eternalOrchestrator: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  iteration: number,
): any {
  yield ctx.callActivity(processIteration, iteration);
  ctx.continueAsNew(iteration + 1, true, "2.0.0");
};
```

The second argument controls whether unprocessed external events carry over. The optional third
argument becomes the restarted orchestration's `ctx.version`; omit it to retain the existing
continue-as-new behavior.

### Durable entities

Durable entities provide a way to manage small pieces of state with a simple object-oriented programming model:

```typescript
import { TaskEntity } from "@microsoft/durabletask-js";

interface CounterState {
  value: number;
}

class CounterEntity extends TaskEntity<CounterState> {
  add(amount: number): number {
    this.state.value += amount;
    return this.state.value;
  }

  get(): number {
    return this.state.value;
  }

  reset(): void {
    this.state.value = 0;
  }

  protected initializeState(): CounterState {
    return { value: 0 };
  }
}

// Register with the worker
worker.addNamedEntity("Counter", () => new CounterEntity());
```

You can find the full entity samples at [examples/entity-counter](./examples/entity-counter) and [examples/entity-orchestration](./examples/entity-orchestration).

## Obtaining the Protobuf definitions

This project utilizes protobuf definitions from [durabletask-protobuf](https://github.com/microsoft/durabletask-protobuf). To download the latest proto files, run:

```sh
npm run download-proto
```

This will download the proto files to `internal/durabletask-protobuf/protos/`. Once the proto files are available, the corresponding TypeScript source code can be regenerated using:

```sh
npm run generate-grpc
```

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
