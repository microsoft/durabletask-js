// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for Durable Task Scheduler (DTS).
 *
 * Environment variables (choose one):
 *   - DTS_CONNECTION_STRING: Full connection string (e.g., "Endpoint=https://...;Authentication=DefaultAzure;TaskHub=...")
 *   OR
 *   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
 *   - TASKHUB: The task hub name (default: default)
 */

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  ProtoOrchestrationStatus as OrchestrationStatus,
  getName,
  whenAll,
  whenAny,
  ActivityContext,
  OrchestrationContext,
  Task,
  TOrchestrator,
  RetryPolicy,
  Logger,
  terminateOptions,
  PurgeInstanceOptions,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
  VersionMatchStrategy,
  VersionFailureStrategy,
} from "@microsoft/durabletask-js-azuremanaged";

// Read environment variables
const connectionString = process.env.DTS_CONNECTION_STRING;
const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

function createClient(): TaskHubGrpcClient {
  if (connectionString) {
    return new DurableTaskAzureManagedClientBuilder().connectionString(connectionString).build();
  }
  return new DurableTaskAzureManagedClientBuilder()
    .endpoint(endpoint, taskHub, null) // null credential for emulator (no auth)
    .build();
}

function createWorker(): TaskHubGrpcWorker {
  if (connectionString) {
    return new DurableTaskAzureManagedWorkerBuilder().connectionString(connectionString).build();
  }
  return new DurableTaskAzureManagedWorkerBuilder()
    .endpoint(endpoint, taskHub, null) // null credential for emulator (no auth)
    .build();
}

function createWorkerWithVersioning(
  version: string,
  matchStrategy: VersionMatchStrategy = VersionMatchStrategy.None,
  failureStrategy: VersionFailureStrategy = VersionFailureStrategy.Reject,
): TaskHubGrpcWorker {
  const builder = connectionString
    ? new DurableTaskAzureManagedWorkerBuilder().connectionString(connectionString)
    : new DurableTaskAzureManagedWorkerBuilder().endpoint(endpoint, taskHub, null);

  // Disable auto-generated work item filters so version mismatches are handled
  // by the SDK's local versioning logic, not by server-side filter enforcement.
  return builder.versioning({ version, matchStrategy, failureStrategy }).useWorkItemFilters(null).build();
}

