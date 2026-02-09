// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This sample demonstrates the in-memory testing framework for unit-testing
// orchestrations WITHOUT any external dependencies (no Docker, no emulator, no network).
//
// Features demonstrated:
//   1. InMemoryOrchestrationBackend — full in-memory orchestration engine
//   2. TestOrchestrationClient — same API as TaskHubGrpcClient
//   3. TestOrchestrationWorker — same API as TaskHubGrpcWorker
//   4. ReplaySafeLogger — suppress duplicate logs during orchestration replay
//   5. Testing all patterns: sequence, fan-out/fan-in, timers, events, continue-as-new

import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  OrchestrationContext,
  ActivityContext,
  TOrchestrator,
  OrchestrationStatus,
  whenAll,
  ConsoleLogger,
  NoOpLogger,
} from "@microsoft/durabletask-js";

// ---------------------------------------------------------------------------
// Application code (same code you'd use with the real TaskHubGrpcWorker)
// ---------------------------------------------------------------------------

const addNumbers = async (_ctx: ActivityContext, nums: number[]): Promise<number> => {
  return nums.reduce((a, b) => a + b, 0);
};

const greet = async (_ctx: ActivityContext, name: string): Promise<string> => {
  return `Hello, ${name}!`;
};

/** Sequence: calls greet for each city. */
const sequenceOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  // Demonstrate ReplaySafeLogger — only logs when NOT replaying
  const safeLogger = ctx.createReplaySafeLogger(new ConsoleLogger());
  safeLogger.info("Orchestration started (only printed once, not during replay)");

  const cities = ["Tokyo", "London", "Paris"];
  const results: string[] = [];

  for (const city of cities) {
    const greeting: string = yield ctx.callActivity(greet, city);
    results.push(greeting);
  }

  safeLogger.info("Orchestration finishing");
  return results;
};

/** Fan-out/fan-in: parallel sum. */
const parallelSumOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const batches = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  const tasks = batches.map((batch) => ctx.callActivity(addNumbers, batch));
  const partialSums: number[] = yield whenAll(tasks);
  return partialSums.reduce((a, b) => a + b, 0); // total = 45
};

/** Timer: waits for a timer then returns. */
const timerOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  yield ctx.createTimer(100); // 100ms timer
  return "Timer fired";
};

/** External event: waits for an event, returns its data. */
const eventOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const data: string = yield ctx.waitForExternalEvent<string>("myEvent");
  return `Received: ${data}`;
};

/** Continue-as-new: increments a counter until it reaches 3. */
const counterOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, count: number): any {
  if (count >= 3) {
    return `Final count: ${count}`;
  }
  yield; // yield before continue-as-new
  ctx.continueAsNew(count + 1);
};

// ---------------------------------------------------------------------------
// Test runner (lightweight, no framework needed)
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

