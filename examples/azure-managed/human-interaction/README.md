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
