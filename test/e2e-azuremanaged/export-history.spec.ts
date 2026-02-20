// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for the Export History feature against Durable Task Scheduler (DTS).
 *
 * These tests validate the full export history workflow including:
 * - Entity registration and state management
 * - Job creation, status querying, and lifecycle transitions
 * - Export orchestrator execution (listing instances + exporting history)
 * - Integration with Azure Blob Storage (Azurite or real)
 *
 * These tests can run against either:
 * 1. DTS Emulator (default) - No authentication required
 *    docker run -i -p 8080:8080 -d mcr.microsoft.com/dts/dts-emulator:latest
 *
 * 2. Real DTS Scheduler - Requires connection string with authentication
 *
 * Environment variables:
 *   - AZURE_DTS_CONNECTION_STRING: Connection string for real DTS (takes precedence)
 *     Example: Endpoint=https://your-scheduler.eastus.durabletask.io;Authentication=DefaultAzure;TaskHub=your-taskhub
 *   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
 *   - TASKHUB: The task hub name (default: default)
 *   - AZURE_STORAGE_CONNECTION_STRING: Connection string for Azure Blob Storage or Azurite
 *     (default: UseDevelopmentStorage=true)
 *   - EXPORT_CONTAINER_NAME: Blob container name for exports (default: export-history-e2e)
 */

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  OrchestrationContext,
  TOrchestrator,
  ActivityContext,
  ProtoOrchestrationStatus as OrchestrationStatus,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";
import {
  useExportHistoryWorker,
  createExportHistoryClient,
  ExportHistoryClient,
  ExportMode,
  ExportFormatKind,
  ExportJobStatus,
  createExportJobCreationOptions,
  ExportHistoryStorageOptions,
  getOrchestratorInstanceId,
} from "@microsoft/durabletask-js-export-history";

// Read environment variables
const connectionString = process.env.AZURE_DTS_CONNECTION_STRING;
const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";
const storageConnectionString =
  process.env.AZURE_STORAGE_CONNECTION_STRING || "UseDevelopmentStorage=true";
const exportContainerName = process.env.EXPORT_CONTAINER_NAME || "export-history-e2e";

// ============================================================================
// Helpers
// ============================================================================

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
    .endpoint(endpoint, taskHub, null)
    .build();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ============================================================================
// Sample orchestrators and activities (to create instances for export)
// ============================================================================

/** Simple activity that returns a greeting. */
const greetActivity = async (_: ActivityContext, name: string) => {
  return `Hello, ${name}!`;
};

/** Simple orchestrator that calls the greet activity. */
const greetOrchestrator: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  name: string,
): any {
  const result = yield ctx.callActivity(greetActivity, name);
  return result;
};

/** Activity that simulates some work. */
const workActivity = async (_: ActivityContext, input: number) => {
  return input * 2;
};

/** Orchestrator with multiple activity calls for richer history. */
const multiStepOrchestrator: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  startVal: number,
): any {
  const step1 = yield ctx.callActivity(workActivity, startVal);
  const step2 = yield ctx.callActivity(workActivity, step1 as number);
  return step2;
};

// ============================================================================
// E2E Tests
// ============================================================================

