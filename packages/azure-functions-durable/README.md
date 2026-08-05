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
  are removed. Locks live on the core-native `context.entities` surface, which the classic
  `{ df, log }` context does **not** expose — an orchestrator that needs locks must first migrate to
  the core-native orchestrator/context shape, then acquire locks with
  `context.entities.lockEntities(...entityIds)` (returns a `LockHandle` — call `release()`, ideally
  in a `finally`) and query with `context.entities.isInCriticalSection()`. Reintroducing the v3
  `df.lock` / `isLocked` surface is **not supported and not planned**
  ([#317](https://github.com/microsoft/durabletask-js/issues/317), closed as not planned).
- **`context.df.callHttp(...)` is restored** as a worker-side durable HTTP call
  ([#318](https://github.com/microsoft/durabletask-js/issues/318)) — though **not** as a drop-in, fully
  v3-equivalent replacement: the known incompatibilities and behavior differences listed below are
  load-bearing for migration, so review them before relying on it. It accepts the v3
  `CallHttpOptions` (`method`, `url`, `body`, `headers`, `tokenSource`, `enablePolling`) and returns a
  `Task<DurableHttpResponse>` (`{ statusCode, headers, content }`), including automatic `202 Accepted`
  polling that honors `Retry-After` via durable timers. **Trust-boundary change:** in v3 the Functions
  **host** extension executed the HTTP request; here it runs as a durable **activity inside your
  app/worker process** (via `fetch`). Outbound network path, source identity, and firewall/VNet rules
  therefore follow the worker process, not the host — re-verify egress and any IP allow-lists. A
  managed-identity `tokenSource` requires the optional
  [`@azure/identity`](https://www.npmjs.com/package/@azure/identity) package
  (`npm install @azure/identity`); without it, a request that uses a `tokenSource` throws a clear error.
  A behavior note and several deliberate hardening/compat differences from v3:
  - **Cross-origin `202` poll credentials are stripped.** The `Location` returned with a `202` is
    callee-controlled, so when it points to a **different origin** (scheme/host/port) the poll drops
    `Authorization`, `Cookie`, and the `tokenSource` (no token is re-minted for the attacker), and the
    `x-functions-key` header is **always** dropped (both same- and cross-origin). Same-origin polls
    still forward headers and the `tokenSource`, so legitimate async patterns keep working. This
    mirrors the .NET extension's policy
    ([Azure/azure-functions-durable-extension#3443](https://github.com/Azure/azure-functions-durable-extension/pull/3443)).
  - **The initial request follows redirects with `fetch`'s defaults, which do not strip _custom_
    credential headers.** Distinct from the `202` poll loop above, the first HTTP hop uses `fetch`'s
    default `redirect: "follow"`. Per the Fetch Standard the implementation drops `Authorization` and
    `Cookie` when a redirect crosses origins, but it does **not** drop custom credential headers such as
    `x-functions-key`. Switching to `redirect: "manual"` with a per-hop cross-origin policy would close
    this residual gap but change observable single-request semantics (hop count, effective URL, cookie
    handling), so it is deliberately deferred; until then, avoid sending custom credential headers (e.g.
    `x-functions-key`) to endpoints that may redirect cross-origin.
  - **The built-in poll orchestrator cannot be started directly.** It is registered under a reserved
    name (`BuiltIn__HttpPollOrchestrator`) and refuses a top-level start (it is only ever a
    sub-orchestration of `callHttp`), so a dynamic `orchestrators/{name}` starter cannot be abused to
    drive arbitrary SSRF or Managed-Identity token minting.
  - **The default poll interval is 30 s** (matching the classic host) when a `202` carries no usable
    `Retry-After`, rather than polling once per second.
  - **Known incompatibility — a body on a `GET`/`HEAD` request throws.** v3 attached request content
    regardless of method, and both the .NET extension (`TaskHttpActivityShim` builds the message with
    no method check) and the durabletask-python SDK still pass the body to the request unconditionally.
    The [Fetch Standard](https://fetch.spec.whatwg.org/) forbids a body on `GET`/`HEAD` and the
    underlying `fetch` implementation rejects it, so this cannot be matched while `callHttp` is built on
    `fetch`. Failing loudly was chosen over silently dropping the body (which would change the request
    the app asked for): a migrated v3 workflow that relied on it must drop the `body` or switch to
    `POST`/`PUT`/`PATCH`. Restoring the v3 behavior would require replacing `fetch` with a lower-level
    HTTP transport, which is not planned.
  - **Known incompatibility — `DurableHttpResponse` is a plain object, not a class.** The response
    crosses the poll sub-orchestration's JSON boundary, so the v3 `response.getHeader(name)` method is
    **not** available — existing `response.getHeader(...)` calls **fail at runtime** and must be
    rewritten to index `response.headers[...]` by lower-cased key (response header names are lower-cased
    by `fetch`).
- **The v3 dummy contexts were replaced by `durable-functions/testing`.** The new helpers run
  orchestrators through the real in-memory replay engine and run entity batches directly, without a
  Functions host or imports from `@microsoft/durabletask-js`. The entity-lock types above remain
  removed. `TaskFailedError` is re-exported from the core SDK (aggregate failures surface as
  JS-native `AggregateError`).
- **A plain non-generator classic orchestrator is no longer supported.** A classic v3 orchestrator
  written as a _synchronous, single-argument, non-generator_ function `(context) => context.df.*`
  (one that never `yield`s) is now treated as a **core-native** orchestrator and receives the core
  `OrchestrationContext`, which has no `.df`. This resolves
  [#321](https://github.com/microsoft/durabletask-js/issues/321), where a core-native
  `(ctx) => ctx.instanceId` was mis-routed to the classic context. Standard classic orchestrators —
  sync **generators** (`function*`) using `context.df.*` — are unaffected; convert any non-generator
  classic orchestrator to generator form, or to the core-native `ctx.*` API.

## Requirements

This provider reaches the Durable Task backend over the Functions host's **gRPC** channel, which
exists only in newer durable-extension builds. Your app's `host.json` must reference one of:

- GA bundle — `Microsoft.Azure.Functions.ExtensionBundle` at **`[4.36.0, 5.0.0)`**, or
- Preview bundle — `Microsoft.Azure.Functions.ExtensionBundle.Preview` at **`[4.29.0, 5.0.0)`**.

Earlier GA v4 bundles (**<= 4.32.0**) predate that gRPC endpoint, so orchestration starters **hang
for ~60 seconds and time out with no error**. A fresh app on the default GA range (`[4.*, 5.0.0)`)
resolves to the latest GA (>= 4.36.0) and works — the trap is an **explicit** pin at or below
4.32.0.

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

## Testing

Import the first-class test helpers from `durable-functions/testing`. They create the compatibility
wrappers and core in-memory components internally, deserialize outputs, and clean up workers after
one-shot runs.

### Activities and one-shot orchestrations

```typescript
import type { OrchestrationContext } from "durable-functions";
import { runActivity, runOrchestrator } from "durable-functions/testing";

const helloOrchestrator = function* (context: OrchestrationContext) {
  const name = context.df.getInput<string>();
  return yield context.df.callActivity("sayHello", name);
};

const activityOutput = await runActivity(
  (name: string, context) => `${context.functionName}: Hello, ${name}!`,
  "World",
  { functionName: "sayHello" },
);

const orchestrationResult = await runOrchestrator(helloOrchestrator, {
  input: "World",
  activities: {
    sayHello: (name: unknown) => `Hello, ${String(name)}!`,
  },
});

expect(activityOutput).toBe("sayHello: Hello, World!");
expect(orchestrationResult.status).toBe("Completed");
expect(orchestrationResult.output).toBe("Hello, World!");
```

Failed orchestrations return `status: "Failed"` with plain `failure` details instead of requiring
manual parsing of core state.

`runOrchestrator` intentionally has no forced timeout. It returns only after the orchestration
reaches a terminal state and worker cleanup finishes, so activity code cannot keep mutating test
state after the helper returns. Arbitrary JavaScript promises cannot be forcibly cancelled: if an
orchestrator or activity never settles, the helper also remains pending and the test runner's own
timeout applies.

### Interactive orchestration tests

Use a harness when a test needs to raise events, terminate, suspend, or resume an instance:

```typescript
import type { OrchestrationContext } from "durable-functions";
import { createOrchestrationHarness } from "durable-functions/testing";

const approvalOrchestrator = function* (context: OrchestrationContext) {
  const approved = yield context.df.waitForExternalEvent<boolean>("approved");
  return { approved };
};

const harness = createOrchestrationHarness();
harness.registerOrchestrator("approval", approvalOrchestrator);

try {
  const run = await harness.start("approval", { input: { orderId: "42" } });
  await run.waitForStart();
  await run.raiseEvent("approved", true);

  const result = await run.waitForCompletion();
  expect(result.output).toEqual({ approved: true });
} finally {
  await harness.dispose();
}
```

Harness wait timeouts are observation-only: a timed-out `waitForStart()` or
`waitForCompletion()` call leaves the explicitly owned harness running. `dispose()` waits for
in-flight orchestrator and activity handlers to settle before it reports completion; if
non-cooperative user code never settles, disposal also remains pending.

Durable timers are supported with **real wall-clock delays**. The current core in-memory backend has
no virtual clock or timer-advance API, so use short timer delays in tests. The harness does not add a
synthetic fast-forward operation.

Future `startAt` values are rejected because the current in-memory backend enqueues scheduled starts
immediately instead of deferring their execution. Past `startAt` values are accepted and start
immediately.

### Entities

`runEntity` executes a classic or core-native entity batch directly through the existing entity
executor, preserving per-operation rollback semantics:

```typescript
import type { EntityHandler } from "durable-functions";
import { runEntity } from "durable-functions/testing";

const counterEntity: EntityHandler<number> = (context) => {
  const state = context.df.getState(() => 0) ?? 0;
  if (context.df.operationName === "add") {
    context.df.setState(state + (context.df.getInput<number>() ?? 0));
  } else if (context.df.operationName === "get") {
    context.df.return(state);
  }
};

const result = await runEntity(counterEntity, {
  initialState: 0,
  operations: [{ name: "add", input: 5 }, { name: "get" }],
});

expect(result.state).toBe(5);
expect(result.results).toEqual([undefined, 5]);
```

This is a direct, host-free entity unit seam. End-to-end entity messaging through the
orchestration harness is not supported by the current core in-memory backend.

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

This rewritten `durable-functions` v4 provider is in **preview**, published under the `preview` npm
dist-tag — install it with `npm install durable-functions@preview`. APIs may change before the
GA `4.0.0` release.
