# Versioning

Demonstrates orchestration versioning for safe side-by-side deployment of different orchestration versions.

## Features Covered

| Feature | API |
|---------|-----|
| Schedule with version | `scheduleNewOrchestration(..., { version: "1.0.0" })` |
| Version in orchestrator | `ctx.version` |
| Compare versions | `ctx.compareVersionTo("2.0.0")` |
| Strict matching | `VersionMatchStrategy.Strict` |
| Current-or-older matching | `VersionMatchStrategy.CurrentOrOlder` |
| Fail on mismatch | `VersionFailureStrategy.Fail` |

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
npm run example -- ./examples/azure-managed/versioning/index.ts
```

## Expected Output

```
=== 1. Schedule Orchestration with Version ===
v1.0.0 result: {"version":"1.0.0","result":"Processed: v1-logic (version=1.0.0)","comparedTo2":-1}
v2.5.0 result: {"version":"2.5.0","result":"Processed: v2-logic (version=2.5.0)","comparedTo2":1}

=== 2. VersionMatchStrategy.Strict ===
Exact match (v2.0.0): COMPLETED — "Processed: version=2.0.0"
Mismatch (v1.0.0): FAILED
  Failure: Version mismatch: ...

=== 3. VersionMatchStrategy.CurrentOrOlder ===
Older (v2.0.0): COMPLETED — "Processed: version=2.0.0"
Same (v3.0.0): COMPLETED — "Processed: version=3.0.0"
Newer (v4.0.0): FAILED
  Failure: Version mismatch: ...

=== All versioning demos completed successfully! ===
```

## Smoke Test

```bash
npm run example -- ./examples/azure-managed/versioning/index.ts 2>&1 | grep "All versioning demos completed successfully"
```
