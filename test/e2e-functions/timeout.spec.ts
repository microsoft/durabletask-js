// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `TimeoutTests.TimeoutFunction_ShouldTimeoutWhenAppropriate`.
 *
 * The TimeoutOrchestrator races a ~5s activity against a timer. A 2s timeout lets
 * the timer win ("timed out"); a 10s timeout lets the activity win ("completed").
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
  console.warn(`[functions-e2e] timeout.spec skipped: ${preflight.reason}`);
}

describeMaybe("Functions host E2E — activity timeout (AzureStorage)", () => {
  it.each([
    [2, "The activity function timed out"],
    [10, "The activity function completed successfully"],
  ])(
    "TimeoutOrchestrator(timeoutSeconds=%i) => %s",
    async (timeoutSeconds, expectedOutput) => {
      const response = await invokeHttpTrigger(
        baseUrl,
        "TimeoutOrchestrator_HttpStart",
        `?timeoutSeconds=${timeoutSeconds}`,
      );
      expect(response.status).toBe(202); // HttpStatusCode.Accepted

      const statusQueryGetUri = parseStatusQueryGetUri(response);
      await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

      const { outputString } = await getOrchestrationDetails(statusQueryGetUri);
      expect(outputString).toBe(expectedOutput);
    },
    120_000,
  );
});
