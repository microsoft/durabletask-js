# Entity Orchestration Example

This example demonstrates using Durable Entities from within orchestrations, including entity locking for atomic operations.

## What You'll Learn

This example demonstrates:
- Calling entities from orchestrations (request/response)
- Signaling entities from orchestrations (fire-and-forget)
- Entity locking / Critical sections for atomic operations across multiple entities

## Scenario

A bank transfer between two accounts (entities). We use entity locking to ensure the transfer is atomic - both the withdrawal and deposit happen together, or neither happens.

## Prerequisites

You need a Durable Task-compatible backend. Choose one:

### Option 1: DTS Emulator (Recommended for testing)

```bash
docker run -i -p 8080:8080 -d mcr.microsoft.com/dts/dts-emulator:latest
```

### Option 2: Local Sidecar

Install and run the [Durable Task Sidecar](https://github.com/microsoft/durabletask-go) or [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/) on `localhost:4001`.

## Running the Example

### With DTS Emulator

```bash
npm run start:emulator
```

### With Local Sidecar

```bash
npm run start
```

## Expected Output

```
Connecting to endpoint: localhost:8080, taskHub: default
Worker started successfully

--- Initializing accounts ---
Alice balance: 1000
Bob balance: 500

--- Running transfer orchestration ---
Transfer orchestration started: [instance-id]
In critical section: true
Locked entities: BankAccount@alice, BankAccount@bob
From account balance: 1000
To account balance: 500
Transfer completed: {"success":true,"fromBalance":750,"toBalance":750,"message":"Transferred 250 from alice to bob"}

--- Final balances ---
Alice balance: 750
Bob balance: 750

--- Cleaning up ---
Worker stopped
```

## Key Concepts

### Entity Locking

Entity locking ensures that multiple entities can be locked together for atomic operations:

```typescript
const lock: LockHandle = yield* ctx.entities.lockEntities(fromEntity, toEntity);
try {
  // Perform atomic operations
  yield* ctx.entities.callEntity(fromEntity, "withdraw", amount);
  yield* ctx.entities.callEntity(toEntity, "deposit", amount);
} finally {
  lock.release();
}
```

This prevents race conditions when multiple orchestrations try to access the same entities concurrently.
