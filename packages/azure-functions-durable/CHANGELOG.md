# Changelog

## 4.0.0

Initial gRPC-consolidated Azure Functions Durable provider, built on `@microsoft/durabletask-js`.

### Added

- `app.client.*` durable client function registration helpers (`http`, `timer`, `storageBlob`,
  `storageQueue`, `serviceBusQueue`, `serviceBusTopic`, `eventHub`, `eventGrid`, `cosmosDB`,
  `generic`), restoring v3 parity. Each registers a normal trigger and injects a
  `DurableFunctionsClient` as the handler's second argument, so the client-starter signature
  `(trigger, client, context)` works without manually wiring
  `extraInputs: [df.input.durableClient()]` + `df.getClient(context)`.

### Requirements

- Node.js >= 22 (drops the Node 18/20 that `durable-functions` v3 supported).

### Breaking changes vs `durable-functions` v3

- Classic orchestration and entity contexts no longer extend `InvocationContext`; they expose only
  `df` plus replay-safe log helpers (no `invocationId` / `functionName` / `extraInputs`), and the
  classic entity context exposes only `{ df }`. Rationale: reading `InvocationContext` members such as
  `invocationId` / `extraInputs` inside an orchestrator is replay-nondeterministic and was never
  recommended, so they are intentionally not surfaced. The classic entity context stays generic over
  its state type (`EntityContext<TState>`), so a bare `context.df.getState()` returns `TState | undefined`
  as in v3; the per-call `getState<T>()` generic still overrides it.
- Task result shape follows the core SDK: use `isComplete` / `isFailed` / `getResult()` (v3 used
  `isCompleted` / `isFaulted` / `result`). `context.df.createTimer(...)` returns a cancelable
  `TimerTask`, so the timeout-race pattern (`Task.any` then `timer.cancel()`) keeps working.
- `client.getStatus()` matches the v3 signature: it returns a non-optional `DurableOrchestrationStatus`
  and throws when the instance does not exist. `showInput` suppresses only the top-level input (output
  and custom status are always returned, as in v3); `showHistory` populates `history`, and
  `showHistoryOutput` toggles whether those entries keep their input/result payloads. One
  consolidated-path note: `history` entries are core `HistoryEvent`s (v3 types `history` as
  `Array<unknown>`), not the classic .NET extension's history serialization.
- `client.startNew()` supports the v3 `version` option (forwarded to the core scheduler).
- Removed top-level exports: `DummyOrchestrationContext`, `DummyEntityContext`, `DurableError`,
  `AggregatedError`, `ManagedIdentityTokenSource`, `TokenSource`. `TaskFailedError` is re-exported
  from the core SDK and aggregate failures surface as JS-native `AggregateError`. For orchestration
  unit tests, use the core `TestOrchestrationWorker` / `TestOrchestrationClient` in place of the v3
  dummy contexts.
