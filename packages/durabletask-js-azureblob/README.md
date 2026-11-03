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

| Option                                  | Default                | Behavior                                                                                                           |
| --------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `payloads.thresholdBytes`               | 262144 (256 KiB)       | Externalize at **greater than or equal** serialized UTF-8 bytes; maximum threshold 1 MiB.                          |
| `payloads.maxPayloadBytes`              | 10485760 (10 MiB)      | Reject larger externalized payloads before uploading.                                                              |
| `containerName`                         | `durabletask-payloads` | Lazily create a private container, once per successful initialization.                                             |
| `allowAllContainersInConfiguredAccount` | `false`                | Read/delete only in the configured container; `true` allows every container at the configured account endpoint.    |
| `additionalAccountUris`                 | `[]`                   | Allow read/delete in all containers at these additional exact account endpoints; requires identity authentication. |
| `compressionEnabled`                    | `true`                 | Gzip payload bytes; record `Content-Encoding: gzip`.                                                               |

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
Readers also recognize `blob:v1:{container}:{blobName}`. V1 tokens select a container in the
configured primary account; they cannot identify an additional account.
V2 tokens remain self-describing absolute URLs; a URL identifies a blob but does not grant access.

### Payload access scopes

The default `allowAllContainersInConfiguredAccount: false` permits reads and explicit deletion only at the
configured storage account endpoint **and** `containerName`, even if the configured credential
can access other locations. No hostname-only allowlist is used.

Set `allowAllContainersInConfiguredAccount: true` to allow every container at the configured primary account
endpoint. This relaxes only the container restriction. Set `additionalAccountUris` to allow every
container at specific additional account endpoints. These options are independent: adding an
account does not broaden access to other containers in the primary account.

The following example **explicitly enables broader access**:

```typescript
const store = new BlobPayloadStore({
  accountUri: "https://myaccount.blob.core.windows.net",
  credential: new DefaultAzureCredential(),
  allowAllContainersInConfiguredAccount: true,
  additionalAccountUris: ["https://archiveaccount.blob.core.windows.net"],
});
```

In all scopes, the scheme, hostname, effective port, and complete account path must match an
authorized endpoint. The container must also match for container-scoped access. Default ports
and hostname casing normalize normally; changing scheme or port does not retain permission.
For path-style endpoints such as `https://127.0.0.1:10000/accounta`, `/accountb` is a different
account, not another container. Endpoint paths are matched on segment boundaries. Account endpoint
options must identify the account, not a container or blob.

The store checks the incoming normalized URL and the final destination after decoding blob-name
escaping and applying SDK path normalization, before HTTP requests or token acquisition. Encoded
separators or dot segments cannot escape the authorized account or container. Blob-name escaping
and both token versions remain supported. Token query parameters do not select credentials:
requests use only configured authentication. Uploads always use the configured primary
`containerName` and write credential-free v2 tokens, regardless of read/delete scope.

| Authentication configuration       | Primary container or account scope                                       | Additional accounts                                 |
| ---------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| Connection string with account key | Supported, using that same key/pipeline                                  | Not supported                                       |
| Connection string with SAS         | Supported, using that same SAS/pipeline; SAS permissions may be narrower | Not supported                                       |
| `accountUri` and `TokenCredential` | Supported, using the configured identity                                 | Supported, using that same identity; HTTPS required |

A nonempty `additionalAccountUris` list without both `accountUri` and `credential` fails at
construction, including a connection string with an otherwise unused `credential`. Additional
endpoints must be absolute HTTPS account URLs without embedded credentials, query, or fragment.
Equivalent additional endpoints are deduplicated. Container/blob URLs and arbitrary account-path
prefixes are rejected: the Azure SDK must recognize the endpoint as an account service endpoint,
including the account segment for its supported path-style endpoints. Wildcards are not supported.
Use `allowAllContainersInConfiguredAccount` rather than listing the primary endpoint again. The existing constructor
precedence is unchanged: both `accountUri` and `credential` select identity authentication;
otherwise `connectionString` selects its key/SAS authentication. No operation silently switches
between modes. Identity-authenticated requests require HTTPS, as enforced by the Azure SDK.

