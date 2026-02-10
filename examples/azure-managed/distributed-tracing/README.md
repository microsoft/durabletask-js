# Distributed Tracing

Demonstrates how to enable OpenTelemetry distributed tracing with the Azure Managed Durable Task Scheduler (DTS). Traces are exported to a local Jaeger or OTLP-compatible collector so you can visualize the full orchestration lifecycle.

## Features Covered

| Feature | API |
|---------|-----|
| OpenTelemetry setup | `NodeSDK`, `OTLPTraceExporter`, `SimpleSpanProcessor` |
| Builder pattern | `DurableTaskAzureManagedClientBuilder`, `DurableTaskAzureManagedWorkerBuilder` |
| Data pipeline | Fan-out/fan-in with chained activities |
| Console logger | `ConsoleLogger` |

## Prerequisites

- Node.js ≥ 22
- Docker (for the DTS Emulator and Jaeger)

## Setup

```bash
# From the repository root
cd examples/azure-managed
docker compose up -d          # start DTS emulator (and Jaeger if configured)
cp .env.emulator .env         # configure for local emulator
cd ../..
npm install && npm run build
```

## Run

```bash
npm run example -- ./examples/azure-managed/distributed-tracing/index.ts
```

After the orchestrations complete, open the Jaeger UI at [http://localhost:16686](http://localhost:16686) and search for service `durabletask-js-tracing-example` to view traces.

## Running Against Azure

See the [parent README](../README.md#quick-start-azure-managed-dts--cloud) for instructions on running against a real Azure Managed DTS resource.
