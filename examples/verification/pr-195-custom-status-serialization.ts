// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Verification sample for PR #195: Fix eager serialization of custom status
//
// Customer scenario: A data processing pipeline orchestrator tracks progress by
// calling setCustomStatus() at each stage. If the status object accidentally
// contains a non-serializable value (e.g., a circular reference introduced by a
// library or a BigInt from a database driver), the orchestrator should fail
// gracefully with a clear error — not silently lose the entire orchestration result.
//
// Before fix: Calling setCustomStatus() with a non-serializable value would defer
// the JSON.stringify() call to getCustomStatus(), which runs OUTSIDE the executor's
// try-catch block. The resulting TypeError crashes the executor and the sidecar
// never receives the completion actions, leaving the orchestration stuck forever.
//
// After fix: setCustomStatus() eagerly serializes the value. Serialization errors
// are thrown inside orchestrator code (within the executor's try-catch), so the
// orchestration properly fails with a descriptive "not JSON-serializable" error.

import {
  OrchestrationContext,
  ActivityContext,
  TOrchestrator,
  ProtoOrchestrationStatus as OrchestrationStatus,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

// --- Activity: simulates fetching enrichment data from an external service ---
const fetchEnrichmentData = async (_: ActivityContext, batchId: string): Promise<string> => {
  console.log(`[activity] Fetching enrichment data for batch ${batchId}...`);
  return JSON.stringify({ batchId, enriched: true, records: 42 });
};

// --- Orchestrator: a data pipeline that sets custom status at each stage ---
// This orchestrator intentionally sets a non-serializable custom status (circular
// reference) to reproduce the bug scenario where the executor would previously crash.
const dataPipelineOrchestrator: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  rawInput: any,
): any {
  const input = rawInput as { batchId: string; triggerBug: boolean };

  // Stage 1: Mark pipeline as "fetching data"
  ctx.setCustomStatus({ stage: "fetching", batchId: input.batchId });

  const enrichmentResult: string = yield ctx.callActivity(fetchEnrichmentData, input.batchId);

  // Stage 2: Mark pipeline as "processing"
  ctx.setCustomStatus({ stage: "processing", batchId: input.batchId });

  if (input.triggerBug) {
    // Simulate the bug: a library inadvertently creates a circular reference
    // in the status object (e.g., an ORM entity with back-references)
    const statusWithCircular: Record<string, unknown> = {
      stage: "enriching",
      batchId: input.batchId,
      data: JSON.parse(enrichmentResult),
    };
    statusWithCircular.self = statusWithCircular; // circular reference!

    // Before the fix, this would silently pass here but crash later in
    // getCustomStatus(). After the fix, this throws immediately with a
    // clear "not JSON-serializable" error caught by the executor.
    ctx.setCustomStatus(statusWithCircular);
  }

  // Stage 3: Mark pipeline as "completed"
  ctx.setCustomStatus({ stage: "completed", batchId: input.batchId });

  return { success: true, enrichment: JSON.parse(enrichmentResult) };
};

async function main() {
  const client = new DurableTaskAzureManagedClientBuilder()
    .endpoint(endpoint, taskHub, null)
    .build();

  const worker = new DurableTaskAzureManagedWorkerBuilder()
    .endpoint(endpoint, taskHub, null)
    .build();

  worker.addOrchestrator(dataPipelineOrchestrator);
  worker.addActivity(fetchEnrichmentData);

  await worker.start();
  console.log("[worker] Started successfully.");

  const results: Array<{
    scenario: string;
    instanceId: string;
    status: string | undefined;
    output: string | undefined;
    failureMessage: string | undefined;
    expected: string;
    passed: boolean;
  }> = [];

  // --- Scenario 1: Normal pipeline (no bug trigger) should complete successfully ---
  console.log("\n--- Scenario 1: Normal pipeline with serializable custom status ---");
  const normalId = await client.scheduleNewOrchestration(
    dataPipelineOrchestrator,
    { batchId: "batch-001", triggerBug: false },
  );
  console.log(`[client] Scheduled orchestration: ${normalId}`);

  const normalState = await client.waitForOrchestrationCompletion(normalId, undefined, 30);
  console.log(`[client] Status: ${normalState?.runtimeStatus}`);
  console.log(`[client] Output: ${normalState?.serializedOutput}`);

  const normalPassed =
    normalState?.runtimeStatus === OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED;
  results.push({
    scenario: "Normal pipeline with serializable custom status",
    instanceId: normalId,
    status: normalState?.runtimeStatus?.toString(),
    output: normalState?.serializedOutput,
    failureMessage: normalState?.failureDetails?.message,
    expected: "ORCHESTRATION_STATUS_COMPLETED",
    passed: normalPassed,
  });

  // --- Scenario 2: Pipeline with circular reference in custom status ---
  // Before the fix, this would leave the orchestration stuck.
  // After the fix, it should fail gracefully with a clear error message.
  console.log("\n--- Scenario 2: Pipeline with non-serializable custom status (circular ref) ---");
  const buggyId = await client.scheduleNewOrchestration(
    dataPipelineOrchestrator,
    { batchId: "batch-002", triggerBug: true },
  );
  console.log(`[client] Scheduled orchestration: ${buggyId}`);

  const buggyState = await client.waitForOrchestrationCompletion(buggyId, undefined, 30);
  console.log(`[client] Status: ${buggyState?.runtimeStatus}`);
  console.log(`[client] Failure: ${buggyState?.failureDetails?.message}`);

  const buggyPassed =
    buggyState?.runtimeStatus === OrchestrationStatus.ORCHESTRATION_STATUS_FAILED &&
    (buggyState?.failureDetails?.message?.includes("not JSON-serializable") ?? false);
  results.push({
    scenario: "Pipeline with non-serializable custom status (circular ref)",
    instanceId: buggyId,
    status: buggyState?.runtimeStatus?.toString(),
    output: buggyState?.serializedOutput,
    failureMessage: buggyState?.failureDetails?.message,
    expected: "ORCHESTRATION_STATUS_FAILED with 'not JSON-serializable' error",
    passed: buggyPassed,
  });

  // --- Print structured verification results ---
  const allPassed = results.every((r) => r.passed);

  console.log("\n=== VERIFICATION RESULT ===");
  console.log(
    JSON.stringify(
      {
        pr: 195,
        title: "fix: Serialize custom status eagerly to prevent executor crash",
        scenarios: results,
        allPassed,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  await worker.stop();
  await client.stop();

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Verification failed with error:", err);
  process.exit(1);
});
