# Lifecycle Management

Demonstrates all orchestration lifecycle operations: terminate, suspend/resume, restart, continue-as-new, purge, and tags.

## Features Covered

| Feature | API |
|---------|-----|
| Terminate | `client.terminateOrchestration()` |
| Terminate with output | `terminateOptions({ output })` |
| Recursive terminate | `terminateOptions({ recursive: true })` |
| Suspend | `client.suspendOrchestration()` |
| Resume | `client.resumeOrchestration()` |
| Continue-as-new | `ctx.continueAsNew()` |
| Restart | `client.restartOrchestration()` |
| Purge | `client.purgeOrchestration()` |
| Tags | `scheduleNewOrchestration(..., { tags })` |

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
npm run example -- ./examples/azure-managed/lifecycle-management/index.ts
```

## Expected Output

```
=== 1. Terminate (with output) ===
Status: TERMINATED
Output: "Cancelled by admin"

=== 2. Terminate (recursive — parent + child) ===
Parent status: TERMINATED

=== 3. Suspend / Resume ===
After suspend: SUSPENDED
After resume: RUNNING
Final result: "Completed normally"

=== 4. Continue-as-new ===
Status: COMPLETED
Result: {"status":"all batches done","batchNum":3,"processed":9}

=== 5. Restart Orchestration ===
Restarted as new ID: <new-id>
Result: "Done: original-run"

=== 6. Purge Orchestration ===
Purged instances: 1
State after purge: undefined (deleted)

=== 7. Orchestration Tags ===
Tags: {"environment":"staging","owner":"demo-user","priority":"high"}
Result: "Done: tagged-run"

=== All lifecycle demos completed successfully! ===
```

## Smoke Test

```bash
npm run example -- ./examples/azure-managed/lifecycle-management/index.ts 2>&1 | grep "All lifecycle demos completed successfully"
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
   npm run example -- ./examples/azure-managed/lifecycle-management/index.ts
   ```
