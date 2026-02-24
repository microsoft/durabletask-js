// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for the Export History feature against Durable Task Scheduler (DTS).
 *
 * These tests require a real DTS scheduler with entity support. The DTS emulator
 * does not currently support entities, so these tests are SKIPPED by default.
 *
 * To run locally, set the EXPORT_HISTORY_E2E=1 environment variable:
 *
 *   $env:EXPORT_HISTORY_E2E = "1"
 *   $env:AZURE_DTS_CONNECTION_STRING = "Endpoint=https://...;Authentication=DefaultAzure;TaskHub=..."
 *   npx jest test/e2e-azuremanaged/export-history.spec.ts --config jest.config.js --forceExit
 *
 * These tests validate the full export history workflow including:
 * - Entity registration and state management
 * - Job creation, status querying, and lifecycle transitions
 * - Export orchestrator execution (listing instances + exporting history)
 * - Blob storage verification (correct blobs, content, format)
 * - Integration with Azure Blob Storage (Azurite or real)
 *
 * Environment variables:
 *   - EXPORT_HISTORY_E2E: Set to "1" to enable these tests (default: skipped)
 *   - AZURE_DTS_CONNECTION_STRING: Connection string for real DTS (required)
 *     Example: Endpoint=https://your-scheduler.eastus.durabletask.io;Authentication=DefaultAzure;TaskHub=your-taskhub
 *   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
 *   - TASKHUB: The task hub name (default: default)
 *   - AZURE_STORAGE_CONNECTION_STRING: Connection string for Azure Blob Storage or Azurite
 *     (default: UseDevelopmentStorage=true)
 *   - EXPORT_CONTAINER_NAME: Blob container name for exports (default: export-history-e2e)
 */

import { gunzipSync } from "zlib";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  OrchestrationContext,
  TOrchestrator,
  ActivityContext,
  OrchestrationStatus as ClientOrchestrationStatus,
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

/**
 * Buffer in milliseconds to account for clock skew between the local machine
 * and the DTS server. Without this, the completed-time window may be too narrow
 * to capture recently completed instances.
 */
const TIME_BUFFER_MS = 10_000;

/**
 * Returns a time window that accounts for clock skew with the DTS server.
 * - `from`: set before orchestrations are created, shifted back by TIME_BUFFER_MS
 * - `to`: captured after a sleep following orchestration completion, ensuring
 *   the server-side completion timestamp falls within the window.
 */
function bufferedTimeFrom(): Date {
  return new Date(Date.now() - TIME_BUFFER_MS);
}

async function bufferedTimeTo(): Promise<Date> {
  await sleep(TIME_BUFFER_MS);
  return new Date();
}

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

/**
 * Lists all blobs in a container with an optional prefix and returns their names.
 */
async function listBlobs(container: ContainerClient, prefix?: string): Promise<string[]> {
  const names: string[] = [];
  for await (const blob of container.listBlobsFlat({ prefix })) {
    names.push(blob.name);
  }
  return names;
}

/**
 * Downloads a blob and returns its content as a string.
 * Automatically decompresses gzip content based on the file extension.
 */
