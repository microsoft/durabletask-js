# Versioning

Demonstrates orchestration versioning for safe side-by-side deployment of different orchestration versions.

## Features Covered

| Feature | API |
|---------|-----|
| Schedule with version | `scheduleNewOrchestration(..., { version: "1.0.0" })` |
| Version in orchestrator | `ctx.version` |
| Compare versions | `ctx.compareVersionTo("2.0.0")` |
| Strict matching | `VersionMatchStrategy.Strict` |
| Current-or-older matching | `VersionMatchStrategy.CurrentOrOlder` |
| Fail on mismatch | `VersionFailureStrategy.Fail` |

## Prerequisites

- Node.js ≥ 22
- Docker (for the DTS Emulator)

## Setup

```bash
cd examples/azure-managed
docker compose up -d
cp .env.emulator .env
cd ../..
npm install && npm run build
```

## Run

```bash
npm run example -- ./examples/azure-managed/versioning/index.ts
```

## Expected Output

```
=== 1. Schedule Orchestration with Version ===
v1.0.0 result: {"version":"1.0.0","result":"Processed: v1-logic (version=1.0.0)","comparedTo2":-1}
v2.5.0 result: {"version":"2.5.0","result":"Processed: v2-logic (version=2.5.0)","comparedTo2":1}

=== 2. VersionMatchStrategy.Strict ===
Exact match (v2.0.0): COMPLETED — "Processed: version=2.0.0"
Mismatch (v1.0.0): FAILED
  Failure: Version mismatch: ...

=== 3. VersionMatchStrategy.CurrentOrOlder ===
Older (v2.0.0): COMPLETED — "Processed: version=2.0.0"
Same (v3.0.0): COMPLETED — "Processed: version=3.0.0"
Newer (v4.0.0): FAILED
  Failure: Version mismatch: ...

=== All versioning demos completed successfully! ===
```

## Smoke Test

```bash
npm run example -- ./examples/azure-managed/versioning/index.ts 2>&1 | grep "All versioning demos completed successfully"
```

## Running Against Azure Managed DTS (Cloud)

To run this sample against a real [Azure Managed Durable Task Scheduler](https://learn.microsoft.com/azure/durable-task-scheduler/) instead of the local emulator:

1. **Create a scheduler and task hub** (if you haven't already) — see the [parent README](../README.md#quick-start-azure-managed-dts--cloud) for `az durabletask` commands.

2. **Configure `.env`** for your cloud endpoint:

   ```bash
   cd examples/azure-managed
   cp .env.example .env
   # Edit .env with your scheduler endpoint and task hub name
   ```

   Example `.env`:

   ```env
   DURABLE_TASK_SCHEDULER_CONNECTION_STRING=Endpoint=https://your-scheduler.eastus.durabletask.io;Authentication=DefaultAzure;TaskHub=your-taskhub
   ```

3. **Authenticate** with Azure:

   ```bash
   az login
   ```

4. **Run** (no Docker needed):

   ```bash
   npm run example -- ./examples/azure-managed/versioning/index.ts
   ```
