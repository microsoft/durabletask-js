// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `IsReplayingTests`.
 *
 * Verifies the `isReplaying` flag across single-activity, multi-activity, and
 * counter orchestrations. Backend = Storage, so `[Trait("Node-DTS","Skip")]`
 * tests are INCLUDED; the two `[Trait("Node","Skip")]` tests are `it.skip`
 * (bugs #564 and #679).
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
  console.warn(`[functions-e2e] is-replaying.spec skipped: ${preflight.reason}`);
}

async function runAndGetOutput(orchestrationName: string): Promise<Record<string, unknown>> {
  const response = await invokeHttpTrigger(baseUrl, "StartOrchestration", `?orchestrationName=${orchestrationName}`);
  expect(response.status).toBe(202); // HttpStatusCode.Accepted
  const statusQueryGetUri = parseStatusQueryGetUri(response);
  await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);
  const details = await getOrchestrationDetails(statusQueryGetUri);
  return details.output as Record<string, unknown>;
}

describeMaybe("Functions host E2E — isReplaying (AzureStorage)", () => {
  // Node-DTS-skipped in C#; included for the Storage backend.
  it("IsReplayingBasic reports replay flags around a single activity", async () => {
    const output = await runAndGetOutput("IsReplayingBasic");
    expect(output["before_activity"]).toBe(true);
    expect(output["after_activity"]).toBe(false);
    expect(output["activity_result"]).toBe("hello");
  }, 120_000);

  // Node-DTS-skipped in C#; included for the Storage backend.
  it("IsReplayingMultiActivity shows replay progression across snapshots", async () => {
    const output = await runAndGetOutput("IsReplayingMultiActivity");

    const activities = output["activities"] as string[];
    expect(activities).toEqual(["one", "two", "three"]);

    const snapshots = output["snapshots"] as Array<{ is_replaying: boolean; label: string }>;
    expect(snapshots).toHaveLength(4);
    for (let i = 0; i < 3; i++) {
      expect(snapshots[i].is_replaying).toBe(true);
    }
    expect(snapshots[3].is_replaying).toBe(false);
  }, 120_000);

  // Bug: https://github.com/Azure/azure-functions-durable-js/issues/564
  it.skip("IsReplayingConditionalLog (Node skip: isReplaying undefined before first yield, #564)", () => {
    // Not portable until #564 is fixed.
  });

  // Node-DTS-skipped in C#; included for the Storage backend.
  it("IsReplayingCounter tracks replay and live checkpoints", async () => {
    const output = await runAndGetOutput("IsReplayingCounter");
    expect(output["total_checkpoints"]).toBe(4);
    expect(output["non_replay_count"]).toBe(1);
    expect(output["replay_count"]).toBe(3);
    expect(output["activities"] as string[]).toEqual(["a", "b", "c"]);
  }, 120_000);

  // Bug: https://github.com/Azure/azure-functions-durable-js/issues/679
  it.skip("IsReplayingFanOutFanIn (Node skip: replay flags around parallel tasks, #679)", () => {
    // Not portable until #679 is fixed.
  });
});
