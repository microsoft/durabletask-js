# Azure Functions host E2E tests (gated)

This suite launches a **real Azure Functions host** (`func start`) for the ported
app under [`test-app/`](./test-app), backed by **Azurite** (the local Azure
Storage emulator) using the Durable Task **AzureStorage** provider, and drives the
app entirely over HTTP. The Node.js worker, the Functions host, and the Durable
extension all cooperate exactly as they would in production.

It is a faithful port of the Azure Functions host E2E suite from the
[`azure-functions-durable-extension`](https://github.com/Azure/azure-functions-durable-extension)
repo — the `BasicNode` app plus its xUnit test classes — adapted to Jest. Expected
strings and Node-specific bug annotations come from that repo's
`NodeTestLanguageLocalizer`.

## Published `durable-functions` dependency

The [`test-app`](./test-app) is wired to the **published** npm packages
`durable-functions` (`^3.1.0`) and `@azure/functions` (`^4.11.2`), so it installs
and builds without any in-repo package build. This is what makes the suite
genuinely runnable.

To run the app against an **in-repo** build of the Azure Functions durable package
instead, change the `durable-functions` dependency in
[`test-app/package.json`](./test-app/package.json) to a `file:` reference (e.g.
`file:../../../packages/azure-functions-durable`) once that package exists on your
branch, then re-run `npm install`. A note to this effect lives in that
`package.json` (`comment_durable-functions`).

## Gating / skip model

The suite **skips cleanly** (it never fails) unless everything it needs is present,
so it is safe to leave wired into CI and to run locally without setup:

- **Prerequisite detection** — `global-setup.ts` only starts the shared `func`
  host when all of these hold (otherwise every spec skips):
  1. Azure Functions Core Tools (`func`) v4 is on `PATH`,
  2. Azurite is reachable on `127.0.0.1:10000`, and
  3. the test-app is installed and built (`test-app/node_modules` + `test-app/dist`).
- **One shared host** — `global-setup.ts` starts a single `func start` host for the
  whole run (mirroring the C# `FunctionAppFixture`) and writes its base URL to a
  preflight file; the specs drive it over HTTP and `global-teardown.ts` stops it.
- **Isolation** — these specs are only run by the dedicated
  `jest.functions-e2e.config.js` via `npm run test:e2e:functions:internal`. They are
  **not** part of the default `npm test` / workspaces test run, nor of
  `test:e2e:internal` (which is scoped to `tests/e2e`).
- **CI** — `.github/workflows/functions-e2e-tests.yaml` installs `func` + Azurite,
  installs/builds the test-app, and runs the suite on PRs that touch
  `test/e2e-functions/**`. The self-skip is the safety net if a prerequisite fails
  to come up.

## What it covers

One spec per area, mirroring the extension repo's test classes. Because this is the
**Storage** backend, `[Trait("Node-DTS","Skip")]` and `[Trait("DTS","Skip")]` tests
are **included** (those skips apply only to the DTS backend); `[Trait("Node","Skip")]`
tests are `it.skip` with a comment citing the same reason.

| Spec                          | Ported from                    | Notes                                                                                                       |
| ----------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `hello-cities.spec.ts`        | `HelloCitiesTest`              | activity chaining → `Hello Tokyo!` etc.                                                                     |
| `activity-input-type.spec.ts` | `ActivityInputTypeTests`       | `byte[]`/`int[]`/string/custom-class serialization                                                          |
| `error-handling.spec.ts`      | `ErrorHandlingTests`           | rethrow/catch/retry activity & entity; skips dotnet-only FailureDetails + custom-exception-properties tests |
| `external-event.spec.ts`      | `ExternalEventTests`           | raise to running/completed/missing (raise-to-completed error skipped per #645)                              |
| `suspend-resume.spec.ts`      | `SuspendResumeTests`           | suspend/resume running, suspended, completed                                                                |
| `terminate.spec.ts`           | `TerminateOrchestratorTests`   | terminate running/terminated/completed/nonexistent                                                          |
| `timeout.spec.ts`             | `TimeoutTests`                 | `Task.any` activity-vs-timer race                                                                           |
| `rewind.spec.ts`              | `RewindOrchestratorTests`      | fail → rewind → complete; invocation counts; rewind-only-failed                                             |
| `is-replaying.spec.ts`        | `IsReplayingTests`             | `isReplaying` flags (ConditionalLog #564 and FanOutFanIn #679 skipped)                                      |
| `large-output.spec.ts`        | `LargeOutputOrchestratorTests` | 65 KB via status URI + 4.5 MB via query trigger                                                             |
| `orchestration-query.spec.ts` | `OrchestrationQueryTests`      | `GetAllInstances` / `GetRunningInstances`                                                                   |
| `purge.spec.ts`               | `PurgeInstancesTests`          | purge by time / by entity id (purge-without-start-time #644 skipped)                                        |
| `class-based-entity.spec.ts`  | `ClassBasedEntityTests`        | class-based entity state                                                                                    |

### Node bug annotations honored

- [#642](https://github.com/Azure/azure-functions-durable-js/issues/642) — entity
  error text: inner "This entity failed"/"More information" assertions omitted.
- [#645](https://github.com/Azure/azure-functions-durable-js/issues/645) —
  raise-external-event to a completed instance: error assertions omitted.
- [#564](https://github.com/Azure/azure-functions-durable-js/issues/564) —
  `isReplaying` undefined before the first `yield`: `IsReplayingConditionalLog`
  skipped.
- [#679](https://github.com/Azure/azure-functions-durable-js/issues/679) —
  `IsReplayingFanOutFanIn` skipped.
- [#644](https://github.com/Azure/azure-functions-durable-js/issues/644) — purge
  without a start time: those purge tests skipped.
- Node swallows suspend/resume/terminate of a **terminal** instance and returns
  success (`200`); the specs assert that behavior.

The test-app additions over `BasicNode` are a plain `/api/ping` readiness function
(for host-readiness probing) and the published-dependency wiring. The Durable
function code is otherwise kept close to the source app.

## Running locally

You need the [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
and [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite).

```bash
# 1. Start Azurite (blob/queue/table on 10000/10001/10002)
npm install -g azurite
azurite --silent --location /tmp/azurite --blobPort 10000 --queuePort 10001 --tablePort 10002 &

# 2. Install the Core Tools (if needed)
npm install -g azure-functions-core-tools@4

# 3. Install root dev deps (jest + ts-jest)
npm ci

# 4. Install + build the test-app (against the published durable-functions)
cd test/e2e-functions/test-app
npm install
npm run build
cd -

# 5. Run the suite
npm run test:e2e:functions:internal
```

Or use the convenience wrapper, which starts Azurite (if the CLI is installed),
installs + builds the test-app, and runs the suite:

```bash
npm run test:e2e:functions
```

If any prerequisite is missing, the suite skips with a `[functions-e2e]` note
instead of failing.

## Follow-ups (deferred)

The following extension-repo test areas are **not** ported yet. Most need extra
infrastructure (an OTLP collector, multi-version host config, scheduled starts) or
an orchestration that is not part of `BasicNode`:

- **DistributedTracing / DistributedTracingEntities** — need an OTLP collector.
- **Versioning / EntityVersioning** — need a multi-version host configuration.
- **DedupeStatuses**, **GetOrchestrationHistory**, **HTTPFeature**, **Restart**,
  **Scheduled** — not yet ported.
- **`PurgeOnlyPurgesTerminalOrchestrations`** — needs a `HelloActivityDIFailure`
  orchestration that is not present in `BasicNode`.
