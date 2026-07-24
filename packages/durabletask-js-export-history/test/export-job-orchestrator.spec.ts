// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { exportJobOrchestrator } from "../src/orchestrators/export-job-orchestrator";
import {
  ExportJobStatus,
  ExportJobState,
  ExportMode,
  ExportFormatKind,
  createExportFormat,
  ExportJobConfiguration,
} from "../src/models";
import { ExportJobRunRequest } from "../src/entity/export-job";
import {
  LIST_TERMINAL_INSTANCES_ACTIVITY_NAME,
  EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
} from "../src/constants";
import { EntityInstanceId } from "@microsoft/durabletask-js";
import { CompletableTask } from "../../durabletask-js/src/task/completable-task";

/**
 * Creates a mock OrchestrationContext for testing orchestrator generators.
 *
 * callActivity and callEntity return real CompletableTask objects so that
 * whenAll() can compose them correctly. The test drives the generator
 * and completes tasks externally to feed results back.
 */
function createMockOrchestrationContext() {
  const calls: Array<{
    type: "callActivity" | "callEntity" | "createTimer" | "continueAsNew";
    name?: string;
    input?: unknown;
    entityId?: string;
    operationName?: string;
    task?: CompletableTask<any>;
  }> = [];

  const ctx = {
    currentUtcDateTime: new Date("2024-06-01T00:00:00Z"),

    callActivity: jest.fn((name: string, input?: unknown) => {
      const task = new CompletableTask();
      calls.push({ type: "callActivity", name, input, task });
      return task;
    }),

    entities: {
      callEntity: jest.fn((id: EntityInstanceId, operationName: string, input?: unknown) => {
        const task = new CompletableTask();
        calls.push({
          type: "callEntity",
          entityId: id.toString(),
          operationName,
          input,
          task,
        });
        return task;
      }),
    },

    createTimer: jest.fn((_fireAt: Date) => {
      const task = new CompletableTask();
      calls.push({ type: "createTimer", task });
      return task;
    }),

    continueAsNew: jest.fn((input: unknown) => {
      calls.push({ type: "continueAsNew", input });
    }),

    _calls: calls,
  };

  return ctx;
}

/**
 * Creates a valid ExportJobState for testing.
 */
function createActiveJobState(overrides?: Partial<ExportJobState>): ExportJobState {
  return {
    status: ExportJobStatus.Active,
    createdAt: new Date("2024-01-01"),
    lastModifiedAt: new Date("2024-01-01"),
    scannedInstances: 0,
    exportedInstances: 0,
    config: {
      mode: ExportMode.Batch,
      filter: {
        completedTimeFrom: new Date("2024-01-01"),
        completedTimeTo: new Date("2024-06-01"),
        runtimeStatus: [],
      },
      destination: { container: "exports" },
      format: createExportFormat(ExportFormatKind.Jsonl),
      maxInstancesPerBatch: 100,
      maxParallelExports: 10,
    } as ExportJobConfiguration,
    ...overrides,
  };
}

/**
 * Gets all calls of a certain type, filtering the accumulated mock calls.
 */
function getCallsByType(
  calls: ReturnType<typeof createMockOrchestrationContext>["_calls"],
  type: string,
) {
  return calls.filter((c) => c.type === type);
}

/**
 * Gets all callEntity calls with a specific operationName.
 */
function getEntityCalls(
  calls: ReturnType<typeof createMockOrchestrationContext>["_calls"],
  operationName: string,
) {
  return calls.filter((c) => c.type === "callEntity" && c.operationName === operationName);
}

