# Changelog

## TBD

- Change ([#321](https://github.com/microsoft/durabletask-js/issues/321)): a plain **synchronous,
  single-argument, non-generator** orchestrator `(ctx) => value` is now always treated as a
  **core-native** orchestrator and receives the core `OrchestrationContext` (`instanceId`,
  `callActivity`, `newGuid`, …). This fixes #321, where such a handler previously received only the
  classic `{ df, log }` context, so core members read as `undefined` / threw `TypeError`.
  - **BREAKING:** a *classic* v3 orchestrator written as a plain **non-generator** function that uses
    `context.df.*` / `context.log` in this exact shape (sync, single-arg, non-generator) no longer
    receives the classic context. Convert it to the standard classic **generator** form (`function*`,
    unaffected) or to core-native (`ctx.*`). Sync generators, `async` orchestrators, async generators,
    and 2-argument `(ctx, input)` handlers are all unchanged.
- Details to be finalized at release time.
