// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for the restartOrchestration API.
 *
 * NOTE: These tests assume the DTS emulator is running. Example command:
 *       docker run -i -p 8080:8080 -d mcr.microsoft.com/dts/dts-emulator:latest
 *
 * Environment variables:
 *   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
 *   - TASKHUB: The task hub name (default: default)
 *   - DURABLE_TASK_SCHEDULER_CONNECTION_STRING: Optional connection string for real Azure DTS
 */

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  ProtoOrchestrationStatus as OrchestrationStatus,
  OrchestrationContext,
  TOrchestrator,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";
import { DefaultAzureCredential } from "@azure/identity";

// Read environment variables
const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";
const connectionString = process.env.DURABLE_TASK_SCHEDULER_CONNECTION_STRING;

/**
 * Helper to create a client that works with both emulator and real Azure DTS
 */
function createClient(): TaskHubGrpcClient {
  if (connectionString) {
    // Parse connection string for real Azure DTS
    const params = new Map<string, string>();
    for (const part of connectionString.split(";")) {
      const [key, ...valueParts] = part.split("=");
      if (key && valueParts.length > 0) {
        params.set(key.trim(), valueParts.join("=").trim());
      }
    }
    const endpointUrl = params.get("Endpoint") || "";
    const taskHubName = params.get("TaskHub") || "default";
    const credential = new DefaultAzureCredential();
    return new DurableTaskAzureManagedClientBuilder().endpoint(endpointUrl, taskHubName, credential).build();
  }

  // Use emulator
  return new DurableTaskAzureManagedClientBuilder()
    .endpoint(endpoint, taskHub, null) // null credential for emulator (no auth)
    .build();
}

/**
 * Helper to create a worker that works with both emulator and real Azure DTS
 */
function createWorker(): TaskHubGrpcWorker {
  if (connectionString) {
    // Parse connection string for real Azure DTS
    const params = new Map<string, string>();
    for (const part of connectionString.split(";")) {
      const [key, ...valueParts] = part.split("=");
      if (key && valueParts.length > 0) {
        params.set(key.trim(), valueParts.join("=").trim());
      }
    }
    const endpointUrl = params.get("Endpoint") || "";
    const taskHubName = params.get("TaskHub") || "default";
    const credential = new DefaultAzureCredential();
    return new DurableTaskAzureManagedWorkerBuilder().endpoint(endpointUrl, taskHubName, credential).build();
  }

  // Use emulator
  return new DurableTaskAzureManagedWorkerBuilder()
    .endpoint(endpoint, taskHub, null) // null credential for emulator (no auth)
    .build();
}

