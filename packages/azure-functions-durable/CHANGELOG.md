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

- Preserve nested task `innerFailure` details in `durable-functions/testing` results.
- Inherit core version-aware replay dispatch and worker child defaults in the embedded
  `DurableFunctionsWorker`, including classic-context wrappers. Host `app.*` function registrations
  remain name-only; see README for the boundary and activity-version migration guidance.
- Inherit Python-aligned core three-day timer/retry segments so the gRPC provider does not exceed
  Azure Storage's per-message delay limit. The testing helper inherits the same default. Functions
  also splits timers with DTS; there is no backend detection or Functions timer configuration.

### Breaking changes

- Timer cancellation now matches Python: boolean return, canceled terminal state, parent notification,
  and `TaskCancelledError` from canceled results. Timer `result` now aliases `getResult()`, including
  errors while pending or failed. Drain affected instances before mixing versions or rollback;
  cancellation branching and already-segmented histories can change replay.
## v4.0.0-beta.1 (2026-07-31)

### Changes

- docs(release): changelog, README, and copilot-instructions updates ([#339](https://github.com/microsoft/durabletask-js/pull/339))
- feat(durable-functions): restore worker-side callHttp ([#318](https://github.com/microsoft/durabletask-js/issues/318)) ([#333](https://github.com/microsoft/durabletask-js/pull/333))
- fix(durable-functions): route sync single-arg orchestrators to core-native ([#321](https://github.com/microsoft/durabletask-js/pull/321)) (#323)
- Add `durable-functions@4.0.0` — Azure Functions Durable provider on the gRPC core (+ core host helpers, E2E CI, and release pipeline) ([#282](https://github.com/microsoft/durabletask-js/pull/282))
