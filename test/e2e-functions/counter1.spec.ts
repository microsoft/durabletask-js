// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E test for the `counter1` durable entity, driven over HTTP against a real
 * Azure Functions host backed by Azurite (AzureStorage provider).
 *
 * The sample app only wires the entity's `add` (POST) and read (GET) operations
 * to HTTP, so the test asserts that repeated signals increment the persisted
 * state. `reset` is not HTTP-exposed and is intentionally not tested.
 *
 * Gated: skips cleanly unless `func`, Azurite, and a built/installed test-app
 * are all present (see globalSetup + readPreflight).
 */

import { FunctionApp, HOST_STARTUP_TIMEOUT_MS, readPreflight, TEST_APP_DIR } from "./harness";

const preflight = readPreflight(TEST_APP_DIR);
const describeMaybe = preflight.ok ? describe : describe.skip;

if (!preflight.ok) {
  console.warn(`[functions-e2e] counter1.spec skipped: ${preflight.reason}`);
}

describeMaybe("Functions host E2E — counter1 entity (AzureStorage)", () => {
  let app: FunctionApp;

  beforeAll(async () => {
    app = new FunctionApp(TEST_APP_DIR);
    await app.start();
  }, HOST_STARTUP_TIMEOUT_MS + 30_000);

  afterAll(async () => {
    if (app) {
      await app.stop();
    }
  });

  it("increments entity state on each signal", async () => {
    // Use a unique key so repeated runs (state persists in Azurite) start clean.
    const key = `it-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

    await app.signalCounter(key);
    const afterFirst = await app.waitForCounter(key, (value) => value === 1);
    expect(afterFirst).toBe(1);

    await app.signalCounter(key);
    const afterSecond = await app.waitForCounter(key, (value) => value === 2);
    expect(afterSecond).toBe(2);
  }, 90_000);
});
