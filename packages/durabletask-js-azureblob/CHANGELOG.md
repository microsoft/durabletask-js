## Upcoming

### Fixes

- Classify malformed percent/UTF-8 encodings in v2 token paths as `InvalidPayloadTokenError`
  so cleanup quarantines them without storage I/O. Keep access-scope denials and unrelated
  storage failures retryable.
- Default payload reads and deletion to the configured storage endpoint and container, including
  normalized blob paths and path-style account names. Out-of-location deletion references
  remain available for retry. Changing storage locations requires explicit migration or a
  store configured for the original location; v2 tokens retain their absolute URLs.
- Remove the custom HTTP/response-stream transport adapter. Use native Azure SDK abort and
  stream handling without injected progress callbacks or additional transport controllers;
  active download cancellation no longer emits the adapter's unhandled AbortError, and socket
  failures are no longer stranded behind its progress stream.
- Validate the opt-in Azurite test endpoint using the SDK-selected URL before any storage I/O.
- Preserve configured same-account secondary failover and reject a final secondary 404 as
  unknown primary absence, preserving the actual SDK failure as its cause.
- Delegate HTTP retries entirely to the Azure JavaScript SDK, with nine total attempts,
  250 ms retry delay and a 10 s exponential cap by default. Remove custom retry classification,
  backoff/jitter and Retry-After emulation; network behavior intentionally follows JavaScript
  rather than exact .NET retry semantics. Preserve public caller options and SDK ETag-bound
  body recovery without nested HTTP retries or whole-download retries. `tryTimeoutInMs` is
  only the native server-side hint; no additional client network/read deadline is enforced.

### New

- Add explicit `allowAllContainersInConfiguredAccount: true` for all containers in the configured account and
  `additionalAccountUris` for identity-authenticated access to specific additional account
  endpoints. Preserve default container scope, v2 writes, v1/v2 reads, and conditional deletion.
  Additional-account configuration requires `accountUri` and `TokenCredential`; connection-string
  key/SAS authentication remains limited to the configured account.
- Require core SDK `>=0.4.1`, excluding published `0.4.0`, which does not export the payload APIs.
- Add opt-in Azure Blob payload storage, interoperable with durabletask-dotnet
  `91739687ff647699079cdadd627daa00562982b7`: UTF-8/gzip blobs, credential-free v2 tokens,
  legacy v1 reads, and configured-endpoint/container routing.
- Support ownership-checked, ETag-conditional deletion for DTS automatic payload cleanup,
  including snapshots and confirmed-absence handling.
