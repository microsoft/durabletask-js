// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for AsyncRetryHandler (custom retry logic) in Durable Task Scheduler (DTS).
 *
 * These tests cover:
 * - Activity retry with custom retry handler
 * - Sub-orchestration retry with custom retry handler
 * - Retry handler that filters by error type
 * - Retry handler that limits by attempt count
 * - Sync RetryHandler support
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
  AsyncRetryHandler,
  RetryHandler,
  RetryContext,
  toAsyncRetryHandler,
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

describe("Retry Handler E2E Tests", () => {
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

  // ==================== Activity Retry Handler Tests ====================

  describe("activity retry with AsyncRetryHandler", () => {
    it("should retry activity when handler returns true and succeed after transient failures", async () => {
      let attemptCount = 0;

      const flakyActivity = async (_: ActivityContext, input: number) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Transient failure on attempt ${attemptCount}`);
        }
        return input * 2;
      };

      // Retry handler: retry up to 5 attempts
      const retryHandler: AsyncRetryHandler = async (ctx: RetryContext) => {
        return ctx.lastAttemptNumber < 5;
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
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
      expect(attemptCount).toBe(3); // Failed twice, succeeded on third
    }, 31000);

    it("should fail when retry handler returns false", async () => {
      let attemptCount = 0;

      const failingActivity = async (_: ActivityContext) => {
        attemptCount++;
        const error = new Error("Permanent failure");
        error.name = "PermanentError";
        throw error;
      };

      // Retry handler: don't retry PermanentError
      const retryHandler: AsyncRetryHandler = async (ctx: RetryContext) => {
        return ctx.lastFailure.errorType !== "PermanentError";
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
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
      // Should only attempt once since handler returns false for PermanentError
      expect(attemptCount).toBe(1);
    }, 31000);

    it("should exhaust retries when handler limits by attempt count", async () => {
      let attemptCount = 0;
      const maxAttempts = 3;

      const alwaysFailsActivity = async (_: ActivityContext) => {
        attemptCount++;
        throw new Error(`Failure on attempt ${attemptCount}`);
      };

      // Retry handler: retry up to maxAttempts
      const retryHandler: AsyncRetryHandler = async (ctx: RetryContext) => {
        return ctx.lastAttemptNumber < maxAttempts;
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(alwaysFailsActivity, undefined, { retry: retryHandler });
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
      expect(attemptCount).toBe(maxAttempts);
    }, 31000);

    it("should filter retries based on error type using handler", async () => {
      let attemptCount = 0;

      const activityWithMixedErrors = async (_: ActivityContext) => {
        attemptCount++;
        if (attemptCount === 1) {
          const error = new Error("Connection timeout");
          error.name = "TransientError";
          throw error;
        } else {
          const error = new Error("Invalid input");
          error.name = "ValidationError";
          throw error;
        }
      };

      // Retry handler: only retry TransientError, not ValidationError
      const retryHandler: AsyncRetryHandler = async (ctx: RetryContext) => {
        return ctx.lastFailure.errorType === "TransientError";
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(activityWithMixedErrors, undefined, { retry: retryHandler });
        return result;
      };

      taskHubWorker.addActivity(activityWithMixedErrors);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();
      // First: TransientError (retry), Second: ValidationError (stop)
      expect(attemptCount).toBe(2);
    }, 31000);
  });

  // ==================== Sub-Orchestration Retry Handler Tests ====================

  describe("sub-orchestration retry with AsyncRetryHandler", () => {
    it("should retry sub-orchestration when handler returns true", async () => {
      let attemptCount = 0;

      // eslint-disable-next-line require-yield
      const failingSubOrchestrator: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Sub-orchestration failure on attempt ${attemptCount}`);
        }
        return "sub-orch-result";
      };

      const retryHandler: AsyncRetryHandler = async (ctx: RetryContext) => {
        return ctx.lastAttemptNumber < 5;
      };

      const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callSubOrchestrator(failingSubOrchestrator, undefined, {
          retry: retryHandler,
        });
        return result;
      };

      taskHubWorker.addOrchestrator(failingSubOrchestrator);
      taskHubWorker.addOrchestrator(parentOrchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.failureDetails).toBeUndefined();
      expect(state?.serializedOutput).toEqual(JSON.stringify("sub-orch-result"));
      expect(attemptCount).toBe(3);
    }, 31000);

    it("should fail sub-orchestration when handler returns false", async () => {
      let attemptCount = 0;

      // eslint-disable-next-line require-yield
      const alwaysFailsSubOrch: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
        attemptCount++;
        const error = new Error("Fatal sub-orchestration error");
        error.name = "FatalError";
        throw error;
      };

      // Don't retry FatalError
      const retryHandler: AsyncRetryHandler = async (ctx: RetryContext) => {
        return ctx.lastFailure.errorType !== "FatalError";
      };

      const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callSubOrchestrator(alwaysFailsSubOrch, undefined, {
          retry: retryHandler,
        });
        return result;
      };

      taskHubWorker.addOrchestrator(alwaysFailsSubOrch);
      taskHubWorker.addOrchestrator(parentOrchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();
      // Should only attempt once since handler returns false for FatalError
      expect(attemptCount).toBe(1);
    }, 31000);
  });

  // ==================== Retry Handler with Delay (number return) Tests ====================

  describe("retry handler returning delay in milliseconds", () => {
    it("should retry activity after specified delay when handler returns a positive number", async () => {
      let attemptCount = 0;
      const attemptTimes: number[] = [];

      const flakyActivity = async (_: ActivityContext, input: number) => {
        attemptCount++;
        attemptTimes.push(Date.now());
        if (attemptCount < 3) {
          throw new Error(`Transient failure on attempt ${attemptCount}`);
        }
        return input * 2;
      };

      // Retry handler returning delay in ms (fixed 500ms delay)
       
      const retryHandler: any = async (ctx: RetryContext): Promise<boolean | number> => {
        if (ctx.lastAttemptNumber >= 5) {
          return false;
        }
        return 500; // retry after 500ms
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
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

      // Verify delays are approximately 500ms
      if (attemptTimes.length >= 3) {
        const delay1 = attemptTimes[1] - attemptTimes[0];
        const delay2 = attemptTimes[2] - attemptTimes[1];
        // Allow generous tolerance for timer scheduling overhead
        expect(delay1).toBeGreaterThanOrEqual(400);
        expect(delay2).toBeGreaterThanOrEqual(400);
      }
    }, 31000);

    it("should support exponential backoff via handler returning increasing delays", async () => {
      let attemptCount = 0;
      const attemptTimes: number[] = [];

      const flakyActivity = async (_: ActivityContext) => {
        attemptCount++;
        attemptTimes.push(Date.now());
        if (attemptCount < 4) {
          throw new Error(`Failure on attempt ${attemptCount}`);
        }
        return "success";
      };

      // Retry handler implementing manual exponential backoff: 200ms, 400ms, 800ms
       
      const retryHandler: any = async (ctx: RetryContext): Promise<boolean | number> => {
        if (ctx.lastAttemptNumber >= 5) {
          return false;
        }
        return 200 * Math.pow(2, ctx.lastAttemptNumber - 1);
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
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
      expect(attemptCount).toBe(4);

      // Verify delays are increasing
      if (attemptTimes.length >= 4) {
        const delay1 = attemptTimes[1] - attemptTimes[0];
        const delay2 = attemptTimes[2] - attemptTimes[1];
        const delay3 = attemptTimes[3] - attemptTimes[2];

        // Each delay should be roughly double the previous (with tolerance)
        expect(delay2).toBeGreaterThan(delay1 * 0.8);
        expect(delay3).toBeGreaterThan(delay2 * 0.8);
      }
    }, 31000);

    it("should retry sub-orchestration with delay when handler returns a number", async () => {
      let attemptCount = 0;

      // eslint-disable-next-line require-yield
      const failingSubOrch: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Sub-orch failure on attempt ${attemptCount}`);
        }
        return "sub-orch-result";
      };

      // Retry handler returning fixed delay
       
      const retryHandler: any = async (ctx: RetryContext): Promise<boolean | number> => {
        if (ctx.lastAttemptNumber >= 5) {
          return false;
        }
        return 300; // 300ms delay
      };

      const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callSubOrchestrator(failingSubOrch, undefined, {
          retry: retryHandler,
        });
        return result;
      };

      taskHubWorker.addOrchestrator(failingSubOrch);
      taskHubWorker.addOrchestrator(parentOrchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(parentOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.failureDetails).toBeUndefined();
      expect(state?.serializedOutput).toEqual(JSON.stringify("sub-orch-result"));
      expect(attemptCount).toBe(3);
    }, 31000);

    it("should handle handler switching between delay and false (stop)", async () => {
      let attemptCount = 0;

      const activityWithMixedErrors = async (_: ActivityContext) => {
        attemptCount++;
        if (attemptCount === 1) {
          const error = new Error("Transient error");
          error.name = "TransientError";
          throw error;
        } else {
          const error = new Error("Fatal error");
          error.name = "FatalError";
          throw error;
        }
      };

      // Handler: returns delay for TransientError, false for FatalError
       
      const retryHandler: any = async (ctx: RetryContext): Promise<boolean | number> => {
        if (ctx.lastFailure.errorType === "TransientError") {
          return 200; // retry after 200ms
        }
        return false; // don't retry
      };

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result = yield ctx.callActivity(activityWithMixedErrors, undefined, { retry: retryHandler });
        return result;
      };

      taskHubWorker.addActivity(activityWithMixedErrors);
      taskHubWorker.addOrchestrator(orchestrator);
      await taskHubWorker.start();

      const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(state?.failureDetails).toBeDefined();
      // First: TransientError (retry with 200ms delay), Second: FatalError (stop)
      expect(attemptCount).toBe(2);
    }, 31000);

    it("should use sync RetryHandler returning a delay number", async () => {
      let attemptCount = 0;

      const flakyActivity = async (_: ActivityContext) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Failure on attempt ${attemptCount}`);
        }
        return "success";
      };

      // Sync handler returning a delay
       
      const syncHandler: any = (ctx: RetryContext): boolean | number => {
        if (ctx.lastAttemptNumber >= 5) {
          return false;
        }
        return 300;
      };
      const retryHandler = toAsyncRetryHandler(syncHandler);

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
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
      expect(attemptCount).toBe(3);
    }, 31000);
  });

  // ==================== Sync RetryHandler Tests ====================

  describe("sync RetryHandler support", () => {
    it("should support synchronous RetryHandler via toAsyncRetryHandler", async () => {
      let attemptCount = 0;

      const flakyActivity = async (_: ActivityContext) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Transient failure on attempt ${attemptCount}`);
        }
        return "success";
      };

      // Use synchronous RetryHandler converted via toAsyncRetryHandler
      const syncHandler: RetryHandler = (ctx: RetryContext) => {
        return ctx.lastAttemptNumber < 5;
      };
      const retryHandler = toAsyncRetryHandler(syncHandler);

      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
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
      expect(attemptCount).toBe(3);
    }, 31000);
  });
});
