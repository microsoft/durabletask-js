# @microsoft/durabletask-js-azuremanaged

Azure-managed Durable Task support for the Durable Task JavaScript SDK.

This package provides support for connecting to Azure-managed Durable Task services, including authentication via Azure Identity.

## Installation

```bash
npm install @microsoft/durabletask-js-azuremanaged @microsoft/durabletask-js
```

## Usage

### Via Connection String

```typescript
import { createAzureManagedClient, createAzureManagedWorkerBuilder } from "@microsoft/durabletask-js-azuremanaged";

// Create a client
const client = createAzureManagedClient(
  "Endpoint=https://myservice.durabletask.io;Authentication=DefaultAzure;TaskHub=myTaskHub",
);

// Create a worker
const worker = createAzureManagedWorkerBuilder(
  "Endpoint=https://myservice.durabletask.io;Authentication=DefaultAzure;TaskHub=myTaskHub",
)
  .addOrchestrator(myOrchestrator)
  .addActivity(myActivity)
  .build();

await worker.start();
```

### Via Explicit Parameters

```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { createAzureManagedClient, createAzureManagedWorkerBuilder } from "@microsoft/durabletask-js-azuremanaged";

const credential = new DefaultAzureCredential();

// Create a client
const client = createAzureManagedClient("https://myservice.durabletask.io", "myTaskHub", credential);

// Create a worker
const worker = createAzureManagedWorkerBuilder("https://myservice.durabletask.io", "myTaskHub", credential)
  .addOrchestrator(myOrchestrator)
  .addActivity(myActivity)
  .build();

await worker.start();
```

### Token Audience and Azure Government

The optional `resourceId` is a **token audience URI**, not an Azure Resource Manager resource path.
Configure it with `.resourceId(value)` on either builder, `.setResourceId(value)` on either options class,
the optional fourth argument to the explicit-parameter factory functions, or `ResourceId` in a connection string.
Existing calls remain valid.

| Configuration | Selected resource ID |
| --- | --- |
| Explicit nonempty `resourceId` / `ResourceId` | The normalized explicit value |
| Missing, `null`, or empty, and `REGION_NAME` starts with `usgov` or `usdod` (case-insensitive) | `https://durabletask.azure.us` |
| Otherwise | `https://durabletask.io` |

The default is captured when the connection options are created, including when a builder is constructed or
its `.connectionString(...)` replaces the options. It stays fixed across token refreshes, worker reconnects,
and restarts. Resetting the resource ID to `null`, `undefined`, or `""` uses that captured default.
An explicit public audience overrides a government region, and vice versa. `chinaeast2`, `notusgov`, and
`notusdod` use the public default. The SDK does not infer an audience from the endpoint.

**Intentional default change:** applications running with a government/DoD `REGION_NAME` now request the
government audience rather than the public audience. Set `resourceId` explicitly to `https://durabletask.io`
if such an application intentionally connects to the public service.

Explicit values have surrounding whitespace and trailing `/` characters trimmed, then **one**
case-insensitive `/.default` suffix removed, followed by any remaining trailing `/` characters.
The SDK requests `<normalized-resource-id>/.default` without changing the URI's casing:

| Input | Requested scope |
| --- | --- |
| `https://durabletask.azure.us/` | `https://durabletask.azure.us/.default` |
| `https://durabletask.azure.us//.DEFAULT//` | `https://durabletask.azure.us/.default` |
| `api://CustomAudience/resource/.DEFAULT/` | `api://CustomAudience/resource/.default` |

Whitespace-only values, `///`, `/.default`, and `/.DEFAULT///` throw a configuration `Error`,
even with anonymous authentication. `ResourceId=` selects the default, but `ResourceId=   ` is invalid.

The **audience, credential authority/cloud, and service endpoint are separate settings**. Neither `resourceId`
nor `REGION_NAME` changes the endpoint or authority. Configure authority on a caller-supplied Azure Identity
credential when constructing it; `TokenCredential.getToken()` does not accept a per-request authority override:

```typescript
import { AzureAuthorityHosts, DefaultAzureCredential } from "@azure/identity";
import { createAzureManagedClient, createAzureManagedWorkerBuilder } from "@microsoft/durabletask-js-azuremanaged";

const credential = new DefaultAzureCredential({
  authorityHost: AzureAuthorityHosts.AzureGovernment,
});
const endpoint = "https://myaccount.usgovvirginia.durabletask.azure.us";
const resourceId = "https://durabletask.azure.us";

const client = createAzureManagedClient(endpoint, "myTaskHub", credential, resourceId);
const worker = createAzureManagedWorkerBuilder(endpoint, "myTaskHub", credential)
  .resourceId(resourceId)
  .addOrchestrator(myOrchestrator)
  .addActivity(myActivity)
  .build();
```

For SDK-created credentials, use the optional connection-string `AuthorityHost` property:

```text
Endpoint=https://myaccount.usgovvirginia.durabletask.azure.us;Authentication=DefaultAzure;TaskHub=myTaskHub;ResourceId=https://durabletask.azure.us;AuthorityHost=https://login.microsoftonline.us
```

