# Azure Blob payload storage for Durable Task

`@microsoft/durabletask-js-azureblob` adds opt-in external payload storage to the
Durable Task JavaScript SDK. Core users do not acquire Azure Storage dependencies.
Its tokens, UTF-8/gzip representation, ownership metadata, and auto-purge protocol
match [durabletask-dotnet at `91739687`](https://github.com/microsoft/durabletask-dotnet/tree/91739687ff647699079cdadd627daa00562982b7/src/Extensions/AzureBlobPayloads).

## Configure clients and workers

Requires `@microsoft/durabletask-js >=0.4.1`, the first core source version with
`PayloadStore` and the payload transport APIs. Published core `0.4.0` is incompatible;
npm rejects that peer pairing. Publish the payload-capable core release before this extension.

```sh
npm install @microsoft/durabletask-js @microsoft/durabletask-js-azureblob
```

```typescript
import { TaskHubGrpcClient, TaskHubGrpcWorker } from "@microsoft/durabletask-js";
import { BlobPayloadStore } from "@microsoft/durabletask-js-azureblob";

const store = new BlobPayloadStore({
  connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
  // containerName: "durabletask-payloads",
  // compressionEnabled: true,
});
const payloads = { store, thresholdBytes: 256 * 1024, maxPayloadBytes: 10 * 1024 * 1024 };
const client = new TaskHubGrpcClient({ hostAddress: "localhost:8080", payloads });
const worker = new TaskHubGrpcWorker({ hostAddress: "localhost:8080", payloads });
```

For identity authentication, install `@azure/identity` and replace the store configuration:

```typescript
import { DefaultAzureCredential } from "@azure/identity";

const store = new BlobPayloadStore({
  accountUri: "https://myaccount.blob.core.windows.net",
  credential: new DefaultAzureCredential(),
});
```

The identity needs permission to create the private container and read/write its blobs,
and delete permission when auto-purge is enabled. The SDK does not provision accounts or roles.
Azure-managed scheduler builders expose `.useExternalizedPayloads(payloads)` on both
`DurableTaskAzureManagedClientBuilder` and `DurableTaskAzureManagedWorkerBuilder`.
Scheduler credentials and blob credentials are independent.

Configure every participating client and worker, including .NET workers in a mixed-language
task hub, **before** writing externalized payloads. Workers advertise large-payload capability
only when enabled. Removing support while stored tokens remain makes those instances unreadable.
This feature targets the Durable Task Scheduler; it does not reconfigure a Durable Functions host.

## Payload contract

| Option                     | Default                | Behavior                                                                                  |
| -------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `payloads.thresholdBytes`  | 262144 (256 KiB)       | Externalize at **greater than or equal** serialized UTF-8 bytes; maximum threshold 1 MiB. |
| `payloads.maxPayloadBytes` | 10485760 (10 MiB)      | Reject larger externalized payloads before uploading.                                     |
| `containerName`            | `durabletask-payloads` | Lazily create a private container, once per successful initialization.                    |
| `compressionEnabled`       | `true`                 | Gzip payload bytes; record `Content-Encoding: gzip`.                                      |

Sizes refer to serialized values, including JSON quotes/escapes, not JavaScript string length
or compressed size. Absent and empty payloads remain inline. Payload transport is opt-in.
Single-instance purge routing is corrected independently of payload configuration: ordinary
IDs identify orchestrations, and `@name@key` IDs identify entities, including management-only clients.

The SDK transparently externalizes client start/event/entity-signal inputs and management
reasons/outputs, activity results, orchestration actions and custom status, continue-as-new
inputs, rewritten history, and entity state/results/outgoing operations. State queries,
waits, history streams, and orchestration/activity/entity V1/V2 work items are hydrated before
conversion or user execution. Each message runs at most eight payload operations concurrently;
failure/cancellation stops further dispatch and drains already-started operations.

New blobs have 32-character GUID names and `managed_by=dts` metadata on compressed and
uncompressed writes. Tokens are `blob:v2:{absoluteBlobUrl}`, without account keys or SAS.
Readers also recognize `blob:v1:{container}:{blobName}` in the configured container.
Same-service v2 reads preserve the configured credential/pipeline across containers,
including path-style/Azurite endpoints. Another account or endpoint requires an explicit
`TokenCredential`; account keys and configured SAS credentials are never forwarded there.

Storage uses Azure SDK exponential retries: eight retries after the initial request,
250 ms initial delay, 10-second maximum delay, and two-minute request timeout. Optional
`clientOptions` accepts Azure SDK pipeline/retry overrides. Missing blobs and store/size
failures surface as `PayloadStorageException`. Permanent activity/orchestrator response
upload failures become non-retriable task/orchestration failures; transient failures remain
retryable. Entity upload failures and download failures propagate rather than fabricating success.

Custom stores can extend `PayloadStore` from the core package. They must honor `AbortSignal`,
recognize only their own tokens, and return confirmed `PayloadDeleteOutcome` values for cleanup.
Deletion is optional; a store without deletion support leaves cleanup work retryable.

## Automatic cleanup

```typescript
await worker.start();
await client.setLargePayloadAutoPurge(true); // default batch size 500; range 1..1000
await client.setLargePayloadAutoPurge(true, 250); // update through SetBatchSize
await client.setLargePayloadAutoPurge(false); // pause backend fetches; do not terminate the runner
```

This requires a DTS backend implementing `microsoft.durabletask.largepayloads.LargePayloadPurge`.
Merely configuring storage does **not** enable deletion. The last explicit setting wins;
coordinate calls from multiple clients.

Enabling writes the backend setting first, schedules the unversioned singleton
`BlobPurgeJobOrchestrator` at `BlobPurgeJob-__dt_blob_payload_autopurge__`, verifies its identity
and Running status, then enqueues `SetBatchSize`. Live instances are deduplicated, not replaced.
Do not use these names/IDs for business tasks. The steps are not transactional: earlier successful
steps remain applied if a later step fails or is canceled. Completion acknowledges event enqueue,
not application of the configuration. The optional third argument is an `AbortSignal`.
Disabling ignores batch size and only writes the backend setting; already-fetched deletes may finish.

Payload-enabled workers automatically register the runner and its three activities, include
them with wildcard versions in nonempty filters, and bypass business version policy for those
reserved tasks. All-empty/unfiltered subscriptions remain unfiltered. Purge RPCs reuse the
worker's current authenticated transport across reconnects.

The runner fetches due tombstones, deletes chunks of 50 with at most four chunk activities
concurrent, and reports one positional outcome per attempted tombstone, preserving correlation
tokens unchanged. Each chunk limits deletion to eight concurrent blobs with a 60-second ceiling
per cooperative store call. Fetch/report RPCs have 60-second deadlines. Activities make up to three
attempts with 15/30-second retry delays, excluding unsupported backends. Empty/disabled fetches and
all-Retry results idle on a one-minute durable timer, interruptible by configuration. The runner
continues as new after five cycles, retaining configuration events, batch size, and diagnostic count.
Unsupported fetch/report RPCs wait for explicit configuration instead of polling indefinitely.

Deletion checks the case-insensitive ownership marker, then uses that read's ETag and includes
snapshots. Unowned blobs are never deleted. Only confirmed `BlobNotFound`/`ContainerNotFound`
responses count as already absent. Malformed v2 tokens, legacy v1 tokens, and invalid storage
requests are quarantined; authorization, uncertain errors, ETag conflicts, unsupported stores,
and unknown token versions remain retryable. The backend owns retry scheduling and quarantined
evidence. Logs contain bounded classifications, not payload tokens or raw storage errors.

Only tracked v2 references are eligible for automatic cleanup; v1 blobs remain in storage.
`Deleted` means storage accepted deletion or confirmed a terminal outcome, **not** immediate
physical reclamation. Soft-delete retention and blob versions can continue to consume storage.
The progress count can include duplicate/already-absent/unowned outcomes.

## Local verification

Unit tests use the real Azure SDK pipeline with an offline HTTP transport and checked-in
gzip vectors generated by .NET 10.0.13 using the pinned implementation's write/flush sequence.
Run `npm run test:unit -w @microsoft/durabletask-js-azureblob`.
The optional `test:azurite` suite requires a local-only
`DURABLETASK_BLOB_TEST_CONNECTION_STRING` and never provisions cloud resources.

After `npm run build`, run the packed-consumer regression from the repository root:

```sh
npm pack @microsoft/durabletask-js@0.4.0 --ignore-scripts --pack-destination <artifact-directory>
npm run test:payload-packages -- <artifact-directory>/microsoft-durabletask-js-0.4.0.tgz
```

This checks actual npm peer resolution against the published archive: both payload-enabled
extensions must reject core `0.4.0` with `ERESOLVE`. It then installs the new packed core and
extensions in an isolated consumer and loads their public APIs without contacting storage or DTS.
It also type-checks the packed public declarations with `lib: ES2020`, strict checking, and
`skipLibCheck: false`, without inheriting the ambient ES2022 `ErrorOptions` type.
All temporary consumer installations are removed afterward.

Merge all six review phases before preparing any package release. The complete core `0.4.1`
must be published before the dependent extensions; no partial feature phase is a release.
