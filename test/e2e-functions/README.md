# Azure Functions host E2E tests (gated)

This suite launches a **real Azure Functions host** (`func start`) for the sample
app under [`test-app/`](./test-app), backed by **Azurite** (the local Azure
Storage emulator) using the Durable Task **AzureStorage** provider, and drives
the app entirely over HTTP. The Node.js worker, the Functions host, and the
Durable extension all cooperate exactly as they would in production.

It mirrors the Python suite added in
[durabletask-python#155](https://github.com/microsoft/durabletask-python/pull/155).

## ⚠️ Gated until PR #282 merges

The sample app depends on the in-repo `durable-functions` package
(`packages/azure-functions-durable`) added by
[durabletask-js#282](https://github.com/microsoft/durabletask-js/pull/282), which
is **not on `main` yet**. This suite is deliberately split out from #282 so it
can land independently without touching that package.

Because the package does not exist on `main`, everything here is **gated /
skipped** so existing CI (`npm test`, lint, build) stays green:

- **Prerequisite detection** — the suite skips cleanly unless all of these hold
  (see `harness.ts` + `global-setup.ts`):
  1. Azure Functions Core Tools (`func`) v4 is on `PATH`,
  2. Azurite is reachable on `127.0.0.1:10000`, and
  3. the test-app is installed and built (`test-app/node_modules` + `test-app/dist`).

  On `main`, step 3 cannot be satisfied (the local `durable-functions` package is
  absent), so the suite is a clean no-op.

- **Isolation** — these specs are only run by the dedicated
  `jest.functions-e2e.config.js` via `npm run test:e2e:functions:internal`. They
  are **not** part of the default `npm test` / workspaces test run, nor of
  `test:e2e:internal` (which is scoped to `tests/e2e`).
- **CI** — `.github/workflows/functions-e2e-tests.yaml` gates every job behind the
  `RUN_FUNCTIONS_E2E` repository variable. It is a no-op until that variable is
  set to `true` (do so only after #282 has merged).

## What it covers

Faithful to the (identical) `azure-functions-durable-js` sample app:

- **`hello.spec.ts`** — starts the `helloOrchestrator` (which chains three
  `hello` activities) and asserts the output is
  `["Hello, Tokyo", "Hello, Seattle", "Hello, Cairo"]`.
- **`counter1.spec.ts`** — signals the `counter1` durable entity (`add`, 1) via
  HTTP and asserts the persisted state increments (1, then 2). `reset` is not
  wired to an HTTP route in the sample app, so it is not tested.

The only additions to the sample app are a plain `/api/ping` readiness function
(for host-readiness probing) and the dependency wiring (`durable-functions`
points at the workspace package). The Durable function code is kept byte-for-byte
identical to `azure-functions-durable-js`.

## Running locally

You need the [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
and [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite).

```bash
# 1. Start Azurite (blob/queue/table on 10000/10001/10002)
npm install -g azurite
azurite --silent --location /tmp/azurite --blobPort 10000 --queuePort 10001 --tablePort 10002 &

# 2. Install the Core Tools (if needed)
npm install -g azure-functions-core-tools@4

# 3. Build the workspace (must include packages/azure-functions-durable from #282)
npm ci
npm run build

# 4. Install + build the test-app
cd test/e2e-functions/test-app
npm install
npm run build
cd -

# 5. Run the suite
npm run test:e2e:functions:internal
```

Or use the convenience wrapper, which starts Azurite (if the CLI is installed),
builds the workspace + test-app, and runs the suite:

```bash
npm run test:e2e:functions
```

If any prerequisite is missing, the suite skips with a `[functions-e2e]` note
instead of failing.
