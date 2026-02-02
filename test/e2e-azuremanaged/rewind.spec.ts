// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for rewindInstance API.
 *
 * NOTE: These tests can run against either:
 *   1. DTS emulator - set ENDPOINT and TASKHUB environment variables
 *   2. Real Azure DTS - set AZURE_DTS_CONNECTION_STRING environment variable
 *
 * Example for emulator:
 *   docker run -i -p 8080:8080 -d mcr.microsoft.com/dts/dts-emulator:latest
 *   ENDPOINT=localhost:8080 TASKHUB=default npx jest rewind.spec.ts
 *
 * Example for real DTS:
 *   AZURE_DTS_CONNECTION_STRING="Endpoint=https://...;Authentication=DefaultAzure;TaskHub=th3" npx jest rewind.spec.ts
 */

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  OrchestrationStatus,
  OrchestrationContext,
  TOrchestrator,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

// Read environment variables - support both connection string and endpoint/taskhub
const connectionString = process.env.AZURE_DTS_CONNECTION_STRING;
const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

function createClient(): TaskHubGrpcClient {
  const builder = new DurableTaskAzureManagedClientBuilder();
  if (connectionString) {
    return builder.connectionString(connectionString).build();
  }
  return builder.endpoint(endpoint, taskHub, null).build();
}

function createWorker(): TaskHubGrpcWorker {
  const builder = new DurableTaskAzureManagedWorkerBuilder();
  if (connectionString) {
    return builder.connectionString(connectionString).build();
  }
  return builder.endpoint(endpoint, taskHub, null).build();
}

