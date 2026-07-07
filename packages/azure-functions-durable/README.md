# durable-functions

Azure Functions Durable provider for the Durable Task JavaScript SDK.

This package is the gRPC-consolidated Durable Functions provider for JavaScript. It builds on `@microsoft/durabletask-js` and is intended to supersede the legacy `durable-functions` package at a new major version.

## Phase 1 scope

This preview includes the low-level host integration pieces:

- `DurableFunctionsClient`, a direct subclass of `TaskHubGrpcClient`.
- HTTP management payload helpers for Durable HTTP starter responses.
- `DurableFunctionsWorker`, which accepts base64-encoded protobuf work-item payloads from the Functions host and delegates execution to the core worker byte processors.
- `addDurableGrpcMetadata`, which stamps `durableRequiresGrpc: true` onto durable trigger and client binding metadata.
- The authoring model (`app.orchestration` / `app.activity` / `app.entity`, `input.durableClient`, `getClient`) and a **classic (v3) backward-compatibility** layer (see below).

Orchestrator, activity, and entity bodies can be written either in the core `@microsoft/durabletask-js` style or in the classic `durable-functions` v3 style; both run on the gRPC engine.

## Client binding

The Functions host passes a JSON client-binding payload to the app. Construct the client from that payload:

```typescript
import { DurableFunctionsClient } from "durable-functions";

const client = new DurableFunctionsClient(clientBindingJson);
const instanceId = await client.scheduleNewOrchestration("hello", { name: "Durable" });
return client.createCheckStatusResponse(request, instanceId);
```

`DurableFunctionsClient` extends `TaskHubGrpcClient`, so orchestration and entity management methods come from the core SDK by inheritance. The only Functions-specific public helpers are:

- `createCheckStatusResponse(request, instanceId)`
- `createHttpManagementPayload(request, instanceId)`

Both helpers derive the management endpoint from the incoming HTTP request origin:

```text
{scheme}://{host}/runtime/webhooks/durabletask/instances/{instanceId}
```

## gRPC metadata

The client mirrors the Python Azure Functions Durable provider interceptor by adding per-call gRPC metadata:

- `taskhub`: the task hub name from the host client-binding payload.
- `x-user-agent`: the package user agent. gRPC reserves `user-agent`, so this package uses `x-user-agent`.

The host-provided `requiredQueryStringParameters` value is used for HTTP management URLs. Python PR #155 passes it to the interceptor constructor but does not emit it as gRPC metadata; this package keeps the same behavior.

## Serialization

This package intentionally does not port Python's `DEFAULT_FUNCTIONS_DATA_CONVERTER`. The JavaScript core client and worker already serialize payloads at the protobuf string boundary with plain `JSON.stringify` and `JSON.parse`, which matches the Azure Functions JavaScript worker's plain JSON payload contract for this gRPC path.

## Worker adapter

`DurableFunctionsWorker` extends `TaskHubGrpcWorker` and adds base64 helpers for the Functions host's middleware-passthrough payloads:

```typescript
const worker = new DurableFunctionsWorker();
worker.addOrchestrator(myOrchestrator);

const encodedResponse = await worker.handleOrchestratorRequest(encodedRequest);
```

## Classic (v3) backward compatibility

Orchestrators and entities may be written in the legacy `durable-functions` v3 style. The style is
detected by parameter count and adapted onto the core engine — the classic API surface forwards to
the core context, it does not re-implement the v3 replay engine.

- **Classic orchestrator** — a single-parameter generator using `context.df.*`:

  ```typescript
  import * as df from "durable-functions";

  df.app.orchestration("helloOrchestrator", function* (context) {
    const input = context.df.getInput();
    const retry = new df.RetryOptions(5000, 3);
    const r = yield context.df.callActivityWithRetry("sayHello", retry, input);
    const all = yield context.df.Task.all([context.df.callActivity("a"), context.df.callActivity("b")]);
    return [r, all];
  });
  ```

- **Core-native orchestrator** — a two-parameter `(ctx, input)` generator using `ctx.*`, passed through unchanged:

  ```typescript
  df.app.orchestration("helloOrchestrator", async function* (ctx, input) {
    return yield ctx.callActivity("sayHello", input);
  });
  ```

- **Classic entity** — a single-parameter function using `context.df.*`; core-native zero-argument
  `EntityFactory` handlers pass through unchanged:

  ```typescript
  df.app.entity("Counter", (context) => {
    const current = context.df.getState(() => 0);
    switch (context.df.operationName) {
      case "add": context.df.setState(current + context.df.getInput()); break;
      case "get": context.df.setResult(current); break;
    }
  });
  ```

`RetryOptions` and the deprecated `DurableOrchestrationClient` alias are also provided for source
compatibility.

## Phase 2 status

Implemented in this phase:

- `src/app.ts`: `app.orchestration` / `app.activity` / `app.entity` registration over a shared worker.
- `src/trigger.ts` / `src/input.ts`: durable triggers and the `durableClient` input binding, all emitting `durableRequiresGrpc: true`.
- `src/get-client.ts`: `getClient(context)` constructs a `DurableFunctionsClient` from the host binding.
- `src/orchestration-context.ts` / `src/entity-context.ts`: classic (v3) `context.df.*` adapters plus `wrapOrchestrator` / `wrapEntity`.
- `src/retry-options.ts`: classic `RetryOptions` mapping to the core `RetryPolicy`.
- `src/orchestration-status.ts` / `src/entity-state-response.ts` / `src/purge-history-result.ts`: classic (v3) client query-return types (`DurableOrchestrationStatus`, `OrchestrationRuntimeStatus`, `EntityStateResponse`, `PurgeHistoryResult`), surfaced through `DurableFunctionsClient.getStatus` / `readEntityState` / `purgeInstanceHistory`. `context.df.callHttp` is present but throws (no durabletask durable-HTTP equivalent).

Deferred:

- **Functions data converter.** The core SDK serializes at the protobuf string boundary with plain `JSON.stringify` / `JSON.parse` and exposes no pluggable converter injection point, so the Python provider's `FunctionsDataConverter` (custom-object `{__class__,__module__,__data__}` envelope) cannot be ported here without a core change. This package keeps the plain-JSON contract for now.

Open questions for the Functions extension team:

- Confirm the exact JavaScript client-binding payload field set and whether `rpcBaseUrl` is always an absolute URL with scheme.
- Confirm whether `requiredQueryStringParameters` always includes any required `taskHub` and `connection` HTTP routing parameters. This Phase 1 port mirrors Python PR #155 and appends only that host-provided string to management URLs.
- Confirm whether `requiredQueryStringParameters` should ever be emitted as gRPC metadata; Python stores it on the interceptor but only sends `taskhub` and `x-user-agent`.
- Confirm whether the local gRPC sidecar remains plaintext-only for JavaScript (`useTLS: false`) in all supported Functions hosting modes.