`AuthorityHost` is forwarded to `DefaultAzure`, `WorkloadIdentity`, `Environment`, `VisualStudioCode`, and
`InteractiveBrowser` credentials. Omission (or an empty value) preserves Azure Identity's defaults, including
`AZURE_AUTHORITY_HOST` where applicable; the SDK does not substitute its own authority default.
Managed identity uses the hosting environment's identity endpoint, so an Entra authority override does not apply.
`AzureCli` and `AzurePowerShell` use their tools' cloud configuration rather than `AuthorityHost`; configure those
tools separately, including when used through `DefaultAzureCredential`. VS Code also needs its extension/account
configured for the target cloud.

See the [government-cloud sample configuration](../../examples/azure-managed/README.md#azure-government-configuration)
for running the existing samples against a government scheduler.

### Versioned registrations

All four orchestrator/activity registration methods accept an optional final `version` argument,
which is preserved when the builder constructs the worker:

```typescript
const worker = createAzureManagedWorkerBuilder("http://localhost:8080", "myTaskHub", null)
  .versioning({ defaultVersion: "v2" })
  .addNamedOrchestrator("Order", orderV1, "v1")
  .addNamedOrchestrator("Order", orderV2, "v2")
  .addNamedActivity("Price", priceV1, "v1")
  .addNamedActivity("Price", priceV2, "v2")
  .useWorkItemFilters()
  .build();
```

Names remain case-sensitive; versions are case-insensitive opaque strings. Omitted or empty
versions register an unversioned implementation. Worker filtering is independent of local
dispatch. The worker default applies to child orchestrations, while activities default to their
parent instance's version. See the core
[versioning and migration contract](../../README.md#versioned-registration-and-dispatch).

## Supported Authentication Types

The connection string `Authentication` parameter supports the following values:

- `DefaultAzure` - Uses `DefaultAzureCredential`
- `ManagedIdentity` - Uses `ManagedIdentityCredential`
- `WorkloadIdentity` - Uses `WorkloadIdentityCredential`
- `Environment` - Uses `EnvironmentCredential`
- `AzureCli` - Uses `AzureCliCredential`
- `AzurePowerShell` - Uses `AzurePowerShellCredential`
- `VisualStudioCode` - Uses `VisualStudioCodeCredential`
- `InteractiveBrowser` - Uses `InteractiveBrowserCredential`
- `None` - No authentication (for local development/testing)

## Connection String Format

```
Endpoint=<endpoint>;Authentication=<auth-type>;TaskHub=<task-hub-name>[;ClientID=<client-id>][;TenantId=<tenant-id>][;ResourceId=<token-audience-uri>][;AuthorityHost=<authority-url>]
```

Property names are case-insensitive. `ResourceId` normalization and `AuthorityHost` support are described above.
For workload identity, `TokenFilePath` and comma-separated `AdditionallyAllowedTenants` are also supported.

## Transport Security

Endpoint transport and authentication are configured independently:

- `https://` endpoints always use TLS.
- `http://` endpoints use plaintext and are intended for local development and testing.
- Endpoints without a scheme default to HTTPS.
- Token credentials with an HTTP endpoint are rejected unless the client or worker builder explicitly calls
  `.allowInsecureCredentials(true)`. This opt-in permits authentication metadata over plaintext; it never
  downgrades an HTTPS endpoint.

`connectionString()` replaces only the Azure-managed connection options. Builder-level state such as the logger,
gRPC channel options, and worker registrations is preserved. Connection options configured before it are reset, so
`.allowInsecureCredentials(true)` must follow `.connectionString(...)`:

```typescript
new DurableTaskAzureManagedClientBuilder()
  .connectionString("Endpoint=http://localhost:8080;Authentication=DefaultAzure;TaskHub=myTaskHub")
  .allowInsecureCredentials(true)
  .build();
```

## API Reference

### Classes

- `DurableTaskAzureManagedConnectionString` - Parses connection strings
- `DurableTaskAzureManagedClientOptions` - Client configuration
- `DurableTaskAzureManagedWorkerOptions` - Worker configuration
- `DurableTaskAzureManagedClientBuilder` - Builder for creating clients
- `DurableTaskAzureManagedWorkerBuilder` - Builder for creating workers
- `AzureManagedTaskHubGrpcClient` - Client implementation
- `AzureManagedTaskHubGrpcWorker` - Worker implementation
- `AccessTokenCache` - Token caching for Azure authentication

### Functions

- `createAzureManagedClient(connectionString)` - Create a client from connection string
- `createAzureManagedClient(endpoint, taskHubName, credential?, resourceId?)` - Create a client with explicit parameters
- `createAzureManagedWorkerBuilder(connectionString)` - Create a worker builder from connection string
- `createAzureManagedWorkerBuilder(endpoint, taskHubName, credential?, resourceId?)` - Create a worker builder with explicit parameters
- `getCredentialFromAuthenticationType(connectionString)` - Get credential from connection string auth type

### Audience Configuration

- Client and worker builders: `.resourceId(resourceId?: string | null)`
- Client and worker options: `.setResourceId(resourceId?: string | null)` and `.getResourceId()` (normalized)
- Parsed connection strings: `.getResourceId()` (raw) and `.getAuthorityHost()`

Configure connection options after `.connectionString(...)`, which replaces previous audience settings.

## License

MIT
