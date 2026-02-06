// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for advanced retry features in Durable Task Scheduler (DTS).
 *
 * These tests cover:
 * - handleFailure predicate to filter which errors to retry
 * - maxRetryIntervalInMilliseconds to cap backoff intervals
 * - retryTimeoutInMilliseconds to limit total retry duration
 *
 * Environment variables (choose one):
 *   - DTS_CONNECTION_STRING: Full connection string
 *   OR
 *   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
 *   - TASKHUB: The task hub name (default: default)
 */

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  ProtoOrchestrationStatus as OrchestrationStatus,
  ActivityContext,
  OrchestrationContext,
  TOrchestrator,
  RetryPolicy,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
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

describe("Advanced Retry Policy E2E Tests", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;

  beforeEach(async () => {
    taskHubClient = createClient();
    taskHubWorker = createWorker();
  });

  afterEach(async () => {
    try {
      await taskHubWorker.stop();
    } catch {
      // Worker wasn't started, ignore the error
    }
    await taskHubClient.stop();
  });

  // ==================== handleFailure Predicate Tests ====================

  describe("handleFailure predicate", () => {
    it("should retry when handleFailure returns true", async () => {
      let attemptCount = 0;

      const flakyActivity = async (_: ActivityContext, input: number) => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error(`Transient failure on attempt ${attemptCount}`);
          error.name = "TransientError";
          throw error;
        }
        return input * 2;
      };

      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 100,
        backoffCoefficient: 1.0,
        handleFailure: (failure) => {
          // Only retry TransientError errors
          return failure.errorType === "TransientError";
        },
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
      expect(attemptCount).toBe(3); // Failed twice with TransientError, succeeded on third
    }, 31000);

    it("should stop retrying when handleFailure returns false", async () => {
      let attemptCount = 0;

      const activityWithPermanentError = async (_: ActivityContext) => {
        attemptCount++;
        const error = new Error("This is a permanent error");
        error.name = "PermanentError";
        throw error;
      };

      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 100,
        backoffCoefficient: 1.0,
        handleFailure: (failure) => {
          // Don't retry PermanentError - stop immediately
          return failure.errorType !== "PermanentError";
        },
      });

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(activityWithPermanentError, undefined, { retry: retryPolicy });
        return result;
      };

      taskHubWorker.addActivity(activityWithPermanentError);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();
      // Should only attempt once since handleFailure returns false for PermanentError
      expect(attemptCount).toBe(1);
    }, 31000);

    it("should filter retries based on error message content", async () => {
      let attemptCount = 0;

      const activityWithSpecificError = async (_: ActivityContext) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error("Database connection timeout - please retry");
        } else if (attemptCount === 2) {
          throw new Error("Invalid input: field 'email' is required");
        }
        return "success";
      };

      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 100,
        backoffCoefficient: 1.0,
        handleFailure: (failure) => {
          // Only retry timeout errors, not validation errors
          return failure.message?.includes("timeout") ?? false;
        },
      });

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(activityWithSpecificError, undefined, { retry: retryPolicy });
        return result;
      };

      taskHubWorker.addActivity(activityWithSpecificError);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();
      // First attempt: timeout error (retry), Second attempt: validation error (no retry)
      expect(attemptCount).toBe(2);
    }, 31000);

    it("should apply handleFailure to sub-orchestration retries", async () => {
      let attemptCount = 0;

      // eslint-disable-next-line require-yield
      const subOrchestrator: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
        attemptCount++;
        const error = new Error("Sub-orchestration failed");
        error.name = attemptCount === 1 ? "RetryableError" : "FatalError";
        throw error;
      };

      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 100,
        backoffCoefficient: 1.0,
        handleFailure: (failure) => {
          // Only retry RetryableError
          return failure.errorType === "RetryableError";
        },
      });

      const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callSubOrchestrator(subOrchestrator, undefined, { retry: retryPolicy });
        return result;
      };

      taskHubWorker.addOrchestrator(subOrchestrator);
      taskHubWorker.addOrchestrator(parentOrchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();
      // First: RetryableError (retry), Second: FatalError (no retry)
      expect(attemptCount).toBe(2);
    }, 31000);
  });

  // ==================== maxRetryIntervalInMilliseconds Tests ====================

  describe("maxRetryIntervalInMilliseconds", () => {
    it("should cap retry interval at maxRetryIntervalInMilliseconds", async () => {
      const attemptTimes: number[] = [];

      const flakyActivity = async (_: ActivityContext) => {
        attemptTimes.push(Date.now());
        if (attemptTimes.length < 4) {
          throw new Error(`Transient failure on attempt ${attemptTimes.length}`);
        }
        return "success";
      };

      // With backoffCoefficient=2.0 and first interval 200ms:
      // Without cap: 200ms, 400ms, 800ms
      // With cap at 300ms: 200ms, 300ms, 300ms
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 200,
        backoffCoefficient: 2.0,
        maxRetryIntervalInMilliseconds: 300,
      });

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(flakyActivity, undefined, { retry: retryPolicy });
        return result;
      };

      taskHubWorker.addActivity(flakyActivity);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(attemptTimes.length).toBe(4);

      // Verify delays are capped
      if (attemptTimes.length >= 4) {
        const delay1 = attemptTimes[1] - attemptTimes[0];
        const delay2 = attemptTimes[2] - attemptTimes[1];
        const delay3 = attemptTimes[3] - attemptTimes[2];

        // First delay should be ~200ms
        expect(delay1).toBeGreaterThanOrEqual(150);
        expect(delay1).toBeLessThanOrEqual(400);

        // Second and third delays should be capped at ~300ms (not growing exponentially)
        expect(delay2).toBeLessThanOrEqual(500); // With tolerance
        expect(delay3).toBeLessThanOrEqual(500); // With tolerance

        // Without cap, third delay would be ~800ms; with cap it should be ~300ms
        // So third delay should NOT be much larger than second delay
        expect(delay3).toBeLessThanOrEqual(delay2 * 1.5);
      }
    }, 31000);
  });

  // ==================== retryTimeoutInMilliseconds Tests ====================

  describe("retryTimeoutInMilliseconds", () => {
    it("should stop retrying after retryTimeoutInMilliseconds expires", async () => {
      let attemptCount = 0;
      const startTime = Date.now();
      let endTime = 0;

      const slowFailingActivity = async (_: ActivityContext) => {
        attemptCount++;
        endTime = Date.now();
        throw new Error(`Failure on attempt ${attemptCount}`);
      };

      // Retry timeout of 800ms with 300ms intervals means max 2-3 attempts
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 10, // High max, but timeout should stop it earlier
        firstRetryIntervalInMilliseconds: 300,
        backoffCoefficient: 1.0,
        retryTimeoutInMilliseconds: 800,
      });

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(slowFailingActivity, undefined, { retry: retryPolicy });
        return result;
      };

      taskHubWorker.addActivity(slowFailingActivity);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();

      // Should have stopped before 10 attempts due to timeout
      expect(attemptCount).toBeLessThan(10);
      // Should have at least tried a couple times
      expect(attemptCount).toBeGreaterThanOrEqual(2);

      // Total time should be roughly within the timeout window (with some tolerance)
      const totalTime = endTime - startTime;
      // The orchestration framework timing may add overhead, but attempts should stop reasonably quickly
      expect(totalTime).toBeLessThan(2000); // Very generous upper bound
    }, 31000);
  });

  // ==================== Combined Features Tests ====================

  describe("combined retry features", () => {
    it("should respect both handleFailure and maxRetryIntervalInMilliseconds", async () => {
      let attemptCount = 0;
      const attemptTimes: number[] = [];

      const flakyActivity = async (_: ActivityContext) => {
        attemptCount++;
        attemptTimes.push(Date.now());

        if (attemptCount < 3) {
          const error = new Error(`Transient failure on attempt ${attemptCount}`);
          error.name = "TransientError";
          throw error;
        }
        return "success";
      };

      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 200,
        backoffCoefficient: 2.0,
        maxRetryIntervalInMilliseconds: 250,
        handleFailure: (failure) => failure.errorType === "TransientError",
      });

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(flakyActivity, undefined, { retry: retryPolicy });
        return result;
      };

      taskHubWorker.addActivity(flakyActivity);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(attemptCount).toBe(3);

      // Verify second delay is capped (would be 400ms without cap, should be ~250ms with cap)
      if (attemptTimes.length >= 3) {
        const delay2 = attemptTimes[2] - attemptTimes[1];
        expect(delay2).toBeLessThanOrEqual(400); // Should be capped at ~250ms
      }
    }, 31000);

    it("should fail fast when handleFailure returns false regardless of other settings", async () => {
      let attemptCount = 0;

      const activityWithFatalError = async (_: ActivityContext) => {
        attemptCount++;
        const error = new Error("Fatal configuration error");
        error.name = "ConfigurationError";
        throw error;
      };

      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 10,
        firstRetryIntervalInMilliseconds: 100,
        backoffCoefficient: 2.0,
        maxRetryIntervalInMilliseconds: 5000,
        retryTimeoutInMilliseconds: 60000,
        handleFailure: (failure) => {
          // Never retry configuration errors
          return failure.errorType !== "ConfigurationError";
        },
      });

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(activityWithFatalError, undefined, { retry: retryPolicy });
        return result;
      };

      taskHubWorker.addActivity(activityWithFatalError);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();
      // Should fail immediately on first attempt due to handleFailure returning false
      expect(attemptCount).toBe(1);
    }, 31000);
  });
});
