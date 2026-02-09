// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This sample demonstrates orchestration versioning:
//   1. Schedule orchestrations with a version
//   2. VersionMatchStrategy.Strict — only exact version match processes
//   3. VersionMatchStrategy.CurrentOrOlder — worker processes same or older versions
//   4. ctx.version and ctx.compareVersionTo() — version-aware orchestration logic
//   5. defaultVersion on client — auto-tag all orchestrations

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
  ConsoleLogger,
  VersionMatchStrategy,
  VersionFailureStrategy,
} from "@microsoft/durabletask-js-azuremanaged";
import {
  OrchestrationContext,
  ActivityContext,
  TOrchestrator,
  OrchestrationStatus,
} from "@microsoft/durabletask-js";

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

const doWork = async (_ctx: ActivityContext, label: string): Promise<string> => {
  return `Processed: ${label}`;
};

// ---------------------------------------------------------------------------
// Orchestrators
// ---------------------------------------------------------------------------

/** Version-aware orchestrator — behavior changes based on version. */
const versionedOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const version = ctx.version;
  const comparison = ctx.compareVersionTo("2.0.0");

  let result: string;
  if (comparison >= 0) {
    // v2.0.0 or newer — uses new logic
    result = yield ctx.callActivity(doWork, `v2-logic (version=${version})`);
  } else {
    // Older than v2.0.0 — uses legacy logic
    result = yield ctx.callActivity(doWork, `v1-logic (version=${version})`);
  }

  return { version, result, comparedTo2: comparison };
};

/** Simple orchestrator used with different workers. */
const simpleOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const result: string = yield ctx.callActivity(doWork, `version=${ctx.version}`);
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

  // --- 1. Schedule with version ---
  console.log("\n=== 1. Schedule Orchestration with Version ===");

  // Client with a default version
  const clientV1 = new DurableTaskAzureManagedClientBuilder()
    .connectionString(connectionString)
    .logger(logger)
    .build();

  // Worker with no versioning (MatchStrategy.None = processes everything)
  const worker = new DurableTaskAzureManagedWorkerBuilder()
    .connectionString(connectionString)
    .logger(logger)
    .addOrchestrator(versionedOrchestrator)
    .addOrchestrator(simpleOrchestrator)
    .addActivity(doWork)
    .build();

  try {
    await worker.start();
    await new Promise((r) => setTimeout(r, 2000));

    // Schedule with explicit version
    const id1 = await clientV1.scheduleNewOrchestration(versionedOrchestrator, undefined, { version: "1.0.0" });
    const state1 = await clientV1.waitForOrchestrationCompletion(id1, true, 30);
    console.log(`v1.0.0 result: ${state1?.serializedOutput}`);

    const id2 = await clientV1.scheduleNewOrchestration(versionedOrchestrator, undefined, { version: "2.5.0" });
    const state2 = await clientV1.waitForOrchestrationCompletion(id2, true, 30);
    console.log(`v2.5.0 result: ${state2?.serializedOutput}`);

    await worker.stop();
  } catch (error) {
    console.error("Error in demo 1:", error);
    await worker.stop();
  }

  // --- 2. Strict version matching ---
  console.log("\n=== 2. VersionMatchStrategy.Strict ===");

  const workerStrict = new DurableTaskAzureManagedWorkerBuilder()
    .connectionString(connectionString)
    .logger(logger)
    .versioning({
      version: "2.0.0",
      matchStrategy: VersionMatchStrategy.Strict,
      failureStrategy: VersionFailureStrategy.Fail,
    })
    .addOrchestrator(simpleOrchestrator)
    .addActivity(doWork)
    .build();

  try {
    await workerStrict.start();
    await new Promise((r) => setTimeout(r, 2000));

    // This one should match (version 2.0.0 == worker version 2.0.0)
    const matchId = await clientV1.scheduleNewOrchestration(simpleOrchestrator, undefined, { version: "2.0.0" });
    const matchState = await clientV1.waitForOrchestrationCompletion(matchId, true, 30);
    console.log(`Exact match (v2.0.0): ${OrchestrationStatus[matchState!.runtimeStatus]} — ${matchState?.serializedOutput}`);

    // This one should fail (version 1.0.0 != worker version 2.0.0)
    const mismatchId = await clientV1.scheduleNewOrchestration(simpleOrchestrator, undefined, { version: "1.0.0" });
    const mismatchState = await clientV1.waitForOrchestrationCompletion(mismatchId, true, 15);
    console.log(`Mismatch (v1.0.0): ${OrchestrationStatus[mismatchState!.runtimeStatus]}`);
    if (mismatchState?.failureDetails) {
      console.log(`  Failure: ${mismatchState.failureDetails.errorMessage?.substring(0, 80)}`);
    }

    await workerStrict.stop();
  } catch (error) {
    console.error("Error in demo 2:", error);
    await workerStrict.stop();
  }

  // --- 3. CurrentOrOlder matching ---
  console.log("\n=== 3. VersionMatchStrategy.CurrentOrOlder ===");

  const workerCurrentOrOlder = new DurableTaskAzureManagedWorkerBuilder()
    .connectionString(connectionString)
    .logger(logger)
    .versioning({
      version: "3.0.0",
      matchStrategy: VersionMatchStrategy.CurrentOrOlder,
      failureStrategy: VersionFailureStrategy.Fail,
    })
    .addOrchestrator(simpleOrchestrator)
    .addActivity(doWork)
    .build();

  try {
    await workerCurrentOrOlder.start();
    await new Promise((r) => setTimeout(r, 2000));

    // Older version — should be processed
    const olderId = await clientV1.scheduleNewOrchestration(simpleOrchestrator, undefined, { version: "2.0.0" });
    const olderState = await clientV1.waitForOrchestrationCompletion(olderId, true, 30);
    console.log(`Older (v2.0.0): ${OrchestrationStatus[olderState!.runtimeStatus]} — ${olderState?.serializedOutput}`);

    // Same version — should be processed
    const sameId = await clientV1.scheduleNewOrchestration(simpleOrchestrator, undefined, { version: "3.0.0" });
    const sameState = await clientV1.waitForOrchestrationCompletion(sameId, true, 30);
    console.log(`Same (v3.0.0): ${OrchestrationStatus[sameState!.runtimeStatus]} — ${sameState?.serializedOutput}`);

    // Newer version — should fail (worker is 3.0.0, orchestration is 4.0.0)
    const newerId = await clientV1.scheduleNewOrchestration(simpleOrchestrator, undefined, { version: "4.0.0" });
    const newerState = await clientV1.waitForOrchestrationCompletion(newerId, true, 15);
    console.log(`Newer (v4.0.0): ${OrchestrationStatus[newerState!.runtimeStatus]}`);
    if (newerState?.failureDetails) {
      console.log(`  Failure: ${newerState.failureDetails.errorMessage?.substring(0, 80)}`);
    }

    await workerCurrentOrOlder.stop();
  } catch (error) {
    console.error("Error in demo 3:", error);
    await workerCurrentOrOlder.stop();
  }

  console.log("\n=== All versioning demos completed successfully! ===");

  await clientV1.stop();
  process.exit(0);
})();
