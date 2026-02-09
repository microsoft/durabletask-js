# Query and History

Demonstrates the query and history inspection APIs for monitoring and debugging orchestrations.

## Features Covered

| Feature | API |
|---------|-----|
| Query instances | `client.getAllInstances(query)` |
| Page-by-page iteration | `pageable.asPages()` |
| Item-by-item iteration | `for await (const item of pageable)` |
| Query filters | `OrchestrationQuery` (status, time range, pageSize) |
| List instance IDs | `client.listInstanceIds()` |
| Cursor pagination | `continuationToken` / `lastInstanceKey` |
| Fetch history | `client.getOrchestrationHistory()` |
| Typed history events | `HistoryEventType`, typed event interfaces |

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
npm run example -- ./examples/azure-managed/query-and-history/index.ts
```

## Expected Output

```
Creating orchestration instances...
Created 6 orchestration instances.

=== 1. getAllInstances (query with filters) ===
  Page 1: 3 instances (hasMore: true)
    - <id> [simpleOrchestrator] = "Done: item-1"
    ...
  Total instances across pages: 6

=== 2. listInstanceIds (cursor pagination) ===
  Page 1: 3 IDs (hasMore: true)
  Page 2: 3 IDs (hasMore: ...)

=== 3. getOrchestrationHistory ===
  History for <id>: N events
    [0] ExecutionStarted @ ...
    [1] TimerCreated @ ...
    ...

=== 4. Typed History Event Inspection ===
  ExecutionStarted: name=richOrchestrator, input="World"
  TaskScheduled events: 1
  TaskCompleted events: 1
  TimerCreated events: 1

=== All query/history demos completed successfully! ===
```

## Smoke Test

```bash
npm run example -- ./examples/azure-managed/query-and-history/index.ts 2>&1 | grep "All query/history demos completed successfully"
```
