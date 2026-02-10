# Human Interaction

Demonstrates event-driven orchestration patterns for workflows that involve human actors or external systems.

## Features Covered

| Feature | API |
|---------|-----|
| External events | `ctx.waitForExternalEvent()`, `client.raiseOrchestrationEvent()` |
| Durable timers | `ctx.createTimer()` |
| Race pattern | `whenAny()` — event vs timer |
| Custom status | `ctx.setCustomStatus()` |
| Orchestration-to-orchestration events | `ctx.sendEvent()` |
| Multiple events | Sequential `waitForExternalEvent()` calls |

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
npm run example -- ./examples/azure-managed/human-interaction/index.ts
```

## Expected Output

```
=== 1. Approval Workflow (client sends approval) ===
Orchestration started: <id>
Custom status: {"stage":"Awaiting approval","requestId":"REQ-..."}
Sent approval event from client
Result: "Order placed"

=== 2. Approval Workflow (timeout — no event sent) ===
Result: "Timed out — auto-rejected"

=== 3. sendEvent (orchestration → orchestration) ===
Target result: "Order placed"
Notifier result: "Sent approval to <id>"

=== 4. Multiple External Events ===
Result: {"event1":"Hello","event2":"World"}

=== All human-interaction demos completed successfully! ===
```

## Smoke Test

```bash
npm run example -- ./examples/azure-managed/human-interaction/index.ts 2>&1 | grep "All human-interaction demos completed successfully"
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
   npm run example -- ./examples/azure-managed/human-interaction/index.ts
   ```
