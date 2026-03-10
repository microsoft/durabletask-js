# Copilot Instructions — DurableTask JavaScript SDK

This document provides architectural context for AI assistants working with this codebase.
Focus is on **stable patterns, invariants, and pitfalls** — not file paths or function signatures.

---

## What This Project Is

The **Durable Task SDK for JavaScript/TypeScript** enables writing long-running, stateful
workflows as code. It is the JavaScript implementation of Microsoft's cross-language
Durable Task Framework (sibling SDKs exist in .NET, Python, Java, Go).

**This is NOT Azure Durable Functions.** It's a lower-level SDK for the Azure Durable Task
Scheduler service (or its emulator). The two are related but have different APIs, deployment
models, and npm packages.

---

## Core Execution Model — Generator-Based Replay

This is the single most important thing to understand. Everything else follows from it.

### How Orchestrations Work

Orchestrations are **async generator functions** (`async function*`) that `yield` `Task<T>`
objects. The runtime replays completed history events to rebuild state, then advances the
generator for new work.

```
Orchestrator yields Task → Runtime checks history → Already done? Send result back
                                                   → Not done? Suspend generator, create action for sidecar
```

On every re-invocation:
1. The executor receives `(instanceId, oldEvents[], newEvents[])`.
2. With `isReplaying = true`: feeds `oldEvents` through event processing. Completed tasks
   resolve instantly via `generator.next(result)`.
3. With `isReplaying = false`: processes `newEvents`. Incomplete tasks suspend the generator.
4. The resulting `OrchestratorAction[]` are sent back to the sidecar.

### The Determinism Rule (Critical)

**Orchestrator code MUST be deterministic.** Every replay must produce the exact same
sequence of actions. This is enforced at runtime — mismatches throw `NonDeterminismError`.

What this means in practice:
- **No `Date.now()`** — use `context.currentUtcDateTime`
- **No `Math.random()` or `crypto.randomUUID()`** — use `context.newGuid()` (deterministic UUID v5)
- **No direct I/O** (HTTP calls, file reads, database queries) — use activities
- **No non-deterministic control flow** — no data-dependent branching on external state

Adding, removing, or reordering `yield` statements between code versions **breaks replay**
for in-flight orchestrations. The validator catches type/name mismatches but not all
ordering issues.

### Activities vs Orchestrations

Activities are the leaf nodes — they execute side effects exactly once (modulo retries)
and persist results as history events. They can do anything: HTTP calls, DB writes, etc.

**Key mental model:** Orchestrations = coordination logic (deterministic).
Activities = real work (non-deterministic allowed).

---

## Architecture — How Pieces Connect

### Communication Model

The SDK **never touches storage directly**. All communication happens over gRPC to a
sidecar (Azure Durable Task Scheduler, emulator, or Dapr):

```
Client → gRPC → Sidecar (owns storage & scheduling)
                   ↕
Worker ← gRPC (streaming) ← Sidecar pushes work items
```

The worker opens a **server-streaming RPC** (`getWorkItems`) and dispatches incoming work:
orchestration replays, activity executions, and entity operations.

### Package Structure

This is an npm workspaces monorepo with two published packages:

| Package | Role |
|---|---|
| Core SDK | Orchestration engine, client, worker, entities, testing, tracing |
| Azure Managed Backend | Connection string / Entra ID auth, credential factory, builder pattern |

The Azure package **peers on** the core package — it adds authentication and connection
management but delegates all domain logic to core.

### Protocol Layer

Protobuf definitions live in `internal/protocol/`. Generated JavaScript stubs (not
TypeScript) provide the gRPC message types. A helper layer converts between protobuf
messages and SDK types (history events, orchestrator actions).

**Generated proto files should never be manually edited.** They're rebuilt from the proto
definitions using `grpc_tools_node_protoc`.

---

## Task System — The Heart of the SDK

### Task Hierarchy

```
Task<T>              — Base: result, exception, isComplete, isFailed, parent ref
├── CompletableTask  — Can be completed or failed; notifies parent on completion
│   ├── RetryableTask     — Policy-driven retries (exponential backoff)
│   └── RetryHandlerTask  — Custom retry handler function
└── CompositeTask    — Holds children with parent backlinks
    ├── WhenAllTask  — Completes when ALL children done; fails fast on first failure
    └── WhenAnyTask  — Completes when ANY child done
```