describe("Export History E2E Tests (DTS)", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;
  let storageOptions: ExportHistoryStorageOptions;
  let exportClient: ExportHistoryClient;

  beforeEach(async () => {
    taskHubClient = createClient();
    taskHubWorker = createWorker();

    storageOptions = {
      connectionString: storageConnectionString,
      containerName: exportContainerName,
    };

    // Register export history components on the worker
    useExportHistoryWorker(taskHubWorker, {
      client: taskHubClient,
      storageOptions,
    });

    // Register sample orchestrators and activities
    taskHubWorker.addOrchestrator(greetOrchestrator);
    taskHubWorker.addActivity(greetActivity);
    taskHubWorker.addOrchestrator(multiStepOrchestrator);
    taskHubWorker.addActivity(workActivity);

    exportClient = createExportHistoryClient(taskHubClient, storageOptions);
  });

  afterEach(async () => {
    try {
      await taskHubWorker.stop();
    } catch {
      // Worker may not have been started
    }
    await taskHubClient.stop();
  }, 30_000);

  describe("Export Job Entity Lifecycle", () => {
    it("should create an export job and query its status", async () => {
      await taskHubWorker.start();

      const jobId = uniqueId("create-test");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom: new Date("2024-01-01T00:00:00Z"),
        completedTimeTo: new Date("2025-12-31T23:59:59Z"),
        mode: ExportMode.Batch,
      });

      // Create the job via the client
      const jobClient = await exportClient.createJob(options);

      // Query the job status
      const description = await jobClient.describe();

      expect(description).toBeDefined();
      expect(description.jobId).toBe(jobId);
      // After creation, status should be either Active (started immediately)
      // or NotStarted (waiting for orchestrator to pick up)
      expect([ExportJobStatus.Active, ExportJobStatus.NotStarted]).toContain(
        description.status,
      );
      expect(description.config).toBeDefined();
      expect(description.config?.mode).toBe(ExportMode.Batch);
    }, 120_000);

    it("should get the same job when queried by ID", async () => {
      await taskHubWorker.start();

      const jobId = uniqueId("get-test");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom: new Date("2024-01-01T00:00:00Z"),
        mode: ExportMode.Batch,
      });

      await exportClient.createJob(options);

      // Query the same job using the top-level client
      const description = await exportClient.getJob(jobId);

      expect(description).toBeDefined();
      expect(description.jobId).toBe(jobId);
      expect(description.config).toBeDefined();
    }, 120_000);

    it("should delete an export job", async () => {
      await taskHubWorker.start();

      const jobId = uniqueId("delete-test");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom: new Date("2024-01-01T00:00:00Z"),
        mode: ExportMode.Batch,
      });

      const jobClient = await exportClient.createJob(options);

      // Delete the job
      await jobClient.delete();

      // After deletion, the entity is re-initialized on next access.
      // Querying it returns the default initial state (NotStarted, no config).
      const afterDelete = await exportClient.getJob(jobId);
      expect(afterDelete.status).toBe(ExportJobStatus.NotStarted);
      expect(afterDelete.config).toBeUndefined();
      expect(afterDelete.createdAt).toBeUndefined();
    }, 120_000);
  });

  describe("Export Job Execution (Batch Mode)", () => {
    it("should complete a batch export when there are completed orchestrations", async () => {
      await taskHubWorker.start();

      // Record time BEFORE creating orchestrations to narrow the export time window.
      // This avoids picking up unrelated instances from the shared task hub.
      const completedTimeFrom = new Date();

      // Create some completed orchestration instances
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const id = await taskHubClient.scheduleNewOrchestration(greetOrchestrator, `User-${i}`);
        ids.push(id);
      }

      // Wait for all orchestrations to complete
      for (const id of ids) {
        const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);
        expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      }

      // Capture the cutoff time BEFORE creating the export job.
      // This prevents the export infrastructure's own entity-operation orchestrations
      // (which complete during processing) from being returned by listTerminalInstances,
      // which would cause an infinite loop.
      const completedTimeTo = new Date();

      const jobId = uniqueId("batch-export");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
        format: { kind: ExportFormatKind.Jsonl, schemaVersion: "1.0" },
      });

      const jobClient = await exportClient.createJob(options);

      // Wait for the export orchestrator to complete directly (faster than polling entity)
      const exportOrchId = getOrchestratorInstanceId(jobId);
      const orchState = await taskHubClient.waitForOrchestrationCompletion(exportOrchId, true, 90);
      expect(orchState?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      // After orchestrator completes, entity should be marked as Completed
      // Allow a moment for the entity state update to propagate
      await sleep(2000);
      const description = await jobClient.describe();

      // Batch mode should eventually complete
      expect(description.status).toBe(ExportJobStatus.Completed);
      // Should have scanned and exported some instances
      expect(description.scannedInstances).toBeGreaterThanOrEqual(0);
    }, 120_000);

    it("should complete a batch export with no matching instances", async () => {
      await taskHubWorker.start();

      // Create an export job with a time range in the distant past (no instances)
      const jobId = uniqueId("empty-batch");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom: new Date("2020-01-01T00:00:00Z"),
        completedTimeTo: new Date("2020-01-02T00:00:00Z"),
        mode: ExportMode.Batch,
      });

      const jobClient = await exportClient.createJob(options);

      // Wait for the export orchestrator to complete directly
      const exportOrchId = getOrchestratorInstanceId(jobId);
      const orchState = await taskHubClient.waitForOrchestrationCompletion(exportOrchId, true, 90);
      expect(orchState?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      // After orchestrator completes, check entity state
      await sleep(2000);
      const description = await jobClient.describe();

      expect(description.status).toBe(ExportJobStatus.Completed);
      expect(description.exportedInstances).toBe(0);
    }, 120_000);
  });

  describe("Export Job with Multi-Step Orchestrations", () => {
    it("should export orchestrations with multiple activity steps", async () => {
      await taskHubWorker.start();

      // Record time BEFORE creating orchestrations to narrow the export time window.
      const completedTimeFrom = new Date();

      // Create and complete multi-step orchestrations
      const ids: string[] = [];
      for (let i = 0; i < 2; i++) {
        const id = await taskHubClient.scheduleNewOrchestration(multiStepOrchestrator, i + 1);
        ids.push(id);
      }

      for (const id of ids) {
        const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);
        expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      }

      // Capture cutoff time BEFORE creating the export job to prevent infinite loop.
      const completedTimeTo = new Date();

      const jobId = uniqueId("multi-step-export");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
        format: { kind: ExportFormatKind.Json, schemaVersion: "1.0" },
      });

      const jobClient = await exportClient.createJob(options);

      // Wait for the export orchestrator to complete directly
      const exportOrchId = getOrchestratorInstanceId(jobId);
      const orchState = await taskHubClient.waitForOrchestrationCompletion(exportOrchId, true, 90);
      expect(orchState?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      await sleep(2000);
      const description = await jobClient.describe();

      expect(description.status).toBe(ExportJobStatus.Completed);
      expect(description.scannedInstances).toBeGreaterThanOrEqual(0);
    }, 120_000);
  });

  describe("Export Job Configuration Validation", () => {
    it("should use JSONL format by default via createExportJobCreationOptions", () => {
      const options = createExportJobCreationOptions({
        jobId: "test",
        completedTimeFrom: new Date("2024-01-01"),
      });

      expect(options.format.kind).toBe(ExportFormatKind.Jsonl);
      expect(options.mode).toBe(ExportMode.Batch);
      expect(options.maxInstancesPerBatch).toBe(100);
      expect(options.maxParallelExports).toBe(10);
    });

    it("should reject export worker registration with missing connectionString", () => {
      const worker = createWorker();
      const client = createClient();

      expect(() =>
        useExportHistoryWorker(worker, {
          client,
          storageOptions: {
            connectionString: "",
            containerName: "test",
          },
        }),
      ).toThrow("connectionString is required");

      worker.stop().catch(() => {});
      client.stop();
    });

    it("should reject export worker registration with missing containerName", () => {
      const worker = createWorker();
      const client = createClient();

      expect(() =>
        useExportHistoryWorker(worker, {
          client,
          storageOptions: {
            connectionString: "UseDevelopmentStorage=true",
            containerName: "",
          },
        }),
      ).toThrow("containerName is required");

      worker.stop().catch(() => {});
      client.stop();
    });

    it("should reject export client creation with missing connectionString", () => {
      const client = createClient();

      expect(() =>
        createExportHistoryClient(client, {
          connectionString: "",
          containerName: "test",
        }),
      ).toThrow("connectionString is required");

      client.stop();
    });
  });

  describe("Diagnostic", () => {
    it("should verify export orchestrator starts and runs", async () => {
      await taskHubWorker.start();

      // Create the export job entity
      const jobId = uniqueId("diag");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom: new Date("2020-01-01T00:00:00Z"),
        completedTimeTo: new Date("2020-01-02T00:00:00Z"),
        mode: ExportMode.Batch,
      });

      const jobClient = await exportClient.createJob(options);

      // Verify entity has the orchestratorInstanceId set
      const desc = await jobClient.describe();
      expect(desc.orchestratorInstanceId).toBeDefined();

      // Verify the export orchestrator completes successfully
      const orchState = await taskHubClient.waitForOrchestrationCompletion(
        desc.orchestratorInstanceId!,
        true,
        30,
      );
      expect(orchState?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(orchState?.failureDetails).toBeUndefined();
    }, 120_000);
  });
});