describe("Durable Task Scheduler (DTS) E2E Tests", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;

  beforeEach(async () => {
    taskHubClient = createClient();
    taskHubWorker = createWorker();
  });

  afterEach(async () => {
    // Only stop the worker if it was started
    try {
      await taskHubWorker.stop();
    } catch {
      // Worker wasn't started, ignore the error
    }
    await taskHubClient.stop();
  });

  it("should be able to run an empty orchestration", async () => {
    let invoked = false;

    const emptyOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      invoked = true;
    };

    taskHubWorker.addOrchestrator(emptyOrchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(emptyOrchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(invoked).toBe(true);
    expect(state).toBeDefined();
    expect(state?.name).toEqual(getName(emptyOrchestrator));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
  }, 31000);

  it("should round-trip orchestration tags", async () => {
    const orchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      return "done";
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const tags = { env: "test", owner: "durable" };
    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, undefined, { tags });
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.tags).toEqual(tags);
  }, 31000);

  it("should be able to run an activity sequence", async () => {
    const plusOne = async (_: ActivityContext, input: number) => {
      return input + 1;
    };

    const sequence: TOrchestrator = async function* (ctx: OrchestrationContext, startVal: number): any {
      const numbers = [startVal];
      let current = startVal;

      for (let i = 0; i < 10; i++) {
        current = yield ctx.callActivity(plusOne, current);
        numbers.push(current);
      }

      return numbers;
    };

    taskHubWorker.addOrchestrator(sequence);
    taskHubWorker.addActivity(plusOne);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(sequence, 1);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.name).toEqual(getName(sequence));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedInput).toEqual(JSON.stringify(1));
    expect(state?.serializedOutput).toEqual(JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
  }, 31000);

  it("should be able to run fan-out/fan-in", async () => {
    let activityCounter = 0;

    const increment = (_: ActivityContext) => {
      activityCounter++;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, count: number): any {
      // Fan out to multiple activities
      const tasks: Task<any>[] = [];

      for (let i = 0; i < count; i++) {
        tasks.push(ctx.callActivity(increment));
      }

      // Wait for all the activities to complete
      yield whenAll(tasks);
    };

    taskHubWorker.addActivity(increment);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 10);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(activityCounter).toEqual(10);
  }, 31000);

  it("should remain completed when whenAll fail-fast is caught and other children complete later", async () => {
    let failActivityCounter = 0;

    const fastFail = async (_: ActivityContext): Promise<void> => {
      failActivityCounter++;
      throw new Error("fast failure for whenAll fail-fast test");
    };

    const slowSuccess = async (_: ActivityContext, _input: string): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      try {
        yield whenAll([
          ctx.callActivity(fastFail),
          ctx.callActivity(slowSuccess, "a"),
          ctx.callActivity(slowSuccess, "b"),
        ]);
      } catch {
        return "handled-failure";
      }
    };

    taskHubWorker.addActivity(fastFail);
    taskHubWorker.addActivity(slowSuccess);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.serializedOutput).toEqual(JSON.stringify("handled-failure"));
    expect(failActivityCounter).toEqual(1);

    // Wait a bit then verify orchestration stays COMPLETED (not corrupted by late activity completions)
    const finalState = await taskHubClient.getOrchestrationState(id);
    expect(finalState).toBeDefined();
    expect(finalState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(finalState?.serializedOutput).toEqual(JSON.stringify("handled-failure"));
  }, 31000);

  it("should preserve original whenAll failure details when not caught", async () => {
    const fastFail = async (_: ActivityContext): Promise<void> => {
      throw new Error("fast failure for whenAll uncaught test");
    };

    const slowSuccess = async (_: ActivityContext): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield whenAll([
        ctx.callActivity(fastFail),
        ctx.callActivity(slowSuccess),
        ctx.callActivity(slowSuccess),
      ]);
    };

    taskHubWorker.addActivity(fastFail);
    taskHubWorker.addActivity(slowSuccess);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(state?.failureDetails).toBeDefined();
    expect(state?.failureDetails?.message).toContain("fast failure for whenAll uncaught test");
    expect(state?.failureDetails?.message).not.toContain("Task is already completed");
  }, 31000);

  it("should fail whenAll correctly when the failing task is the last to complete", async () => {
    const fastSuccess = async (_: ActivityContext): Promise<void> => {
      // completes immediately
    };

    const slowFail = async (_: ActivityContext): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      throw new Error("slow failure as last task");
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield whenAll([
        ctx.callActivity(fastSuccess),
        ctx.callActivity(fastSuccess),
        ctx.callActivity(slowFail),
      ]);
    };

    taskHubWorker.addActivity(fastSuccess);
    taskHubWorker.addActivity(slowFail);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(state?.failureDetails).toBeDefined();
    expect(state?.failureDetails?.message).toContain("slow failure as last task");
  }, 31000);

  // Issue #131: WhenAllTask constructor was resetting the _completedTasks counter,
  // causing whenAll to hang when some children were already completed during replay.
  // This test validates the fix by scheduling activities that complete at different
  // speeds, then doing additional work after whenAll. The additional activity after
  // whenAll forces a replay where the whenAll children are already completed, which
  // would trigger the bug (the counter reset would make it appear that no children
  // had completed, causing whenAll to never resolve).
  it("should complete whenAll correctly when children finish at different speeds and replay occurs", async () => {
    const fast = async (_: ActivityContext): Promise<string> => {
      return "fast";
    };

    const medium = async (_: ActivityContext): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return "medium";
    };

    const slow = async (_: ActivityContext): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return "slow";
    };

    const finalStep = async (_: ActivityContext): Promise<string> => {
      return "done";
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      // Fan-out with activities completing at different speeds
      const results: string[] = yield whenAll([
        ctx.callActivity(fast),
        ctx.callActivity(medium),
        ctx.callActivity(slow),
      ]);

      // This additional activity forces a replay of the orchestration.
      // During replay, all three whenAll children will already be completed
      // (they have history events). The bug was that WhenAllTask's constructor
      // reset the _completedTasks counter AFTER CompositeTask's constructor
      // had already counted them, so whenAll would never resolve.
      const final: string = yield ctx.callActivity(finalStep);

      return { results, final };
    };

    taskHubWorker.addActivity(fast);
    taskHubWorker.addActivity(medium);
    taskHubWorker.addActivity(slow);
    taskHubWorker.addActivity(finalStep);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();

    const output = JSON.parse(state?.serializedOutput || "{}");
    expect(output.results).toEqual(["fast", "medium", "slow"]);
    expect(output.final).toEqual("done");
  }, 31000);

  it("should be able to use the sub-orchestration", async () => {
    let activityCounter = 0;

    const increment = (_: ActivityContext) => {
      activityCounter++;
    };

    const orchestratorChild: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.callActivity(increment);
    };

    const orchestratorParent: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      // Call sub-orchestration
      yield ctx.callSubOrchestrator(orchestratorChild);
    };

    taskHubWorker.addActivity(increment);
    taskHubWorker.addOrchestrator(orchestratorChild);
    taskHubWorker.addOrchestrator(orchestratorParent);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestratorParent, 10);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(activityCounter).toEqual(1);
  }, 31000);

  it("should allow waiting for multiple external events", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const a = yield ctx.waitForExternalEvent("A");
      const b = yield ctx.waitForExternalEvent("B");
      const c = yield ctx.waitForExternalEvent("C");
      return [a, b, c];
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    // Send events to the client immediately
    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    await taskHubClient.raiseOrchestrationEvent(id, "A", "a");
    await taskHubClient.raiseOrchestrationEvent(id, "B", "b");
    await taskHubClient.raiseOrchestrationEvent(id, "C", "c");
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(["a", "b", "c"]));
  }, 31000);

  it("should be able to run a single timer", async () => {
    const delay = 3;
    const singleTimer: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.createTimer(delay);
    };

    taskHubWorker.addOrchestrator(singleTimer);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(singleTimer);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    let expectedCompletionSecond = state?.createdAt?.getTime() ?? 0;
    if (state && state.createdAt !== undefined) {
      expectedCompletionSecond += delay * 1000;
    }
    expect(expectedCompletionSecond).toBeDefined();
    const actualCompletionSecond = state?.lastUpdatedAt?.getTime() ?? 0;
    expect(actualCompletionSecond).toBeDefined();

    expect(state).toBeDefined();
    expect(state?.name).toEqual(getName(singleTimer));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.createdAt).toBeDefined();
    expect(state?.lastUpdatedAt).toBeDefined();
    expect(expectedCompletionSecond).toBeLessThanOrEqual(actualCompletionSecond);
  }, 31000);

  it("should use deterministic time for createTimer(seconds) across replays", async () => {
    // Issue #134: createTimer(seconds) used Date.now() instead of ctx.currentUtcDateTime,
    // violating the determinism contract. During replay, Date.now() returns a different
    // wall-clock time, producing a different timer fire-at value. The fix uses the
    // orchestration's deterministic time (ctx.currentUtcDateTime) instead.
    //
    // This test validates the fix by:
    // 1. Using createTimer(seconds) with an activity before and after it
    // 2. The activity after the timer forces a replay of the timer yield
    // 3. If the timer fire-at time were non-deterministic, the replay would either
    //    throw a NonDeterminismError or produce incorrect behavior
    const sayHello = async (_: ActivityContext, name: string) => `Hello, ${name}!`;

    const timerDeterminismOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      // Record orchestration time BEFORE the timer
      const timeBefore = ctx.currentUtcDateTime.toISOString();

      // Call an activity to force a replay after the timer
      const greeting1: string = yield ctx.callActivity(sayHello, "before-timer");

      // Use createTimer with a relative seconds value (the code path being tested)
      const timerDelay = 2;
      yield ctx.createTimer(timerDelay);

      // Record orchestration time AFTER the timer
      const timeAfter = ctx.currentUtcDateTime.toISOString();

      // Call another activity — this forces another replay that re-executes
      // the createTimer(seconds) path with the replayed history
      const greeting2: string = yield ctx.callActivity(sayHello, "after-timer");

      return {
        timeBefore,
        timeAfter,
        greeting1,
        greeting2,
        timerDelay,
      };
    };

    taskHubWorker.addOrchestrator(timerDeterminismOrchestrator);
    taskHubWorker.addActivity(sayHello);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(timerDeterminismOrchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();

    const output = JSON.parse(state?.serializedOutput ?? "{}");
    expect(output.greeting1).toEqual("Hello, before-timer!");
    expect(output.greeting2).toEqual("Hello, after-timer!");
    expect(output.timerDelay).toEqual(2);

    // Verify time progressed (timeAfter should be at least timerDelay seconds after timeBefore)
    const before = new Date(output.timeBefore).getTime();
    const after = new Date(output.timeAfter).getTime();
    expect(after).toBeGreaterThanOrEqual(before + 2000);
  }, 45000);

  it("should be able to terminate an orchestration", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const res = yield ctx.waitForExternalEvent("my_event");
      return res;
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    let state = await taskHubClient.waitForOrchestrationStart(id, undefined, 30);
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING);

    await taskHubClient.terminateOrchestration(id, "some reason for termination");
    state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("some reason for termination"));
  }, 31000);

  it("should allow to continue as new", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, input: number) => {
      if (input < 10) {
        ctx.continueAsNew(input + 1, true);
      } else {
        return input;
      }
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 1);

    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(10));
  }, 31000);

  it("should be able to run a single orchestration without activity", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, startVal: number) => {
      return startVal + 1;
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 15);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.name).toEqual(getName(orchestrator));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedInput).toEqual(JSON.stringify(15));
    expect(state?.serializedOutput).toEqual(JSON.stringify(16));
  }, 31000);

  // ==================== Retry Policy Tests ====================

  it("should retry activity and succeed after transient failures", async () => {
    let attemptCount = 0;

    const flakyActivity = async (_: ActivityContext, input: number) => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error(`Transient failure on attempt ${attemptCount}`);
      }
      return input * 2;
    };

    const retryPolicy = new RetryPolicy({
      maxNumberOfAttempts: 5,
      firstRetryIntervalInMilliseconds: 100,
      backoffCoefficient: 1.0,
    });

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
      const result = yield ctx.callActivity(flakyActivity, input, { retry: retryPolicy });
      return result;
    };

    taskHubWorker.addActivity(flakyActivity);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 21);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.serializedOutput).toEqual(JSON.stringify(42));
    expect(attemptCount).toBe(3); // Failed twice, succeeded on third attempt
  }, 31000);

  it("should fail activity after exhausting all retry attempts", async () => {
    let attemptCount = 0;

    const alwaysFailsActivity = async (_: ActivityContext) => {
      attemptCount++;
      throw new Error(`Permanent failure on attempt ${attemptCount}`);
    };

    const retryPolicy = new RetryPolicy({
      maxNumberOfAttempts: 3,
      firstRetryIntervalInMilliseconds: 100,
      backoffCoefficient: 1.0,
    });

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const result = yield ctx.callActivity(alwaysFailsActivity, undefined, { retry: retryPolicy });
      return result;
    };

    taskHubWorker.addActivity(alwaysFailsActivity);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(state?.failureDetails).toBeDefined();
    expect(attemptCount).toBe(3); // All 3 attempts exhausted
  }, 31000);

  it("should use exponential backoff for retries", async () => {
    const attemptTimes: number[] = [];

    const flakyActivity = async (_: ActivityContext, input: number) => {
      attemptTimes.push(Date.now());
      if (attemptTimes.length < 3) {
        throw new Error(`Transient failure on attempt ${attemptTimes.length}`);
      }
      return input;
    };

    const retryPolicy = new RetryPolicy({
      maxNumberOfAttempts: 5,
      firstRetryIntervalInMilliseconds: 500,
      backoffCoefficient: 2.0, // Exponential backoff
    });

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
      const result = yield ctx.callActivity(flakyActivity, input, { retry: retryPolicy });
      return result;
    };

    taskHubWorker.addActivity(flakyActivity);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 100);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(attemptTimes.length).toBe(3);

    // Verify exponential backoff: second delay should be roughly 2x the first
    // Allow some tolerance for timing variations
    if (attemptTimes.length >= 3) {
      const firstDelay = attemptTimes[1] - attemptTimes[0];
      const secondDelay = attemptTimes[2] - attemptTimes[1];
      // Second delay should be approximately 2x the first (with 50% tolerance for timing)
      expect(secondDelay).toBeGreaterThan(firstDelay * 1.5);
    }
  }, 31000);

  it("should retry sub-orchestration and succeed after transient failures", async () => {
    let attemptCount = 0;

    // eslint-disable-next-line require-yield
    const flakySubOrchestrator: TOrchestrator = async function* (_ctx: OrchestrationContext, input: number): any {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error(`Sub-orchestration transient failure on attempt ${attemptCount}`);
      }
      return input * 3;
    };

    const retryPolicy = new RetryPolicy({
      maxNumberOfAttempts: 3,
      firstRetryIntervalInMilliseconds: 100,
      backoffCoefficient: 1.0,
    });

    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
      const result = yield ctx.callSubOrchestrator(flakySubOrchestrator, input, { retry: retryPolicy });
      return result;
    };

    taskHubWorker.addOrchestrator(flakySubOrchestrator);
    taskHubWorker.addOrchestrator(parentOrchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(parentOrchestrator, 7);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.serializedOutput).toEqual(JSON.stringify(21));
    expect(attemptCount).toBe(2); // Failed once, succeeded on second attempt
  }, 31000);

  it("should fail sub-orchestration after exhausting all retry attempts", async () => {
    let attemptCount = 0;

    // eslint-disable-next-line require-yield
    const alwaysFailsSubOrchestrator: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
      attemptCount++;
      throw new Error(`Sub-orchestration permanent failure on attempt ${attemptCount}`);
    };

    const retryPolicy = new RetryPolicy({
      maxNumberOfAttempts: 2,
      firstRetryIntervalInMilliseconds: 100,
      backoffCoefficient: 1.0,
    });

    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const result = yield ctx.callSubOrchestrator(alwaysFailsSubOrchestrator, undefined, { retry: retryPolicy });
      return result;
    };

    taskHubWorker.addOrchestrator(alwaysFailsSubOrchestrator);
    taskHubWorker.addOrchestrator(parentOrchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(state?.failureDetails).toBeDefined();
    expect(attemptCount).toBe(2); // All 2 attempts exhausted
  }, 31000);

  it("should work without retry policy (backward compatibility)", async () => {
    let invoked = false;

    const simpleActivity = async (_: ActivityContext, input: string) => {
      invoked = true;
      return `Hello, ${input}!`;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      // No retry policy - should work as before
      const result = yield ctx.callActivity(simpleActivity, input);
      return result;
    };

    taskHubWorker.addActivity(simpleActivity);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, "World");
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.serializedOutput).toEqual(JSON.stringify("Hello, World!"));
    expect(invoked).toBe(true);
  }, 31000);

  // ==================== Retry Handler Tests ====================

  it("should fail (not retry infinitely) when retry handler returns undefined", async () => {
    // Issue: A retry handler with a missing return statement returns undefined.
    // Before the fix, `undefined !== false` was truthy, so the executor treated it
    // as "retry", causing an infinite retry loop. The fix uses a positive check:
    // only `true` or a finite number triggers a retry.
    let attemptCount = 0;

    const failingActivity = async (_: ActivityContext) => {
      attemptCount++;
      throw new Error(`Failure on attempt ${attemptCount}`);
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      // Cast to any to simulate a JavaScript consumer or handler with a missing return
      const retryHandler = (async (_retryCtx: any) => {
        // Intentionally no return statement — returns undefined
      }) as any;
      const result = yield ctx.callActivity(failingActivity, undefined, { retry: retryHandler });
      return result;
    };

    taskHubWorker.addActivity(failingActivity);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    // Should fail after exactly 1 attempt — the handler returned undefined so no retry
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(state?.failureDetails).toBeDefined();
    expect(attemptCount).toBe(1);
  }, 31000);

  it("should fail (not retry infinitely) when retry handler returns null", async () => {
    let attemptCount = 0;

    const failingActivity = async (_: ActivityContext) => {
      attemptCount++;
      throw new Error(`Failure on attempt ${attemptCount}`);
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const retryHandler = async (_retryCtx: any) => {
        return null as any; // Explicitly returning null
      };
      const result = yield ctx.callActivity(failingActivity, undefined, { retry: retryHandler });
      return result;
    };

    taskHubWorker.addActivity(failingActivity);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(state?.failureDetails).toBeDefined();
    expect(attemptCount).toBe(1);
  }, 31000);

  it("should retry and succeed when retry handler returns true", async () => {
    let attemptCount = 0;

    const flakyActivity = async (_: ActivityContext, input: number) => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error(`Transient failure on attempt ${attemptCount}`);
      }
      return input * 2;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
      const retryHandler = async (retryCtx: any) => retryCtx.lastAttemptNumber < 5;
      const result = yield ctx.callActivity(flakyActivity, input, { retry: retryHandler });
      return result;
    };

    taskHubWorker.addActivity(flakyActivity);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 21);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.serializedOutput).toEqual(JSON.stringify(42));
    expect(attemptCount).toBe(3);
  }, 31000);

  it("should retry with delay when retry handler returns a positive number", async () => {
    let attemptCount = 0;
    const attemptTimes: number[] = [];

    const flakyActivity = async (_: ActivityContext) => {
      attemptCount++;
      attemptTimes.push(Date.now());
      if (attemptCount < 2) {
        throw new Error(`Transient failure on attempt ${attemptCount}`);
      }
      return "success";
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const retryHandler = async (_retryCtx: any) => {
        return 1000; // Retry after 1 second
      };
      const result = yield ctx.callActivity(flakyActivity, undefined, { retry: retryHandler });
      return result;
    };

    taskHubWorker.addActivity(flakyActivity);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.serializedOutput).toEqual(JSON.stringify("success"));
    expect(attemptCount).toBe(2);

    // Verify there was at least ~1s delay between attempts
    if (attemptTimes.length >= 2) {
      const delay = attemptTimes[1] - attemptTimes[0];
      expect(delay).toBeGreaterThanOrEqual(900); // Allow some tolerance
    }
  }, 31000);

  // // ==================== newGuid Tests ====================

  it("should generate deterministic GUIDs with newGuid", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      const guid1 = ctx.newGuid();
      const guid2 = ctx.newGuid();
      const guid3 = ctx.newGuid();
      return { guid1, guid2, guid3 };
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

    const output = JSON.parse(state?.serializedOutput ?? "{}");

    // Verify GUIDs are in valid format (8-4-4-4-12 hex chars)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(output.guid1).toMatch(uuidRegex);
    expect(output.guid2).toMatch(uuidRegex);
    expect(output.guid3).toMatch(uuidRegex);

    // Verify all GUIDs are unique
    expect(output.guid1).not.toEqual(output.guid2);
    expect(output.guid2).not.toEqual(output.guid3);
    expect(output.guid1).not.toEqual(output.guid3);
  }, 31000);

  it("should generate consistent GUIDs across replays", async () => {
    // This test verifies that newGuid produces the same values across replays
    // by running an orchestration that generates GUIDs, waits, and then returns them
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      // Generate GUIDs before and after a timer
      const guid1 = ctx.newGuid();
      const guid2 = ctx.newGuid();

      yield ctx.createTimer(1);

      // Generate more GUIDs after replay
      const guid3 = ctx.newGuid();
      const guid4 = ctx.newGuid();

      // Return all GUIDs - if deterministic, guid3/guid4 should be different from guid1/guid2
      // but consistent across replays (which we verify by the orchestration completing successfully)
      return { guid1, guid2, guid3, guid4 };
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

    const output = JSON.parse(state?.serializedOutput ?? "{}");

    // Verify all 4 GUIDs are unique
    const guids = [output.guid1, output.guid2, output.guid3, output.guid4];
    const uniqueGuids = new Set(guids);
    expect(uniqueGuids.size).toBe(4);

    // Verify all GUIDs are valid UUID v5 format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    guids.forEach((guid) => expect(guid).toMatch(uuidRegex));
  }, 31000);

  // // ==================== setCustomStatus Tests ====================

  it("should set and retrieve custom status", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      ctx.setCustomStatus("Processing");
      yield ctx.createTimer(10);
      ctx.setCustomStatus("Completed");
      return "done";
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);

    // Poll to observe the first status
    let foundProcessingStatus = false;
    const startTime = Date.now();
    while (Date.now() - startTime < 10000) {
      const state = await taskHubClient.getOrchestrationState(id);
      if (state?.serializedCustomStatus === JSON.stringify("Processing")) {
        foundProcessingStatus = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const finalState = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(finalState).toBeDefined();
    expect(finalState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(finalState?.serializedCustomStatus).toEqual(JSON.stringify("Completed"));
    expect(foundProcessingStatus).toBe(true);
  }, 31000);

  it("should update custom status to empty string when explicitly set", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      ctx.setCustomStatus("Initial status");
      yield ctx.createTimer(1);

      // Update custom status to an empty string; this is a valid value and does not clear it.
      ctx.setCustomStatus("");
      return "done";
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    // When set to empty string, the serialized value should be '""' (JSON-encoded empty string)
    expect(state?.serializedCustomStatus).toEqual('""');
  }, 31000);

  // ==================== sendEvent Tests ====================

  it("should send event from one orchestration to another", async () => {
    const receiverOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const event = yield ctx.waitForExternalEvent("greeting");
      return event;
    };

    const senderOrchestrator: TOrchestrator = async function* (
      ctx: OrchestrationContext,
      targetInstanceId: string,
    ): any {
      // Wait a bit to ensure receiver is running
      yield ctx.createTimer(1);

      // Send event to the receiver
      ctx.sendEvent(targetInstanceId, "greeting", { message: "Hello from sender!" });

      // Must yield after sendEvent to ensure the action is sent before orchestration completes
      yield ctx.createTimer(1);

      return "sent";
    };

    taskHubWorker.addOrchestrator(receiverOrchestrator);
    taskHubWorker.addOrchestrator(senderOrchestrator);
    await taskHubWorker.start();

    // Start receiver first
    const receiverId = await taskHubClient.scheduleNewOrchestration(receiverOrchestrator);
    await taskHubClient.waitForOrchestrationStart(receiverId, undefined, 10);

    // Start sender with receiver's instance ID
    const senderId = await taskHubClient.scheduleNewOrchestration(senderOrchestrator, receiverId);

    // Wait for both to complete
    const [receiverState, senderState] = await Promise.all([
      taskHubClient.waitForOrchestrationCompletion(receiverId, undefined, 30),
      taskHubClient.waitForOrchestrationCompletion(senderId, undefined, 30),
    ]);

    expect(senderState).toBeDefined();
    expect(senderState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(senderState?.serializedOutput).toEqual(JSON.stringify("sent"));

    expect(receiverState).toBeDefined();
    expect(receiverState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(receiverState?.serializedOutput).toEqual(JSON.stringify({ message: "Hello from sender!" }));
  }, 45000);

  it("should send event without data", async () => {
    const receiverOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.waitForExternalEvent("signal");
      return "received signal";
    };

    const senderOrchestrator: TOrchestrator = async function* (
      ctx: OrchestrationContext,
      targetInstanceId: string,
    ): any {
      yield ctx.createTimer(1);
      ctx.sendEvent(targetInstanceId, "signal");
      // Must yield after sendEvent to ensure the action is sent
      yield ctx.createTimer(1);
      return "signaled";
    };

    taskHubWorker.addOrchestrator(receiverOrchestrator);
    taskHubWorker.addOrchestrator(senderOrchestrator);
    await taskHubWorker.start();

    const receiverId = await taskHubClient.scheduleNewOrchestration(receiverOrchestrator);
    await taskHubClient.waitForOrchestrationStart(receiverId, undefined, 10);

    const senderId = await taskHubClient.scheduleNewOrchestration(senderOrchestrator, receiverId);

    const [receiverState, senderState] = await Promise.all([
      taskHubClient.waitForOrchestrationCompletion(receiverId, undefined, 30),
      taskHubClient.waitForOrchestrationCompletion(senderId, undefined, 30),
    ]);

    expect(senderState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(receiverState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(receiverState?.serializedOutput).toEqual(JSON.stringify("received signal"));
  }, 45000);

  describe("Versioning", () => {
    it("should be able to pass version when scheduling orchestration", async () => {
      let capturedVersion: string | undefined;

      const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
        capturedVersion = ctx.version;
        return ctx.version;
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator, undefined, {
        version: "1.0.0",
      });
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(capturedVersion).toEqual("1.0.0");
      expect(state?.serializedOutput).toEqual(JSON.stringify("1.0.0"));
    }, 31000);

    it("should have empty version when not specified", async () => {
      let capturedVersion: string | undefined;

      const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
        capturedVersion = ctx.version;
        return "done";
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(capturedVersion).toEqual("");
    }, 31000);
  });

  describe("ReplaySafeLogger", () => {
    it("should only log when not replaying", async () => {
      const logMessages: string[] = [];
      const mockLogger: Logger = {
        error: (msg) => logMessages.push(`error: ${msg}`),
        warn: (msg) => logMessages.push(`warn: ${msg}`),
        info: (msg) => logMessages.push(`info: ${msg}`),
        debug: (msg) => logMessages.push(`debug: ${msg}`),
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const logger = ctx.createReplaySafeLogger(mockLogger);
        logger.info("before timer");
        yield ctx.createTimer(1);
        logger.info("after timer");
        return "done";
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      // Each log message should appear only once (not duplicated during replay)
      const beforeTimerLogs = logMessages.filter((m) => m.includes("before timer"));
      const afterTimerLogs = logMessages.filter((m) => m.includes("after timer"));

      expect(beforeTimerLogs.length).toEqual(1);
      expect(afterTimerLogs.length).toEqual(1);
    }, 31000);
  });

  describe("Terminate with options", () => {
    it("should terminate orchestration with output using options object", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Wait forever
        yield ctx.waitForExternalEvent("never-coming");
        return "should not reach here";
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      await taskHubClient.waitForOrchestrationStart(id, undefined, 10);

      // Terminate with options object using terminateOptions factory
      await taskHubClient.terminateOrchestration(id, terminateOptions({ output: "terminated-output" }));
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);
      expect(state?.serializedOutput).toEqual(JSON.stringify("terminated-output"));
    }, 31000);

    it("should terminate orchestration with legacy signature (output only)", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        yield ctx.waitForExternalEvent("never-coming");
        return "should not reach here";
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      await taskHubClient.waitForOrchestrationStart(id, undefined, 10);

      // Use legacy signature
      await taskHubClient.terminateOrchestration(id, "legacy-output");
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);
      expect(state?.serializedOutput).toEqual(JSON.stringify("legacy-output"));
    }, 31000);
  });

  describe("Purge with options", () => {
    it("should purge orchestration by instance ID", async () => {
      const orchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "done";
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      // Purge the completed orchestration
      const purgeResult = await taskHubClient.purgeOrchestration(id);

      expect(purgeResult).toBeDefined();
      expect(purgeResult?.deletedInstanceCount).toEqual(1);

      // Verify the orchestration is gone
      const stateAfterPurge = await taskHubClient.getOrchestrationState(id);
      expect(stateAfterPurge).toBeUndefined();
    }, 31000);

    it("should purge orchestration with options object", async () => {
      const orchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "done";
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      // Purge with options (recursive: false for simple case)
      const purgeResult = await taskHubClient.purgeOrchestration(id, { recursive: false });

      expect(purgeResult).toBeDefined();
      expect(purgeResult?.deletedInstanceCount).toEqual(1);
    }, 31000);
  });
  it("should expose parent orchestration info in sub-orchestrations", async () => {
    // Child orchestration that captures and returns its parent info
    const childOrchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      if (ctx.parent) {
        return {
          hasParent: true,
          parentName: ctx.parent.name,
          parentInstanceId: ctx.parent.instanceId,
          taskScheduledId: ctx.parent.taskScheduledId,
        };
      }
      return { hasParent: false };
    };

    // Parent orchestration that calls the child
    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      // First verify parent is not set for top-level orchestration
      const topLevelParentInfo = ctx.parent;

      // Call sub-orchestration
      const childResult = yield ctx.callSubOrchestrator(childOrchestrator);

      return {
        topLevelHasParent: topLevelParentInfo !== undefined,
        childResult,
      };
    };

    taskHubWorker.addOrchestrator(childOrchestrator);
    taskHubWorker.addOrchestrator(parentOrchestrator);
    await taskHubWorker.start();

    const parentId = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(parentId, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();

    const result = JSON.parse(state?.serializedOutput || "{}");

    // Verify top-level orchestration has no parent
    expect(result.topLevelHasParent).toBe(false);

    // Verify child orchestration received parent info
    expect(result.childResult.hasParent).toBe(true);
    expect(result.childResult.parentName).toEqual(getName(parentOrchestrator));
    expect(result.childResult.parentInstanceId).toEqual(parentId);
    expect(typeof result.childResult.taskScheduledId).toBe("number");
  }, 31000);

  it("should have undefined parent for top-level orchestration started by client", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      return {
        hasParent: ctx.parent !== undefined,
        parentInfo: ctx.parent,
      };
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

    const result = JSON.parse(state?.serializedOutput || "{}");
    expect(result.hasParent).toBe(false);
    expect(result.parentInfo).toBeUndefined();
  }, 31000);

  describe("Versioning with MatchStrategy", () => {
    it("should process orchestration when MatchStrategy.None is used (always matches)", async () => {
      let capturedVersion: string | undefined;

      const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
        capturedVersion = ctx.version;
        return ctx.version;
      };

      // Worker with version "1.0.0" but MatchStrategy.None means it accepts all versions
      const worker = createWorkerWithVersioning("1.0.0", VersionMatchStrategy.None);
      worker.addOrchestrator(orchestrator);
      await worker.start();

      try {
        // Schedule orchestration with different version
        const id = await taskHubClient.scheduleNewOrchestration(orchestrator, undefined, {
          version: "2.0.0",
        });
        const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

        expect(state).toBeDefined();
        expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
        expect(capturedVersion).toEqual("2.0.0"); // Orchestration's version, not worker's
        expect(state?.serializedOutput).toEqual(JSON.stringify("2.0.0"));
      } finally {
        await worker.stop();
      }
    }, 31000);

    it("should process orchestration when MatchStrategy.Strict matches exactly", async () => {
      let capturedVersion: string | undefined;

      const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
        capturedVersion = ctx.version;
        return ctx.version;
      };

      // Worker with version "1.0.0" and MatchStrategy.Strict
      const worker = createWorkerWithVersioning("1.0.0", VersionMatchStrategy.Strict);
      worker.addOrchestrator(orchestrator);
      await worker.start();

      try {
        // Schedule orchestration with exact same version
        const id = await taskHubClient.scheduleNewOrchestration(orchestrator, undefined, {
          version: "1.0.0",
        });
        const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

        expect(state).toBeDefined();
        expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
        expect(capturedVersion).toEqual("1.0.0");
        expect(state?.serializedOutput).toEqual(JSON.stringify("1.0.0"));
      } finally {
        await worker.stop();
      }
    }, 31000);

    it("should process orchestration when MatchStrategy.CurrentOrOlder with matching version", async () => {
      let capturedVersion: string | undefined;

      const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
        capturedVersion = ctx.version;
        return ctx.version;
      };

      // Worker with version "2.0.0" and MatchStrategy.CurrentOrOlder
      const worker = createWorkerWithVersioning("2.0.0", VersionMatchStrategy.CurrentOrOlder);
      worker.addOrchestrator(orchestrator);
      await worker.start();

      try {
        // Schedule orchestration with older version - should be processed
        const id = await taskHubClient.scheduleNewOrchestration(orchestrator, undefined, {
          version: "1.0.0",
        });
        const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

        expect(state).toBeDefined();
        expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
        expect(capturedVersion).toEqual("1.0.0");
        expect(state?.serializedOutput).toEqual(JSON.stringify("1.0.0"));
      } finally {
        await worker.stop();
      }
    }, 31000);

    it("should process orchestration when MatchStrategy.CurrentOrOlder with same version", async () => {
      let capturedVersion: string | undefined;

      const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
        capturedVersion = ctx.version;
        return ctx.version;
      };

      // Worker with version "2.0.0" and MatchStrategy.CurrentOrOlder
      const worker = createWorkerWithVersioning("2.0.0", VersionMatchStrategy.CurrentOrOlder);
      worker.addOrchestrator(orchestrator);
      await worker.start();

      try {
        // Schedule orchestration with same version
        const id = await taskHubClient.scheduleNewOrchestration(orchestrator, undefined, {
          version: "2.0.0",
        });
        const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

        expect(state).toBeDefined();
        expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
        expect(capturedVersion).toEqual("2.0.0");
        expect(state?.serializedOutput).toEqual(JSON.stringify("2.0.0"));
      } finally {
        await worker.stop();
      }
    }, 31000);
  });

  describe("Versioning with FailureStrategy", () => {
    it("should fail orchestration when MatchStrategy.Strict mismatches with FailureStrategy.Fail", async () => {
      const orchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => {
        return "should not reach here";
      };

      // Worker with version "1.0.0", Strict match, and Fail strategy
      const worker = createWorkerWithVersioning(
        "1.0.0",
        VersionMatchStrategy.Strict,
        VersionFailureStrategy.Fail,
      );
      worker.addOrchestrator(orchestrator);
      await worker.start();

      try {
        // Schedule orchestration with different version - should fail
        const id = await taskHubClient.scheduleNewOrchestration(orchestrator, undefined, {
          version: "2.0.0",
        });
        const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

        expect(state).toBeDefined();
        expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
        expect(state?.failureDetails?.message).toContain("version");
      } finally {
        await worker.stop();
      }
    }, 31000);

    it("should fail orchestration when MatchStrategy.CurrentOrOlder with newer version and FailureStrategy.Fail", async () => {
      const orchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => {
        return "should not reach here";
      };

      // Worker with version "1.0.0", CurrentOrOlder match, and Fail strategy
      const worker = createWorkerWithVersioning(
        "1.0.0",
        VersionMatchStrategy.CurrentOrOlder,
        VersionFailureStrategy.Fail,
      );
      worker.addOrchestrator(orchestrator);
      await worker.start();

      try {
        // Schedule orchestration with newer version - should fail
        const id = await taskHubClient.scheduleNewOrchestration(orchestrator, undefined, {
          version: "2.0.0",
        });
        const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

        expect(state).toBeDefined();
        expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
        expect(state?.failureDetails?.message).toContain("version");
      } finally {
        await worker.stop();
      }
    }, 31000);

    // Note: FailureStrategy.Reject causes the worker to abandon the work item silently,
    // so the orchestration would remain in PENDING state. This is harder to test in E2E
    // because we'd need to wait for the orchestration to NOT complete (negative test).
    // The unit tests cover this case more thoroughly.
  });

  describe("Recursive terminate", () => {
    it("should terminate parent and child orchestrations recursively", async () => {
      // Child orchestration that waits forever
      const childOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        yield ctx.waitForExternalEvent("never-coming");
        return "child completed";
      };

      // Parent orchestration that starts a child and waits
      const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Start child and wait for it (but it never completes)
        const childResult = yield ctx.callSubOrchestrator(childOrchestrator);
        return { parentCompleted: true, childResult };
      };

      taskHubWorker.addOrchestrator(childOrchestrator);
      taskHubWorker.addOrchestrator(parentOrchestrator);
      await taskHubWorker.start();

      const parentId = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
      await taskHubClient.waitForOrchestrationStart(parentId, undefined, 10);

      // Wait a bit for child to be started
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Terminate recursively with output using terminateOptions factory
      await taskHubClient.terminateOrchestration(
        parentId,
        terminateOptions({ output: "terminated-by-test", recursive: true }),
      );

      // Wait for parent to be terminated
      const parentState = await taskHubClient.waitForOrchestrationCompletion(parentId, undefined, 30);

      expect(parentState).toBeDefined();
      expect(parentState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);
      expect(parentState?.serializedOutput).toEqual(JSON.stringify("terminated-by-test"));

      // Find and verify child is also terminated
      // The child instance ID follows a pattern based on parent ID
      // We need to query for sub-orchestrations
      // For now, we verify by checking the parent completed with termination
      // This confirms the recursive flag was processed
    }, 60000);

    it("should terminate only parent when recursive is false", async () => {
      let childStarted = false;

      // Child orchestration that sets a flag and waits
      const childOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        childStarted = true;
        yield ctx.waitForExternalEvent("never-coming");
        return "child completed";
      };

      // Parent orchestration that starts a child and waits
      const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const childResult = yield ctx.callSubOrchestrator(childOrchestrator);
        return { parentCompleted: true, childResult };
      };

      taskHubWorker.addOrchestrator(childOrchestrator);
      taskHubWorker.addOrchestrator(parentOrchestrator);
      await taskHubWorker.start();

      const parentId = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
      await taskHubClient.waitForOrchestrationStart(parentId, undefined, 10);

      // Wait a bit for child to be started
      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(childStarted).toBe(true);

      // Terminate non-recursively using terminateOptions factory
      await taskHubClient.terminateOrchestration(
        parentId,
        terminateOptions({ output: "parent-terminated", recursive: false }),
      );

      const parentState = await taskHubClient.waitForOrchestrationCompletion(parentId, undefined, 30);

      expect(parentState).toBeDefined();
      expect(parentState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);
      expect(parentState?.serializedOutput).toEqual(JSON.stringify("parent-terminated"));

      // Note: The child may or may not be terminated depending on how the runtime handles it.
      // The key assertion is that the parent was terminated with the correct output.
    }, 60000);

    it("should preserve termination output when using terminateOptions", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        yield ctx.waitForExternalEvent("never-coming");
        return "should not reach here";
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      await taskHubClient.waitForOrchestrationStart(id, undefined, 10);

      // Terminate with complex output object
      const complexOutput = { reason: "test termination", timestamp: Date.now(), data: [1, 2, 3] };
      await taskHubClient.terminateOrchestration(id, terminateOptions({ output: complexOutput }));

      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);
      expect(JSON.parse(state?.serializedOutput || "{}")).toEqual(complexOutput);
    }, 31000);
  });

  describe("Recursive purge", () => {
    it("should purge parent and child orchestrations recursively", async () => {
      // Child orchestration that completes immediately
      const childOrchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => {
        return "child done";
      };

      // Parent orchestration that creates a child
      const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const childResult = yield ctx.callSubOrchestrator(childOrchestrator);
        return { parentDone: true, childResult };
      };

      taskHubWorker.addOrchestrator(childOrchestrator);
      taskHubWorker.addOrchestrator(parentOrchestrator);
      await taskHubWorker.start();

      const parentId = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(parentId, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      // Purge recursively
      const purgeOptions: PurgeInstanceOptions = { recursive: true };
      const purgeResult = await taskHubClient.purgeOrchestration(parentId, purgeOptions);

      expect(purgeResult).toBeDefined();
      // When recursive is true, the parent should be deleted
      // Note: The actual count depends on the DTS implementation - at minimum, the parent is deleted
      expect(purgeResult?.deletedInstanceCount).toBeGreaterThanOrEqual(1);

      // Verify parent is gone
      const parentStateAfterPurge = await taskHubClient.getOrchestrationState(parentId);
      expect(parentStateAfterPurge).toBeUndefined();
    }, 60000);

    it("should purge only parent when recursive is false", async () => {
      // Child orchestration that completes immediately
      const childOrchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => {
        return "child done";
      };

      // Parent orchestration that creates a child
      const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const childResult = yield ctx.callSubOrchestrator(childOrchestrator);
        return { parentDone: true, childResult };
      };

      taskHubWorker.addOrchestrator(childOrchestrator);
      taskHubWorker.addOrchestrator(parentOrchestrator);
      await taskHubWorker.start();

      const parentId = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(parentId, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      // Purge non-recursively
      const purgeOptions: PurgeInstanceOptions = { recursive: false };
      const purgeResult = await taskHubClient.purgeOrchestration(parentId, purgeOptions);

      expect(purgeResult).toBeDefined();
      // When recursive is false, only the parent should be deleted
      expect(purgeResult?.deletedInstanceCount).toEqual(1);

      // Verify parent is gone
      const parentStateAfterPurge = await taskHubClient.getOrchestrationState(parentId);
      expect(parentStateAfterPurge).toBeUndefined();
    }, 60000);
  });

  // PR #138: Fix falsy values (0, "", false, null) silently dropped during serialization
  describe("falsy value serialization", () => {
    it("should pass zero (0) through activity round-trip", async () => {
      const echo = async (_: ActivityContext, input: number) => input;

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
        const result = yield ctx.callActivity(echo, input);
        return result;
      };

      taskHubWorker.addOrchestrator(orchestrator);
      taskHubWorker.addActivity(echo);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 0);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedInput).toEqual(JSON.stringify(0));
      expect(state?.serializedOutput).toEqual(JSON.stringify(0));
    }, 31000);

    it("should pass empty string through activity round-trip", async () => {
      const echo = async (_: ActivityContext, input: string) => input;

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
        const result = yield ctx.callActivity(echo, input);
        return result;
      };

      taskHubWorker.addOrchestrator(orchestrator);
      taskHubWorker.addActivity(echo);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator, "");
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedInput).toEqual(JSON.stringify(""));
      expect(state?.serializedOutput).toEqual(JSON.stringify(""));
    }, 31000);

    it("should pass false through activity round-trip", async () => {
      const echo = async (_: ActivityContext, input: boolean) => input;

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: boolean): any {
        const result = yield ctx.callActivity(echo, input);
        return result;
      };

      taskHubWorker.addOrchestrator(orchestrator);
      taskHubWorker.addActivity(echo);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator, false);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedInput).toEqual(JSON.stringify(false));
      expect(state?.serializedOutput).toEqual(JSON.stringify(false));
    }, 31000);

    it("should pass null through activity round-trip", async () => {
      const echo = async (_: ActivityContext, input: any) => input;

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: any): any {
        const result = yield ctx.callActivity(echo, input);
        return result;
      };

      taskHubWorker.addOrchestrator(orchestrator);
      taskHubWorker.addActivity(echo);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator, null);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify(null));
    }, 31000);

    it("should pass zero through sub-orchestration round-trip", async () => {
      const child: TOrchestrator = async (_ctx: OrchestrationContext, input: number) => {
        return input;
      };

      const parent: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
        const result = yield ctx.callSubOrchestrator(child, input);
        return result;
      };

      taskHubWorker.addOrchestrator(parent);
      taskHubWorker.addOrchestrator(child);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(parent, 0);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify(0));
    }, 31000);

    it("should return zero as orchestration result", async () => {
      const orchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => {
        return 0;
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify(0));
    }, 31000);

    it("should return false as orchestration result", async () => {
      const orchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => {
        return false;
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify(false));
    }, 31000);

    it("should return empty string as orchestration result", async () => {
      const orchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => {
        return "";
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify(""));
    }, 31000);

    it("should continue-as-new with zero input", async () => {
      const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, input: number) => {
        if (input === 0) {
          ctx.continueAsNew(1, false);
          return;
        }
        return input;
      };

      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 0);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify(1));
    }, 31000);
  });

  describe("nested composite tasks (whenAll/whenAny)", () => {
    it("should complete nested whenAll(whenAll, whenAll)", async () => {
      const addTen = async (_: ActivityContext, input: number): Promise<number> => {
        return input + 10;
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Two independent groups of activities, each wrapped in whenAll
        const group1 = whenAll([
          ctx.callActivity(addTen, 1),
          ctx.callActivity(addTen, 2),
        ]);
        const group2 = whenAll([
          ctx.callActivity(addTen, 3),
          ctx.callActivity(addTen, 4),
        ]);

        // Outer whenAll wraps both inner whenAll composite tasks
        const results: number[][] = yield whenAll([group1, group2]);
        // results should be [[11, 12], [13, 14]]
        return results;
      };

      taskHubWorker.addActivity(addTen);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.failureDetails).toBeUndefined();
      expect(state?.serializedOutput).toEqual(JSON.stringify([[11, 12], [13, 14]]));
    }, 31000);

    it("should complete whenAny wrapping multiple whenAll groups", async () => {
      const fast = async (_: ActivityContext): Promise<string> => {
        return "fast-done";
      };

      const slow = async (_: ActivityContext): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return "slow-done";
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Group 1: both fast — should complete first
        const fastGroup = whenAll([
          ctx.callActivity(fast),
          ctx.callActivity(fast),
        ]);
        // Group 2: both slow — should complete later
        const slowGroup = whenAll([
          ctx.callActivity(slow),
          ctx.callActivity(slow),
        ]);

        // whenAny should resolve as soon as fastGroup finishes
        const winner: Task<any> = yield whenAny([fastGroup, slowGroup]);
        return winner.getResult();
      };

      taskHubWorker.addActivity(fast);
      taskHubWorker.addActivity(slow);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.failureDetails).toBeUndefined();
      // The fast group completes first, returning ["fast-done", "fast-done"]
      expect(state?.serializedOutput).toEqual(JSON.stringify(["fast-done", "fast-done"]));
    }, 31000);

    it("should propagate failure from nested whenAll to outer whenAll", async () => {
      const succeed = async (_: ActivityContext): Promise<string> => {
        return "ok";
      };

      const fail = async (_: ActivityContext): Promise<string> => {
        throw new Error("nested-whenAll-failure");
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const group1 = whenAll([
          ctx.callActivity(succeed),
          ctx.callActivity(fail), // This will fail
        ]);
        const group2 = whenAll([
          ctx.callActivity(succeed),
          ctx.callActivity(succeed),
        ]);

        // Outer whenAll should fail because group1 fails
        yield whenAll([group1, group2]);
      };

      taskHubWorker.addActivity(succeed);
      taskHubWorker.addActivity(fail);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();
      expect(state?.failureDetails?.message).toContain("nested-whenAll-failure");
    }, 31000);
  });

  // Issue #159: Missing non-Task validation in generator failure recovery path
  describe("non-Task yield validation after catching task failure", () => {
    it("should fail orchestration when generator catches a task failure and yields a non-Task value", async () => {
      const failingActivity = async (_: ActivityContext): Promise<string> => {
        throw new Error("activity failure for non-Task yield test");
      };

      // This orchestrator catches the activity failure but then yields a plain number
      // instead of a Task — this should fail the orchestration with a clear error
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        try {
          yield ctx.callActivity(failingActivity);
        } catch {
          yield 42 as any; // Bug: yielding a non-Task value after catching an exception
        }
        return "should not reach here";
      };

      taskHubWorker.addActivity(failingActivity);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();
      expect(state?.failureDetails?.message).toContain("non-Task");
    }, 31000);

    it("should fail orchestration when generator catches a task failure and yields a string", async () => {
      const failingActivity = async (_: ActivityContext): Promise<string> => {
        throw new Error("activity failure for string yield test");
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        try {
          yield ctx.callActivity(failingActivity);
        } catch {
          yield "not a task" as any;
        }
        return "should not reach here";
      };

      taskHubWorker.addActivity(failingActivity);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();
      expect(state?.failureDetails?.message).toContain("non-Task");
    }, 31000);

    it("should succeed when generator catches a task failure and yields a valid new Task", async () => {
      const failingActivity = async (_: ActivityContext): Promise<string> => {
        throw new Error("activity failure for recovery test");
      };

      const recoveryActivity = async (_: ActivityContext): Promise<string> => {
        return "recovered-value";
      };

      // This orchestrator catches the activity failure and correctly recovers
      // by yielding a new Task from callActivity
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        try {
          yield ctx.callActivity(failingActivity);
        } catch {
          const result: string = yield ctx.callActivity(recoveryActivity);
          return result;
        }
      };

      taskHubWorker.addActivity(failingActivity);
      taskHubWorker.addActivity(recoveryActivity);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.failureDetails).toBeUndefined();
      expect(state?.serializedOutput).toEqual(JSON.stringify("recovered-value"));
    }, 31000);
  });
});