async function runTest(
  name: string,
  fn: (backend: InMemoryOrchestrationBackend, client: TestOrchestrationClient, worker: TestOrchestrationWorker) => Promise<void>,
): Promise<TestResult> {
  const backend = new InMemoryOrchestrationBackend();
  const client = new TestOrchestrationClient(backend);
  const worker = new TestOrchestrationWorker(backend);

  try {
    await fn(backend, client, worker);
    await worker.stop();
    await client.stop();
    backend.reset();
    return { name, passed: true };
  } catch (error: any) {
    await worker.stop();
    await client.stop();
    backend.reset();
    return { name, passed: false, error: error.message };
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  console.log("=== Unit Testing with In-Memory Backend ===\n");

  const results: TestResult[] = [];

  // Test 1: Activity Sequence
  results.push(
    await runTest("Activity Sequence", async (_backend, client, worker) => {
      worker.addOrchestrator(sequenceOrchestrator);
      worker.addActivity(greet);
      await worker.start();

      const id = await client.scheduleNewOrchestration(sequenceOrchestrator);
      const state = await client.waitForOrchestrationCompletion(id, true, 10);

      assert(state !== undefined, "State should be defined");
      assert(state!.runtimeStatus === OrchestrationStatus.COMPLETED, "Should be completed");
      const output = JSON.parse(state!.serializedOutput!);
      assert(output.length === 3, "Should have 3 greetings");
      assert(output[0] === "Hello, Tokyo!", "First greeting should be Tokyo");
    }),
  );

  // Test 2: Fan-out/Fan-in
  results.push(
    await runTest("Fan-out/Fan-in", async (_backend, client, worker) => {
      worker.addOrchestrator(parallelSumOrchestrator);
      worker.addActivity(addNumbers);
      await worker.start();

      const id = await client.scheduleNewOrchestration(parallelSumOrchestrator);
      const state = await client.waitForOrchestrationCompletion(id, true, 10);

      assert(state!.runtimeStatus === OrchestrationStatus.COMPLETED, "Should be completed");
      assert(state!.serializedOutput === "45", `Sum should be 45, got ${state!.serializedOutput}`);
    }),
  );

  // Test 3: Timer
  results.push(
    await runTest("Timer", async (_backend, client, worker) => {
      worker.addOrchestrator(timerOrchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(timerOrchestrator);
      const state = await client.waitForOrchestrationCompletion(id, true, 10);

      assert(state!.runtimeStatus === OrchestrationStatus.COMPLETED, "Should be completed");
      assert(state!.serializedOutput === '"Timer fired"', "Should return timer result");
    }),
  );

  // Test 4: External Event
  results.push(
    await runTest("External Event", async (_backend, client, worker) => {
      worker.addOrchestrator(eventOrchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(eventOrchestrator);
      await client.waitForOrchestrationStart(id);

      // Raise the event
      await client.raiseOrchestrationEvent(id, "myEvent", "test-data");

      const state = await client.waitForOrchestrationCompletion(id, true, 10);
      assert(state!.runtimeStatus === OrchestrationStatus.COMPLETED, "Should be completed");
      assert(state!.serializedOutput === '"Received: test-data"', `Got: ${state!.serializedOutput}`);
    }),
  );

  // Test 5: Continue-as-new
  results.push(
    await runTest("Continue-as-new", async (_backend, client, worker) => {
      worker.addOrchestrator(counterOrchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(counterOrchestrator, 0);
      const state = await client.waitForOrchestrationCompletion(id, true, 10);

      assert(state!.runtimeStatus === OrchestrationStatus.COMPLETED, "Should be completed");
      assert(state!.serializedOutput === '"Final count: 3"', `Got: ${state!.serializedOutput}`);
    }),
  );

  // Test 6: Terminate
  results.push(
    await runTest("Terminate", async (_backend, client, worker) => {
      worker.addOrchestrator(eventOrchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(eventOrchestrator);
      await client.waitForOrchestrationStart(id);

      await client.terminateOrchestration(id, "Cancelled");
      const state = await client.waitForOrchestrationCompletion(id, true, 10);

      assert(state!.runtimeStatus === OrchestrationStatus.TERMINATED, "Should be terminated");
    }),
  );

  // Test 7: Suspend / Resume
  results.push(
    await runTest("Suspend / Resume", async (_backend, client, worker) => {
      worker.addOrchestrator(eventOrchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(eventOrchestrator);
      await client.waitForOrchestrationStart(id);

      await client.suspendOrchestration(id);
      let state = await client.getOrchestrationState(id);
      assert(state!.runtimeStatus === OrchestrationStatus.SUSPENDED, "Should be suspended");

      await client.resumeOrchestration(id);
      await client.raiseOrchestrationEvent(id, "myEvent", "after-resume");
      state = await client.waitForOrchestrationCompletion(id, true, 10);
      assert(state!.runtimeStatus === OrchestrationStatus.COMPLETED, "Should complete after resume");
    }),
  );

  // Test 8: NoOpLogger (verify it doesn't throw)
  results.push(
    await runTest("NoOpLogger", async () => {
      const logger = new NoOpLogger();
      logger.info("This should do nothing");
      logger.error("This too");
      logger.warn("And this");
      logger.debug("Silent");
      // If we get here without throwing, the test passes
    }),
  );

  // --- Report ---
  console.log("\n--- Test Results ---");
  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? "PASS" : "FAIL";
    console.log(`  [${status}] ${result.name}${result.error ? ` — ${result.error}` : ""}`);
    if (!result.passed) allPassed = false;
  }

  const passCount = results.filter((r) => r.passed).length;
  console.log(`\n${passCount}/${results.length} tests passed.`);

  if (allPassed) {
    console.log("\n=== All unit-testing demos completed successfully! ===");
    process.exit(0);
  } else {
    console.error("\nSome tests failed!");
    process.exit(1);
  }
})();
