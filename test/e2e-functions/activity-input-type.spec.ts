// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `ActivityInputTypeTests.DifferentActivityInputTypeTests`.
 *
 * Verifies that different input types (byte[], empty byte[], single byte, custom
 * class, int[], string, custom-class array) serialize correctly and are received
 * by activities without serialization errors.
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup.
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
  console.warn(`[functions-e2e] activity-input-type.spec skipped: ${preflight.reason}`);
}

describeMaybe("Functions host E2E — activity input types (AzureStorage)", () => {
  it("ActivityInputTypeOrchestrator serializes every input type without errors", async () => {
    const response = await invokeHttpTrigger(
      baseUrl,
      "StartOrchestration",
      "?orchestrationName=ActivityInputTypeOrchestrator",
    );
    expect(response.status).toBe(202); // HttpStatusCode.Accepted

    const statusQueryGetUri = parseStatusQueryGetUri(response);
    await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

    const { outputString } = await getOrchestrationDetails(statusQueryGetUri);

    expect(outputString).toContain("Received byte[]: [1, 2, 3, 4, 5]");
    expect(outputString).toContain("Received byte[]: []");
    expect(outputString).toContain("Received byte: 42");
    expect(outputString).toContain("Received CustomClass: {Name: Test, Age: 25, Duration: 01:00:00, Data: [1, 2, 3]}");
    expect(outputString).toContain("Received int[]: [1, 2, 3, 4, 5]");
    expect(outputString).toContain("Received string: Test string input");
    expect(outputString).toContain(
      "Received CustomClass[]: [{Name: Test1, Age: 25, Duration: 00:30:00, Data: [1, 2, 3]}, {Name: Test2, Age: 30, Duration: 00:45:00, Data: []}]",
    );

    // No serialization errors, especially for byte[] types.
    expect(outputString).not.toContain("Error:");
  }, 120_000);
});
