// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E test for the `helloOrchestrator` fan-in/sequence sample, driven over HTTP
 * against a real Azure Functions host backed by Azurite (AzureStorage provider).
 *
 * Gated: skips cleanly unless `func`, Azurite, and a built/installed test-app
 * are all present (see globalSetup + readPreflight).
 */

import { FunctionApp, HOST_STARTUP_TIMEOUT_MS, readPreflight, TEST_APP_DIR } from "./harness";

const preflight = readPreflight(TEST_APP_DIR);
const describeMaybe = preflight.ok ? describe : describe.skip;

if (!preflight.ok) {
  console.warn(`[functions-e2e] hello.spec skipped: ${preflight.reason}`);
}

describeMaybe("Functions host E2E — hello orchestration (AzureStorage)", () => {
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

  it("runs helloOrchestrator and returns the three greetings", async () => {
    const { id, statusQueryGetUri } = await app.startHelloOrchestration();
    expect(id).toBeTruthy();

    const status = await app.waitForCompletion(statusQueryGetUri);

    expect(String(status.runtimeStatus).toLowerCase()).toBe("completed");
    expect(status.output).toEqual(["Hello, Tokyo", "Hello, Seattle", "Hello, Cairo"]);
  }, 90_000);
});
