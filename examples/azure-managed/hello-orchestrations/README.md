# Hello Orchestrations

Demonstrates the five fundamental orchestration patterns every Durable Task developer needs.

## Features Covered

| Feature | API |
|---------|-----|
| Activity sequence | `ctx.callActivity()` in a loop |
| Fan-out/fan-in | `whenAll()` with parallel `callActivity()` |
| Sub-orchestrations | `ctx.callSubOrchestrator()` |
| Race pattern | `whenAny()` |
| Deterministic GUID | `ctx.newGuid()` |

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

=== 5. Deterministic GUID ===
Result: {"guid1":"<uuid>","guid2":"<uuid>","areDifferent":true}

=== All orchestrations completed successfully! ===
```

## Smoke Test

```bash
npm run example -- ./examples/azure-managed/hello-orchestrations/index.ts 2>&1 | grep "All orchestrations completed successfully"
```

## Troubleshooting

- **Connection refused**: Ensure the DTS emulator is running (`docker compose up -d` from the `examples/azure-managed` directory).
- **Worker timeout**: The emulator may need a few seconds to start. Retry the command.
