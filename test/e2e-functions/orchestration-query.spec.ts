// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `OrchestrationQueryTests`.
 *
 * Lists all instances and running instances via the query HTTP triggers.
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
  console.warn(`[functions-e2e] orchestration-query.spec skipped: ${preflight.reason}`);
}

interface QueriedInstance {
  InstanceId?: string;
  instanceId?: string;
}

describeMaybe("Functions host E2E — orchestration query (AzureStorage)", () => {
  it("GetAllInstances returns a JSON array", async () => {
    const statusResponse = await invokeHttpTrigger(baseUrl, "GetAllInstances", "");
    expect(statusResponse.status).toBe(200); // HttpStatusCode.OK

    const parsed = JSON.parse(statusResponse.body);
    expect(parsed).not.toBeNull();
    expect(Array.isArray(parsed)).toBe(true);
  }, 120_000);

  it("GetRunningInstances contains the running instance", async () => {
    const response = await invokeHttpTrigger(
      baseUrl,
      "StartOrchestration",
      "?orchestrationName=LongRunningOrchestrator",
    );
    expect(response.status).toBe(202); // HttpStatusCode.Accepted
    const instanceId = parseInstanceId(response);
    const statusQueryGetUri = parseStatusQueryGetUri(response);

    await waitForOrchestrationState(statusQueryGetUri, "Running", 30);
    try {
      const statusResponse = await invokeHttpTrigger(baseUrl, "GetRunningInstances", "");
      expect(statusResponse.status).toBe(200); // HttpStatusCode.OK

      const parsed = JSON.parse(statusResponse.body) as QueriedInstance[];
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.some((x) => x.InstanceId === instanceId || x.instanceId === instanceId)).toBe(true);
    } finally {
      try {
        await invokeHttpTrigger(baseUrl, "TerminateInstance", `?instanceId=${instanceId}`);
      } catch {
        // best-effort cleanup
      }
    }
  }, 120_000);
});
