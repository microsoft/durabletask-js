## Upcoming

### Breaking Changes

- Workers built by `DurableTaskAzureManagedWorkerBuilder` now reject `start()` when the sidecar
  cannot be reached within the configured startup timeout. Previously, `start()` resolved before
  connecting and retried forever in the background. Use `.startupTimeout(...)` to allow more time,
  or retry `start()` from the caller as described in the core package changelog.

### New

### Fixes

- Add `startupTimeout()` to configure the core worker's metadata and hello-handshake startup budget.

## v0.4.0 (2026-07-31)

### Changes

- fix: trim whitespace from tenant values in connection string parsing ([#311](https://github.com/microsoft/durabletask-js/pull/311))
- [copilot-finds] Bug: Fix off-by-one in createServiceConfig maxRetries→maxAttempts conversion ([#287](https://github.com/microsoft/durabletask-js/pull/287))
- [copilot-finds] Improve: Add addEntity/addNamedEntity methods to DurableTaskAzureManagedWorkerBuilder ([#266](https://github.com/microsoft/durabletask-js/pull/266))
- Fix race condition in AccessTokenCache concurrent token fetches ([#178](https://github.com/microsoft/durabletask-js/pull/178))
- build(deps): bump @grpc/grpc-js ([#259](https://github.com/microsoft/durabletask-js/pull/259))
- fix: preserve error cause in getHostAddress() for better debugging ([#194](https://github.com/microsoft/durabletask-js/pull/194))
- [copilot-finds] Bug: Connection string parser uses case-sensitive key lookup ([#196](https://github.com/microsoft/durabletask-js/pull/196))
- feat: Implement work item filters ([#168](https://github.com/microsoft/durabletask-js/pull/168))
