# Entity Counter Example

This example demonstrates a simple Counter entity using Durable Entities.

## What are Durable Entities?

Durable Entities are stateful objects that can be addressed by a unique ID. They process operations one at a time, ensuring consistency without explicit locks.

## Key Concepts

This example demonstrates:
- Defining an entity with `TaskEntity<TState>`
- Entity operations (add, get, reset)
- Signaling entities from a client (fire-and-forget)
- Getting entity state from a client

## Prerequisites

You need a Durable Task-compatible backend. Choose one:

### Option 1: DTS Emulator (Recommended for testing)

```bash
docker run --name dts-emulator -i -p 8080:8080 -d --rm mcr.microsoft.com/dts/dts-emulator:latest
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

--- Signaling entity operations ---
Signaled: add(5)
Signaled: add(3)
Signaled: add(-2)

--- Getting entity state ---
Counter value: 6
Last modified: [timestamp]

--- Resetting counter ---
Signaled: reset()
Counter value after reset: 0

--- Cleaning up ---
Worker stopped
```
