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
