## Upcoming

### Fixes

- Release raw response I/O, timers and caller listeners immediately on downstream stream failure.
- Validate the opt-in Azurite test endpoint using the SDK-selected URL before any storage I/O.
- Keep account-specific secondary failover off cross-endpoint identity requests and reject a
  final secondary 404 as unknown primary absence, preserving the actual SDK failure as its cause.
- Enforce the default two-minute client network/pending-read timeout at the shared Azure
  pipeline boundary; preserve healthy progressive reads, caller cancellation and SDK
  ETag-bound body recovery.
- Delegate HTTP retries entirely to the Azure JavaScript SDK, with nine total attempts,
  250 ms retry delay and a 10 s exponential cap by default. Remove custom retry classification,
  backoff/jitter and Retry-After emulation; network behavior intentionally follows JavaScript
  rather than exact .NET retry semantics. Preserve caller options and per-attempt deadlines
  through a public HTTP transport adapter, without nested HTTP retries or whole-download retries.

### New

- Require core SDK `>=0.4.1`, excluding published `0.4.0`, which does not export the payload APIs.
- Add opt-in Azure Blob payload storage, interoperable with durabletask-dotnet
  `91739687ff647699079cdadd627daa00562982b7`: UTF-8/gzip blobs, credential-free v2 tokens,
  legacy v1 reads, safe same-service and identity-only cross-account routing.
- Support explicit ownership-checked, ETag-conditional deletion, including snapshots and
  confirmed-absence handling. Scheduler-driven cleanup follows in later phases; do not release
  partial feature phases.