describe("Restart Orchestration E2E Tests", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;
  let workerStarted = false;

  beforeEach(async () => {
    taskHubClient = createClient();
    taskHubWorker = createWorker();
    workerStarted = false;
  });

  afterEach(async () => {
    if (workerStarted) {
      await taskHubWorker.stop();
    }
    await taskHubClient.stop();
  });

  // Helper to start worker and track that it's running
  const startWorker = async () => {
    await taskHubWorker.start();
    workerStarted = true;
  };

  describe("restartOrchestration", () => {
    it("should restart a completed orchestration with the same instance ID", async () => {
      // Orchestrator that returns its input + 1
      const incrementOrchestrator: TOrchestrator = async (_: OrchestrationContext, input: number) => {
        return input + 1;
      };

      taskHubWorker.addOrchestrator(incrementOrchestrator);
      await startWorker();

      // Create and complete the first instance
      const instanceId = `restart-same-id-${Date.now()}`;
      await taskHubClient.scheduleNewOrchestration(incrementOrchestrator, 5, instanceId);
      const firstState = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);

      expect(firstState).toBeDefined();
      expect(firstState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(firstState?.serializedOutput).toEqual(JSON.stringify(6));

      // Restart with same instance ID
      const restartedId = await taskHubClient.restartOrchestration(instanceId, false);
      expect(restartedId).toEqual(instanceId);

      // Wait for the restarted orchestration to complete
      const restartedState = await taskHubClient.waitForOrchestrationCompletion(restartedId, undefined, 30);

      expect(restartedState).toBeDefined();
      expect(restartedState?.instanceId).toEqual(instanceId);
      expect(restartedState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      // Should use the same input as the original
      expect(restartedState?.serializedOutput).toEqual(JSON.stringify(6));
    }, 60000);

    it("should restart a completed orchestration with a new instance ID", async () => {
      // Orchestrator that returns its input doubled
      const doubleOrchestrator: TOrchestrator = async (_: OrchestrationContext, input: number) => {
        return input * 2;
      };

      taskHubWorker.addOrchestrator(doubleOrchestrator);
      await startWorker();

      // Create and complete the first instance
      const originalInstanceId = `restart-new-id-${Date.now()}`;
      await taskHubClient.scheduleNewOrchestration(doubleOrchestrator, 7, originalInstanceId);
      const firstState = await taskHubClient.waitForOrchestrationCompletion(originalInstanceId, undefined, 30);

      expect(firstState).toBeDefined();
      expect(firstState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(firstState?.serializedOutput).toEqual(JSON.stringify(14));

      // Restart with new instance ID
      const newInstanceId = await taskHubClient.restartOrchestration(originalInstanceId, true);
      expect(newInstanceId).not.toEqual(originalInstanceId);

      // Wait for the restarted orchestration to complete
      const restartedState = await taskHubClient.waitForOrchestrationCompletion(newInstanceId, undefined, 30);

      expect(restartedState).toBeDefined();
      expect(restartedState?.instanceId).toEqual(newInstanceId);
      expect(restartedState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      // Should use the same input as the original (7), so output should be 14
      expect(restartedState?.serializedOutput).toEqual(JSON.stringify(14));

      // Original instance should still be queryable and in completed state
      const originalState = await taskHubClient.getOrchestrationState(originalInstanceId);
      expect(originalState).toBeDefined();
      expect(originalState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    }, 60000);

    it("should restart a failed orchestration", async () => {
      let attemptCount = 0;

      // Orchestrator that fails on first attempt, succeeds on restart
      const failOnceOrchestrator: TOrchestrator = async (_: OrchestrationContext, input: string) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error("First attempt failed!");
        }
        return `Success: ${input}`;
      };

      taskHubWorker.addOrchestrator(failOnceOrchestrator);
      await startWorker();

      // Create and let the first instance fail
      const instanceId = `restart-failed-${Date.now()}`;
      await taskHubClient.scheduleNewOrchestration(failOnceOrchestrator, "test-input", instanceId);
      const failedState = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);

      expect(failedState).toBeDefined();
      expect(failedState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(failedState?.failureDetails).toBeDefined();

      // Restart the failed orchestration with a new instance ID
      const restartedId = await taskHubClient.restartOrchestration(instanceId, true);

      // Wait for the restarted orchestration to complete (should succeed this time)
      const restartedState = await taskHubClient.waitForOrchestrationCompletion(restartedId, undefined, 30);

      expect(restartedState).toBeDefined();
      expect(restartedState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(restartedState?.serializedOutput).toEqual(JSON.stringify("Success: test-input"));
    }, 60000);

    it("should restart a terminated orchestration", async () => {
      // Orchestrator that waits for an event
      const waitingOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
        const event = yield ctx.waitForExternalEvent("approval");
        return `Approved: ${input} - ${event}`;
      };

      taskHubWorker.addOrchestrator(waitingOrchestrator);
      await startWorker();

      // Create and terminate the orchestration
      const instanceId = `restart-terminated-${Date.now()}`;
      await taskHubClient.scheduleNewOrchestration(waitingOrchestrator, "my-data", instanceId);
      await taskHubClient.waitForOrchestrationStart(instanceId, undefined, 30);

      // Terminate it
      await taskHubClient.terminateOrchestration(instanceId, "User requested termination");
      const terminatedState = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);

      expect(terminatedState).toBeDefined();
      expect(terminatedState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);

      // Restart with new instance ID
      const restartedId = await taskHubClient.restartOrchestration(instanceId, true);

      // Wait for it to start
      const restartedState = await taskHubClient.waitForOrchestrationStart(restartedId, undefined, 30);
      expect(restartedState).toBeDefined();
      expect(restartedState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING);

      // Send the event so it can complete
      await taskHubClient.raiseOrchestrationEvent(restartedId, "approval", "yes");

      const completedState = await taskHubClient.waitForOrchestrationCompletion(restartedId, undefined, 30);
      expect(completedState).toBeDefined();
      expect(completedState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(completedState?.serializedOutput).toEqual(JSON.stringify("Approved: my-data - yes"));
    }, 60000);

    it("should preserve the original input when restarting", async () => {
      // Orchestrator that returns its input as-is
      const echoOrchestrator: TOrchestrator = async (_: OrchestrationContext, input: any) => {
        return input;
      };

      taskHubWorker.addOrchestrator(echoOrchestrator);
      await startWorker();

      const originalInput = { name: "test", value: 42, nested: { items: [1, 2, 3] } };
      const instanceId = `restart-preserve-input-${Date.now()}`;

      // Create and complete the first instance
      await taskHubClient.scheduleNewOrchestration(echoOrchestrator, originalInput, instanceId);
      const firstState = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);

      expect(firstState).toBeDefined();
      expect(firstState?.serializedOutput).toEqual(JSON.stringify(originalInput));

      // Restart
      const restartedId = await taskHubClient.restartOrchestration(instanceId, true);
      const restartedState = await taskHubClient.waitForOrchestrationCompletion(restartedId, undefined, 30);

      expect(restartedState).toBeDefined();
      // The output should match the original input, proving input was preserved
      expect(restartedState?.serializedOutput).toEqual(JSON.stringify(originalInput));
    }, 60000);

    it("should use default value of false for restartWithNewInstanceId parameter", async () => {
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext, input: number) => {
        return input;
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await startWorker();

      const instanceId = `restart-default-param-${Date.now()}`;
      await taskHubClient.scheduleNewOrchestration(simpleOrchestrator, 100, instanceId);
      await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);

      // Call restart without the second parameter - should default to false (same ID)
      const restartedId = await taskHubClient.restartOrchestration(instanceId);
      expect(restartedId).toEqual(instanceId);
    }, 60000);
  });

  describe("restartOrchestration - negative cases", () => {
    it("should throw an error when restarting a non-existent instance", async () => {
      const nonExistentInstanceId = `non-existent-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await expect(taskHubClient.restartOrchestration(nonExistentInstanceId)).rejects.toThrow();
    }, 30000);

    it("should throw an error when restarting a running instance with same instance ID", async () => {
      // Orchestrator that waits for an event (stays running)
      const waitingOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
        yield ctx.waitForExternalEvent("never_sent_event");
        return "completed";
      };

      taskHubWorker.addOrchestrator(waitingOrchestrator);
      await startWorker();

      const instanceId = `restart-running-error-${Date.now()}`;
      await taskHubClient.scheduleNewOrchestration(waitingOrchestrator, null, instanceId);

      // Wait for it to start (it will be in RUNNING state)
      const runningState = await taskHubClient.waitForOrchestrationStart(instanceId, undefined, 30);
      expect(runningState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING);

      // Attempting to restart with same instance ID while running should fail
      await expect(taskHubClient.restartOrchestration(instanceId, false)).rejects.toThrow();

      // Clean up: terminate the running orchestration
      await taskHubClient.terminateOrchestration(instanceId, "test cleanup");
      await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);
    }, 60000);

    it("should allow restarting a running instance with a new instance ID", async () => {
      // Orchestrator that waits for an event (stays running)
      const waitingOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
        yield ctx.waitForExternalEvent("approval");
        return `approved: ${input}`;
      };

      taskHubWorker.addOrchestrator(waitingOrchestrator);
      await startWorker();

      const instanceId = `restart-running-new-id-${Date.now()}`;
      await taskHubClient.scheduleNewOrchestration(waitingOrchestrator, "original", instanceId);

      // Wait for it to start (it will be in RUNNING state)
      const runningState = await taskHubClient.waitForOrchestrationStart(instanceId, undefined, 30);
      expect(runningState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING);

      // Restarting with new instance ID should succeed even while the original is running
      const newInstanceId = await taskHubClient.restartOrchestration(instanceId, true);
      expect(newInstanceId).not.toEqual(instanceId);

      // The new instance should also be running (waiting for event)
      const newInstanceState = await taskHubClient.waitForOrchestrationStart(newInstanceId, undefined, 30);
      expect(newInstanceState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING);

      // Clean up: terminate both orchestrations
      await taskHubClient.terminateOrchestration(instanceId, "test cleanup");
      await taskHubClient.terminateOrchestration(newInstanceId, "test cleanup");
      await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);
      await taskHubClient.waitForOrchestrationCompletion(newInstanceId, undefined, 30);
    }, 60000);

    it("should throw an error when restarting a suspended instance with same instance ID", async () => {
      // Orchestrator that waits for an event
      const waitingOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
        yield ctx.waitForExternalEvent("never_sent_event");
        return "completed";
      };

      taskHubWorker.addOrchestrator(waitingOrchestrator);
      await startWorker();

      const instanceId = `restart-suspended-error-${Date.now()}`;
      await taskHubClient.scheduleNewOrchestration(waitingOrchestrator, null, instanceId);

      // Wait for it to start
      await taskHubClient.waitForOrchestrationStart(instanceId, undefined, 30);

      // Suspend it
      await taskHubClient.suspendOrchestration(instanceId);

      // Wait a moment for the suspend to take effect
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify it's suspended
      const suspendedState = await taskHubClient.getOrchestrationState(instanceId);
      expect(suspendedState?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED);

      // Attempting to restart with same instance ID while suspended should fail
      await expect(taskHubClient.restartOrchestration(instanceId, false)).rejects.toThrow();

      // Clean up: resume and terminate
      await taskHubClient.resumeOrchestration(instanceId);
      await taskHubClient.terminateOrchestration(instanceId, "test cleanup");
      await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);
    }, 60000);
  });
});
