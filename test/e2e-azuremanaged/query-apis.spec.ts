// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for Query APIs (getAllInstances, listInstanceIds).
 *
 * NOTE: These tests can run against either:
 *   1. DTS emulator - set ENDPOINT and TASKHUB environment variables
 *   2. Real Azure DTS - set DURABLE_TASK_SCHEDULER_CONNECTION_STRING environment variable
 *
 * Example for emulator:
 *   docker run -i -p 8080:8080 -d mcr.microsoft.com/dts/dts-emulator:latest
 *   ENDPOINT=localhost:8080 TASKHUB=default npx jest query-apis.spec.ts
 *
 * Example for real DTS:
 *   DURABLE_TASK_SCHEDULER_CONNECTION_STRING="Endpoint=https://...;Authentication=DefaultAzure;TaskHub=th3" npx jest query-apis.spec.ts
 */

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  OrchestrationStatus,
  OrchestrationContext,
  TOrchestrator,
  OrchestrationQuery,
  Page,
  OrchestrationState,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

// Read environment variables - support both connection string and endpoint/taskhub
const connectionString = process.env.DURABLE_TASK_SCHEDULER_CONNECTION_STRING;
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

describe("Query APIs E2E Tests", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;

  beforeEach(async () => {
    taskHubClient = createClient();
    taskHubWorker = createWorker();
  });

  afterEach(async () => {
    await taskHubWorker.stop();
    await taskHubClient.stop();
  });

  describe("getAllInstances", () => {
    it("should query all orchestration instances without filters", async () => {
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "completed";
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await taskHubWorker.start();

      // Schedule multiple orchestrations
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const id = await taskHubClient.scheduleNewOrchestration(simpleOrchestrator);
        ids.push(id);
        await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);
      }

      // Query all instances
      const pageable = taskHubClient.getAllInstances();
      const foundInstances: OrchestrationState[] = [];

      for await (const instance of pageable) {
        if (ids.includes(instance.instanceId)) {
          foundInstances.push(instance);
        }
      }

      // Verify we found all the instances we created
      expect(foundInstances.length).toBe(3);
      for (const id of ids) {
        expect(foundInstances.some((i) => i.instanceId === id)).toBe(true);
      }
    }, 60000);

    it("should query instances filtered by status", async () => {
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "completed";
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await taskHubWorker.start();

      // Schedule and complete an orchestration
      const id = await taskHubClient.scheduleNewOrchestration(simpleOrchestrator);
      await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      // Query only completed instances
      const query: OrchestrationQuery = {
        statuses: [OrchestrationStatus.COMPLETED],
      };

      const pageable = taskHubClient.getAllInstances(query);
      let foundInstance: OrchestrationState | undefined;

      for await (const instance of pageable) {
        if (instance.instanceId === id) {
          foundInstance = instance;
          break;
        }
      }

      expect(foundInstance).toBeDefined();
      expect(foundInstance?.instanceId).toBe(id);
      expect(foundInstance?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
    }, 60000);

    it("should query instances with instanceIdPrefix filter", async () => {
      const prefix = `test-prefix-${Date.now()}-`;
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "completed";
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await taskHubWorker.start();

      // Schedule orchestrations with specific prefix
      const prefixedIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const instanceId = `${prefix}${i}`;
        await taskHubClient.scheduleNewOrchestration(simpleOrchestrator, undefined, instanceId);
        prefixedIds.push(instanceId);
        await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);
      }

      // Also schedule one without the prefix
      const nonPrefixedId = await taskHubClient.scheduleNewOrchestration(simpleOrchestrator);
      await taskHubClient.waitForOrchestrationCompletion(nonPrefixedId, undefined, 30);

      // Query only instances with the prefix
      const query: OrchestrationQuery = {
        instanceIdPrefix: prefix,
      };

      const pageable = taskHubClient.getAllInstances(query);
      const foundInstances: OrchestrationState[] = [];

      for await (const instance of pageable) {
        foundInstances.push(instance);
      }

      // Should find exactly the prefixed instances
      expect(foundInstances.length).toBe(2);
      for (const id of prefixedIds) {
        expect(foundInstances.some((i) => i.instanceId === id)).toBe(true);
      }
      expect(foundInstances.some((i) => i.instanceId === nonPrefixedId)).toBe(false);
    }, 60000);

    it("should respect pageSize when iterating", async () => {
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "completed";
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await taskHubWorker.start();

      // Schedule multiple orchestrations
      const ids: string[] = [];
      const prefix = `page-test-${Date.now()}-`;
      for (let i = 0; i < 5; i++) {
        const instanceId = `${prefix}${i}`;
        await taskHubClient.scheduleNewOrchestration(simpleOrchestrator, undefined, instanceId);
        ids.push(instanceId);
        await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);
      }

      // Query with small page size
      const query: OrchestrationQuery = {
        instanceIdPrefix: prefix,
        pageSize: 2,
      };

      const pageable = taskHubClient.getAllInstances(query);
      const pages: Page<OrchestrationState>[] = [];

      for await (const page of pageable.asPages()) {
        pages.push(page);
      }

      // Should have multiple pages
      expect(pages.length).toBeGreaterThan(1);

      // Each page should have at most 2 items (the page size)
      for (const page of pages) {
        expect(page.values.length).toBeLessThanOrEqual(2);
      }

      // Total items should be 5
      const totalItems = pages.reduce((sum, page) => sum + page.values.length, 0);
      expect(totalItems).toBe(5);
    }, 120000);

    it("should fetch inputs and outputs when requested", async () => {
      const echoOrchestrator: TOrchestrator = async (_: OrchestrationContext, input: any) => {
        return { received: input };
      };

      taskHubWorker.addOrchestrator(echoOrchestrator);
      await taskHubWorker.start();

      const input = { message: "hello" };
      const id = await taskHubClient.scheduleNewOrchestration(echoOrchestrator, input);
      await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      // Query with fetchInputsAndOutputs = true
      const query: OrchestrationQuery = {
        fetchInputsAndOutputs: true,
      };

      const pageable = taskHubClient.getAllInstances(query);
      let foundInstance: OrchestrationState | undefined;

      for await (const instance of pageable) {
        if (instance.instanceId === id) {
          foundInstance = instance;
          break;
        }
      }

      expect(foundInstance).toBeDefined();
      // Note: Input should always be available when fetchInputsAndOutputs is true
      // Output may or may not be available depending on orchestration state
      expect(foundInstance?.serializedInput).toBeDefined();
    }, 60000);

    it("should filter by createdFrom and createdTo", async () => {
      const prefix = `time-filter-${Date.now()}-`;
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "completed";
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await taskHubWorker.start();

      const beforeTime = new Date(Date.now() - 60000); // 1 minute ago

      const instanceId = `${prefix}test`;
      await taskHubClient.scheduleNewOrchestration(simpleOrchestrator, undefined, instanceId);
      await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);

      const afterTime = new Date(Date.now() + 60000); // 1 minute from now

      // Query with time range that includes the orchestration
      const query: OrchestrationQuery = {
        createdFrom: beforeTime,
        createdTo: afterTime,
        instanceIdPrefix: prefix,
      };

      const pageable = taskHubClient.getAllInstances(query);
      let foundInstance: OrchestrationState | undefined;

      for await (const instance of pageable) {
        if (instance.instanceId === instanceId) {
          foundInstance = instance;
          break;
        }
      }

      expect(foundInstance).toBeDefined();
      expect(foundInstance?.instanceId).toBe(instanceId);
    }, 60000);
  });

  describe("listInstanceIds", () => {
    it("should list all instance IDs", async () => {
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "completed";
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await taskHubWorker.start();

      // Schedule multiple orchestrations with unique prefix
      const prefix = `list-ids-${Date.now()}-`;
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const instanceId = `${prefix}${i}`;
        await taskHubClient.scheduleNewOrchestration(simpleOrchestrator, undefined, instanceId);
        ids.push(instanceId);
        await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);
      }

      // List instance IDs and paginate through all results
      const allInstanceIds: string[] = [];
      let lastInstanceKey: string | undefined = undefined;
      
      do {
        const page = await taskHubClient.listInstanceIds({
          runtimeStatus: [OrchestrationStatus.COMPLETED],
          lastInstanceKey,
        });
        allInstanceIds.push(...page.values);
        lastInstanceKey = page.continuationToken;
      } while (lastInstanceKey && lastInstanceKey !== "");

      // Verify we can find the created instance IDs
      for (const id of ids) {
        expect(allInstanceIds.includes(id)).toBe(true);
      }
    }, 60000);

    it("should filter by runtime status", async () => {
      const prefix = `filter-status-${Date.now()}-`;
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "completed";
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await taskHubWorker.start();

      // Schedule and complete an orchestration with unique ID
      const instanceId = `${prefix}test`;
      await taskHubClient.scheduleNewOrchestration(simpleOrchestrator, undefined, instanceId);
      await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 30);

      // List completed instances and paginate through all results
      const allInstanceIds: string[] = [];
      let lastInstanceKey: string | undefined = undefined;

      do {
        const page = await taskHubClient.listInstanceIds({
          runtimeStatus: [OrchestrationStatus.COMPLETED],
          lastInstanceKey,
        });
        allInstanceIds.push(...page.values);
        lastInstanceKey = page.continuationToken;
      } while (lastInstanceKey && lastInstanceKey !== "");

      expect(allInstanceIds.includes(instanceId)).toBe(true);
    }, 60000);

    it("should support pagination with lastInstanceKey", async () => {
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "completed";
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await taskHubWorker.start();

      // Schedule multiple orchestrations
      for (let i = 0; i < 5; i++) {
        const id = await taskHubClient.scheduleNewOrchestration(simpleOrchestrator);
        await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);
      }

      // Get first page with small page size
      const firstPage = await taskHubClient.listInstanceIds({
        pageSize: 2,
      });

      expect(firstPage.values.length).toBeLessThanOrEqual(2);

      // If there are more results, get the next page
      if (firstPage.hasMoreResults && firstPage.continuationToken) {
        const secondPage = await taskHubClient.listInstanceIds({
          pageSize: 2,
          lastInstanceKey: firstPage.continuationToken,
        });

        expect(secondPage.values.length).toBeGreaterThan(0);

        // First and second page should have different instance IDs
        const firstPageIds = new Set(firstPage.values);
        for (const id of secondPage.values) {
          expect(firstPageIds.has(id)).toBe(false);
        }
      }
    }, 120000);

    it("should respect pageSize parameter", async () => {
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "completed";
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await taskHubWorker.start();

      // Schedule multiple orchestrations
      for (let i = 0; i < 5; i++) {
        const id = await taskHubClient.scheduleNewOrchestration(simpleOrchestrator);
        await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);
      }

      // List with specific page size
      const page = await taskHubClient.listInstanceIds({
        pageSize: 3,
      });

      expect(page.values.length).toBeLessThanOrEqual(3);
    }, 60000);

    it("should filter by completed time range", async () => {
      const simpleOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "completed";
      };

      taskHubWorker.addOrchestrator(simpleOrchestrator);
      await taskHubWorker.start();

      // Use a wide time window to account for clock differences between client and server
      const beforeTime = new Date(Date.now() - 60000); // 1 minute ago

      const id = await taskHubClient.scheduleNewOrchestration(simpleOrchestrator);
      await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

      const afterTime = new Date(Date.now() + 60000); // 1 minute from now

      // List with completed time filter
      const page = await taskHubClient.listInstanceIds({
        runtimeStatus: [OrchestrationStatus.COMPLETED],
        completedTimeFrom: beforeTime,
        completedTimeTo: afterTime,
      });

      // The instance should be in the results
      expect(page.values.includes(id)).toBe(true);
    }, 60000);
  });

  describe("Query API Integration", () => {
    it("should correctly differentiate between running and completed instances", async () => {
      const longRunningOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Wait for an event that won't come (simulates long-running)
        yield ctx.waitForExternalEvent("never-sent");
        return "completed";
      };

      const quickOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "quick";
      };

      taskHubWorker.addOrchestrator(longRunningOrchestrator);
      taskHubWorker.addOrchestrator(quickOrchestrator);
      await taskHubWorker.start();

      // Schedule a long-running orchestration (will stay in RUNNING state)
      const runningId = await taskHubClient.scheduleNewOrchestration(longRunningOrchestrator);
      await taskHubClient.waitForOrchestrationStart(runningId, false, 10);

      // Schedule a quick orchestration (will complete)
      const completedId = await taskHubClient.scheduleNewOrchestration(quickOrchestrator);
      await taskHubClient.waitForOrchestrationCompletion(completedId, undefined, 30);

      // Query for running instances
      const runningQuery: OrchestrationQuery = {
        statuses: [OrchestrationStatus.RUNNING],
      };
      const runningPageable = taskHubClient.getAllInstances(runningQuery);
      const runningInstances: string[] = [];
      for await (const instance of runningPageable) {
        runningInstances.push(instance.instanceId);
      }

      // Query for completed instances
      const completedQuery: OrchestrationQuery = {
        statuses: [OrchestrationStatus.COMPLETED],
      };
      const completedPageable = taskHubClient.getAllInstances(completedQuery);
      const completedInstances: string[] = [];
      for await (const instance of completedPageable) {
        completedInstances.push(instance.instanceId);
      }

      expect(runningInstances).toContain(runningId);
      expect(completedInstances).toContain(completedId);
      expect(runningInstances).not.toContain(completedId);
      expect(completedInstances).not.toContain(runningId);

      // Terminate the long-running orchestration for cleanup
      await taskHubClient.terminateOrchestration(runningId);
    }, 60000);

    it("should handle empty query results gracefully", async () => {
      // Start the worker (required by afterEach)
      const dummyOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
        return "dummy";
      };
      taskHubWorker.addOrchestrator(dummyOrchestrator);
      await taskHubWorker.start();

      // Query with a very specific prefix that shouldn't match anything
      const nonExistentPrefix = `non-existent-${Date.now()}-${Math.random()}`;
      const query: OrchestrationQuery = {
        instanceIdPrefix: nonExistentPrefix,
      };

      const pageable = taskHubClient.getAllInstances(query);
      const instances: OrchestrationState[] = [];

      for await (const instance of pageable) {
        instances.push(instance);
      }

      expect(instances.length).toBe(0);
    }, 30000);
  });
});
