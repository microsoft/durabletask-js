# Changelog

## TBD

- Fix ([#321](https://github.com/microsoft/durabletask-js/issues/321)): a plain **synchronous,
  single-argument, non-generator** orchestrator is an ambiguous shape — the identical
  `(ctx) => ...` signature is used both by a classic body (`(context) => context.df.*`) and a
  core-native body (`(ctx) => ctx.newGuid()`). It is now wrapped with a **dual context** that
  overlays the classic `df` + replay-safe log surface on top of the core `OrchestrationContext`, so
  both intents work. Previously such a handler received only the classic `{ df, log }` context, so
  core members threw `TypeError: ctx.<method> is not a function` (or read as `undefined`). No change
  to already-correctly-classified orchestrators (async generators, plain `async`, sync generators,
  and 2-argument `(ctx, input)` handlers).
- Details to be finalized at release time.
