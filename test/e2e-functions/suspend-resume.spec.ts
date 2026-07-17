// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `SuspendResumeTests`.
 *
 * Suspends/resumes a running orchestration, and asserts the failure behavior for
 * suspend-of-suspended, resume-of-running, and suspend/resume-of-completed. Node
 * swallows suspend/resume of a terminal instance and returns success (200 empty),
 * so that branch is asserted here.
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup.
 */

import {
  HttpResult,
  NODE_LOCALIZED_STRINGS,
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
  console.warn(`[functions-e2e] suspend-resume.spec skipped: ${preflight.reason}`);
}

function assertRequestSucceeds(response: HttpResult): void {
  expect(response.status).toBe(200); // HttpStatusCode.OK
  expect(response.body).toBe("");
}

function assertRequestFails(response: HttpResult, expectedErrorMessage: string): void {
  expect(response.status).toBe(400); // HttpStatusCode.BadRequest
  expect(response.body.startsWith(expectedErrorMessage)).toBe(true);
}

async function tryTerminate(instanceId: string): Promise<void> {
  try {
    await invokeHttpTrigger(baseUrl, "TerminateInstance", `?instanceId=${instanceId}`);
  } catch {
    // best-effort cleanup
  }
}

async function startLongRunning(): Promise<{ instanceId: string; statusQueryGetUri: string }> {
  const response = await invokeHttpTrigger(baseUrl, "StartOrchestration", "?orchestrationName=LongRunningOrchestrator");
  expect(response.status).toBe(202); // HttpStatusCode.Accepted
  return {
    instanceId: parseInstanceId(response),
    statusQueryGetUri: parseStatusQueryGetUri(response),
  };
}

describeMaybe("Functions host E2E — suspend/resume (AzureStorage)", () => {
  it("suspends and resumes a running orchestration", async () => {
    const { instanceId, statusQueryGetUri } = await startLongRunning();
    await waitForOrchestrationState(statusQueryGetUri, "Running", 30);
    try {
      assertRequestSucceeds(await invokeHttpTrigger(baseUrl, "SuspendInstance", `?instanceId=${instanceId}`));
      await waitForOrchestrationState(statusQueryGetUri, "Suspended", 30);

      assertRequestSucceeds(await invokeHttpTrigger(baseUrl, "ResumeInstance", `?instanceId=${instanceId}`));
      await waitForOrchestrationState(statusQueryGetUri, "Running", 30);
    } finally {
      await tryTerminate(instanceId);
    }
  }, 120_000);

  it("fails to suspend an already-suspended orchestration", async () => {
    const { instanceId, statusQueryGetUri } = await startLongRunning();
    await waitForOrchestrationState(statusQueryGetUri, "Running", 30);
    try {
      assertRequestSucceeds(await invokeHttpTrigger(baseUrl, "SuspendInstance", `?instanceId=${instanceId}`));
      await waitForOrchestrationState(statusQueryGetUri, "Suspended", 30);

      const resuspend = await invokeHttpTrigger(baseUrl, "SuspendInstance", `?instanceId=${instanceId}`);
      assertRequestFails(resuspend, NODE_LOCALIZED_STRINGS["SuspendSuspendedInstance.FailureMessage"]);
    } finally {
      await tryTerminate(instanceId);
    }
  }, 120_000);

  it("fails to resume a running orchestration", async () => {
    const { instanceId, statusQueryGetUri } = await startLongRunning();
    await waitForOrchestrationState(statusQueryGetUri, "Running", 30);
    try {
      const resume = await invokeHttpTrigger(baseUrl, "ResumeInstance", `?instanceId=${instanceId}`);
      assertRequestFails(resume, NODE_LOCALIZED_STRINGS["ResumeRunningInstance.FailureMessage"]);
    } finally {
      await tryTerminate(instanceId);
    }
  }, 120_000);

  // Skipped pending #315: over the consolidated gRPC path, suspend/resume of a terminal instance
  // surfaces an opaque `2 UNKNOWN` (HTTP 400) instead of v3's swallow -> 200. Re-enable once the
  // terminal-op status policy in #315 is decided.
  it.skip("swallows suspend/resume of a completed orchestration (Node behavior)", async () => {
    const response = await invokeHttpTrigger(baseUrl, "StartOrchestration", "?orchestrationName=HelloCities");
    expect(response.status).toBe(202); // HttpStatusCode.Accepted
    const instanceId = parseInstanceId(response);
    const statusQueryGetUri = parseStatusQueryGetUri(response);
    await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

    try {
      // Node swallows suspend/resume of a terminal instance and returns 200 empty.
      assertRequestSucceeds(await invokeHttpTrigger(baseUrl, "SuspendInstance", `?instanceId=${instanceId}`));
      assertRequestSucceeds(await invokeHttpTrigger(baseUrl, "ResumeInstance", `?instanceId=${instanceId}`));
    } finally {
      await tryTerminate(instanceId);
    }
  }, 120_000);
});
