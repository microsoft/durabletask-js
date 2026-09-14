## Upcoming

### New

- Add optional orchestration version migration support to `context.df.continueAsNew()`.
- Added a `durable-functions/testing` entry point with `runOrchestrator`, which runs an orchestrator
  to a terminal state against inline activity implementations on the in-memory backend and always
  releases its worker, and `createActivityContext` for invoking activity handlers directly.
  Interactive scenarios (external events, termination, suspend/resume) and entity batches are
  covered by driving the `@microsoft/durabletask-js` in-memory test stack with `wrapOrchestrator` /
  `wrapEntity`; see the README.
- Forward the top-level `dedupeStatuses` duplicate rejection and atomic replacement option through
  `DurableFunctionsClient.startNew()`; the shared protocol does not support atomic no-op/`IGNORE`.

### Fixes

- Automatically split long durable timers and retry delays into fixed three-day segments so the gRPC
  provider does not exceed Azure Storage's per-message delay limit. Logical timer identity and
  cancellation semantics are unchanged. The testing helper uses the same strategy without configuration.
  Functions also splits timers with DTS; there is no backend detection. Drain segmented instances
  before rollback to a native-timer worker; do not mix old and new workers for those instances.
## v4.0.0-beta.1 (2026-07-31)

### Changes

- docs(release): changelog, README, and copilot-instructions updates ([#339](https://github.com/microsoft/durabletask-js/pull/339))
- feat(durable-functions): restore worker-side callHttp ([#318](https://github.com/microsoft/durabletask-js/issues/318)) ([#333](https://github.com/microsoft/durabletask-js/pull/333))
- fix(durable-functions): route sync single-arg orchestrators to core-native ([#321](https://github.com/microsoft/durabletask-js/pull/321)) (#323)
- Add `durable-functions@4.0.0` — Azure Functions Durable provider on the gRPC core (+ core host helpers, E2E CI, and release pipeline) ([#282](https://github.com/microsoft/durabletask-js/pull/282))
