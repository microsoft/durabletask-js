// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Functions host E2E — orchestrator-shape routing (#321/#322).
 *
 * Drives each orchestrator shape registered by the test-app's `OrchestratorShapes.ts` through the
 * real `func start` host and asserts the correct output, proving `wrapOrchestrator` routes every
 * shape correctly end-to-end (not only in the in-memory-executor unit tests).
 *
 * The headline case is `ShapeSyncNative` — the ambiguous plain sync, single-argument, non-generator
 * shape from #321. Before #322 it was mis-detected as classic and silently completed with the
 * garbage output `sync-native:undefined`; here we assert it returns `sync-native:<instanceId>`.
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup (func + Azurite + a
 * built/installed test-app all present).
 */

import {
  getOrchestrationDetails,
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
  console.warn(`[functions-e2e] orchestrator-shapes.spec skipped: ${preflight.reason}`);
}

interface ShapeResult {
  instanceId: string;
  output: unknown;
  outputString: string;
}

async function startAndComplete(orchestrationName: string): Promise<ShapeResult> {
  const response = await invokeHttpTrigger(baseUrl, "StartOrchestration", `?orchestrationName=${orchestrationName}`);
  expect(response.status).toBe(202); // HttpStatusCode.Accepted

  const instanceId = parseInstanceId(response);
  const statusQueryGetUri = parseStatusQueryGetUri(response);
  await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);

  const details = await getOrchestrationDetails(statusQueryGetUri);
  return { instanceId, output: details.output, outputString: details.outputString };
}

describeMaybe("Functions host E2E — orchestrator shapes (#321/#322, AzureStorage)", () => {
  it("classic v3 sync generator (context.df.*) routes to the classic context", async () => {
    const { output } = await startAndComplete("ShapeClassicGenerator");
    expect(output).toBe("classic:echo:IN");
  }, 120_000);

  it("core-native async generator (single arg) is driven and round-trips an activity", async () => {
    const { output } = await startAndComplete("ShapeNativeGenerator");
    expect(output).toBe("native-gen:echo:IN");
  }, 120_000);

  // Headline regression (#321/#322): before the fix this ambiguous shape received the classic
  // { df, log } context (no instanceId) and silently completed with "sync-native:undefined".
  it("plain sync single-arg non-generator reaches the core context (#321/#322)", async () => {
    const { instanceId, output, outputString } = await startAndComplete("ShapeSyncNative");
    expect(instanceId).toBeTruthy();
    expect(output).toBe(`sync-native:${instanceId}`);
    expect(outputString).not.toContain("undefined");
  }, 120_000);

  it("plain async single-arg non-generator reaches the core context", async () => {
    const { instanceId, output, outputString } = await startAndComplete("ShapeAsyncNative");
    expect(instanceId).toBeTruthy();
    expect(output).toBe(`async-native:${instanceId}`);
    expect(outputString).not.toContain("undefined");
  }, 120_000);
});
