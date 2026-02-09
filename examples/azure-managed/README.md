# Azure Managed Durable Task Scheduler — Samples

Runnable samples demonstrating every major feature of the Durable Task JavaScript SDK with Azure Managed DTS.

## Sample Index

| Sample | Scenario | Key Features | Emulator Required |
|--------|----------|-------------|-------------------|
| [hello-orchestrations](hello-orchestrations/) | Core patterns | Activity sequence, fan-out/fan-in, sub-orchestrations, `whenAny` | Yes |
| [retry-and-error-handling](retry-and-error-handling/) | Fault tolerance | `RetryPolicy`, `handleFailure`, `AsyncRetryHandler`, sub-orchestration retry, `raiseIfFailed()` | Yes |
| [human-interaction](human-interaction/) | Event-driven workflows | External events, timers, `whenAny` race, `sendEvent`, custom status | Yes |
| [lifecycle-management](lifecycle-management/) | Orchestration control | Terminate (recursive), suspend/resume, restart, continue-as-new, purge, tags | Yes |
| [query-and-history](query-and-history/) | Monitoring & debugging | `getAllInstances`, pagination, `listInstanceIds`, `getOrchestrationHistory`, typed events | Yes |
| [versioning](versioning/) | Safe deployments | Version match strategies, failure strategies, `ctx.version`, `ctx.compareVersionTo()` | Yes |
| [unit-testing](unit-testing/) | Testing without infra | `InMemoryOrchestrationBackend`, `TestOrchestrationClient`, `TestOrchestrationWorker`, `ReplaySafeLogger` | **No** |
| [index.ts](index.ts) | Azure-managed basics | Connection strings, `DefaultAzureCredential`, `createAzureManagedClient` | Yes |
| [distributed-tracing.ts](distributed-tracing.ts) | OpenTelemetry tracing | `NodeSDK`, OTLP export, Jaeger, `DurableTaskAzureManagedClientBuilder` | Yes |

### Quick Start (Local Emulator)

```bash
npm install && npm run build                              # build SDK
cd examples/azure-managed && docker compose up -d          # start emulator
cp .env.emulator .env                                      # configure
cd ../..
npm run example -- ./examples/azure-managed/hello-orchestrations/index.ts
```

### Quick Start (Azure Managed DTS — Cloud)

To run samples against a **real Azure Managed Durable Task Scheduler** instead of the local emulator:

#### 1. Create a Durable Task Scheduler resource

If you haven't already, create a Durable Task Scheduler and a Task Hub in Azure:

```bash
# Install the Durable Task Scheduler CLI extension
az extension add --name durabletask

# Create a scheduler
az durabletask scheduler create \
  --resource-group <your-rg> \
  --name <your-scheduler-name> \
  --location <region> \
  --sku free

# Create a task hub
az durabletask taskhub create \
  --resource-group <your-rg> \
  --scheduler-name <your-scheduler-name> \
  --name <your-taskhub-name>
```

#### 2. Assign yourself the "Durable Task Data Contributor" role

```bash
SCHEDULER_ID=$(az durabletask scheduler show \
  --resource-group <your-rg> \
  --name <your-scheduler-name> \
  --query id -o tsv)

az role assignment create \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --role "Durable Task Data Contributor" \
  --scope $SCHEDULER_ID
```

#### 3. Configure your `.env` file

```bash
cd examples/azure-managed
cp .env.example .env
```

Edit `.env` with your scheduler's endpoint and task hub name:

```env
# Option A: Connection string (recommended)
DURABLE_TASK_SCHEDULER_CONNECTION_STRING=Endpoint=https://<your-scheduler>.eastus.durabletask.io;Authentication=DefaultAzure;TaskHub=<your-taskhub>

# Option B: Explicit parameters
# AZURE_DTS_ENDPOINT=https://<your-scheduler>.eastus.durabletask.io
# AZURE_DTS_TASKHUB=<your-taskhub>
```

#### 4. Authenticate and run

```bash
az login                      # authenticate with Azure
cd ../..                      # back to repo root
npm run example -- ./examples/azure-managed/hello-orchestrations/index.ts
```

> **Supported authentication types** in the connection string: `DefaultAzure`, `ManagedIdentity`, `WorkloadIdentity`, `Environment`, `AzureCli`, `AzurePowerShell`, `VisualStudioCode`, `InteractiveBrowser`.

See each sample's README for details. See [Feature Coverage Map](#feature-coverage-map) below for full feature mapping.

### CI Validation

Samples are validated automatically by [`.github/workflows/validate-samples.yaml`](../../.github/workflows/validate-samples.yaml). Any subfolder with a `sample.json` is auto-discovered and tested on every PR.

To add a new sample: create a subfolder with `sample.json`, `index.ts`, and `README.md`. CI picks it up automatically.

### Running All Samples Locally

```bash
for dir in examples/azure-managed/*/; do
  if [ -f "$dir/sample.json" ] && [ -f "$dir/index.ts" ]; then
    echo "--- Running $(basename $dir) ---"
    npx ts-node --swc "$dir/index.ts"
  fi
done
```

### Feature Coverage Map

