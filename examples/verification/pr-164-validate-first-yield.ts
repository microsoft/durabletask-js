// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Verification sample for PR #164: Validate first yielded value in orchestrator run()
//
// Customer scenario: A developer writes a data-enrichment orchestrator that accidentally
// yields a raw Promise (from a helper function) instead of a Task from ctx.callActivity().
// Before this fix, the orchestration would hang indefinitely with no error — the developer
// would have no indication of what went wrong. After the fix, the SDK immediately fails
// with a clear error: "The orchestrator generator yielded a non-Task object".
//
// This sample verifies two things:
// 1. A correct orchestrator (yielding Tasks) still works normally.
// 2. A buggy orchestrator (yielding a non-Task value) now fails fast with a clear error
//    instead of hanging forever.

import {
  OrchestrationContext,
  ActivityContext,
  TOrchestrator,
  OrchestrationStatus,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

// --- Activities ---

// Simulates fetching enrichment data from an external service
const fetchEnrichmentData = async (_ctx: ActivityContext, recordId: string): Promise<string> => {
  return `enriched-data-for-${recordId}`;
};

// --- Orchestrators ---

// CORRECT orchestrator: yields a Task from ctx.callActivity()
const correctEnrichmentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const result: string = yield ctx.callActivity(fetchEnrichmentData, "record-001");
  return { enriched: true, data: result };
};

// BUGGY orchestrator: accidentally yields a raw Promise instead of a Task.
// This simulates a common developer mistake — calling a helper function that returns
// a Promise directly, rather than using ctx.callActivity().
const buggyEnrichmentOrchestrator: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
  // Bug: yielding a raw Promise instead of ctx.callActivity(...)
  // Before PR #164, this would cause the orchestration to hang indefinitely.
  // After PR #164, this throws: "The orchestrator generator yielded a non-Task object"
  yield Promise.resolve("this-is-not-a-task");
};

async function main() {
  console.log(`Connecting to DTS emulator at ${endpoint}, taskHub: ${taskHub}`);

  const client = new DurableTaskAzureManagedClientBuilder()
    .endpoint(endpoint, taskHub, null)
    .build();

  const worker = new DurableTaskAzureManagedWorkerBuilder()
    .endpoint(endpoint, taskHub, null)
    .build();

  worker.addNamedOrchestrator("CorrectEnrichment", correctEnrichmentOrchestrator);
  worker.addNamedOrchestrator("BuggyEnrichment", buggyEnrichmentOrchestrator);
  worker.addNamedActivity("fetchEnrichmentData", fetchEnrichmentData);

  await worker.start();
  console.log("Worker started.");

  let allPassed = true;

  // --- Test 1: Correct orchestrator should complete successfully ---
  console.log("\n--- Test 1: Correct orchestrator (yields Task) ---");
  const correctId = await client.scheduleNewOrchestration("CorrectEnrichment");
  console.log(`Scheduled correct orchestration: ${correctId}`);

  const correctState = await client.waitForOrchestrationCompletion(correctId, undefined, 30);
  const correctPassed = correctState?.runtimeStatus === OrchestrationStatus.COMPLETED;
  console.log(`Status: ${correctState?.runtimeStatus}`);
  console.log(`Output: ${correctState?.serializedOutput}`);
  console.log(`Result: ${correctPassed ? "PASS" : "FAIL"}`);
  if (!correctPassed) allPassed = false;

  // --- Test 2: Buggy orchestrator should FAIL (not hang) with clear error ---
  console.log("\n--- Test 2: Buggy orchestrator (yields non-Task Promise) ---");
  const buggyId = await client.scheduleNewOrchestration("BuggyEnrichment");
  console.log(`Scheduled buggy orchestration: ${buggyId}`);

  const buggyState = await client.waitForOrchestrationCompletion(buggyId, undefined, 30);
  const buggyFailed = buggyState?.runtimeStatus === OrchestrationStatus.FAILED;
  const hasNonTaskError = buggyState?.failureDetails?.message?.includes("non-Task") ?? false;
  const buggyPassed = buggyFailed && hasNonTaskError;
  console.log(`Status: ${buggyState?.runtimeStatus}`);
  console.log(`Failure message: ${buggyState?.failureDetails?.message ?? "none"}`);
  console.log(`Result: ${buggyPassed ? "PASS" : "FAIL"}`);
  if (!buggyPassed) allPassed = false;

  // --- Verification summary ---
  console.log("\n=== VERIFICATION RESULT ===");
  console.log(
    JSON.stringify(
      {
        pr: 164,
        scenario: "validate-first-yield-non-task",
        checks: [
          {
            name: "Correct orchestrator completes successfully",
            expected: "COMPLETED",
            actual: OrchestrationStatus[correctState?.runtimeStatus ?? -1] ?? String(correctState?.runtimeStatus),
            passed: correctPassed,
          },
          {
            name: "Buggy orchestrator fails fast with non-Task error",
            expected: "FAILED with non-Task message",
            actual: `${OrchestrationStatus[buggyState?.runtimeStatus ?? -1] ?? buggyState?.runtimeStatus} - ${buggyState?.failureDetails?.message ?? "no error"}`,
            passed: buggyPassed,
          },
        ],
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
