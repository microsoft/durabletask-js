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
- Removed top-level exports (verified against the v3 `durable-functions` public surface):
  `DummyOrchestrationContext`, `DummyEntityContext`, `ManagedIdentityTokenSource`, `DurableLock`,
  `LockState`, `LockingRulesViolationError`. `TaskFailedError` is re-exported from the core SDK and
  aggregate failures surface as JS-native `AggregateError`. For orchestration unit tests, use the
  core `TestOrchestrationWorker` / `TestOrchestrationClient` in place of the v3 dummy contexts.
  (`DurableError`, `AggregatedError`, and a bare `TokenSource` were never v3 top-level exports, so
  they are not listed as removed.)
- Entity locking / critical sections: the v3 `context.df.lock(...)` / `context.df.isLocked()` API and
  its `DurableLock` / `LockState` / `LockingRulesViolationError` types are removed. The capability is
  available natively on the core orchestration context: acquire locks with
  `context.entities.lockEntities(...entityIds)` (returns a `LockHandle`; call `handle.release()`, ideally
  in a `finally`), and query section state with `context.entities.isInCriticalSection()`. The core
  enforces the same rules (globally-sorted lock order, no nested sections, no sub-orchestration calls
  while holding locks). Reach it by writing the orchestrator against the core-native context signature
  `(context) => { ... context.entities.lockEntities(...) ... }`.
- `context.df.callHttp(...)` now throws instead of performing a durable HTTP call. v3's `callHttp` was
  executed by the Functions host as a built-in HTTP activity (the WebJobs `TaskHttpActivityShim`,
  including the 202 async-polling pattern and managed-identity token acquisition); the consolidated
  durabletask/gRPC backend exposes no host-managed durable-HTTP primitive. To make durable HTTP calls,
  implement an HTTP activity in your app and invoke it from the orchestrator.