| Feature | Sample(s) |
|---------|-----------|
| `ctx.callActivity()` | hello-orchestrations, retry-and-error-handling |
| `whenAll()` | hello-orchestrations, unit-testing |
| `whenAny()` | hello-orchestrations, human-interaction |
| `ctx.callSubOrchestrator()` | hello-orchestrations, retry-and-error-handling, lifecycle-management |

| `ctx.waitForExternalEvent()` | human-interaction, unit-testing |
| `client.raiseOrchestrationEvent()` | human-interaction, unit-testing |
| `ctx.createTimer()` | human-interaction, query-and-history, unit-testing |
| `ctx.sendEvent()` | human-interaction |
| `ctx.setCustomStatus()` | human-interaction |
| `RetryPolicy` | retry-and-error-handling |
| `handleFailure` predicate | retry-and-error-handling |
| `AsyncRetryHandler` | retry-and-error-handling |
| `state.raiseIfFailed()` | retry-and-error-handling |
| `terminateOrchestration()` | lifecycle-management, unit-testing |
| `terminateOptions()` (recursive) | lifecycle-management |
| `suspendOrchestration()` / `resumeOrchestration()` | lifecycle-management, unit-testing |
| `continueAsNew()` | lifecycle-management, unit-testing |
| `restartOrchestration()` | lifecycle-management |
| `purgeOrchestration()` | lifecycle-management |
| Orchestration tags | lifecycle-management |
| `getAllInstances()` / pagination | query-and-history |
| `listInstanceIds()` | query-and-history |
| `getOrchestrationHistory()` | query-and-history |
| Typed `HistoryEvent` | query-and-history |
| `VersionMatchStrategy` | versioning |
| `VersionFailureStrategy` | versioning |
| `ctx.version` / `ctx.compareVersionTo()` | versioning |
| `InMemoryOrchestrationBackend` | unit-testing |
| `TestOrchestrationClient/Worker` | unit-testing |
| `ReplaySafeLogger` | unit-testing |
| `NoOpLogger` | unit-testing |
| Connection strings | index.ts, all samples |
| `DefaultAzureCredential` | index.ts |
| `createAzureLogger()` | index.ts |
| Distributed tracing (OTel) | distributed-tracing.ts |
| `ConsoleLogger` | all samples |

---

# Distributed Tracing with Azure Managed Durable Task Scheduler