**Parent notification chain:** When a child task completes, it calls
`parent.onChildCompleted()`. This chain drives composite task completion.

**Important:** `CompositeTask` checks already-complete children in its constructor.
A composite task can be **immediately complete upon construction** — callers must handle this.

### WhenAll Fail-Fast Behavior

`WhenAllTask` marks itself complete on the **first** failed child. Other children may still
be in flight. The `isComplete` guard prevents double-completion, but the mental model is:
one failure = whole task fails immediately, remaining results ignored.

---

## Entity System

### Identity Model

Entities are addressed as `@name@key`. Names are **always lowercased** (cross-SDK
consistency with .NET). Keys **preserve case**.

### Execution Model

Entities process operations in **single-threaded batches** with per-operation transactional
semantics:
1. Checkpoint state + accumulated actions before each operation
2. Execute the operation
3. On success: commit. On failure: rollback to checkpoint.

State uses **lazy JSON deserialization** — deserialize only on first read. If state is
written but never read, the original JSON is discarded (intentional optimization).

### Method Dispatch

`TaskEntity<TState>` does automatic method dispatch: it walks the prototype chain, finds
a method matching the operation name (case-insensitive), and calls it. The implicit
`delete` operation sets state to `null`.

### Entity Lock Ordering

`lockEntities()` **sorts entity IDs** before acquiring locks to prevent deadlocks.
This is enforced in the orchestration context — never bypass it or implement custom locking.

---

## Error Handling Patterns

### Exception Hierarchy

| Error | When |
|---|---|
| `TaskFailedError` | Activity or sub-orchestration fails (carries `FailureDetails`) |
| `NonDeterminismError` | Replayed action mismatches history (not recoverable) |
| `OrchestrationStateError` | Invalid state transition attempted |
| `EntityOperationFailedException` | Entity operation throws |
| `TimeoutError` | Wait timeout exceeded |

### Error Propagation Flow

1. Activity throws → sidecar records failure event → executor calls `task.fail()` →
   generator receives thrown `TaskFailedError` → orchestrator can catch or propagate.
2. Uncaught orchestrator error → executor catches → creates complete action with
   failure details → sidecar records failed status.
3. Non-determinism → immediately throws, aborts replay. **Not recoverable by user code.**

### Retry System

Two flavors, both using **durable timers** for backoff (survives process restarts):
- **Policy-driven:** `RetryPolicy` with max attempts, backoff coefficient, intervals.
  Delay formula: `firstRetryInterval × backoffCoefficient^(attempt - 1)`, capped.
- **Custom handler:** User function receives `RetryContext`, returns `RetryAction`.

**Critical invariant:** Retry tasks create timers whose `taskId` differs from the original
task's ID. The executor maintains maps to link timer IDs back to retry tasks. If this
linkage breaks (e.g., during continue-as-new), retries silently fail.

---

## Tracing (OpenTelemetry)

OpenTelemetry is an **optional peer dependency**, loaded via `require()` with fallback.
If not available, tracing is silently disabled.

Cross-SDK conventions (shared with .NET, Python, Java, Go):
- Tracer name: `"Microsoft.DurableTask"`
- Span naming: `"{type}:{name}"` (e.g., `"orchestration:MyWorkflow"`)
- W3C `traceparent` propagated via protobuf `TraceContext` fields
- Replay spans carry forward original span ID for cross-replay correlation

---

## Logging Conventions

### Logger Interface

The SDK supports two logging modes, detected at runtime via type guard:
- **Plain `Logger`:** `error()`, `warn()`, `info()`, `debug()` — string messages
- **`StructuredLogger`:** Adds `logEvent(level, event, message)` with event IDs and
  categories matching the .NET SDK for cross-SDK log correlation

### Replay-Safe Logging

`ReplaySafeLogger` wraps any logger and **suppresses all output when `isReplaying = true`**.
This prevents duplicate log entries during history replay. Always use it in orchestrator
context.

---

## Testing Approach

### In-Memory Backend

The SDK provides a full in-memory testing stack that mirrors the gRPC path:

