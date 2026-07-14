# Changelog

## 0.4.0

Initial gRPC-consolidated Azure Functions Durable provider, built on `@microsoft/durabletask-js`.

### Requirements

- Node.js >= 22 (drops the Node 18/20 that `durable-functions` v3 supported).

### Breaking changes vs `durable-functions` v3

- Classic orchestration and entity contexts no longer extend `InvocationContext`; they expose only
  `df` plus replay-safe log helpers (no `invocationId` / `functionName` / `extraInputs`).
- Task result shape follows the core SDK: use `isComplete` / `isFailed` / `getResult()` (v3 used
  `isCompleted` / `isFaulted` / `result`). `context.df.createTimer(...)` returns a cancelable
  `TimerTask`, so the timeout-race pattern (`Task.any` then `timer.cancel()`) keeps working.
- `client.getStatus()` returns `DurableOrchestrationStatus | undefined` (was non-optional) and honors
  only `showInput`; `showHistory` / `showHistoryOutput` are ignored and `history` is not populated.
- `client.startNew()` drops the v3 `version` option.
- Removed top-level exports: `DummyOrchestrationContext`, `DummyEntityContext`, `DurableError`,
  `AggregatedError`, `ManagedIdentityTokenSource`, `TokenSource`. `TaskFailedError` is re-exported
  from the core SDK and aggregate failures surface as JS-native `AggregateError`. For orchestration
  unit tests, use the core `TestOrchestrationWorker` / `TestOrchestrationClient` in place of the v3
  dummy contexts.

### Release order

- Publish `@microsoft/durabletask-js` (0.3.0) before this package.
- Confirm the target `@azure/functions` (^4.16.1) build includes the Durable extension changes
  (`DurableRequiresGrpc`) required by the consolidated gRPC path.
