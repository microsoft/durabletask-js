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

### Worker concurrency and backpressure

Configure independent limits for complete orchestration, activity, and entity work-item
lifecycles through `TaskHubGrpcWorkerOptions.concurrency` or the Azure-managed worker builder:

```typescript
const worker = createAzureManagedWorkerBuilder(connectionString)
  .concurrency({
    maximumConcurrentOrchestrationWorkItems: 10,
    maximumConcurrentActivityWorkItems: 20,
    maximumConcurrentEntityWorkItems: 5,
  })
  .addOrchestrator(helloCities)
  .addActivity(sayHello)
  .build();
```

Each omitted limit defaults at worker construction time to 100 times the logical processor
count available to Node.js. Values must be non-negative safe integers; `0` disables that
work-item kind. Entity V1 and V2 batches share the entity limit, and each batch counts as one
work item regardless of its operation count. Because the protocol fields are signed 32-bit
integers, larger safe-integer limits are enforced locally but their wire hints are capped at
`2147483647`.

The limits are sent to the backend on every work-item stream and are also enforced locally
through independent bounded schedulers. Each scheduler can hold at most one waiting item per
permit. If a backend exceeds that bound or sends a disabled kind, the worker abandons the item
without pausing other work-item kinds. Abandon RPCs are bounded to 16 outstanding calls per
kind; further violating deliveries are logged and dropped so a misbehaving backend cannot
create unbounded local memory growth. When reconnect recreates a channel, the replaced delivery
stub remains open for at least a 30-second grace period and until every work item delivered by
that stub has finished its completion or abandonment path.

You can find more samples in the [examples/azure-managed](./examples/azure-managed) directory.

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

### Continue as new

Long-running orchestrations can restart with fresh history and optionally move to a new
orchestration version:

```typescript
const eternalOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, iteration: number): any {
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
