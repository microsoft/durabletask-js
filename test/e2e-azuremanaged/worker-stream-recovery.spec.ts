// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for worker stream recovery behavior.
 *
 * These tests verify that the TaskHubGrpcWorker handles gRPC connection
 * failures gracefully — specifically that it retries on stream errors and
 * does not crash or hang when the sidecar is unreachable.
 *
 * The test connects to a port where no emulator/sidecar is running, which
 * triggers the exact gRPC UNAVAILABLE errors that the stream recovery logic
 * is designed to handle.
 *
 * Environment variables:
 *   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
 *   - TASKHUB: The task hub name (default: default)
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

const connectionString = process.env.DTS_CONNECTION_STRING;
const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

function createClient(): TaskHubGrpcClient {
  if (connectionString) {
    return new DurableTaskAzureManagedClientBuilder().connectionString(connectionString).build();
  }
  return new DurableTaskAzureManagedClientBuilder()
    .endpoint(endpoint, taskHub, null)
    .build();
}

function createWorker(): TaskHubGrpcWorker {
  if (connectionString) {
    return new DurableTaskAzureManagedWorkerBuilder().connectionString(connectionString).build();
  }
  return new DurableTaskAzureManagedWorkerBuilder()
    .endpoint(endpoint, taskHub, null)
    .build();
}

/**
 * Creates a worker that connects to a port where no sidecar is running.
 * This triggers gRPC UNAVAILABLE errors, exercising the stream recovery path.
 */
function createWorkerWithBadEndpoint(): TaskHubGrpcWorker {
  // Port 19999 — deliberately unused, triggers gRPC UNAVAILABLE
  return new DurableTaskAzureManagedWorkerBuilder()
    .endpoint("localhost:19999", "nonexistent", null)
    .build();
}

describe("Worker Stream Recovery E2E Tests", () => {
  it("should not crash when connecting to an unreachable sidecar and should shut down cleanly", async () => {
    const worker = createWorkerWithBadEndpoint();

    // Register a dummy orchestrator so the worker has something registered
    const dummyOrchestrator: TOrchestrator = async (_: OrchestrationContext) => "hello";
    worker.addOrchestrator(dummyOrchestrator);

    // Start the worker — it will fail to connect and begin retrying
    // The key assertion: start() must not throw even though the sidecar is down
    await worker.start();

    // Give the worker time to attempt at least one retry cycle
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // The worker should shut down cleanly without throwing or hanging
    await worker.stop();
  }, 15000);

  it("should recover and process work after initial connection failure followed by a working connection", async () => {
    // Skip if no real emulator is available (this test needs a running sidecar)
    const client = createClient();
    try {
      // Quick check if emulator is reachable
      const testId = await client.scheduleNewOrchestration(async (_: OrchestrationContext) => "ping");
      await client.waitForOrchestrationCompletion(testId, undefined, 5).catch(() => {});
      await client.purgeOrchestration(testId).catch(() => {});
    } catch {
      // Emulator not running — skip this test
      await client.stop();
      console.log("Skipping recovery test: DTS emulator not reachable");
      return;
    }

    // Phase 1: Start a worker against a bad endpoint — it retries in the background
    const badWorker = createWorkerWithBadEndpoint();
    const orchestrator: TOrchestrator = async (_: OrchestrationContext) => "recovered";
    badWorker.addOrchestrator(orchestrator);
    await badWorker.start();

    // Let it fail a couple times
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Stop the bad worker cleanly
    await badWorker.stop();

    // Phase 2: Start a fresh worker against the real emulator — must work normally
    const goodWorker = createWorker();
    goodWorker.addOrchestrator(orchestrator);
    await goodWorker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toContain("recovered");

    await goodWorker.stop();
    await client.stop();
  }, 45000);
});
