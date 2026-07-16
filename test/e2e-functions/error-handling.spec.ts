// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `ErrorHandlingTests`.
 *
 * Covers uncaught/caught activity and entity exceptions plus retried activity /
 * entity / custom-retry orchestrations. Assertion text comes from the Node
 * localizer. Backend = Storage, so `[Trait("Node-DTS","Skip")]` and
 * `[Trait("DTS","Skip")]` tests are INCLUDED (those skips apply to the DTS
 * backend only); `[Trait("Node","Skip")]` tests are `it.skip`.
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup.
 */

import {
  NODE_LOCALIZED_STRINGS,
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
  console.warn(`[functions-e2e] error-handling.spec skipped: ${preflight.reason}`);
}

async function runToState(orchestrationName: string, desiredState: string) {
  const response = await invokeHttpTrigger(baseUrl, "StartOrchestration", `?orchestrationName=${orchestrationName}`);
  expect(response.status).toBe(202); // HttpStatusCode.Accepted
  const statusQueryGetUri = parseStatusQueryGetUri(response);
  await waitForOrchestrationState(statusQueryGetUri, desiredState, 30);
  return getOrchestrationDetails(statusQueryGetUri);
}

describeMaybe("Functions host E2E — error handling (AzureStorage)", () => {
  // DTS-skipped in C#; included for the Storage backend.
  it("RethrowActivityException fails with the rethrown activity error", async () => {
    const { outputString } = await runToState("RethrowActivityException", "Failed");
    expect(outputString.startsWith(NODE_LOCALIZED_STRINGS["RethrownActivityException.ErrorMessage"])).toBe(true);
    expect(outputString).toContain("This activity failed");
  }, 120_000);

  // DTS-skipped in C#; included for the Storage backend.
  it("ThrowEntityOrchestration fails with the rethrown entity error", async () => {
    const { outputString } = await runToState("ThrowEntityOrchestration", "Failed");
    expect(outputString.startsWith(NODE_LOCALIZED_STRINGS["RethrownEntityException.ErrorMessage"])).toBe(true);
    // Bug: https://github.com/Azure/azure-functions-durable-js/issues/642 — Node does
    // not surface "This entity failed" in the output, so that assertion is omitted.
  }, 120_000);

  // Node-DTS-skipped in C#; included for the Storage backend.
  it("CatchActivityException completes after catching the activity error", async () => {
    const { outputString } = await runToState("CatchActivityException", "Completed");
    expect(outputString.startsWith(NODE_LOCALIZED_STRINGS["CaughtActivityException.ErrorMessage"])).toBe(true);
    expect(outputString).toContain("This activity failed");
  }, 120_000);

  // FailureDetails is a dotnet-isolated implementation detail — [Trait("Node","Skip")].
  it.skip("CatchActivityExceptionFailureDetails (Node skip: FailureDetails is dotnet-isolated-only)", () => {
    // Not applicable to the Node SDK.
  });

  it("CatchEntityOrchestration completes after catching the entity error", async () => {
    const { outputString } = await runToState("CatchEntityOrchestration", "Completed");
    expect(outputString.startsWith(NODE_LOCALIZED_STRINGS["CaughtEntityException.ErrorMessage"])).toBe(true);
    // Bug: https://github.com/Azure/azure-functions-durable-js/issues/642 — Node does not
    // surface "This entity failed"/"More information about the failure", so the inner-detail
    // assertions are omitted for Node.
  }, 120_000);

  // Node-DTS-skipped in C#; included for the Storage backend.
  it("RetryActivityFunction eventually succeeds", async () => {
    const { outputString } = await runToState("RetryActivityFunction", "Completed");
    expect(outputString).toBe("Success");
    // The C# test additionally scrapes Core Tools logs for the retried failure; that
    // exercises the extension's logging, not the JS SDK, so it is omitted here.
  }, 120_000);

  // DTS + Node-DTS-skipped in C#; included for the Storage backend.
  it("RetryEntityOrchestration eventually succeeds", async () => {
    const { outputString } = await runToState("RetryEntityOrchestration", "Completed");
    expect(outputString).toBe("Success");
    // Log-scraping assertions omitted (extension logging, not JS SDK behavior).
  }, 120_000);

  // Node-DTS-skipped in C#; included for the Storage backend.
  it("CustomRetryActivityFunction eventually succeeds", async () => {
    const { outputString } = await runToState("CustomRetryActivityFunction", "Completed");
    expect(outputString).toBe("Success");
    // Log-scraping assertions omitted (extension logging, not JS SDK behavior).
  }, 120_000);

  // FailureDetails custom properties are a dotnet-isolated implementation detail — [Trait("Node","Skip")].
  it.skip("CustomExceptionPropertiesInFailureDetails (Node skip: FailureDetails is dotnet-isolated-only)", () => {
    // Not applicable to the Node SDK.
  });
});
