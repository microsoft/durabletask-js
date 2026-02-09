// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This sample demonstrates retry and error handling in the Durable Task SDK:
//   1. RetryPolicy — declarative retry with exponential backoff
//   2. handleFailure predicate — selectively retry based on error type
//   3. AsyncRetryHandler — imperative retry logic with custom delays
//   4. Sub-orchestration retry — retry an entire sub-orchestration
//   5. raiseIfFailed() — convenient error checking on orchestration state

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
  RetryPolicy,
  OrchestrationStatus,
} from "@microsoft/durabletask-js";
import type { AsyncRetryHandler, RetryContext, TaskRetryOptions } from "@microsoft/durabletask-js";

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

// Track call counts across retries (per activity name + instance)
const callCounts = new Map<string, number>();

/** Activity that fails the first N-1 times, then succeeds on the Nth call. */
const unreliableActivity = async (_ctx: ActivityContext, input: { key: string; failCount: number }): Promise<string> => {
  const count = (callCounts.get(input.key) ?? 0) + 1;
  callCounts.set(input.key, count);

  if (count <= input.failCount) {
    throw new Error(`TransientError: attempt ${count}/${input.failCount + 1} for "${input.key}"`);
  }

  return `Success on attempt ${count} for "${input.key}"`;
};

/** Activity that always fails with a specific error type. */
const permanentFailure = async (_ctx: ActivityContext, errorType: string): Promise<never> => {
  throw new Error(`${errorType}: This operation cannot succeed`);
};

/** Simple activity for sub-orchestration retry demo. */
const addNumbers = async (_ctx: ActivityContext, nums: number[]): Promise<number> => {
  return nums.reduce((a, b) => a + b, 0);
};

// ---------------------------------------------------------------------------
// Orchestrators
// ---------------------------------------------------------------------------

/**
 * 1. Declarative RetryPolicy with exponential backoff.
 * The activity fails twice then succeeds on the 3rd attempt.
 */
const retryPolicyOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const retryPolicy = new RetryPolicy({
    maxNumberOfAttempts: 5,
    firstRetryIntervalInMilliseconds: 500,
    backoffCoefficient: 2.0,
    maxRetryIntervalInMilliseconds: 5000,
  });

  const result: string = yield ctx.callActivity(
    unreliableActivity,
    { key: `retry-policy-${ctx.instanceId}`, failCount: 2 },
    { retry: retryPolicy },
  );

  return result;
};

/**
 * 2. RetryPolicy with handleFailure predicate.
 * Only retries TransientError; stops immediately on PermanentError.
 */
const handleFailureOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const retryPolicy = new RetryPolicy({
    maxNumberOfAttempts: 5,
    firstRetryIntervalInMilliseconds: 200,
    handleFailure: (failure) => {
      // Only retry if the error message contains "TransientError"
      return failure.message?.includes("TransientError") ?? false;
    },
  });

  // This should succeed — fails twice with TransientError then succeeds
  const result: string = yield ctx.callActivity(
    unreliableActivity,
    { key: `handle-failure-${ctx.instanceId}`, failCount: 2 },
    { retry: retryPolicy },
  );

  return result;
};

/**
 * 3. AsyncRetryHandler — custom imperative retry logic.
 * Implements a custom delay strategy: 100ms, 200ms, 400ms, then gives up.
 */
const customRetryHandlerOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const maxAttempts = 4;

  const customRetryHandler: AsyncRetryHandler = async (retryCtx: RetryContext) => {
    if (retryCtx.lastAttemptNumber >= maxAttempts) {
      return false; // give up
    }
    // Exponential delay: 100ms, 200ms, 400ms
    return 100 * Math.pow(2, retryCtx.lastAttemptNumber - 1);
  };

  const result: string = yield ctx.callActivity(
    unreliableActivity,
    { key: `custom-handler-${ctx.instanceId}`, failCount: 2 },
    { retry: customRetryHandler as TaskRetryOptions },
  );

  return result;
};

/**
 * 4. Sub-orchestration with retry — retries the entire child orchestration.
 */
const childOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number[]): any {
  const sum: number = yield ctx.callActivity(addNumbers, input);
  return sum;
};

const parentWithRetryOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  const retryPolicy = new RetryPolicy({
    maxNumberOfAttempts: 3,
    firstRetryIntervalInMilliseconds: 200,
  });

  const result: number = yield ctx.callSubOrchestrator(
    childOrchestrator,
    [1, 2, 3, 4, 5],
    { retry: retryPolicy },
  );

  return { sum: result };
};

/**
 * 5. Error handling — demonstrates raiseIfFailed() and failed state inspection.
 */
const alwaysFailOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  yield ctx.callActivity(permanentFailure, "FatalError");
  return "unreachable";
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
    .addOrchestrator(retryPolicyOrchestrator)
    .addOrchestrator(handleFailureOrchestrator)
    .addOrchestrator(customRetryHandlerOrchestrator)
    .addOrchestrator(childOrchestrator)
    .addOrchestrator(parentWithRetryOrchestrator)
    .addOrchestrator(alwaysFailOrchestrator)
    .addActivity(unreliableActivity)
    .addActivity(permanentFailure)
    .addActivity(addNumbers)
    .build();

  try {
    await worker.start();
    await new Promise((r) => setTimeout(r, 2000));

    // --- 1. RetryPolicy with exponential backoff ---
    console.log("\n=== 1. RetryPolicy (exponential backoff) ===");
    const id1 = await client.scheduleNewOrchestration(retryPolicyOrchestrator);
    const state1 = await client.waitForOrchestrationCompletion(id1, true, 60);
    console.log(`Status: ${OrchestrationStatus[state1!.runtimeStatus]}`);
    console.log(`Result: ${state1?.serializedOutput}`);

    // --- 2. handleFailure predicate ---
    console.log("\n=== 2. handleFailure Predicate ===");
    const id2 = await client.scheduleNewOrchestration(handleFailureOrchestrator);
    const state2 = await client.waitForOrchestrationCompletion(id2, true, 60);
    console.log(`Status: ${OrchestrationStatus[state2!.runtimeStatus]}`);
    console.log(`Result: ${state2?.serializedOutput}`);

    // --- 3. Custom AsyncRetryHandler ---
    console.log("\n=== 3. Custom AsyncRetryHandler ===");
    const id3 = await client.scheduleNewOrchestration(customRetryHandlerOrchestrator);
    const state3 = await client.waitForOrchestrationCompletion(id3, true, 60);
    console.log(`Status: ${OrchestrationStatus[state3!.runtimeStatus]}`);
    console.log(`Result: ${state3?.serializedOutput}`);

    // --- 4. Sub-orchestration with retry ---
    console.log("\n=== 4. Sub-orchestration Retry ===");
    const id4 = await client.scheduleNewOrchestration(parentWithRetryOrchestrator);
    const state4 = await client.waitForOrchestrationCompletion(id4, true, 60);
    console.log(`Status: ${OrchestrationStatus[state4!.runtimeStatus]}`);
    console.log(`Result: ${state4?.serializedOutput}`);

    // --- 5. Error handling with raiseIfFailed() ---
    console.log("\n=== 5. Error Handling (raiseIfFailed) ===");
    const id5 = await client.scheduleNewOrchestration(alwaysFailOrchestrator);
    const state5 = await client.waitForOrchestrationCompletion(id5, true, 60);
    console.log(`Status: ${OrchestrationStatus[state5!.runtimeStatus]}`);
    try {
      state5?.raiseIfFailed();
      console.log("ERROR: raiseIfFailed() should have thrown!");
    } catch (e: any) {
      console.log(`raiseIfFailed() threw: ${e.constructor.name} — ${e.message.substring(0, 80)}`);
    }
    if (state5?.failureDetails) {
      console.log(`Failure type: ${state5.failureDetails.errorType}`);
      console.log(`Failure message: ${state5.failureDetails.errorMessage?.substring(0, 80)}`);
    }

    console.log("\n=== All retry/error demos completed successfully! ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await worker.stop();
    await client.stop();
    process.exit(0);
  }
})();
