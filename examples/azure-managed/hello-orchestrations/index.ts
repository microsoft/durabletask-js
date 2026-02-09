// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This sample demonstrates core orchestration patterns with the Azure Managed
// Durable Task Scheduler (DTS):
//   1. Activity sequence — call activities one after another
//   2. Fan-out/fan-in — run activities in parallel, aggregate results
//   3. Sub-orchestrations — compose orchestrators hierarchically
//   4. whenAny — race multiple tasks, use winner's result
//   5. Deterministic GUID — generate replay-safe unique IDs

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
  ConsoleLogger,
} from "@microsoft/durabletask-js-azuremanaged";
import {
  ActivityContext,
  OrchestrationContext,
  TOrchestrator,
  whenAll,
  whenAny,
} from "@microsoft/durabletask-js";

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

/** Add one to the input. */
const plusOne = async (_ctx: ActivityContext, input: number): Promise<number> => {
  return input + 1;
};

/** Simulate work with variable latency. Returns item length. */
const processItem = async (_ctx: ActivityContext, item: string): Promise<number> => {
  console.log(`  [processItem] Processing "${item}"`);
  return item.length;
};

/** Return a greeting string for the given name. */
const greet = async (_ctx: ActivityContext, name: string): Promise<string> => {
  return `Hello, ${name}!`;
};

/** Child orchestration: adds two to the input via two plusOne activity calls. */
const doubleOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, value: number): any {
  const doubled: number = yield ctx.callActivity(plusOne, value);
  // Call plusOne again so we get value + 2
  const result: number = yield ctx.callActivity(plusOne, doubled);
  return result;
};

// ---------------------------------------------------------------------------
// Orchestrators
// ---------------------------------------------------------------------------

/** 1. Activity Sequence — calls plusOne 5 times in a loop. */
const activitySequence: TOrchestrator = async function* (ctx: OrchestrationContext, startVal: number): any {
  let current = startVal;
  const numbers = [current];

  for (let i = 0; i < 5; i++) {
    current = yield ctx.callActivity(plusOne, current);
    numbers.push(current);
  }

  return numbers; // [1, 2, 3, 4, 5, 6]
};

/** 2. Fan-out/fan-in — processes items in parallel, sums results. */
const fanOutFanIn: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const items = ["alpha", "bravo", "charlie", "delta"];

  // Fan-out: schedule all activities in parallel
  const tasks = items.map((item) => ctx.callActivity(processItem, item));

  // Fan-in: wait for all to complete
  const lengths: number[] = yield whenAll(tasks);

  return { items: items.length, totalChars: lengths.reduce((a, b) => a + b, 0) };
};

/** 3. Sub-orchestrations — calls doubleOrchestrator as a child. */
const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const result1: number = yield ctx.callSubOrchestrator(doubleOrchestrator, 10);
  const result2: number = yield ctx.callSubOrchestrator(doubleOrchestrator, 20);
  return { result1, result2 };
};

/** 4. whenAny — race two activities, return the first result. */
const raceOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const taskA = ctx.callActivity(processItem, "short");
  const taskB = ctx.callActivity(processItem, "a-longer-item");

  const winner = yield whenAny([taskA, taskB]);

  // winner is the task that completed first
  return { winnerResult: winner.getResult() };
};

/** 5. Deterministic GUID — generates replay-safe unique IDs. */
const guidOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  // Call an activity so the generator has at least one yield point
  const label: string = yield ctx.callActivity(greet, "GUID demo");
  const guid1 = ctx.newGuid();
  const guid2 = ctx.newGuid();

  // These GUIDs are deterministic: same values across replays
  return { label, guid1, guid2, areDifferent: guid1 !== guid2 };
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
    .addOrchestrator(activitySequence)
    .addOrchestrator(fanOutFanIn)
    .addOrchestrator(parentOrchestrator)
    .addOrchestrator(doubleOrchestrator)
    .addOrchestrator(raceOrchestrator)
    .addOrchestrator(guidOrchestrator)
    .addActivity(plusOne)
    .addActivity(processItem)
    .addActivity(greet)
    .build();

  try {
    await worker.start();
    await new Promise((r) => setTimeout(r, 2000));

    // --- 1. Activity Sequence ---
    console.log("\n=== 1. Activity Sequence ===");
    const seqId = await client.scheduleNewOrchestration(activitySequence, 1);
    const seqState = await client.waitForOrchestrationCompletion(seqId, true, 30);
    console.log(`Result: ${seqState?.serializedOutput}`);
    // Expected: [1,2,3,4,5,6]

    // --- 2. Fan-out/Fan-in ---
    console.log("\n=== 2. Fan-out/Fan-in ===");
    const fanId = await client.scheduleNewOrchestration(fanOutFanIn);
    const fanState = await client.waitForOrchestrationCompletion(fanId, true, 30);
    console.log(`Result: ${fanState?.serializedOutput}`);
    // Expected: {"items":4,"totalChars":24}

    // --- 3. Sub-orchestrations ---
    console.log("\n=== 3. Sub-orchestrations ===");
    const subId = await client.scheduleNewOrchestration(parentOrchestrator);
    const subState = await client.waitForOrchestrationCompletion(subId, true, 30);
    console.log(`Result: ${subState?.serializedOutput}`);
    // Expected: {"result1":12,"result2":22}

    // --- 4. whenAny (Race) ---
    console.log("\n=== 4. whenAny (Race) ===");
    const raceId = await client.scheduleNewOrchestration(raceOrchestrator);
    const raceState = await client.waitForOrchestrationCompletion(raceId, true, 30);
    console.log(`Result: ${raceState?.serializedOutput}`);
    // Expected: {"winnerResult":<length of whichever completed first>}

    // --- 5. Deterministic GUID ---
    console.log("\n=== 5. Deterministic GUID ===");
    const guidId = await client.scheduleNewOrchestration(guidOrchestrator);
    const guidState = await client.waitForOrchestrationCompletion(guidId, true, 30);
    console.log(`Result: ${guidState?.serializedOutput}`);
    // Expected: {"guid1":"<uuid>","guid2":"<uuid>","areDifferent":true}

    console.log("\n=== All orchestrations completed successfully! ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await worker.stop();
    await client.stop();
    process.exit(0);
  }
})();
