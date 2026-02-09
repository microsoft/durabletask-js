# Retry and Error Handling

Demonstrates every retry mechanism and error handling pattern available in the Durable Task SDK.

## Features Covered

| Feature | API |
|---------|-----|
| Declarative retry | `RetryPolicy` with exponential backoff |
| Failure predicate | `RetryPolicy.handleFailure` |
| Custom retry handler | `AsyncRetryHandler` with custom delays |
| Sub-orchestration retry | `callSubOrchestrator` with retry options |
| Error inspection | `state.raiseIfFailed()`, `state.failureDetails` |

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
npm run example -- ./examples/azure-managed/retry-and-error-handling/index.ts
```

## Expected Output

```
=== 1. RetryPolicy (exponential backoff) ===
Status: COMPLETED
Result: "Success on attempt 3 for \"retry-policy-...\""

=== 2. handleFailure Predicate ===
Status: COMPLETED
Result: "Success on attempt 3 for \"handle-failure-...\""

=== 3. Custom AsyncRetryHandler ===
Status: COMPLETED
Result: "Success on attempt 3 for \"custom-handler-...\""

=== 4. Sub-orchestration Retry ===
Status: COMPLETED
Result: {"sum":15}

=== 5. Error Handling (raiseIfFailed) ===
Status: FAILED
raiseIfFailed() threw: OrchestrationFailedError — ...
Failure type: Error
Failure message: FatalError: This operation cannot succeed

=== All retry/error demos completed successfully! ===
```

## Smoke Test

```bash
npm run example -- ./examples/azure-managed/retry-and-error-handling/index.ts 2>&1 | grep "All retry/error demos completed successfully"
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
   npm run example -- ./examples/azure-managed/retry-and-error-handling/index.ts
   ```
