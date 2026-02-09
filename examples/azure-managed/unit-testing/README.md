# Unit Testing

Demonstrates how to unit-test orchestrations using the built-in in-memory testing framework — **no Docker, no emulator, no network** required.

## Features Covered

| Feature | API |
|---------|-----|
| In-memory backend | `InMemoryOrchestrationBackend` |
| Test client | `TestOrchestrationClient` (same API as `TaskHubGrpcClient`) |
| Test worker | `TestOrchestrationWorker` (same API as `TaskHubGrpcWorker`) |
| Replay-safe logger | `ctx.createReplaySafeLogger()` |
| NoOp logger | `NoOpLogger` |

## Prerequisites

- Node.js ≥ 22
- **No Docker required** — everything runs in-process

## Setup

```bash
# From the repository root
npm install && npm run build
```

## Run

```bash
npm run example -- ./examples/azure-managed/unit-testing/index.ts
```

## Expected Output

```
=== Unit Testing with In-Memory Backend ===

--- Test Results ---
  [PASS] Activity Sequence
  [PASS] Fan-out/Fan-in
  [PASS] Timer
  [PASS] External Event
  [PASS] Continue-as-new
  [PASS] Terminate
  [PASS] Suspend / Resume
  [PASS] NoOpLogger

8/8 tests passed.

=== All unit-testing demos completed successfully! ===
```

## Smoke Test

```bash
npm run example -- ./examples/azure-managed/unit-testing/index.ts 2>&1 | grep "All unit-testing demos completed successfully"
```

## When to Use

Use the in-memory backend for:
- **Unit tests** — fast, deterministic, no infrastructure
- **CI pipelines** — runs anywhere without Docker
- **Local development** — instant feedback loop

Use the DTS Emulator for:
- **Integration tests** — validates gRPC communication
- **End-to-end tests** — tests full stack behavior
