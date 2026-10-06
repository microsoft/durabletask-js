// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { randomUUID } from "crypto";
import { invokeHttpTrigger, parseStatusQueryGetUri, readPreflight, waitForOrchestrationState } from "./harness";

const preflight = readPreflight();
const describeMaybe = preflight.ok ? describe : describe.skip;
const baseUrl = preflight.baseUrl ?? "";

if (!preflight.ok) {
  console.warn(`[functions-e2e] sub-orchestration-tags.spec skipped: ${preflight.reason}`);
}

interface TaggedSubOrchestrationMetadata {
  instanceId: string;
  name: string;
  isCompleted: boolean;
  tags: Record<string, string>;
}

async function purge(instanceId: string): Promise<void> {
  try {
    const response = await invokeHttpTrigger(
      baseUrl,
      "PurgeOrchestrationHistory",
      `?instanceId=${encodeURIComponent(instanceId)}`,
    );
    if (response.status !== 200) {
      console.warn(`[functions-e2e] Failed to purge ${instanceId}: ${response.status} ${response.body}`);
    }
  } catch (error) {
    console.warn(`[functions-e2e] Failed to purge ${instanceId}: ${String(error)}`);
  }
}

describeMaybe("Functions host E2E — sub-orchestration tags (AzureStorage)", () => {
  it("persists facade tags on the child orchestration instance", async () => {
    const runId = randomUUID();
    const parentInstanceId = `tagged-parent-${runId}`;
    const childInstanceId = `tagged-child-${runId}`;

    try {
      const start = await invokeHttpTrigger(
        baseUrl,
        "StartTaggedSubOrchestration",
        `?parentInstanceId=${encodeURIComponent(parentInstanceId)}&childInstanceId=${encodeURIComponent(childInstanceId)}`,
      );
      expect(start.status).toBe(202);

      await waitForOrchestrationState(parseStatusQueryGetUri(start), "Completed", 60);

      const metadataResponse = await invokeHttpTrigger(
        baseUrl,
        "GetTaggedSubOrchestrationMetadata",
        `?instanceId=${encodeURIComponent(childInstanceId)}`,
      );
      expect(metadataResponse.status).toBe(200);
      expect(metadataResponse.json<TaggedSubOrchestrationMetadata>()).toEqual({
        instanceId: childInstanceId,
        name: "TaggedSubOrchestrationChild",
        isCompleted: true,
        tags: {
          environment: "functions-e2e",
          empty: "",
        },
      });
    } finally {
      await purge(childInstanceId);
      await purge(parentInstanceId);
    }
  }, 120_000);
});
