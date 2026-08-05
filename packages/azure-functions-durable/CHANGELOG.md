## Upcoming

### New

- Added a `durable-functions/testing` entry point with `runOrchestrator`, which runs an orchestrator
  to a terminal state against inline activity implementations on the in-memory backend and always
  releases its worker, and `createActivityContext` for invoking activity handlers directly.
  Interactive scenarios (external events, termination, suspend/resume) and entity batches are
  covered by driving the `@microsoft/durabletask-js` in-memory test stack with `wrapOrchestrator` /
  `wrapEntity`; see the README.
- Forward orchestration instance ID reuse policies through `DurableFunctionsClient.startNew()`.

### Fixes

## v4.0.0-beta.1 (2026-07-31)

### Changes

- docs(release): changelog, README, and copilot-instructions updates ([#339](https://github.com/microsoft/durabletask-js/pull/339))
- feat(durable-functions): restore worker-side callHttp ([#318](https://github.com/microsoft/durabletask-js/issues/318)) ([#333](https://github.com/microsoft/durabletask-js/pull/333))
- fix(durable-functions): route sync single-arg orchestrators to core-native ([#321](https://github.com/microsoft/durabletask-js/pull/321)) (#323)
- Add `durable-functions@4.0.0` — Azure Functions Durable provider on the gRPC core (+ core host helpers, E2E CI, and release pipeline) ([#282](https://github.com/microsoft/durabletask-js/pull/282))
