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

### Worker Concurrency

Use `.concurrency()` to set independent limits for full work-item lifecycles:

```typescript
const worker = createAzureManagedWorkerBuilder(connectionString)
  .concurrency({
    maximumConcurrentOrchestrationWorkItems: 10,
    maximumConcurrentActivityWorkItems: 20,
    maximumConcurrentEntityWorkItems: 5,
  })
  .build();
```

Omitted limits default to 100 times Node.js's available logical processor count. A limit of
`0` disables that kind. Entity V1 and V2 batches share the entity limit. The worker sends all
three values to DTS and independently enforces them with bounded local backpressure.

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
Endpoint=<endpoint>;Authentication=<auth-type>;TaskHub=<task-hub-name>[;ClientID=<client-id>][;TenantId=<tenant-id>]
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
- `createAzureManagedClient(endpoint, taskHubName, credential)` - Create a client with explicit parameters
- `createAzureManagedWorkerBuilder(connectionString)` - Create a worker builder from connection string
- `createAzureManagedWorkerBuilder(endpoint, taskHubName, credential)` - Create a worker builder with explicit parameters
- `getCredentialFromAuthenticationType(connectionString)` - Get credential from connection string auth type

## License

MIT
