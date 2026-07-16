// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `PurgeInstancesTests`.
 *
 * Purges instance history by time range and by entity instance id. Backend =
 * Storage, so `[Trait("Node-DTS","Skip")]` tests are INCLUDED. The
 * "purge without start time" tests are `[Trait("Node","Skip")]` (bug #644) and
 * are `it.skip`. `PurgeOnlyPurgesTerminalOrchestrations` requires a
 * `HelloActivityDIFailure` orchestration that is not part of BasicNode, so it is
 * deferred (see README follow-ups).
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup.
 */

import { invokeHttpTrigger, parseStatusQueryGetUri, readPreflight, waitForOrchestrationState } from "./harness";

const preflight = readPreflight();
const describeMaybe = preflight.ok ? describe : describe.skip;
const baseUrl = preflight.baseUrl ?? "";

if (!preflight.ok) {
  console.warn(`[functions-e2e] purge.spec skipped: ${preflight.reason}`);
}

const PURGED_RECORDS = /^Purged \d+ records$/;

describeMaybe("Functions host E2E — purge (AzureStorage)", () => {
  // Node-DTS-skipped in C#; included for the Storage backend.
  it("PurgeOrchestrationHistory with start and end time succeeds", async () => {
    const purgeStartTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const purgeEndTime = new Date().toISOString();
    const response = await invokeHttpTrigger(
      baseUrl,
      "PurgeOrchestrationHistory",
      `?purgeStartTime=${purgeStartTime}&purgeEndTime=${purgeEndTime}`,
    );
    expect(response.status).toBe(200); // HttpStatusCode.OK
    expect(response.body).toMatch(PURGED_RECORDS);
  }, 120_000);

  // Node-DTS-skipped in C#; included for the Storage backend.
  it("PurgeOrchestrationHistory with start time only succeeds", async () => {
    const purgeStartTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const response = await invokeHttpTrigger(baseUrl, "PurgeOrchestrationHistory", `?purgeStartTime=${purgeStartTime}`);
    expect(response.status).toBe(200); // HttpStatusCode.OK
    expect(response.body).toMatch(PURGED_RECORDS);
  }, 120_000);

  // Bug: https://github.com/Azure/azure-functions-durable-js/issues/644 (purge
  // without a start time). [Trait("Node","Skip")].
  it.skip("PurgeOrchestrationHistory with end time only (Node skip: purge without start time, #644)", () => {});
  it.skip("PurgeOrchestrationHistory with no boundaries (Node skip: purge without start time, #644)", () => {});
  it.skip("PurgeOrchestrationHistoryAfterInvocation (Node skip: purge without start time, #644)", () => {});
  it.skip("PurgeAfterPurge_ZeroRows (Node skip: purge without start time, #644)", () => {});

  // Deferred: requires a `HelloActivityDIFailure` orchestration that is not part
  // of the BasicNode app. Tracked as a follow-up in the README.
  it.skip("PurgeOnlyPurgesTerminalOrchestrations (deferred: needs HelloActivityDIFailure)", () => {});

  it("PurgeEntity purges an existing entity instance and reports zero for a missing one", async () => {
    const orchestrationResponse = await invokeHttpTrigger(
      baseUrl,
      "StartOrchestration",
      "?orchestrationName=InvokeDummyEntityOrchestration",
    );
    expect(orchestrationResponse.status).toBe(202); // HttpStatusCode.Accepted

    const statusQueryGetUri = parseStatusQueryGetUri(orchestrationResponse);
    await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

    // EntityInstanceId("DummyEntity","myEntity") => "@dummyentity@myEntity" (name lowercased).
    const existingEntityId = "@dummyentity@myEntity";
    const purgeExistent = await invokeHttpTrigger(
      baseUrl,
      "PurgeOrchestrationHistory",
      `?instanceId=${existingEntityId}`,
    );
    expect(purgeExistent.status).toBe(200); // HttpStatusCode.OK
    expect(purgeExistent.body).toBe("Purged 1 records");

    const missingEntityId = "@dummyentity3@myEntity";
    const purgeNonExistent = await invokeHttpTrigger(
      baseUrl,
      "PurgeOrchestrationHistory",
      `?instanceId=${missingEntityId}`,
    );
    expect(purgeNonExistent.status).toBe(200); // HttpStatusCode.OK
    expect(purgeNonExistent.body).toBe("Purged 0 records");
  }, 120_000);
});
