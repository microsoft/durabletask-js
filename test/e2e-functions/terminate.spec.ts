// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `TerminateOrchestratorTests`.
 *
 * Terminates a running orchestration, then exercises terminate-of-terminated,
 * terminate-of-completed, and terminate-of-nonexistent. Node swallows terminate
 * of a terminal instance and returns 200; a non-existent instance returns 400
 * with the localized not-found message.
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup.
 */

import { randomUUID } from "crypto";
import {
  HttpResult,
  formatLocalized,
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
  console.warn(`[functions-e2e] terminate.spec skipped: ${preflight.reason}`);
}

function assertTerminateSucceeds(response: HttpResult): void {
  expect(response.status).toBe(200); // HttpStatusCode.OK
  expect(response.body).toBe("");
}

describeMaybe("Functions host E2E — terminate (AzureStorage)", () => {
  it("terminates a running orchestration", async () => {
    const response = await invokeHttpTrigger(
      baseUrl,
      "StartOrchestration",
      "?orchestrationName=LongRunningOrchestrator",
    );
    expect(response.status).toBe(202); // HttpStatusCode.Accepted
    const instanceId = parseInstanceId(response);
    const statusQueryGetUri = parseStatusQueryGetUri(response);

    await waitForOrchestrationState(statusQueryGetUri, "Running", 30);

    assertTerminateSucceeds(await invokeHttpTrigger(baseUrl, "TerminateInstance", `?instanceId=${instanceId}`));
    await waitForOrchestrationState(statusQueryGetUri, "Terminated", 30);
  }, 120_000);

  // Scheduled orchestrations are not implemented in Node — [Trait("Node","Skip")].
  it.skip("TerminateScheduledOrchestration (Node skip: scheduled starts not implemented)", () => {
    // Not applicable to the Node SDK.
  });

  // v3 410 parity (#282): terminating a TERMINAL instance is swallowed. Over the gRPC path the wrong-
  // state failure surfaces as `9 FAILED_PRECONDITION` ("...because instance is in the Terminated
  // state."); the compat client looks up the terminal runtime status and no-ops it (returns 200)
  // instead of throwing.
  it("swallows terminate of an already-terminated orchestration (Node behavior)", async () => {
    const response = await invokeHttpTrigger(
      baseUrl,
      "StartOrchestration",
      "?orchestrationName=LongRunningOrchestrator",
    );
    expect(response.status).toBe(202); // HttpStatusCode.Accepted
    const instanceId = parseInstanceId(response);
    const statusQueryGetUri = parseStatusQueryGetUri(response);

    await waitForOrchestrationState(statusQueryGetUri, "Running", 30);
    assertTerminateSucceeds(await invokeHttpTrigger(baseUrl, "TerminateInstance", `?instanceId=${instanceId}`));
    await waitForOrchestrationState(statusQueryGetUri, "Terminated", 30);

    const terminateAgain = await invokeHttpTrigger(baseUrl, "TerminateInstance", `?instanceId=${instanceId}`);
    // Node swallows the failure and returns 200.
    expect(terminateAgain.status).toBe(200);
    // Node's localized message for this case is empty (Contains("") is trivially satisfied).
    expect(terminateAgain.body).toContain(formatLocalized("TerminateTerminatedInstance.FailureMessage", instanceId));
  }, 120_000);

  // v3 410 parity (#282, see above): terminating a COMPLETED instance is swallowed. The `9
  // FAILED_PRECONDITION` is resolved to the terminal runtime status by the compat client and no-oped
  // -> 200.
  it("swallows terminate of a completed orchestration (Node behavior)", async () => {
    const response = await invokeHttpTrigger(baseUrl, "StartOrchestration", "?orchestrationName=HelloCities");
    expect(response.status).toBe(202); // HttpStatusCode.Accepted
    const instanceId = parseInstanceId(response);
    const statusQueryGetUri = parseStatusQueryGetUri(response);

    await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

    const terminateResponse = await invokeHttpTrigger(baseUrl, "TerminateInstance", `?instanceId=${instanceId}`);
    // Node swallows the failure and returns 200.
    expect(terminateResponse.status).toBe(200);
    expect(terminateResponse.body).toContain(formatLocalized("TerminateCompletedInstance.FailureMessage", instanceId));
  }, 120_000);

  it("fails to terminate a non-existent orchestration", async () => {
    const instanceId = randomUUID();
    const terminateResponse = await invokeHttpTrigger(baseUrl, "TerminateInstance", `?instanceId=${instanceId}`);
    expect(terminateResponse.status).toBe(400); // HttpStatusCode.BadRequest
    expect(terminateResponse.body).toContain(formatLocalized("TerminateInvalidInstance.FailureMessage", instanceId));
  }, 120_000);
});
