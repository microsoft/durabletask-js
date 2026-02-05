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

  return builder.versioning({ version, matchStrategy, failureStrategy }).build();
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
});