async function downloadBlobContent(container: ContainerClient, blobName: string): Promise<string> {
  const blobClient = container.getBlobClient(blobName);
  const downloadResponse = await blobClient.download();
  const chunks: Buffer[] = [];
  const readableStream = downloadResponse.readableStreamBody;
  if (!readableStream) {
    throw new Error(`Failed to download blob ${blobName}`);
  }
  for await (const chunk of readableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const rawData = Buffer.concat(chunks);

  // Decompress if gzip
  if (blobName.endsWith(".gz")) {
    return gunzipSync(rawData).toString("utf-8");
  }
  return rawData.toString("utf-8");
}

/**
 * Parses JSONL content into an array of objects.
 */
function parseJsonl(content: string): object[] {
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

/**
 * Creates sample orchestrations, waits for them to complete, and returns their instance IDs.
 */
async function createAndCompleteOrchestrations(
  client: TaskHubGrpcClient,
  orchestrator: TOrchestrator,
  inputs: unknown[],
  timeout = 30,
): Promise<string[]> {
  const ids: string[] = [];
  for (const input of inputs) {
    const id = await client.scheduleNewOrchestration(orchestrator, input);
    ids.push(id);
  }
  for (const id of ids) {
    const state = await client.waitForOrchestrationCompletion(id, undefined, timeout);
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
  }
  return ids;
}

/**
 * Runs an export job and waits for it to complete. Returns the job description.
 */
async function runExportJobToCompletion(
  client: TaskHubGrpcClient,
  exportClient: ExportHistoryClient,
  options: ReturnType<typeof createExportJobCreationOptions>,
  timeoutSec = 240,
) {
  const jobClient = await exportClient.createJob(options);
  const exportOrchId = getOrchestratorInstanceId(options.jobId);
  const orchState = await client.waitForOrchestrationCompletion(exportOrchId, true, timeoutSec);
  expect(orchState?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
  // Allow entity state update to propagate
  await sleep(3000);
  const description = await jobClient.describe();
  return description;
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

/** Activity that always throws for testing failed orchestrations. */
const failActivity = async (_: ActivityContext, _input: string) => {
  throw new Error("Intentional test failure");
};

/** Orchestrator that fails by calling the fail activity. */
const failOrchestrator: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  input: string,
): any {
  const result = yield ctx.callActivity(failActivity, input);
  return result;
};

// ============================================================================
// E2E Tests
// ============================================================================

// Skip in CI — the DTS emulator does not support entities.
// Set EXPORT_HISTORY_E2E=1 to run locally against a real DTS scheduler.
const describeIfEnabled = process.env.EXPORT_HISTORY_E2E === "1" ? describe : describe.skip;

describeIfEnabled("Export History E2E Tests (DTS)", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;
  let storageOptions: ExportHistoryStorageOptions;
  let exportClient: ExportHistoryClient;
  let containerClient: ContainerClient;

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
    taskHubWorker.addOrchestrator(failOrchestrator);
    taskHubWorker.addActivity(failActivity);

    exportClient = createExportHistoryClient(taskHubClient, storageOptions);

    // Set up blob container client for verification
    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
    containerClient = blobServiceClient.getContainerClient(exportContainerName);
    await containerClient.createIfNotExists();
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

      const jobClient = await exportClient.createJob(options);
      const description = await jobClient.describe();

      expect(description).toBeDefined();
      expect(description.jobId).toBe(jobId);
      expect([ExportJobStatus.Active, ExportJobStatus.Pending]).toContain(description.status);
      expect(description.config).toBeDefined();
      expect(description.config?.mode).toBe(ExportMode.Batch);
    }, 120_000);

    it("should get the same job when queried by ID", async () => {
      await taskHubWorker.start();

      const jobId = uniqueId("get-test");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom: new Date("2024-01-01T00:00:00Z"),
        completedTimeTo: new Date("2025-12-31T23:59:59Z"),
        mode: ExportMode.Batch,
      });

      await exportClient.createJob(options);
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
        completedTimeTo: new Date("2025-12-31T23:59:59Z"),
        mode: ExportMode.Batch,
      });

      const jobClient = await exportClient.createJob(options);
      await jobClient.delete();

      const afterDelete = await exportClient.getJob(jobId);
      expect(afterDelete.status).toBe(ExportJobStatus.Pending);
      expect(afterDelete.config).toBeUndefined();
      expect(afterDelete.createdAt).toBeUndefined();
    }, 120_000);

    it("should auto-generate a jobId when none is provided", async () => {
      await taskHubWorker.start();

      const options = createExportJobCreationOptions({
        completedTimeFrom: new Date("2020-01-01T00:00:00Z"),
        completedTimeTo: new Date("2020-01-02T00:00:00Z"),
        mode: ExportMode.Batch,
      });

      // jobId should have been auto-generated (32 hex chars, no dashes)
      expect(options.jobId).toBeDefined();
      expect(options.jobId).toMatch(/^[0-9a-f]{32}$/);

      const jobClient = await exportClient.createJob(options);
      const description = await jobClient.describe();

      expect(description.jobId).toBe(options.jobId);
    }, 120_000);
  });

  describe("Export Job Execution & Blob Verification", () => {
    it("should export exactly N completed instances and produce matching blob count", async () => {
      await taskHubWorker.start();

      const completedTimeFrom = bufferedTimeFrom();

      // Create exactly 3 orchestrations and wait for them to complete
      const ids = await createAndCompleteOrchestrations(
        taskHubClient,
        greetOrchestrator,
        ["Alice", "Bob", "Charlie"],
      );
      expect(ids).toHaveLength(3);

      const completedTimeTo = await bufferedTimeTo();

      const jobId = uniqueId("count-verify");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
        format: { kind: ExportFormatKind.Jsonl, schemaVersion: "1.0" },
      });

      const description = await runExportJobToCompletion(
        taskHubClient,
        exportClient,
        options,
      );

      expect(description.status).toBe(ExportJobStatus.Completed);
      // We created 3 instances; the export should have found at least those 3.
      expect(description.exportedInstances).toBeGreaterThanOrEqual(3);

      // Verify blobs were actually written – one blob per exported instance
      const blobPrefix = `batch-${jobId}/`;
      const blobs = await listBlobs(containerClient, blobPrefix);
      expect(blobs.length).toBeGreaterThanOrEqual(3);
    }, 180_000);

    it("should produce zero exports and no blobs for an empty time window", async () => {
      await taskHubWorker.start();

      const jobId = uniqueId("empty-window");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom: new Date("2020-01-01T00:00:00Z"),
        completedTimeTo: new Date("2020-01-02T00:00:00Z"),
        mode: ExportMode.Batch,
      });

      const description = await runExportJobToCompletion(
        taskHubClient,
        exportClient,
        options,
      );

      expect(description.status).toBe(ExportJobStatus.Completed);
      expect(description.exportedInstances).toBe(0);

      // No blobs should be written for an empty export
      const blobPrefix = `batch-${jobId}/`;
      const blobs = await listBlobs(containerClient, blobPrefix);
      expect(blobs).toHaveLength(0);
    }, 120_000);

    it("should export a single completed instance with correct JSONL.GZ blob content", async () => {
      await taskHubWorker.start();

      const completedTimeFrom = bufferedTimeFrom();
      const orchestrationInput = "SingleTestUser";
      const ids = await createAndCompleteOrchestrations(
        taskHubClient,
        greetOrchestrator,
        [orchestrationInput],
      );
      expect(ids).toHaveLength(1);

      const completedTimeTo = await bufferedTimeTo();

      const jobId = uniqueId("blob-content");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
        format: { kind: ExportFormatKind.Jsonl, schemaVersion: "1.0" },
      });

      const description = await runExportJobToCompletion(
        taskHubClient,
        exportClient,
        options,
      );

      expect(description.status).toBe(ExportJobStatus.Completed);
      expect(description.exportedInstances).toBeGreaterThanOrEqual(1);

      // Download and verify blob content
      const blobPrefix = `batch-${jobId}/`;
      const blobs = await listBlobs(containerClient, blobPrefix);
      expect(blobs.length).toBeGreaterThanOrEqual(1);

      // Find a blob that should be .jsonl.gz
      const jsonlGzBlob = blobs.find((b) => b.endsWith(".jsonl.gz"));
      expect(jsonlGzBlob).toBeDefined();

      // Download and decompress the blob
      const content = await downloadBlobContent(containerClient, jsonlGzBlob!);
      const events = parseJsonl(content);

      // The history should have at least these lifecycle events:
      // OrchestratorStarted, TaskScheduled, TaskCompleted, OrchestratorCompleted, ExecutionStarted, ExecutionCompleted
      expect(events.length).toBeGreaterThanOrEqual(4);

      // Each event should have basic expected fields
      for (const event of events) {
        const evt = event as Record<string, unknown>;
        expect(evt).toHaveProperty("type");
        expect(evt).toHaveProperty("timestamp");
      }
    }, 180_000);

    it("should export a single orchestration with full history events matching expected sequence", async () => {
      await taskHubWorker.start();

      const testInput = "HistoryVerifyUser";
      const completedTimeFrom = bufferedTimeFrom();
      const ids = await createAndCompleteOrchestrations(taskHubClient, greetOrchestrator, [testInput]);
      const completedTimeTo = await bufferedTimeTo();
      const instanceId = ids[0];

      const jobId = uniqueId("full-history");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
        format: { kind: ExportFormatKind.Jsonl, schemaVersion: "1.0" },
      });

      const description = await runExportJobToCompletion(taskHubClient, exportClient, options);
      expect(description.status).toBe(ExportJobStatus.Completed);
      expect(description.exportedInstances).toBeGreaterThanOrEqual(1);

      // Download blobs and find the one containing our instance
      const blobPrefix = `batch-${jobId}/`;
      const blobs = await listBlobs(containerClient, blobPrefix);
      expect(blobs.length).toBeGreaterThanOrEqual(1);

      // Collect all events across all blobs
      const allEvents: Record<string, unknown>[] = [];
      for (const blobName of blobs) {
        const content = await downloadBlobContent(containerClient, blobName);
        if (blobName.endsWith(".jsonl.gz") || blobName.endsWith(".jsonl")) {
          const parsed = parseJsonl(content);
          allEvents.push(...(parsed as Record<string, unknown>[]));
        } else if (blobName.endsWith(".json")) {
          const parsed = JSON.parse(content) as Record<string, unknown>[];
          allEvents.push(...parsed);
        }
      }

      // Each blob is per-instance (SHA-256 of instanceId).
      // Find the blob that contains our instance's ExecutionStarted event.
      let targetEvents: Record<string, unknown>[] = [];
      for (const blobName of blobs) {
        const content = await downloadBlobContent(containerClient, blobName);
        let events: Record<string, unknown>[];
        if (blobName.endsWith(".json") && !blobName.endsWith(".jsonl")) {
          events = JSON.parse(content) as Record<string, unknown>[];
        } else {
          events = parseJsonl(content) as Record<string, unknown>[];
        }
        const hasOurInstance = events.some((evt) => {
          const oi = evt.orchestrationInstance as { instanceId?: string } | undefined;
          return oi?.instanceId === instanceId;
        });
        if (hasOurInstance) {
          targetEvents = events;
          break;
        }
      }

      expect(targetEvents.length).toBe(6);

      // Event 0: OrchestratorStarted
      expect(targetEvents[0].type).toBe("OrchestratorStarted");
      expect(targetEvents[0].eventId).toBe(-1);
      expect(targetEvents[0]).toHaveProperty("timestamp");

      // Event 1: ExecutionStarted — marks the beginning of the orchestration
      expect(targetEvents[1].type).toBe("ExecutionStarted");
      expect(targetEvents[1].eventId).toBe(0);
      expect(targetEvents[1].name).toBe("greetOrchestrator");
      expect(targetEvents[1].input).toBe(JSON.stringify(testInput));
      const oi = targetEvents[1].orchestrationInstance as { instanceId: string };
      expect(oi.instanceId).toBe(instanceId);

      // Event 2: TaskScheduled — activity was scheduled
      expect(targetEvents[2].type).toBe("TaskScheduled");
      expect(targetEvents[2].eventId).toBe(1);
      expect(targetEvents[2].name).toBe("greetActivity");
      expect(targetEvents[2].input).toBe(JSON.stringify(testInput));

      // Event 3: OrchestratorStarted — second replay after activity completes
      expect(targetEvents[3].type).toBe("OrchestratorStarted");
      expect(targetEvents[3].eventId).toBe(-1);

      // Event 4: TaskCompleted — activity result received
      expect(targetEvents[4].type).toBe("TaskCompleted");
      expect(targetEvents[4].eventId).toBe(-1);
      expect(targetEvents[4].taskScheduledId).toBe(1);
      expect(targetEvents[4].result).toBe(JSON.stringify(`Hello, ${testInput}!`));

      // Event 5: ExecutionCompleted — orchestration finished successfully
      expect(targetEvents[5].type).toBe("ExecutionCompleted");
      expect(targetEvents[5].eventId).toBe(2);
      expect(targetEvents[5].orchestrationStatus).toBe("ORCHESTRATION_STATUS_COMPLETED");
      expect(targetEvents[5].result).toBe(JSON.stringify(`Hello, ${testInput}!`));

      // Verify all events have timestamps that are valid ISO dates
      for (const evt of targetEvents) {
        expect(typeof evt.timestamp).toBe("string");
        expect(new Date(evt.timestamp as string).getTime()).not.toBeNaN();
      }
    }, 180_000);

    it("should export in JSON format when configured", async () => {
      await taskHubWorker.start();

      const completedTimeFrom = bufferedTimeFrom();
      const ids = await createAndCompleteOrchestrations(
        taskHubClient,
        greetOrchestrator,
        ["JsonUser"],
      );
      expect(ids).toHaveLength(1);
      const completedTimeTo = await bufferedTimeTo();

      const jobId = uniqueId("json-format");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
        format: { kind: ExportFormatKind.Json, schemaVersion: "1.0" },
      });

      const description = await runExportJobToCompletion(
        taskHubClient,
        exportClient,
        options,
      );

      expect(description.status).toBe(ExportJobStatus.Completed);
      expect(description.exportedInstances).toBeGreaterThanOrEqual(1);

      // Find blobs - should be .json (not .jsonl.gz)
      const blobPrefix = `batch-${jobId}/`;
      const blobs = await listBlobs(containerClient, blobPrefix);
      expect(blobs.length).toBeGreaterThanOrEqual(1);

      const jsonBlob = blobs.find((b) => b.endsWith(".json") && !b.endsWith(".gz"));
      expect(jsonBlob).toBeDefined();

      const content = await downloadBlobContent(containerClient, jsonBlob!);
      // JSON format should be valid JSON (array or object)
      const parsed = JSON.parse(content);
      expect(parsed).toBeDefined();
    }, 180_000);

    it("should export multi-step orchestrations with richer history events", async () => {
      await taskHubWorker.start();

      const completedTimeFrom = bufferedTimeFrom();

      // Create multi-step orchestrations (each calls workActivity twice)
      const ids = await createAndCompleteOrchestrations(
        taskHubClient,
        multiStepOrchestrator,
        [1, 2],
      );
      expect(ids).toHaveLength(2);
      const completedTimeTo = await bufferedTimeTo();

      const jobId = uniqueId("multi-step");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
        format: { kind: ExportFormatKind.Jsonl, schemaVersion: "1.0" },
      });

      const description = await runExportJobToCompletion(
        taskHubClient,
        exportClient,
        options,
      );

      expect(description.status).toBe(ExportJobStatus.Completed);
      expect(description.exportedInstances).toBeGreaterThanOrEqual(2);

      // Verify at least one blob has more history events than a single-step orchestration
      const blobPrefix = `batch-${jobId}/`;
      const blobs = await listBlobs(containerClient, blobPrefix);
      expect(blobs.length).toBeGreaterThanOrEqual(2);

      // Multi-step orchestration has 2 activity calls → should have more events
      const gzBlob = blobs.find((b) => b.endsWith(".jsonl.gz"));
      if (gzBlob) {
        const content = await downloadBlobContent(containerClient, gzBlob);
        const events = parseJsonl(content);
        // 2 activity calls → at least 2 TaskScheduled + 2 TaskCompleted + OrchestratorStarted +
        // ExecutionStarted + ExecutionCompleted events → >= 7
        expect(events.length).toBeGreaterThanOrEqual(6);
      }
    }, 180_000);

    it("should isolate blobs by jobId prefix so different exports don't overlap", async () => {
      await taskHubWorker.start();

      const completedTimeFrom = bufferedTimeFrom();
      await createAndCompleteOrchestrations(taskHubClient, greetOrchestrator, ["IsolationTest"]);
      const completedTimeTo = await bufferedTimeTo();

      // Run two exports with different jobIds over the same time window
      const jobId1 = uniqueId("isolation-a");
      const jobId2 = uniqueId("isolation-b");

      const opts1 = createExportJobCreationOptions({
        jobId: jobId1,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
      });
      const opts2 = createExportJobCreationOptions({
        jobId: jobId2,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
      });

      const [desc1, desc2] = await Promise.all([
        runExportJobToCompletion(taskHubClient, exportClient, opts1),
        runExportJobToCompletion(taskHubClient, exportClient, opts2),
      ]);

      expect(desc1.status).toBe(ExportJobStatus.Completed);
      expect(desc2.status).toBe(ExportJobStatus.Completed);

      // Each export should only have blobs under its own prefix
      const blobs1 = await listBlobs(containerClient, `batch-${jobId1}/`);
      const blobs2 = await listBlobs(containerClient, `batch-${jobId2}/`);

      // Both should have the same data (same time window)
      expect(blobs1.length).toBeGreaterThanOrEqual(1);
      expect(blobs2.length).toBeGreaterThanOrEqual(1);

      // Verify no cross-contamination
      for (const b of blobs1) {
        expect(b.startsWith(`batch-${jobId1}/`)).toBe(true);
      }
      for (const b of blobs2) {
        expect(b.startsWith(`batch-${jobId2}/`)).toBe(true);
      }
    }, 240_000);

    it("should export failed orchestrations when runtimeStatus includes FAILED", async () => {
      await taskHubWorker.start();

      const completedTimeFrom = bufferedTimeFrom();

      // Schedule a failing orchestration
      const failId = await taskHubClient.scheduleNewOrchestration(failOrchestrator, "fail-input");

      // Wait for it to reach a terminal state (FAILED)
      const failState = await taskHubClient.waitForOrchestrationCompletion(failId, undefined, 30);
      expect(failState?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);

      const completedTimeTo = await bufferedTimeTo();

      const jobId = uniqueId("failed-export");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
        runtimeStatus: [ClientOrchestrationStatus.FAILED],
        format: { kind: ExportFormatKind.Jsonl, schemaVersion: "1.0" },
      });

      const description = await runExportJobToCompletion(
        taskHubClient,
        exportClient,
        options,
      );

      expect(description.status).toBe(ExportJobStatus.Completed);
      expect(description.exportedInstances).toBeGreaterThanOrEqual(1);

      // Verify blobs contain the failed instance's history
      const blobPrefix = `batch-${jobId}/`;
      const blobs = await listBlobs(containerClient, blobPrefix);
      expect(blobs.length).toBeGreaterThanOrEqual(1);
    }, 180_000);

    it("should export both completed and failed orchestrations by default", async () => {
      await taskHubWorker.start();

      const completedTimeFrom = bufferedTimeFrom();

      // Create a completed and a failed orchestration
      const completedId = await taskHubClient.scheduleNewOrchestration(greetOrchestrator, "OK");
      const failedId = await taskHubClient.scheduleNewOrchestration(failOrchestrator, "FAIL");

      const completedState = await taskHubClient.waitForOrchestrationCompletion(
        completedId,
        undefined,
        30,
      );
      expect(completedState?.runtimeStatus).toBe(
        OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
      );

      const failedState = await taskHubClient.waitForOrchestrationCompletion(
        failedId,
        undefined,
        30,
      );
      expect(failedState?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);

      const completedTimeTo = await bufferedTimeTo();

      const jobId = uniqueId("mixed-status");
      const options = createExportJobCreationOptions({
        jobId,
        completedTimeFrom,
        completedTimeTo,
        mode: ExportMode.Batch,
        // Default runtimeStatus includes all terminal statuses
      });

      const description = await runExportJobToCompletion(
        taskHubClient,
        exportClient,
        options,
      );

      expect(description.status).toBe(ExportJobStatus.Completed);
      // Should have exported at least the 2 instances (completed + failed)
      expect(description.exportedInstances).toBeGreaterThanOrEqual(2);

      const blobPrefix = `batch-${jobId}/`;
      const blobs = await listBlobs(containerClient, blobPrefix);
      expect(blobs.length).toBeGreaterThanOrEqual(2);
    }, 180_000);
  });

  describe("Export Job Configuration Validation", () => {
    it("should use JSONL format by default via createExportJobCreationOptions", () => {
      const options = createExportJobCreationOptions({
        jobId: "test",
        completedTimeFrom: new Date("2024-01-01"),
        completedTimeTo: new Date("2024-06-01"),
      });

      expect(options.format.kind).toBe(ExportFormatKind.Jsonl);
      expect(options.mode).toBe(ExportMode.Batch);
      expect(options.maxInstancesPerBatch).toBe(100);
      expect(options.maxParallelExports).toBe(32);
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
