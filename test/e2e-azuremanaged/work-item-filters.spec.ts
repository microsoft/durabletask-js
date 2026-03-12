// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for Work Item Filters.
 *
 * These tests verify that work item filters correctly control which work items
 * a worker receives from the sidecar. By default, filters are auto-generated
 * from registered orchestrations, activities, and entities. Users can also
 * provide explicit filters or disable filtering entirely.
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
  WorkItemFilters,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
  VersionMatchStrategy,
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

function createWorkerBuilder(): DurableTaskAzureManagedWorkerBuilder {
  if (connectionString) {
    return new DurableTaskAzureManagedWorkerBuilder().connectionString(connectionString);
  }
  return new DurableTaskAzureManagedWorkerBuilder().endpoint(endpoint, taskHub, null);
}

describe("Work Item Filters E2E Tests", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;

  beforeEach(() => {
    taskHubClient = createClient();
  });

  afterEach(async () => {
    try {
      await taskHubWorker.stop();
    } catch {
      // Worker wasn't started or already stopped
    }
    await taskHubClient.stop();
  });

  describe("Auto-generated filters (default behavior)", () => {
    it("should process orchestrations with auto-generated filters from registry", async () => {
      // Arrange — worker with default filters (auto-generated from registry)
      const sayHello = async (_: ActivityContext, name: string) => `Hello, ${name}!`;

      const helloOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, name: string): any {
        const result = yield ctx.callActivity(sayHello, name);
        return result;
      };

      taskHubWorker = createWorkerBuilder().addOrchestrator(helloOrchestrator).addActivity(sayHello).build();
      await taskHubWorker.start();

      // Act
      const id = await taskHubClient.scheduleNewOrchestration(helloOrchestrator, "World");
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      // Assert
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify("Hello, World!"));
    }, 31000);

    it("should process orchestrations with activities using auto-generated filters", async () => {
      // Arrange — orchestrator that calls multiple activities
      const double = async (_: ActivityContext, n: number) => n * 2;
      const addTen = async (_: ActivityContext, n: number) => n + 10;

      const mathOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
        const doubled = yield ctx.callActivity(double, input);
        const result = yield ctx.callActivity(addTen, doubled);
        return result;
      };

      taskHubWorker = createWorkerBuilder()
        .addOrchestrator(mathOrchestrator)
        .addActivity(double)
        .addActivity(addTen)
        .build();
      await taskHubWorker.start();

      // Act
      const id = await taskHubClient.scheduleNewOrchestration(mathOrchestrator, 5);
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      // Assert — (5 * 2) + 10 = 20
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify(20));
    }, 31000);
  });

  describe("Disabled filters (null)", () => {
    it("should process all orchestrations when filters are explicitly disabled", async () => {
      // Arrange — worker with filters explicitly set to null (receive all work items)
      const echo = async (_: ActivityContext, input: string) => input;

      const echoOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
        const result = yield ctx.callActivity(echo, input);
        return result;
      };

      taskHubWorker = createWorkerBuilder()
        .addOrchestrator(echoOrchestrator)
        .addActivity(echo)
        .useWorkItemFilters(null)
        .build();
      await taskHubWorker.start();

      // Act
      const id = await taskHubClient.scheduleNewOrchestration(echoOrchestrator, "no-filter");
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      // Assert
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify("no-filter"));
    }, 31000);
  });

  describe("Filters with versions", () => {
    it("should auto-generate filters with version when Strict versioning is configured", async () => {
      // Arrange — worker with Strict versioning; auto-generated filters should include the version
      const multiply = async (_: ActivityContext, input: { a: number; b: number }) => input.a * input.b;

      const versionedOrch: TOrchestrator = async function* (ctx: OrchestrationContext, input: { a: number; b: number }): any {
        const result = yield ctx.callActivity(multiply, input);
        return { version: ctx.version, result };
      };

      taskHubWorker = createWorkerBuilder()
        .addOrchestrator(versionedOrch)
        .addActivity(multiply)
        .versioning({ version: "2.0.0", matchStrategy: VersionMatchStrategy.Strict })
        .build();
      await taskHubWorker.start();

      // Act — schedule with matching version
      const id = await taskHubClient.scheduleNewOrchestration(versionedOrch, { a: 6, b: 7 }, {
        version: "2.0.0",
      });
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      // Assert
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = JSON.parse(state?.serializedOutput ?? "{}");
      expect(output.version).toEqual("2.0.0");
      expect(output.result).toEqual(42);
    }, 31000);

    it("should process orchestration with explicit versioned filters", async () => {
      // Arrange — worker with explicit filters that include specific versions
      const greet = async (_: ActivityContext, name: string) => `Hello v3, ${name}!`;

      const greetOrch: TOrchestrator = async function* (ctx: OrchestrationContext, name: string): any {
        const result = yield ctx.callActivity(greet, name);
        return result;
      };

      const filters: WorkItemFilters = {
        orchestrations: [{ name: "greetOrch", versions: ["3.0.0"] }],
        activities: [{ name: "greet", versions: ["3.0.0"] }],
      };

      taskHubWorker = createWorkerBuilder()
        .addOrchestrator(greetOrch)
        .addActivity(greet)
        .useWorkItemFilters(filters)
        .build();
      await taskHubWorker.start();

      // Act — schedule with the version that matches the filter
      const id = await taskHubClient.scheduleNewOrchestration(greetOrch, "VersionTest", {
        version: "3.0.0",
      });
      const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      // Assert
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify("Hello v3, VersionTest!"));
    }, 31000);
  });

  describe("Filtered-out work items", () => {
    // TODO: Enable after DTS emulator and scheduler enforce work item filters server-side.
    // Currently the sidecar dispatches all work items to the only connected worker regardless
    // of filters. The unregistered orchestration gets dispatched and fails (status=FAILED)
    // instead of remaining PENDING. Server-side filter enforcement is tracked separately.
    it.skip("should not dispatch orchestration that is not in the filter", async () => {
      // Arrange — worker only registers (and auto-filters for) 'registeredOrch',
      // then we schedule 'unregisteredOrch' which is NOT in the filter
      const registeredOrch: TOrchestrator = async (_: OrchestrationContext) => {
        return "registered";
      };

      taskHubWorker = createWorkerBuilder().addOrchestrator(registeredOrch).build();
      await taskHubWorker.start();

      // Act — schedule an orchestration by name that doesn't match any filter
      const id = await taskHubClient.scheduleNewOrchestration("unregisteredOrch", undefined);

      // Wait a bit to give the sidecar time to (not) dispatch it
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const state = await taskHubClient.getOrchestrationState(id);

      // Assert — orchestration should remain PENDING because the sidecar won't
      // dispatch it to this worker (its name isn't in the filter)
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_PENDING);
    }, 31000);
  });
});
