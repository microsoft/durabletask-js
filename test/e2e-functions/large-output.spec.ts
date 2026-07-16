// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `LargeOutputOrchestratorTests`.
 *
 * - LargeOutputStatusQueryTests(65): outputs slightly above the 64 KB queue limit
 *   are stored in blob storage and returned via the status-query URI.
 * - DurableTaskClientWriteOutputTests(4608): larger-than-4 MB outputs are read
 *   back via a query trigger. The C# test is DTS/Java-skipped; since this is the
 *   Storage backend, it is included here.
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup.
 */

import {
  invokeHttpTrigger,
  parseInstanceId,
  parseStatusQueryGetUri,
  readPreflight,
  waitForOrchestrationState,
} from "./harness";

const preflight = readPreflight();
const describeMaybe = preflight.ok ? describe : describe.skip;
const baseUrl = preflight.baseUrl ?? "";

if (!preflight.ok) {
  console.warn(`[functions-e2e] large-output.spec skipped: ${preflight.reason}`);
}

function generateLargeString(sizeInKB: number): string {
  return "A".repeat(sizeInKB * 1024);
}

describeMaybe("Functions host E2E — large output (AzureStorage)", () => {
  it("LargeOutputStatusQueryTests(65): returns 65 KB output via the status-query URI", async () => {
    const sizeInKB = 65;
    const response = await invokeHttpTrigger(
      baseUrl,
      "LargeOutputOrchestrator_HttpStart",
      "",
      String(sizeInKB),
      "application/json",
    );
    expect(response.status).toBe(202); // HttpStatusCode.Accepted

    const statusQueryGetUri = parseStatusQueryGetUri(response);
    const details = await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

    expect(details.outputString).toContain(generateLargeString(sizeInKB));
  }, 180_000);

  // The C# test is [Trait("DTS","Skip")] + [Trait("Java","Skip")]; those skips do
  // not apply to the Storage backend, so it is included here.
  it("DurableTaskClientWriteOutputTests(4608): returns >4 MB output via a query trigger", async () => {
    const sizeInKB = 4608;
    const response = await invokeHttpTrigger(
      baseUrl,
      "LargeOutputOrchestrator_HttpStart",
      "",
      String(sizeInKB),
      "application/json",
    );
    expect(response.status).toBe(202); // HttpStatusCode.Accepted

    const instanceId = parseInstanceId(response);
    const statusQueryGetUri = parseStatusQueryGetUri(response);
    await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

    const result = await invokeHttpTrigger(baseUrl, "LargeOutputOrchestrator_Query_Output", `?id=${instanceId}`);
    expect(result.status).toBe(200); // HttpStatusCode.OK
    expect(result.body).toContain(generateLargeString(sizeInKB));
  }, 180_000);
});
