## Upcoming

### New

- Require core SDK `>=0.4.1`, excluding published `0.4.0`, which does not export the payload APIs.
- Add opt-in Azure Blob payload storage, interoperable with durabletask-dotnet
  `91739687ff647699079cdadd627daa00562982b7`: UTF-8/gzip blobs, credential-free v2 tokens,
  legacy v1 reads, safe same-service and identity-only cross-account routing.
- Support explicit ownership-checked, ETag-conditional deletion, including snapshots and
  confirmed-absence handling. Scheduler-driven cleanup follows in later phases; do not release
  partial feature phases.
