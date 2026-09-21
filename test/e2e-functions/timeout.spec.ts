// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `TimeoutTests.TimeoutFunction_ShouldTimeoutWhenAppropriate`.
 *
 * The TimeoutOrchestrator races a ~5s activity against a timer. A 2s timeout lets
 * the timer win ("timed out"); 10s and 30-day timeouts let the activity win.
 * The long deadline exercises scheduling and cancellation against the actual
 * Azure Storage host path without waiting for the business deadline.
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup.
 */

import {
  getOrchestrationDetails,
  getStatus,
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
    [30 * 24 * 60 * 60, "The activity function completed successfully"],
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

      if (timeoutSeconds === 30 * 24 * 60 * 60) {
        const historyUrl = new URL(statusQueryGetUri);
        historyUrl.searchParams.set("showHistory", "true");
        const status = await getStatus(historyUrl.toString());
        const custom = status.customStatus as {
          timerCreatedAt: string;
          timerDeadline: string;
          timerCanceled: boolean;
          timerCompleted: boolean;
        };
        expect(custom).toEqual({
          timerCreatedAt: expect.any(String),
          timerDeadline: expect.any(String),
          timerCanceled: true,
          timerCompleted: true,
        });
        const startedAt = Date.parse(custom.timerCreatedAt);
        expect(Date.parse(custom.timerDeadline) - startedAt).toBe(timeoutSeconds * 1000);
        const history = status.historyEvents as { EventType: string; FireAt?: string }[];
        expect(Array.isArray(history)).toBe(true);
        const timers = history.filter((event) => event.EventType === "TimerCreated");
        expect(timers).toHaveLength(1);
        expect(Date.parse(timers[0].FireAt!) - startedAt).toBe(3 * 24 * 60 * 60 * 1000);
        expect(history.some((event) => event.EventType === "TimerFired")).toBe(false);
      }
    },
    120_000,
  );
});