```
TestOrchestrationClient → InMemoryOrchestrationBackend ← TestOrchestrationWorker
```

This enables testing orchestrations with the **real executor logic** but no sidecar, no
gRPC, no network. The backend manages instance state, work queues, timers, and state
waiters.

Key test utilities:
- `backend.waitForState(predicate, timeout)` — polling with timeout for async assertions
- `backend.reset()` — clear all state between tests
- Direct timer control for deterministic time-dependent tests

### Test Conventions

- Framework: Jest 29 with `ts-jest`
- File naming: `.spec.ts` suffix
- Protobuf test helpers: factory functions create `HistoryEvent` instances without a sidecar
- Three tiers: unit tests (no sidecar), e2e with sidecar, e2e with Azure

---

## Where Bugs Tend to Hide

These are stable architectural areas where complexity concentrates:

1. **Replay event matching** — The executor's large switch statement processes 27+ event
   types. Unmatched events are logged but silently dropped in several places.
   The TODOs in the code explicitly question whether these should be errors.

2. **Timer-to-retry linkage** — Retry tasks create timers with different IDs. The maps
   connecting them are critical. Any break in linkage = silent retry failure.

3. **Generator lifecycle edge cases** — What happens when the generator yields `null`?
   When `done` is true but the loop keeps checking? The initial `next()` return value?
   Several TODOs mark these as not fully hardened.

4. **Composite task constructor side effects** — Already-complete children trigger
   `onChildCompleted()` during construction, potentially completing the composite
   before the caller inspects it.

5. **Continue-as-new state reset** — Resetting history while preserving carryover events
   (buffered external events) is a subtle operation. Incorrect carryover handling leaks
   state between iterations.

6. **Suspend/resume event buffering** — Suspended orchestrations buffer "suspendable"
   events. On resume, all buffered events are replayed in order. If events arrive at
   the boundary of suspend/resume transitions, ordering may be surprising.

7. **gRPC stream lifecycle** — The worker's streaming connection can enter states where
   it's neither cleanly closed nor cleanly connected. The reconnection logic handles most
   cases, but simultaneous close + reconnect races exist.

8. **Entity V1 vs V2 code paths** — The worker supports both entity execution paths.
   V2 is current; V1 is legacy. Incorrect version detection or mixed-version scenarios
   could cause issues.

---

## Code Conventions

### Naming
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Private fields: `_underscorePrefixed`
- Type aliases: `T`-prefixed (`TOrchestrator`, `TActivity`)
- Constants: `UPPER_SNAKE_CASE` or `PascalCase` objects with `UPPER_SNAKE_CASE` properties
- Enums: `PascalCase` names with `PascalCase` members

### Module System
- CommonJS output, ES2022 target
- OpenTelemetry loaded via synchronous `require()` with catch (future ESM migration noted)

### Cross-SDK Consistency
Many decisions mirror the .NET SDK intentionally: entity name lowercasing, structured
log event IDs, tracing attribute names, span naming conventions. When in doubt about
"why is it done this way?", the answer is often ".NET SDK compatibility."

### License
Every source file starts with the Microsoft copyright header + MIT license reference.

### Builder Pattern
Both packages use the builder pattern for constructing clients and workers.
Fluent API with `.host()`, `.port()`, `.connectionString()`, `.endpoint()`, `.build()`.

### Registration Lock
`addOrchestrator()`, `addActivity()`, `addEntity()` all throw if called after `start()`.
The registry is frozen once the worker begins processing.

---

## What Not to Touch

- **Generated proto files** (`*_pb.js`, `*_pb.d.ts`, `*_grpc_pb.js`) — regenerated from
  proto definitions, never manually edited
- **`version.ts`** — auto-generated by prebuild script
- **Proto definitions** in `internal/protocol/` — shared across language SDKs, changes
  must be coordinated

---

## Key Design Constraints to Respect

1. **No new dependencies** without careful consideration — this is a core SDK
2. **Node.js >= 22 required** — the engines field enforces this
3. **Single-threaded execution** — no locking primitives; correctness depends on not
   yielding to the event loop during replay processing
4. **Pre-1.0 API** — public API surface is still evolving but changes should be deliberate
5. **Cross-SDK alignment** — behavior should match .NET/Python/Java/Go SDKs where applicable
