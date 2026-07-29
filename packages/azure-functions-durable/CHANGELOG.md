## Upcoming

First preview of the rewritten `durable-functions` provider. This is a **preview release**: it is
published under the `preview` npm dist-tag, and APIs may change before the stable `4.0.0`.

Install with:

```bash
npm install durable-functions@preview
```

### Why this is a new major version

v4 is a rewrite on top of `@microsoft/durabletask-js`: replay, activities, entities, retries, and
instance-management all come from that shared core, so behavior matches the .NET, Python, and Java
Durable providers. Durable work items flow over a single gRPC channel instead of the legacy
out-of-process HTTP protocol -- the same consolidation `durabletask-python` shipped as
`azure-functions-durable` 2.0.0b1. It supersedes the legacy `durable-functions` v3
([Azure/azure-functions-durable-js](https://github.com/Azure/azure-functions-durable-js)). Classic
`context.df.*` orchestrators and entities keep working through a compatibility layer, but several
surfaces changed (see below).

### Requirements

- **Node.js >= 22** (v3 supported Node 18 and 20; those are no longer supported).
- **Functions extension bundle** -- GA `Microsoft.Azure.Functions.ExtensionBundle` `[4.36.0, 5.0.0)`
  or Preview `Microsoft.Azure.Functions.ExtensionBundle.Preview` `[4.29.0, 5.0.0)`. The provider needs
  a durable extension that starts a gRPC server for Node
  ([Azure/azure-functions-durable-extension#3260](https://github.com/Azure/azure-functions-durable-extension/pull/3260));
  on an earlier bundle the app starts normally but every orchestration starter hangs and times out
  after ~60 s with no error. A fresh app on the default GA range works -- the trap is an explicit pin
  at or below 4.32.0. GA and Preview version numbers are NOT comparable across feeds.

### Underlying packages

- `@microsoft/durabletask-js` `0.4.0` (exact pin).
- `@azure/functions` `^4.16.1`.
- `@azure/identity` `^4.0.0` as an **optional** peer dependency -- needed only for a `callHttp`
  `tokenSource`, and not installed automatically.

### Breaking changes from durable-functions v3

- **Node.js >= 22** is required.
- **Classic contexts no longer extend `InvocationContext`** -- only `df` plus replay-safe log helpers
  are available (the classic entity context is just `{ df }`).
- **Task result shape follows the core SDK** -- use `isComplete` / `isFailed` / `getResult()` instead
  of v3's `isCompleted` / `isFaulted` / `result`. `context.df.createTimer(...)` still returns a
  cancelable `TimerTask`.
- **Entity locking moved to the core context.** `context.df.lock` / `context.df.isLocked` and the
  `DurableLock` / `LockState` / `LockingRulesViolationError` exports are removed and will **not** be
  restored. Acquire locks with `context.entities.lockEntities(...)` (returns a `LockHandle` with
  `release()`) and query with `context.entities.isInCriticalSection()`.
- **A plain non-generator classic orchestrator is no longer supported.** A synchronous,
  single-argument, non-generator function is now treated as core-native and receives the core
  `OrchestrationContext` (which has no `.df`); sync generators (`function*`) using `context.df.*` are
  unaffected.
- **Some v3 top-level exports were removed** -- `DummyOrchestrationContext`, `DummyEntityContext`, and
  the entity-lock types above. `TaskFailedError` is re-exported from the core SDK, and aggregate
  failures now surface as JS-native `AggregateError`; use the core `TestOrchestrationWorker` /
  `TestOrchestrationClient` for orchestration unit tests.

### Added

- **`context.df.callHttp(...)` is restored** as a worker-side durable HTTP call. It accepts the v3
  `CallHttpOptions` (`method`, `url`, `body`, `headers`, `tokenSource`, `enablePolling`) and returns a
  `Task<DurableHttpResponse>` (`{ statusCode, headers, content }`), including automatic `202 Accepted`
  polling that honors `Retry-After` via durable timers. Caveats:
  - **Trust-boundary change** -- in v3 the Functions **host** extension ran the request; here it runs
    as a durable **activity inside your worker** (via `fetch`), so egress path, source identity, and
    firewall/VNet rules follow the worker process -- re-verify IP allow-lists.
  - **Cross-origin `202` poll credentials are stripped** -- when the callee-controlled `Location`
    points to a different origin, the poll drops `Authorization`, `Cookie`, and the `tokenSource`;
    `x-functions-key` is **always** dropped; same-origin polls still forward headers and the
    `tokenSource`. Mirrors the .NET extension
    ([Azure/azure-functions-durable-extension#3443](https://github.com/Azure/azure-functions-durable-extension/pull/3443)).
  - **The initial request follows redirects with `fetch` defaults**, which drop `Authorization` /
    `Cookie` across origins but **not** custom credential headers like `x-functions-key`.
  - **Default poll interval is 30 s** when a `202` carries no usable `Retry-After`.
  - **Known incompatibility** -- a body on a `GET`/`HEAD` request throws (the Fetch Standard forbids
    it, though v3, the .NET extension, and Python all send it).
  - **Known incompatibility** -- `DurableHttpResponse` is a plain object, not a class, so
    `response.getHeader(name)` is unavailable and existing calls **fail at runtime**; index
    `response.headers[...]` by lower-cased key instead.
  - A managed-identity `tokenSource` needs the optional `@azure/identity` package or it throws a clear
    error.
- **`app.client.*` starter helpers** (`http`, `timer`, `storageBlob`, `storageQueue`,
  `serviceBusQueue`, `serviceBusTopic`, `eventHub`, `eventGrid`, `cosmosDB`, `generic`) register a
  normal trigger and inject the client as the handler's second argument, so
  `(trigger, client, context)` works without manually wiring `df.input.durableClient()` +
  `df.getClient(context)`.
- **`client.startNew()` supports the `version` option.**
- **`client.getStatus()` keeps the v3 shape** -- a non-optional `DurableOrchestrationStatus` that
  throws when the instance is missing; `showInput` suppresses only the top-level input, `showHistory`
  populates `history`, and `showHistoryOutput` toggles the per-entry input/result payloads; `history`
  entries are core `HistoryEvent`s (v3 typed it `Array<unknown>`).

### Known limitations

- This is a preview release; the API surface may change before `4.0.0`.
