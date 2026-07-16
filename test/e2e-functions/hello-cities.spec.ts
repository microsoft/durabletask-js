// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `HelloCitiesTest` (HttpEndToEndTests).
 *
 * Drives the generic `StartOrchestration` starter over HTTP against the shared
 * `func` host and asserts the `HelloCities` activity-chaining orchestration
 * completes with the expected greeting in its output.
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup (func +
 * Azurite + a built/installed test-app all present).
 */

import {
  getOrchestrationDetails,
  invokeHttpTrigger,
  parseStatusQueryGetUri,
  readPreflight,
  waitForOrchestrationState,
} from "./harness";

const preflight = readPreflight();
const describeMaybe = preflight.ok ? describe : describe.skip;
const baseUrl = preflight.baseUrl ?? "";

if (!preflight.ok) {
  console.warn(`[functions-e2e] hello-cities.spec skipped: ${preflight.reason}`);
}

describeMaybe("Functions host E2E — HelloCities (AzureStorage)", () => {
  it("StartOrchestration(HelloCities) completes and returns the greeting", async () => {
    const response = await invokeHttpTrigger(baseUrl, "StartOrchestration", "?orchestrationName=HelloCities");
    expect(response.status).toBe(202); // HttpStatusCode.Accepted

    const statusQueryGetUri = parseStatusQueryGetUri(response);
    await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

    const details = await getOrchestrationDetails(statusQueryGetUri);
    expect(details.outputString).toContain("Hello Tokyo!");

    // The C# test additionally asserts a `ClientOperationReceived` log carrying a
    // FunctionInvocationId. That exercises the extension's Core Tools logging, not
    // the JS SDK behavior under test, so it is intentionally not ported here.
  }, 120_000);
});
