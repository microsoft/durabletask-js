# durable-functions

Write [Azure Durable Functions](https://learn.microsoft.com/azure/azure-functions/durable/) orchestrations, activities, and entities in JavaScript and TypeScript, running on the [Durable Task JavaScript SDK](https://github.com/microsoft/durabletask-js).

## What this package is

`durable-functions` is the Azure Functions Durable provider for JavaScript, built on `@microsoft/durabletask-js`. You author Durable Functions apps with the familiar `app.orchestration` / `app.activity` / `app.entity` model, and the provider talks to the Durable Task backend over the Functions host's gRPC channel.

This is a new major version that supersedes the legacy [`durable-functions`](https://github.com/Azure/azure-functions-durable-js) package. New and existing (classic v3) orchestration, activity, and entity code all run on the same gRPC engine.

## Why it is needed

- **One gRPC protocol.** Durable work items flow between the Functions host and your app over a single gRPC channel instead of the legacy out-of-proc HTTP protocol, keeping the JavaScript provider aligned with the .NET, Python, and Java Durable providers.
- **Shared core engine.** Orchestration replay, activities, entities, retries, and instance-management APIs all come from `@microsoft/durabletask-js`, so behavior matches the other Durable Task SDKs.
- **Backward compatible.** Existing v3 Durable Functions orchestrators and entities keep working through a compatibility layer, so you can move to this provider without rewriting your functions.

## What it supports

- **Authoring** — `app.orchestration`, `app.activity`, and `app.entity` register durable functions (each trigger opts into the host's gRPC protocol automatically).
- **Client** — `getClient(context)` returns a `DurableFunctionsClient` for scheduling, querying, signaling, and managing instances, plus HTTP management-payload helpers (`createCheckStatusResponse`, `createHttpManagementPayload`) for durable HTTP starters.
- **Classic (v3) compatibility** — orchestrators and entities written in the legacy `context.df.*` style, `RetryOptions`, `EntityId`, and the deprecated client aliases are adapted onto the core engine.

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
    const instanceId = await client.scheduleNewOrchestration("helloOrchestrator", "Durable");
    return client.createCheckStatusResponse(request, instanceId);
  },
});
```

## Status

This package is an early preview (`4.0.0-alpha.0`); APIs may change before the stable release.