This example demonstrates **OpenTelemetry distributed tracing** with the Durable Task JavaScript SDK and Azure Managed Durable Task Scheduler (DTS). Traces are exported to [Jaeger](https://www.jaegertracing.io/) so you can visualize the full orchestration lifecycle as connected spans.

## What You'll See

When you run this example, the SDK automatically produces [W3C Trace Context](https://www.w3.org/TR/trace-context/) spans for every stage of a durable orchestration:

| Span | Kind | Description |
|------|------|-------------|
| `create_orchestration:<name>` | PRODUCER | Client scheduling a new orchestration |
| `orchestration:<name>` | SERVER | Worker executing the orchestration |
| `activity:<name>` (scheduling) | CLIENT | Orchestrator scheduling an activity |
| `activity:<name>` (execution) | SERVER | Worker executing the activity |
| `timer:<orchestrationName>` | INTERNAL | Timer created inside an orchestration |
| `orchestration_event:<eventName>` | PRODUCER | Event raised to another orchestration |

All spans are linked via `traceparent` propagation, giving you a single end-to-end trace from the client all the way through parallel activity fan-out and back.

### Sample Trace in Jaeger

```
create_orchestration:dataPipelineOrchestrator  (PRODUCER)
 └─ orchestration:dataPipelineOrchestrator     (SERVER)
     ├─ activity:getDataSources                (CLIENT → SERVER)
     ├─ activity:fetchData  ×4                 (CLIENT → SERVER, parallel)
     ├─ activity:transformData  ×4             (CLIENT → SERVER, parallel)
     └─ activity:saveResults                   (CLIENT → SERVER)
```

---

## Prerequisites

- **Node.js ≥ 22** (required by the monorepo)
- **Docker** (for the DTS Emulator and Jaeger)
- **npm** (for installing dependencies)

---

## Quick Start (Local with DTS Emulator)

### 1. Start the DTS Emulator and Jaeger

A `docker-compose.yml` is provided that starts both services:

```bash
cd examples/azure-managed
docker compose up -d
```

This starts:

| Service | Port | Purpose |
|---------|------|---------|
| **DTS Emulator** | `8080` | Local gRPC endpoint (no authentication) |
| **Jaeger UI** | `16686` | Trace visualization dashboard |
| **Jaeger OTLP (HTTP)** | `4318` | OpenTelemetry trace receiver |
| **Jaeger OTLP (gRPC)** | `4317` | OpenTelemetry trace receiver (gRPC) |

> **Tip:** You can also run just the DTS Emulator standalone:
> ```bash
> docker run -d --name dts-emulator -p 8080:8080 -p 8082:8082 \
>   mcr.microsoft.com/dts/dts-emulator:latest
> ```

### 2. Configure Environment Variables

Copy the provided emulator configuration:

```bash
cp .env.emulator .env
```

This sets:

```env
DURABLE_TASK_SCHEDULER_CONNECTION_STRING=Endpoint=http://localhost:8080;Authentication=None;TaskHub=default
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### 3. Install OpenTelemetry Dependencies

From the **repository root**, install the required OTel packages:

```bash
npm install --no-save \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/sdk-trace-base \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

> **Note:** `@opentelemetry/api` is an optional peer dependency of `@microsoft/durabletask-js`. When it's installed, the SDK automatically produces distributed tracing spans — no code changes needed in your orchestrations or activities.

### 4. Build the SDK (if not already built)

```bash
npm run build
```

### 5. Run the Example

```bash
npm run example -- ./examples/azure-managed/distributed-tracing.ts
```

You should see output like:

```
OpenTelemetry SDK started – exporting traces to http://localhost:4318

=== Sequence Orchestration ===
Scheduled: abc123
Completed – result: ["Hello, Tokyo!","Hello, Seattle!","Hello, London!"]

=== Data Pipeline Orchestration ===
Scheduled: def456
Completed – result: {"sourcesProcessed":4,"resultsSaved":4,"data":["transformed(data-from-users-api)",...]}

=== All orchestrations completed! ===
Open Jaeger UI at http://localhost:16686 and search for service "durabletask-js-tracing-example" to view traces.
```

### 6. View Traces in Jaeger

1. Open [http://localhost:16686](http://localhost:16686) in your browser.
2. Select the service **`durabletask-js-tracing-example`** from the dropdown.
3. Click **Find Traces**.
4. Click on a trace to explore the span waterfall.

---

## Running Against Azure Managed DTS (Cloud)

To run this example against a real Azure Managed Durable Task Scheduler endpoint instead of the local emulator:

### 1. Create a `.env` file

```env
# Option A: Connection string
DURABLE_TASK_SCHEDULER_CONNECTION_STRING=Endpoint=https://your-scheduler.eastus.durabletask.io;Authentication=DefaultAzure;TaskHub=your-taskhub

# Option B: Explicit parameters (uses DefaultAzureCredential)
# AZURE_DTS_ENDPOINT=https://your-scheduler.eastus.durabletask.io
# AZURE_DTS_TASKHUB=your-taskhub

# OTLP endpoint (Jaeger, Azure Monitor, Aspire Dashboard, etc.)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### 2. Authenticate

Make sure you're logged in via Azure CLI:

```bash
az login
```

### 3. Run

```bash
npm run example -- ./examples/azure-managed/distributed-tracing.ts
```

---

## Using Azure Monitor / Application Insights

To export traces to **Azure Monitor** instead of Jaeger, replace the OTLP exporter with the Azure Monitor exporter:

```bash
npm install --no-save @azure/monitor-opentelemetry-exporter
```

Then modify the OpenTelemetry setup in `distributed-tracing.ts`:

```typescript
import { AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";

const traceExporter = new AzureMonitorTraceExporter({
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
});
```

---

## DTS Emulator Docker Image Reference

| Property | Value |
|----------|-------|
| **Image** | `should be mcr.microsoft.com/dts/dts-emulator:latest` |
| **gRPC Port** | `8080` |
| **Dashboard Port** | `8082` |
| **Authentication** | `None` (no credentials required) |
| **Connection String** | `Endpoint=http://localhost:8080;Authentication=None;TaskHub=default` |

### Running the Emulator Standalone

```bash
docker run -d \
  --name dts-emulator \
  -p 8080:8080 \
  -p 8082:8082 \
  should be mcr.microsoft.com/dts/dts-emulator:latest
```

### Stopping the Emulator

```bash
docker stop dts-emulator && docker rm dts-emulator
```

---

## How Distributed Tracing Works

The Durable Task JavaScript SDK uses OpenTelemetry as an **optional peer dependency**. When `@opentelemetry/api` is installed and a `TracerProvider` is registered, the SDK automatically:

1. **Creates spans** for orchestration scheduling, execution, activity scheduling/execution, timers, and events.
2. **Propagates W3C `traceparent`** through the gRPC protocol so that spans from the client, orchestrator, and activities are all linked in a single trace.
3. **Handles replay correctly** – on orchestration replay, the SDK carries forward the original span ID so all replay iterations correlate to the same logical orchestration execution.

The tracer is registered under the name **`Microsoft.DurableTask`**, and spans include semantic attributes like:

- `durabletask.type` – `orchestration`, `activity`, `timer`, `event`, etc.
- `durabletask.task.name` – The function name.
- `durabletask.task.instance_id` – The orchestration instance ID.
- `durabletask.task.task_id` – The sequential task ID within an orchestration.

---

## Cleanup

```bash
cd examples/azure-managed
docker compose down
```

---

## Files in This Example

| File | Description |
|------|-------------|
| `distributed-tracing.ts` | Main example – OTel setup + orchestrations |
| `docker-compose.yml` | DTS Emulator + Jaeger stack |
| `.env.emulator` | Pre-configured env vars for the local emulator |
| `.env.example` | Template for Azure Managed DTS (cloud) |
| `index.ts` | Basic example (no tracing) |
