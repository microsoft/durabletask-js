## Upcoming

### Fixes

- Keep account-specific secondary failover off cross-endpoint identity requests and preserve
  the preceding primary failure when a lagging secondary's 404 exhausts the retry budget.
- Enforce the default two-minute client network/pending-read timeout at the shared Azure
  pipeline boundary; preserve healthy progressive reads, caller cancellation and SDK
  ETag-bound body recovery.
- Align the bounded HTTP retry classification, jittered exponential backoff and Retry-After
  precedence with the pinned .NET provider. Preserve custom retry/transport options without
  multiplying the SDK's HTTP retry loop or retrying permanent responses/corrupt gzip.

### New

- Require core SDK `>=0.4.1`, excluding published `0.4.0`, which does not export the payload APIs.
- Add opt-in Azure Blob payload storage, interoperable with durabletask-dotnet
  `91739687ff647699079cdadd627daa00562982b7`: UTF-8/gzip blobs, credential-free v2 tokens,
  legacy v1 reads, safe same-service and identity-only cross-account routing.
- Support ownership-checked, ETag-conditional deletion for DTS automatic payload cleanup,
  including snapshots and confirmed-absence handling.
