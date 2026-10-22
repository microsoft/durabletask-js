# Azure Blob payload storage for Durable Task

`@microsoft/durabletask-js-azureblob` adds opt-in external payload storage to the
Durable Task JavaScript SDK. Core users do not acquire Azure Storage dependencies.
Its tokens, UTF-8/gzip representation, and ownership metadata
match [durabletask-dotnet at `91739687`](https://github.com/microsoft/durabletask-dotnet/tree/91739687ff647699079cdadd627daa00562982b7/src/Extensions/AzureBlobPayloads).

This is phase 3 of the six-PR feature stack. The provider works with the preceding SDK
transport integration; scheduler-driven automatic cleanup is implemented in later phases.
Do not publish a partial feature phase.

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
and delete permission when invoking the store's deletion API. The SDK does not provision accounts or roles.
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
or compressed size. Absent and empty payloads remain inline. With the feature disabled,
existing transport and payload behavior are unchanged.

The SDK transparently externalizes client start/event/entity-signal inputs and management
reasons/outputs, activity results, orchestration actions and custom status, continue-as-new
inputs, carried-over events, rewritten history, and entity state/results/outgoing operations. State queries,
waits, history streams, and orchestration/activity/entity V1/V2 work items are hydrated before
conversion or user execution. Each message runs at most eight payload operations concurrently;
failure/cancellation stops further dispatch and drains already-started operations.

Every eligible payload's serialized UTF-8 size is validated across the whole message before
any upload starts. A deterministically oversized message therefore creates no blobs; valid
messages still use bounded I/O with cancellation and message-order storage failure handling.

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

Externalization and backend submission are not a transaction. Later I/O failures, cancellation,
or uncertain submission can still leave unreferenced blobs; uploads are not automatically rolled
back. Tombstone-based cleanup requires a reference recorded by the backend and cannot discover
or recover existing orphan blobs.

Custom stores can extend `PayloadStore` from the core package. They must honor `AbortSignal`,
recognize only their own tokens, and return confirmed `PayloadDeleteOutcome` values for cleanup.
Deletion is optional. The provider's explicit deletion API has the safety contract below.

## Explicit deletion safety

Deletion checks the case-insensitive ownership marker, then uses that read's ETag and includes
snapshots. Unowned blobs are never deleted. Only confirmed `BlobNotFound`/`ContainerNotFound`
responses count as already absent; uncertain failures propagate. Configuring the provider alone
does not invoke deletion. Later cleanup phases add the authenticated backend lifecycle and runner.
`Deleted` means storage accepted deletion or confirmed a terminal outcome, **not** immediate
physical reclamation. Soft-delete retention and blob versions can continue to consume storage.

## Local verification

Unit tests use the real Azure SDK pipeline with an offline HTTP transport and checked-in
gzip vectors generated by .NET 10.0.13 using the pinned implementation's write/flush sequence.
Run `npm run test:unit -w @microsoft/durabletask-js-azureblob`.
The optional `test:azurite` suite requires a local-only
`DURABLETASK_BLOB_TEST_CONNECTION_STRING` and never provisions cloud resources.
