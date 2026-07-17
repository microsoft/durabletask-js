// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `ExternalEventTests`.
 *
 * Raises an external event to a running orchestration (completes it), then to a
 * completed instance and to a non-existent instance. Assertion text comes from
 * the Node localizer.
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup.
 */

import {
  NODE_LOCALIZED_STRINGS,
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
  console.warn(`[functions-e2e] external-event.spec skipped: ${preflight.reason}`);
}

describeMaybe("Functions host E2E — external events (AzureStorage)", () => {
  it("RaiseExternalEvent delivers to a running instance and completes it", async () => {
    const response = await invokeHttpTrigger(
      baseUrl,
      "StartOrchestration",
      "?orchestrationName=ExternalEventOrchestrator",
    );
    expect(response.status).toBe(202); // HttpStatusCode.Accepted

    const instanceId = parseInstanceId(response);
    const jsonContent = JSON.stringify(instanceId);
    const statusQueryGetUri = parseStatusQueryGetUri(response);

    // Send the event the orchestration is waiting for.
    await invokeHttpTrigger(baseUrl, "SendExternalEvent_HttpStart", "", jsonContent, "application/json");

    await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

    // ClientOperationReceived log assertions from the C# test are omitted (they
    // exercise the extension's Core Tools logging, not the JS SDK).

    // Resend to the now-completed instance.
    await invokeHttpTrigger(baseUrl, "SendExternalEvent_HttpStart", "", jsonContent, "application/json");
    // Bug: https://github.com/Azure/azure-functions-durable-js/issues/645 — Node does
    // not surface an error when raising to a completed instance, so the C# error
    // assertions (guarded by `LanguageType != Node`) are intentionally omitted.
  }, 120_000);

  it("RaiseExternalEvent to a non-existent instance returns the not-found error", async () => {
    const testInstanceId = "instance-does-not-exist-test";
    const jsonContent = JSON.stringify(testInstanceId);

    const response = await invokeHttpTrigger(
      baseUrl,
      "SendExternalEvent_HttpStart",
      "",
      jsonContent,
      "application/json",
    );
    const responseContent = response.body;

    expect(responseContent).toContain(NODE_LOCALIZED_STRINGS["ExternalEvent.InvalidInstance.ErrorName"]);
    expect(responseContent).toContain(formatLocalized("ExternalEvent.InvalidInstance.ErrorMessage", testInstanceId));
  }, 120_000);
});
