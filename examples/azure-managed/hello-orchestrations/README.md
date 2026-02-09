# Hello Orchestrations

Demonstrates four fundamental orchestration patterns every Durable Task developer needs.

## Features Covered

| Feature | API |
|---------|-----|
| Activity sequence | `ctx.callActivity()` in a loop |
| Fan-out/fan-in | `whenAll()` with parallel `callActivity()` |
| Sub-orchestrations | `ctx.callSubOrchestrator()` |
| Race pattern | `whenAny()` |

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
npm run example -- ./examples/azure-managed/hello-orchestrations/index.ts
```

## Expected Output

```
=== 1. Activity Sequence ===
Result: [1,2,3,4,5,6]

=== 2. Fan-out/Fan-in ===
Result: {"items":4,"totalChars":24}

=== 3. Sub-orchestrations ===
Result: {"result1":12,"result2":22}

=== 4. whenAny (Race) ===
Result: {"winnerResult":5}

=== All orchestrations completed successfully! ===
```

## Smoke Test

```bash
npm run example -- ./examples/azure-managed/hello-orchestrations/index.ts 2>&1 | grep "All orchestrations completed successfully"
```

## Troubleshooting

- **Connection refused**: Ensure the DTS emulator is running (`docker compose up -d` from the `examples/azure-managed` directory).
- **Worker timeout**: The emulator may need a few seconds to start. Retry the command.

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
   npm run example -- ./examples/azure-managed/hello-orchestrations/index.ts
   ```
