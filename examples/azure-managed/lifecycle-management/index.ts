// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This sample demonstrates orchestration lifecycle management:
//   1. Terminate — cancel a running orchestration (with output)
//   2. Suspend / Resume — pause and unpause an orchestration
//   3. Continue-as-new — restart an orchestration with new input
//   4. Restart — re-run a completed orchestration
//   5. Purge — delete orchestration history
//   6. Tags — attach metadata to orchestrations

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
  ConsoleLogger,
} from "@microsoft/durabletask-js-azuremanaged";
import {
  OrchestrationContext,
  ActivityContext,
  TOrchestrator,
  OrchestrationStatus,
  terminateOptions,
} from "@microsoft/durabletask-js";

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

const doWork = async (_ctx: ActivityContext, label: string): Promise<string> => {
  console.log(`  [doWork] Processing: ${label}`);
  return `Done: ${label}`;
};

// ---------------------------------------------------------------------------
// Orchestrators
// ---------------------------------------------------------------------------

/** Long-running orchestration (waits for an event, useful for terminate/suspend demos). */
const longRunning: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  yield ctx.callActivity(doWork, "step-1");
  // Wait for an event that may never come — keeps orchestration alive
  const signal: string = yield ctx.waitForExternalEvent<string>("proceed");
  yield ctx.callActivity(doWork, `step-2-${signal}`);
  return "Completed normally";
};

/**
 * Continue-as-new orchestration — processes a batch, then restarts with new input.
 * Stops after processing 3 batches total.
 */
const batchProcessor: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  state: { batchNum: number; processed: number },
): any {
  const batchSize = 3;
  const maxBatches = 3;

  yield ctx.callActivity(doWork, `batch-${state.batchNum}`);
  const newState = { batchNum: state.batchNum + 1, processed: state.processed + batchSize };

  if (newState.batchNum >= maxBatches) {
    return { status: "all batches done", ...newState };
  }

  // Continue-as-new: restart with updated state (no history accumulation)
  ctx.continueAsNew(newState);
};

/** Simple orchestration for restart/purge demos. */
const simpleOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
  const result: string = yield ctx.callActivity(doWork, input);
  return result;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  const logger = new ConsoleLogger();
  const connectionString =
    process.env.DURABLE_TASK_SCHEDULER_CONNECTION_STRING ||
    "Endpoint=http://localhost:8080;Authentication=None;TaskHub=default";

  const client = new DurableTaskAzureManagedClientBuilder()
    .connectionString(connectionString)
    .logger(logger)
    .build();

  const worker = new DurableTaskAzureManagedWorkerBuilder()
    .connectionString(connectionString)
    .logger(logger)
    .addOrchestrator(longRunning)
    .addOrchestrator(batchProcessor)
    .addOrchestrator(simpleOrchestrator)
    .addActivity(doWork)
    .build();

  try {
    await worker.start();
    await new Promise((r) => setTimeout(r, 2000));

    // --- 1. Terminate with output ---
    console.log("\n=== 1. Terminate (with output) ===");
    const termId = await client.scheduleNewOrchestration(longRunning);
    await client.waitForOrchestrationStart(termId);
    await client.terminateOrchestration(termId, terminateOptions({ output: "Cancelled by admin" }));
    const termState = await client.waitForOrchestrationCompletion(termId, true, 15);
    console.log(`Status: ${OrchestrationStatus[termState!.runtimeStatus]}`);
    console.log(`Output: ${termState?.serializedOutput}`);

    // --- 2. Suspend / Resume ---
    console.log("\n=== 2. Suspend / Resume ===");
    const suspId = await client.scheduleNewOrchestration(longRunning);
    await client.waitForOrchestrationStart(suspId);

    await client.suspendOrchestration(suspId);
    let suspState = await client.getOrchestrationState(suspId);
    console.log(`After suspend: ${OrchestrationStatus[suspState!.runtimeStatus]}`);

    await client.resumeOrchestration(suspId);
    suspState = await client.getOrchestrationState(suspId);
    console.log(`After resume: ${OrchestrationStatus[suspState!.runtimeStatus]}`);

    // Send event so it completes, then clean up
    await client.raiseOrchestrationEvent(suspId, "proceed", "resumed");
    const suspFinal = await client.waitForOrchestrationCompletion(suspId, true, 15);
    console.log(`Final result: ${suspFinal?.serializedOutput}`);

    // --- 3. Continue-as-new ---
    console.log("\n=== 3. Continue-as-new ===");
    const canId = await client.scheduleNewOrchestration(batchProcessor, { batchNum: 0, processed: 0 });
    const canState = await client.waitForOrchestrationCompletion(canId, true, 30);
    console.log(`Status: ${OrchestrationStatus[canState!.runtimeStatus]}`);
    console.log(`Result: ${canState?.serializedOutput}`);

    // --- 4. Restart ---
    console.log("\n=== 4. Restart Orchestration ===");
    const origId = await client.scheduleNewOrchestration(simpleOrchestrator, "original-run");
    await client.waitForOrchestrationCompletion(origId, true, 15);
    console.log(`Original completed: ${origId}`);

    const restartedId = await client.restartOrchestration(origId, true); // new instance ID
    const restartState = await client.waitForOrchestrationCompletion(restartedId, true, 15);
    console.log(`Restarted as new ID: ${restartedId}`);
    console.log(`Result: ${restartState?.serializedOutput}`);

    // --- 5. Purge ---
    console.log("\n=== 5. Purge Orchestration ===");
    const purgeId = await client.scheduleNewOrchestration(simpleOrchestrator, "to-be-purged");
    await client.waitForOrchestrationCompletion(purgeId, true, 15);

    const purgeResult = await client.purgeOrchestration(purgeId);
    console.log(`Purged instances: ${purgeResult?.deletedInstanceCount}`);

    const purgedState = await client.getOrchestrationState(purgeId);
    console.log(`State after purge: ${purgedState ?? "undefined (deleted)"}`);

    // --- 6. Tags ---
    console.log("\n=== 6. Orchestration Tags ===");
    const tags = { environment: "staging", owner: "demo-user", priority: "high" };
    const tagId = await client.scheduleNewOrchestration(simpleOrchestrator, "tagged-run", { tags });
    const tagState = await client.waitForOrchestrationCompletion(tagId, true, 15);
    console.log(`Tags: ${JSON.stringify(tagState?.tags)}`);
    console.log(`Result: ${tagState?.serializedOutput}`);

    console.log("\n=== All lifecycle demos completed successfully! ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await worker.stop();
    await client.stop();
    process.exit(0);
  }
})();
