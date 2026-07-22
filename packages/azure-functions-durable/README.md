# durable-functions

Write [Azure Durable Functions](https://learn.microsoft.com/azure/azure-functions/durable/) orchestrations, activities, and entities in JavaScript and TypeScript, running on the [Durable Task JavaScript SDK](https://github.com/microsoft/durabletask-js).

## What this package is

`durable-functions` is the Azure Functions Durable provider for JavaScript, built on `@microsoft/durabletask-js`. You author Durable Functions apps with the familiar `app.orchestration` / `app.activity` / `app.entity` model, and the provider talks to the Durable Task backend over the Functions host's gRPC channel.

This package supersedes the legacy [`durable-functions`](https://github.com/Azure/azure-functions-durable-js) package. New and existing (classic v3) orchestration, activity, and entity code all run on the same gRPC engine.

## Why it is needed

- **One gRPC protocol.** Durable work items flow between the Functions host and your app over a single gRPC channel instead of the legacy out-of-proc HTTP protocol, keeping the JavaScript provider aligned with the .NET, Python, and Java Durable providers.
- **Shared core engine.** Orchestration replay, activities, entities, retries, and instance-management APIs all come from `@microsoft/durabletask-js`, so behavior matches the other Durable Task SDKs.
- **Backward compatible.** Existing v3 Durable Functions orchestrators and entities keep working through a compatibility layer, so you can move to this provider without rewriting your functions.

## What it supports

- **Authoring** — `app.orchestration`, `app.activity`, and `app.entity` register durable functions (each trigger opts into the host's gRPC protocol automatically).
- **Client** — `getClient(context)` returns a `DurableFunctionsClient` for scheduling, querying, signaling, and managing instances, plus HTTP management-payload helpers (`createCheckStatusResponse`, `createHttpManagementPayload`) for durable HTTP starters. The `app.client.*` starter helpers (`http`, `timer`, `storageBlob`, `storageQueue`, `serviceBusQueue`, `serviceBusTopic`, `eventHub`, `eventGrid`, `cosmosDB`, `generic`) register a normal trigger and inject the client as the handler's second argument, so `(trigger, client, context)` works without manually wiring `df.input.durableClient()` + `df.getClient(context)`.
- **Classic (v3) compatibility** — orchestrators and entities written in the legacy `context.df.*` style, `RetryOptions`, `EntityId`, and the deprecated client aliases are adapted onto the core engine.

## Migrating from durable-functions v3

This provider keeps classic `context.df.*` orchestrators and entities working, but a few surfaces
changed:

- **Node.js >= 22** is required (v3 supported Node 18/20).
- **Classic contexts no longer extend `InvocationContext`** — only `df` plus replay-safe log helpers
  are available (no `invocationId` / `functionName` / `extraInputs`; the classic entity context is
  just `{ df }`). Reading those `InvocationContext` members inside an orchestrator is
  replay-nondeterministic and was never recommended.
- **Task result shape follows the core SDK** — use `isComplete` / `isFailed` / `getResult()` instead
  of v3's `isCompleted` / `isFaulted` / `result`. `context.df.createTimer(...)` still returns a
  cancelable `TimerTask` for the timeout-race pattern.
- **`client.getStatus()` keeps the v3 shape** — it returns a non-optional `DurableOrchestrationStatus`
  and throws when the instance is missing. `showInput` suppresses only the top-level input,
  `showHistory` populates `history`, and `showHistoryOutput` toggles the per-entry input/result
  payloads; `history` entries are core `HistoryEvent`s (v3 types `history` as `Array<unknown>`).
  **`client.startNew()` supports the `version` option.**
- **Entity locking / critical sections moved to the core context.** v3's `context.df.lock(...)` /
  `context.df.isLocked()` and the `DurableLock` / `LockState` / `LockingRulesViolationError` exports
  are removed. Acquire locks with the core `context.entities.lockEntities(...entityIds)` (returns a
  `LockHandle` — call `release()`, ideally in a `finally`) and query with
  `context.entities.isInCriticalSection()`. Restoring the v3 `df.lock` / `isLocked` surface is tracked
  in [#317](https://github.com/microsoft/durabletask-js/issues/317).
- **`context.df.callHttp(...)` now throws.** v3 ran durable HTTP as a host-managed activity; the
  consolidated gRPC backend has no equivalent primitive. Implement an HTTP activity in your app and
  call it from the orchestrator. Restoring `callHttp` as a worker-side durable activity is tracked in
  [#318](https://github.com/microsoft/durabletask-js/issues/318).
- **Some v3 top-level exports were removed** — `DummyOrchestrationContext` / `DummyEntityContext`
  (testing utilities), `ManagedIdentityTokenSource`, and the entity-lock types above. `TaskFailedError`
  is re-exported from the core SDK (aggregate failures surface as JS-native `AggregateError`); use the
  core `TestOrchestrationWorker` / `TestOrchestrationClient` for orchestration unit tests.

## Getting started

```typescript
import * as df from "durable-functions";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

df.app.orchestration("helloOrchestrator", async function* (ctx, input) {
  return yield ctx.callActivity("sayHello", input);
});

df.app.activity("sayHello", {
  handler: (name: string) => `Hello, ${name}!`,
});

app.http("startHello", {
  route: "orchestrators/helloOrchestrator",
  extraInputs: [df.input.durableClient()],
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const client = df.getClient(context);
    // scheduleNewOrchestration is the canonical (core) API. The classic v3 alias also works:
    //   const instanceId = await client.startNew("helloOrchestrator", { input: "Durable" });
    const instanceId = await client.scheduleNewOrchestration("helloOrchestrator", "Durable");
    return client.createCheckStatusResponse(request, instanceId);
  },
});
```

### Client (starter) functions

`app.client.*` is sugar for the client-starter above — it adds the `durableClient` input binding and
injects a `DurableFunctionsClient` as the handler's second argument, so you don't wire
`extraInputs: [df.input.durableClient()]` + `df.getClient(context)` yourself:

```typescript
// Sugar equivalent of app.http + df.input.durableClient() + df.getClient(context):
df.app.client.http("startHello", {
  route: "orchestrators/helloOrchestrator",
  handler: async (request, client, context) => {
    // Or the classic v3 alias: await client.startNew("helloOrchestrator", { input: "Durable" })
    const instanceId = await client.scheduleNewOrchestration("helloOrchestrator", "Durable");
    return client.createCheckStatusResponse(request, instanceId);
  },
});
```

### v3-compatible client methods

`DurableFunctionsClient` keeps the classic Durable Functions v3 method names as thin aliases over the
core API, so existing v3 starters compile unchanged. Prefer the core names in new code (most v3 aliases
are `@deprecated`):

| Classic v3 alias                                        | Canonical core method                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `client.startNew(name, { input, instanceId, version })` | `client.scheduleNewOrchestration(name, input, { instanceId, version })` |
| `client.getStatus(id, options)`                         | `client.getOrchestrationState(id)`                                      |
| `client.raiseEvent(id, name, data)`                     | `client.raiseOrchestrationEvent(id, name, data)`                        |
| `client.terminate(id, reason)`                          | `client.terminateOrchestration(id, reason)`                             |
| `client.suspend(id)`                                    | `client.suspendOrchestration(id)`                                       |
| `client.resume(id)`                                     | `client.resumeOrchestration(id)`                                        |
| `client.rewind(id, reason)`                             | `client.rewindInstance(id, reason)`                                     |
| `client.restart(id, restartWithNewInstanceId?)`         | `client.restartOrchestration(id, restartWithNewInstanceId?)`            |

## Status

This package is an early preview (`4.0.0`); APIs may change before the stable release.
