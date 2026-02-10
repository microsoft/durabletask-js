# Basics

Demonstrates the fundamentals of using the Azure Managed Durable Task Scheduler (DTS) with the JavaScript SDK, including connection strings and `DefaultAzureCredential` authentication.

## Features Covered

| Feature | API |
|---------|-----|
| Connection string auth | `createAzureManagedClient(connectionString)` |
| DefaultAzureCredential | `createAzureManagedClient(endpoint, taskHub, credential)` |
| Activity sequence | `ctx.callActivity()` in a loop |
| Fan-out/fan-in | `whenAll()` with parallel `callActivity()` |
| Azure logger | `createAzureLogger()` |

## Prerequisites

- Node.js ≥ 22
- Docker (for the DTS Emulator)

## Setup

```bash
# From the repository root
cd examples/azure-managed
docker compose up -d          # start DTS emulator
cp .env.emulator .env         # configure for local emulator
cd ../..
npm install && npm run build
```

## Run

```bash
npm run example -- ./examples/azure-managed/basics/index.ts
```

## Running Against Azure

See the [parent README](../README.md#quick-start-azure-managed-dts--cloud) for instructions on running against a real Azure Managed DTS resource.
