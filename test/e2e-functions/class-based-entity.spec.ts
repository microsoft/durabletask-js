// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `ClassBasedEntityTests.ClassBasedEntityTest`.
 *
 * Runs an orchestration that sets and reads a class-based entity's state and
 * asserts the exact returned state string.
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
  console.warn(`[functions-e2e] class-based-entity.spec skipped: ${preflight.reason}`);
}

describeMaybe("Functions host E2E — class-based entity (AzureStorage)", () => {
  it("ClassBasedEntityOrchestration returns the entity state string", async () => {
    const response = await invokeHttpTrigger(
      baseUrl,
      "StartOrchestration",
      "?orchestrationName=ClassBasedEntityOrchestration",
    );
    expect(response.status).toBe(202); // HttpStatusCode.Accepted

    const statusQueryGetUri = parseStatusQueryGetUri(response);
    await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

    const { outputString } = await getOrchestrationDetails(statusQueryGetUri);
    expect(outputString).toBe("IConfiguration: yes, MyInjectedService: yes, BlobContainerClient: yes, Number: 42");
  }, 120_000);
});