Broader scopes permit using the configured Storage identity only at the explicitly configured
destinations. Independent Azure Storage permissions are still required; an allowed destination
can return 403. Account-specific `secondaryHost` retry routing is retained for the primary account
but is not forwarded to additional accounts. Other configured HTTP, retry, and transport options
are preserved. HTTP redirects are disabled so a response cannot select another endpoint.
Scope and endpoint values are captured when the store is constructed.

This intentionally replaces unrestricted cross-container/cross-account v2 routing. Changing the
primary endpoint, container, or access scopes can leave existing references outside the new scope.
Explicitly migrate those payloads and references, use a store configured for the original location,
or explicitly authorize the original account/container with these options. A v2 token is never
reinterpreted relative to a new location. V1 contains no account location, so moving accounts
requires explicit migration or a store pointed at the original account.

All SDK client/worker hydration paths use this store policy, including inputs, events, history,
results, and entity state. This package implements neither a scheduler/service backend nor a
dashboard/delegated-user read path; it does not change their identity behavior or fall back to
another credential or location.

The Azure Storage JavaScript SDK owns the only HTTP retry loop, including endpoint selection,
error classification and retry delays. The provider supplies defaults of nine total attempts,
`retryDelayInMs: 250` and `maxRetryDelayInMs: 10000`, and preserves SDK authentication, proxy,
user agent and custom HTTP transport options. Retry behavior deliberately follows the installed
JavaScript SDK, **not** the pinned .NET provider; payload tokens and storage representation remain
interoperable.

For example, the tested Blob SDK 12.31.0 retries ordinary HTTP 500/503 and its recognized
transport/copy-source failures, but not ordinary 408/429/502/504. Its first exponential retry is
immediate; subsequent primary delays follow the SDK's exponential formula without .NET jitter
or Retry-After parsing. `FIXED` uses the SDK's configured delay. These are native SDK behaviors,
not additional provider policies.

The SDK also owns HTTP sends, abort handling and response-stream lifetime. The provider passes
the caller's `AbortSignal` directly to storage and the Node pipeline that consumes/decompresses
the payload. It does not inject progress callbacks, wrap response streams, create transport
abort controllers or enforce a client-side network/pending-read deadline.

`clientOptions.retryOptions` retains `maxTries` (total HTTP attempts, minimum 1),
`retryDelayInMs`, `maxRetryDelayInMs`, `retryPolicyType` (exponential/fixed),
`tryTimeoutInMs` (native server-side timeout hint, default 120000 ms, not a local deadline),
and `secondaryHost` (native same-account read failover). An explicit zero disables that hint.
Other SDK options, including caller-provided `httpClient`, are passed through unchanged.
Custom transports must honor the SDK's abort signal and return Node-readable bodies.
Caller cancellation preserves the original reason. SDK-native network/body errors propagate
without custom normalization or whole-download retries; native resumable failures can use up
to five additional ranged GETs with the original ETag/`If-Match`. Some errors, including native
body `AbortError`, are terminal rather than resumable. A failed ETag condition does not mix
payload versions, and corrupt gzip is not hidden by HTTP retries.

A final secondary 404 is not confirmed primary absence: the provider checks the actual SDK error's request
endpoint and raises a retryable `RestError` with the original 404 as its cause, rather than
reporting missing/deleted data. It does not add attempts or fabricate an HTTP status.
An actual primary 404 still confirms absence, including after the SDK stops using a lagging
secondary. No provider retry loop multiplies the SDK budget.

Missing blobs and store/size
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
References outside the configured access scopes throw before storage access, rather than returning a terminal
`PayloadDeleteOutcome`. Cleanup callers must retain these references for `RETRY`, not acknowledge
them as deleted, absent, or unowned. Retry requires migration, a store configured for their
original location, or explicit authorization of that location through the access-scope options.
`Deleted` means storage accepted deletion or confirmed a terminal outcome, **not** immediate
physical reclamation. Soft-delete retention and blob versions can continue to consume storage.

## Local verification

Unit tests use the real Azure SDK pipeline with an offline HTTP transport and checked-in
gzip vectors generated by .NET 10.0.13 using the pinned implementation's write/flush sequence.
Run `npm run test:unit -w @microsoft/durabletask-js-azureblob`.
The optional `test:azurite` suite requires a local-only
`DURABLETASK_BLOB_TEST_CONNECTION_STRING`. Its explicit local endpoint is checked against the
SDK-parsed service URL before any I/O; the suite never provisions cloud resources.