describe("exportJobOrchestrator", () => {
  describe("batch failure progress reporting", () => {
    it("should report actual scanned and exported counts when batch fails after retries", async () => {
      const ctx = createMockOrchestrationContext();
      const jobEntityId = new EntityInstanceId("exportjob", "test-job-1");
      const input: ExportJobRunRequest = {
        jobEntityId: jobEntityId.toString(),
        processedCycles: 0,
      };

      const gen = exportJobOrchestrator(ctx as any, input);
      const jobState = createActiveJobState();

      // Step 1: Generator starts and yields callEntity("get") for initial state
      let stepResult = await gen.next();
      expect(stepResult.done).toBe(false);
      expect(getEntityCalls(ctx._calls, "get")).toHaveLength(1);

      // Feed back active job state
      stepResult = await gen.next(jobState);
      expect(stepResult.done).toBe(false);

      // Step 2: yields callEntity("get") for loop status check
      expect(getEntityCalls(ctx._calls, "get")).toHaveLength(2);
      stepResult = await gen.next(jobState);
      expect(stepResult.done).toBe(false);

      // Step 3: yields callActivity(LIST_TERMINAL_INSTANCES) for listing instances
      const listCalls = getCallsByType(ctx._calls, "callActivity").filter(
        (c) => c.name === LIST_TERMINAL_INSTANCES_ACTIVITY_NAME,
      );
      expect(listCalls).toHaveLength(1);

      // Return a page with 5 instances
      const pageResult = {
        instanceIds: ["inst-1", "inst-2", "inst-3", "inst-4", "inst-5"],
        nextCheckpoint: { lastInstanceKey: "inst-5" },
      };
      stepResult = await gen.next(pageResult);

      // Step 4: The orchestrator now calls callActivity for each instance, then whenAll.
      // Because all 5 < maxParallelExports(10), it yields one whenAll.
      // Find the export activity tasks and complete them.
      const exportCalls = getCallsByType(ctx._calls, "callActivity").filter(
        (c) => c.name === EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
      );
      expect(exportCalls).toHaveLength(5);

      // Complete each export activity task individually (3 succeed, 2 fail)
      const attempt1Results = [
        { instanceId: "inst-1", success: true },
        { instanceId: "inst-2", success: true },
        { instanceId: "inst-3", success: false, error: "Network error" },
        { instanceId: "inst-4", success: true },
        { instanceId: "inst-5", success: false, error: "Timeout" },
      ];
      for (let i = 0; i < exportCalls.length; i++) {
        exportCalls[i].task!.complete(attempt1Results[i]);
      }

      // Resume the generator (receives the array of results from whenAll)
      stepResult = await gen.next(attempt1Results);

      // Step 5: Retry backoff timer. Complete it.
      const timerCalls = getCallsByType(ctx._calls, "createTimer");
      expect(timerCalls.length).toBeGreaterThanOrEqual(1);
      timerCalls[timerCalls.length - 1].task!.complete(undefined);
      stepResult = await gen.next(undefined);

      // Step 6: Retry attempt 2 exports
      const exportCallsAttempt2 = getCallsByType(ctx._calls, "callActivity").filter(
        (c) => c.name === EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
      );
      expect(exportCallsAttempt2).toHaveLength(10);
      const newExportCalls2 = exportCallsAttempt2.slice(5);
      const attempt2Results = [
        { instanceId: "inst-1", success: true },
        { instanceId: "inst-2", success: true },
        { instanceId: "inst-3", success: false, error: "Network error" },
        { instanceId: "inst-4", success: true },
        { instanceId: "inst-5", success: false, error: "Timeout" },
      ];
      for (let i = 0; i < newExportCalls2.length; i++) {
        newExportCalls2[i].task!.complete(attempt2Results[i]);
      }
      stepResult = await gen.next(attempt2Results);

      // Step 7: Backoff timer for retry attempt 3
      const timerCalls2 = getCallsByType(ctx._calls, "createTimer");
      timerCalls2[timerCalls2.length - 1].task!.complete(undefined);
      stepResult = await gen.next(undefined);

      // Step 8: Retry attempt 3 (final) - still fails
      const exportCallsAttempt3 = getCallsByType(ctx._calls, "callActivity").filter(
        (c) => c.name === EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
      );
      expect(exportCallsAttempt3).toHaveLength(15);
      const newExportCalls3 = exportCallsAttempt3.slice(10);
      const attempt3Results = [
        { instanceId: "inst-1", success: true },
        { instanceId: "inst-2", success: true },
        { instanceId: "inst-3", success: false, error: "Network error" },
        { instanceId: "inst-4", success: true },
        { instanceId: "inst-5", success: false, error: "Timeout" },
      ];
      for (let i = 0; i < newExportCalls3.length; i++) {
        newExportCalls3[i].task!.complete(attempt3Results[i]);
      }
      stepResult = await gen.next(attempt3Results);

      // Step 9: The orchestrator should now yield commitCheckpoint with actual counts.
      // (This was the bug: previously reported scannedInstances=0, exportedInstances=0)
      const commitCheckpointCalls = getEntityCalls(ctx._calls, "commitCheckpoint");
      expect(commitCheckpointCalls.length).toBeGreaterThanOrEqual(1);

      const failedBatchCheckpoint = commitCheckpointCalls[commitCheckpointCalls.length - 1];
      expect(failedBatchCheckpoint.input).toEqual(
        expect.objectContaining({
          scannedInstances: 5,
          exportedInstances: 3,
        }),
      );

      // Also verify failures are reported
      expect((failedBatchCheckpoint.input as any).failures).toBeDefined();
      expect((failedBatchCheckpoint.input as any).failures.length).toBe(2);
    });

    it("should report zero exported when all instances in a failed batch fail", async () => {
      const ctx = createMockOrchestrationContext();
      const jobEntityId = new EntityInstanceId("exportjob", "test-job-2");
      const input: ExportJobRunRequest = {
        jobEntityId: jobEntityId.toString(),
        processedCycles: 0,
      };

      const gen = exportJobOrchestrator(ctx as any, input);
      const jobState = createActiveJobState();

      // Drive through initial state checks
      await gen.next(); // callEntity("get") #1
      await gen.next(jobState); // callEntity("get") #2
      await gen.next(jobState); // callActivity(LIST_TERMINAL_INSTANCES)

      const pageResult = {
        instanceIds: ["inst-1", "inst-2"],
        nextCheckpoint: { lastInstanceKey: "inst-2" },
      };
      await gen.next(pageResult); // yields whenAll of export activities

      // Run 3 retry attempts, all failing
      for (let attempt = 0; attempt < 3; attempt++) {
        const exportCalls = getCallsByType(ctx._calls, "callActivity").filter(
          (c) => c.name === EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
        );
        const latestBatch = exportCalls.slice(attempt * 2, (attempt + 1) * 2);
        expect(latestBatch).toHaveLength(2);

        const results = [
          { instanceId: "inst-1", success: false, error: "Error" },
          { instanceId: "inst-2", success: false, error: "Error" },
        ];
        for (let i = 0; i < latestBatch.length; i++) {
          latestBatch[i].task!.complete(results[i]);
        }
        await gen.next(results);

        // Complete backoff timer (except after last attempt)
        if (attempt < 2) {
          const timerCalls = getCallsByType(ctx._calls, "createTimer");
          timerCalls[timerCalls.length - 1].task!.complete(undefined);
          await gen.next(undefined);
        }
      }

      // Verify the commitCheckpoint call for the failed batch
      const commitCheckpointCalls = getEntityCalls(ctx._calls, "commitCheckpoint");
      expect(commitCheckpointCalls.length).toBeGreaterThanOrEqual(1);

      const failedBatchCheckpoint = commitCheckpointCalls[commitCheckpointCalls.length - 1];
      expect(failedBatchCheckpoint.input).toEqual(
        expect.objectContaining({
          scannedInstances: 2,
          exportedInstances: 0,
          failures: expect.arrayContaining([
            expect.objectContaining({ instanceId: "inst-1" }),
            expect.objectContaining({ instanceId: "inst-2" }),
          ]),
        }),
      );
    });

    it("should report all scanned and exported when batch succeeds", async () => {
      const ctx = createMockOrchestrationContext();
      const jobEntityId = new EntityInstanceId("exportjob", "test-job-3");
      const input: ExportJobRunRequest = {
        jobEntityId: jobEntityId.toString(),
        processedCycles: 0,
      };

      const gen = exportJobOrchestrator(ctx as any, input);
      const jobState = createActiveJobState();

      // Drive through initial state checks
      await gen.next(); // callEntity("get") #1
      await gen.next(jobState); // callEntity("get") #2
      await gen.next(jobState); // callActivity(LIST_TERMINAL_INSTANCES)

      // Return 3 instances, no more pages
      const pageResult = {
        instanceIds: ["inst-1", "inst-2", "inst-3"],
        nextCheckpoint: {},
      };
      await gen.next(pageResult); // yields whenAll of export activities

      // All succeed on first attempt
      const exportCalls = getCallsByType(ctx._calls, "callActivity").filter(
        (c) => c.name === EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
      );
      expect(exportCalls).toHaveLength(3);

      const results = [
        { instanceId: "inst-1", success: true },
        { instanceId: "inst-2", success: true },
        { instanceId: "inst-3", success: true },
      ];
      for (let i = 0; i < exportCalls.length; i++) {
        exportCalls[i].task!.complete(results[i]);
      }
      await gen.next(results);

      // Verify the commitCheckpoint call
      const commitCheckpointCalls = getEntityCalls(ctx._calls, "commitCheckpoint");
      expect(commitCheckpointCalls.length).toBeGreaterThanOrEqual(1);

      const successCheckpoint = commitCheckpointCalls[0];
      expect(successCheckpoint.input).toEqual(
        expect.objectContaining({
          scannedInstances: 3,
          exportedInstances: 3,
          checkpoint: {},
        }),
      );
    });
  });
});
