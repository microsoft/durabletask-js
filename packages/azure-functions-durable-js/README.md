# durable-functions

Azure Functions Durable provider for the Durable Task JavaScript SDK.

This package is the gRPC-consolidated Durable Functions provider for JavaScript. It builds on `@microsoft/durabletask-js` and is intended to supersede the legacy `durable-functions` package at a new major version.

## Phase 1 scope

This preview includes the low-level host integration pieces:

- `DurableFunctionsClient`, a direct subclass of `TaskHubGrpcClient`.
- HTTP management payload helpers for Durable HTTP starter responses.
- `DurableFunctionsWorker`, which accepts base64-encoded protobuf work-item payloads from the Functions host and delegates execution to the core worker byte processors.
- `addDurableGrpcMetadata`, which stamps `durableRequiresGrpc: true` onto durable trigger and client binding metadata.

The full Durable Functions JavaScript authoring model is not included yet. Use `@microsoft/durabletask-js` APIs directly for orchestrator, activity, and entity implementations in this phase.

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

## Phase 2 plan

Phase 2 will port the full Durable Functions JavaScript authoring surface onto the core SDK. Planned work:

- `src/app.ts`: add `DFApp` and `Blueprint` equivalents that mirror Python `decorators/durable_app.py` and register Azure Functions v4 handlers.
- `src/decorators/`: add durable trigger and durable client binding helpers that call `addDurableGrpcMetadata` and emit `durableRequiresGrpc: true`.
- `src/orchestrator.ts`: add an `Orchestrator` wrapper that converts Functions invocation payloads into `DurableFunctionsWorker.handleOrchestratorRequest` calls.
- `src/entity.ts`: add entity handler glue over `DurableFunctionsWorker.handleEntityBatchRequest`.
- `src/input.ts`: add a durable client input helper that constructs `DurableFunctionsClient` from the host binding payload.
- `test/authoring/`: add parity tests for `DFApp`, `Blueprint`, orchestration trigger registration, entity trigger registration, durable client input registration, and generated binding metadata.

Open questions for the Functions extension team:

- Confirm the exact JavaScript client-binding payload field set and whether `rpcBaseUrl` is always an absolute URL with scheme.
- Confirm whether `requiredQueryStringParameters` always includes any required `taskHub` and `connection` HTTP routing parameters. This Phase 1 port mirrors Python PR #155 and appends only that host-provided string to management URLs.
- Confirm whether `requiredQueryStringParameters` should ever be emitted as gRPC metadata; Python stores it on the interceptor but only sends `taskhub` and `x-user-agent`.
- Confirm whether the local gRPC sidecar remains plaintext-only for JavaScript (`useTLS: false`) in all supported Functions hosting modes.