describe("Rewind Instance E2E Tests", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;
  let workerStarted = false;

  // Helper to start worker and track state
  const startWorker = async () => {
    await taskHubWorker.start();
    workerStarted = true;
  };

  beforeEach(async () => {
    workerStarted = false;
    taskHubClient = createClient();
    taskHubWorker = createWorker();
  });

  afterEach(async () => {
    if (workerStarted) {
      await taskHubWorker.stop();
    }
    await taskHubClient.stop();
  });

  describe("rewindInstance - positive cases", () => {
    // Track execution attempt count for retry logic
    let attemptCount = 0;

    // An orchestrator that fails on first attempt, succeeds on subsequent attempts
    const failOnceOrchestrator: TOrchestrator = async (_ctx: OrchestrationContext, _input: number) => {
      // Use input as a key to track attempts per instance
      // After rewind, the orchestrator replays from the beginning
      attemptCount++;
      if (attemptCount === 1) {
        throw new Error("First attempt failed!");
      }
      return `Success on attempt ${attemptCount}`;
    };

    beforeEach(() => {
      attemptCount = 0;
    });

    // Skip these tests if the backend doesn't support rewind (emulator returns UNIMPLEMENTED)
    it.skip("should rewind a failed orchestration instance (requires backend support)", async () => {
      const instanceId = `rewind-test-${Date.now()}`;

      taskHubWorker.addOrchestrator(failOnceOrchestrator);
      await startWorker();

      // Schedule the orchestration - it will fail on first attempt
      await taskHubClient.scheduleNewOrchestration(failOnceOrchestrator, 1, instanceId);

      // Wait for the orchestration to fail
      const failedState = await taskHubClient.waitForOrchestrationCompletion(instanceId, true, 30);
      expect(failedState).toBeDefined();
      expect(failedState?.runtimeStatus).toBe(OrchestrationStatus.FAILED);
      expect(failedState?.failureDetails?.message).toContain("First attempt failed!");

      // Now rewind the failed orchestration
      await taskHubClient.rewindInstance(instanceId, "Testing rewind functionality");

      // The orchestration should now be running again
      // Wait for it to complete (successfully this time)
      const rewindedState = await taskHubClient.waitForOrchestrationCompletion(instanceId, true, 30);
      expect(rewindedState).toBeDefined();
      expect(rewindedState?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(rewindedState?.serializedOutput).toContain("Success on attempt");
    });

    it.skip("should rewind a failed orchestration with a descriptive reason (requires backend support)", async () => {
      const instanceId = `rewind-reason-${Date.now()}`;
      const rewindReason = "Rewinding due to transient network failure";

      taskHubWorker.addOrchestrator(failOnceOrchestrator);
      await startWorker();

      // Schedule and wait for failure
      await taskHubClient.scheduleNewOrchestration(failOnceOrchestrator, 1, instanceId);
      const failedState = await taskHubClient.waitForOrchestrationCompletion(instanceId, true, 30);
      expect(failedState?.runtimeStatus).toBe(OrchestrationStatus.FAILED);

      // Rewind with a specific reason
      await taskHubClient.rewindInstance(instanceId, rewindReason);

      // Verify it can complete after rewind
      const rewindedState = await taskHubClient.waitForOrchestrationCompletion(instanceId, true, 30);
      expect(rewindedState?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
    });
  });

  describe("rewindInstance - negative cases", () => {
    // A simple orchestrator that completes successfully
    const simpleOrchestrator: TOrchestrator = async (ctx: OrchestrationContext, input: number) => {
      return input * 2;
    };

    // An orchestrator that waits for an event (stays in Running state)
    const waitingOrchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      const approval = await ctx.waitForExternalEvent("approval");
      return `Approved: ${approval}`;
    };

    it("should throw an error when rewinding a non-existent instance (or if rewind is not supported)", async () => {
      const nonExistentId = `non-existent-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // No need to start worker for this test
      // Will throw either "not found" or "not supported" depending on backend
      await expect(taskHubClient.rewindInstance(nonExistentId, "Test rewind")).rejects.toThrow();
    });

    it("should throw an error when rewinding a completed orchestration (or if rewind is not supported)", async () => {
      const instanceId = `rewind-completed-${Date.now()}`;

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await startWorker();

      // Schedule and wait for completion
      await taskHubClient.scheduleNewOrchestration(simpleOrchestrator, 5, instanceId);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, true, 30);
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);

      // Try to rewind a completed orchestration - should fail
      await expect(taskHubClient.rewindInstance(instanceId, "Test rewind")).rejects.toThrow();
    });

    it.skip("should throw an error when rewinding a running orchestration (requires backend support)", async () => {
      const instanceId = `rewind-running-${Date.now()}`;

      taskHubWorker.addOrchestrator(waitingOrchestrator);
      await startWorker();

      // Schedule the orchestration (will be waiting for event)
      await taskHubClient.scheduleNewOrchestration(waitingOrchestrator, undefined, instanceId);

      // Wait for it to start running
      await taskHubClient.waitForOrchestrationStart(instanceId, false, 30);

      // Try to rewind a running orchestration - should fail
      try {
        await taskHubClient.rewindInstance(instanceId, "Test rewind");
        // If we get here, the operation didn't throw - which might be expected on some backends
      } catch (e) {
        expect((e as Error).message).toMatch(/not allow|precondition|running/i);
      } finally {
        // Clean up: terminate the waiting orchestration
        await taskHubClient.terminateOrchestration(instanceId, "Test cleanup");
        await taskHubClient.waitForOrchestrationCompletion(instanceId, false, 30);
      }
    });

    it.skip("should throw an error when rewinding a terminated orchestration (requires backend support)", async () => {
      const instanceId = `rewind-terminated-${Date.now()}`;

      taskHubWorker.addOrchestrator(waitingOrchestrator);
      await startWorker();

      // Schedule the orchestration
      await taskHubClient.scheduleNewOrchestration(waitingOrchestrator, undefined, instanceId);
      await taskHubClient.waitForOrchestrationStart(instanceId, false, 30);

      // Terminate it
      await taskHubClient.terminateOrchestration(instanceId, "Terminating for test");
      const terminatedState = await taskHubClient.waitForOrchestrationCompletion(instanceId, false, 30);
      expect(terminatedState?.runtimeStatus).toBe(OrchestrationStatus.TERMINATED);

      // Try to rewind a terminated orchestration - should fail
      await expect(taskHubClient.rewindInstance(instanceId, "Test rewind")).rejects.toThrow();
    });

    it("should throw an error when instanceId is empty", async () => {
      await expect(taskHubClient.rewindInstance("", "Test rewind")).rejects.toThrow("instanceId is required");
    });
  });
});
