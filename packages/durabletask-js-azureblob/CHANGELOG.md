## Upcoming

### Fixes

- Remove the custom HTTP/response-stream transport adapter. Use native Azure SDK abort and
  stream handling without injected progress callbacks or additional transport controllers;
  active download cancellation no longer emits the adapter's unhandled AbortError, and socket
  failures are no longer stranded behind its progress stream.
- Validate the opt-in Azurite test endpoint using the SDK-selected URL before any storage I/O.
- Keep account-specific secondary failover off cross-endpoint identity requests and reject a
  final secondary 404 as unknown primary absence, preserving the actual SDK failure as its cause.
- Delegate HTTP retries entirely to the Azure JavaScript SDK, with nine total attempts,
  250 ms retry delay and a 10 s exponential cap by default. Remove custom retry classification,
  backoff/jitter and Retry-After emulation; network behavior intentionally follows JavaScript
  rather than exact .NET retry semantics. Preserve public caller options and SDK ETag-bound
  body recovery without nested HTTP retries or whole-download retries. `tryTimeoutInMs` is
  only the native server-side hint; no additional client network/read deadline is enforced.

### New

- Require core SDK `>=0.4.1`, excluding published `0.4.0`, which does not export the payload APIs.
- Add opt-in Azure Blob payload storage, interoperable with durabletask-dotnet
  `91739687ff647699079cdadd627daa00562982b7`: UTF-8/gzip blobs, credential-free v2 tokens,
  legacy v1 reads, safe same-service and identity-only cross-account routing.
- Support explicit ownership-checked, ETag-conditional deletion, including snapshots and
  confirmed-absence handling. Scheduler-driven cleanup follows in later phases; do not release
  partial feature phases.
