// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExportJob } from "../src/entity/export-job";
import {
  ExportJobStatus,
  ExportMode,
  ExportFormatKind,
  createExportFormat,
  ExportJobCreationOptions,
  ExportJobState,
} from "../src/models";

/**
 * Creates a TaskEntityOperation mock for testing entity operations.
 */
function createMockOperation(name: string, input?: unknown) {
  const stateHolder: { value: ExportJobState | null } = {
    value: null,
  };

  return {
    name,
    hasInput: input !== undefined,
    getInput: () => input,
    state: {
      getState: <T>(): T | undefined => stateHolder.value as T | undefined,
      setState: (s: unknown) => {
        stateHolder.value = s as ExportJobState | null;
      },
    },
    context: {
      id: { name: "ExportJob", key: "test-job-1" },
      signalEntity: jest.fn(),
      scheduleNewOrchestration: jest.fn().mockReturnValue("orch-instance-123"),
    },
    _stateHolder: stateHolder,
  };
}

describe("ExportJob Entity", () => {
  let entity: ExportJob;

  beforeEach(() => {
    entity = new ExportJob();
  });

  describe("initializeState", () => {
    it("should create initial state via run with no existing state", async () => {
      const op = createMockOperation("get");
      const result = await entity.run(op as any);

      // After run, state should be initialized
      expect(result).toBeDefined();
      const state = result as ExportJobState;
      expect(state.status).toBe(ExportJobStatus.Pending);
      expect(state.scannedInstances).toBe(0);
      expect(state.exportedInstances).toBe(0);
    });
  });

  describe("create operation", () => {
    it("should create a new export job and transition to Active", async () => {
      const creationOptions: ExportJobCreationOptions = {
        jobId: "test-job-1",
        completedTimeFrom: new Date("2024-01-01"),
        mode: ExportMode.Batch,
        format: createExportFormat(ExportFormatKind.Jsonl),
        destination: { container: "exports" },
        maxInstancesPerBatch: 100,
        maxParallelExports: 10,
      };

      const op = createMockOperation("create", creationOptions);
      await entity.run(op as any);

      // Verify state was set
      const state = op._stateHolder.value!;
      expect(state.status).toBe(ExportJobStatus.Active);
      expect(state.config).toBeDefined();
      expect(state.config!.mode).toBe(ExportMode.Batch);
      expect(state.config!.destination.container).toBe("exports");
      expect(state.createdAt).toBeDefined();
      expect(state.scannedInstances).toBe(0);
      expect(state.exportedInstances).toBe(0);

      // Verify that signalEntity was called to start the export
      // (orchestratorInstanceId is set by startExport, not directly by create)
      expect(op.context.signalEntity).toHaveBeenCalledWith(
        op.context.id,
        "startExport",
      );
    });

    it("should throw when creationOptions is missing", async () => {
      const op = createMockOperation("create");
      // Set hasInput to false so getInput returns undefined
      (op as any).hasInput = false;

      await expect(entity.run(op as any)).rejects.toThrow();
    });
  });

  describe("get operation", () => {
    it("should return the current state", async () => {
      const op = createMockOperation("get");
      const result = await entity.run(op as any);
      expect(result).toBeDefined();
    });
  });

  describe("commitCheckpoint operation", () => {
    it("should update progress counts", async () => {
      // First create the job
      const createOp = createMockOperation("create", {
        jobId: "test-job-1",
        completedTimeFrom: new Date("2024-01-01"),
        mode: ExportMode.Batch,
        format: createExportFormat(ExportFormatKind.Jsonl),
        destination: { container: "exports" },
        maxInstancesPerBatch: 100,
        maxParallelExports: 10,
      } as ExportJobCreationOptions);

      await entity.run(createOp as any);

      // Now we need a new entity instance to commit checkpoint since
      // state is managed per-operation
      const entity2 = new ExportJob();
      const checkpointOp = createMockOperation("commitCheckpoint", {
        scannedInstances: 50,
        exportedInstances: 45,
        checkpoint: { lastInstanceKey: "instance-50" },
      });

      // Seed the state from the create operation to simulate continuity
      checkpointOp._stateHolder.value = { ...createOp._stateHolder.value! };

      await entity2.run(checkpointOp as any);

      const state = checkpointOp._stateHolder.value!;
      expect(state.scannedInstances).toBe(50);
      expect(state.exportedInstances).toBe(45);
      expect(state.checkpoint).toEqual({ lastInstanceKey: "instance-50" });
      expect(state.lastCheckpointTime).toBeDefined();
    });
  });

  describe("markAsCompleted operation", () => {
    it("should transition from Active to Completed", async () => {
      // Create a job first
      const createOp = createMockOperation("create", {
        jobId: "test-job-1",
        completedTimeFrom: new Date("2024-01-01"),
        mode: ExportMode.Batch,
        format: createExportFormat(ExportFormatKind.Jsonl),
        destination: { container: "exports" },
        maxInstancesPerBatch: 100,
        maxParallelExports: 10,
      } as ExportJobCreationOptions);

      await entity.run(createOp as any);

      const entity2 = new ExportJob();
      const completeOp = createMockOperation("markAsCompleted");
      completeOp._stateHolder.value = { ...createOp._stateHolder.value! };

      await entity2.run(completeOp as any);

      const state = completeOp._stateHolder.value!;
      expect(state.status).toBe(ExportJobStatus.Completed);
      expect(state.lastError).toBeUndefined();
    });
  });

  describe("markAsFailed operation", () => {
    it("should transition from Active to Failed with error message", async () => {
      // Create a job first
      const createOp = createMockOperation("create", {
        jobId: "test-job-1",
        completedTimeFrom: new Date("2024-01-01"),
        mode: ExportMode.Batch,
        format: createExportFormat(ExportFormatKind.Jsonl),
        destination: { container: "exports" },
        maxInstancesPerBatch: 100,
        maxParallelExports: 10,
      } as ExportJobCreationOptions);

      await entity.run(createOp as any);

      const entity2 = new ExportJob();
      const failOp = createMockOperation("markAsFailed", "Something went wrong");
      failOp._stateHolder.value = { ...createOp._stateHolder.value! };

      await entity2.run(failOp as any);

      const state = failOp._stateHolder.value!;
      expect(state.status).toBe(ExportJobStatus.Failed);
      expect(state.lastError).toBe("Something went wrong");
    });
  });

  describe("startExport operation", () => {
    it("should schedule export orchestrator when job is Active", async () => {
      // Create a job first
      const createOp = createMockOperation("create", {
        jobId: "test-job-1",
        completedTimeFrom: new Date("2024-01-01"),
        mode: ExportMode.Batch,
        format: createExportFormat(ExportFormatKind.Jsonl),
        destination: { container: "exports" },
        maxInstancesPerBatch: 100,
        maxParallelExports: 10,
      } as ExportJobCreationOptions);

      await entity.run(createOp as any);

      const entity2 = new ExportJob();
      const startOp = createMockOperation("startExport");
      startOp._stateHolder.value = { ...createOp._stateHolder.value! };

      await entity2.run(startOp as any);

      const state = startOp._stateHolder.value!;
      expect(state.orchestratorInstanceId).toBeDefined();
      expect(state.orchestratorInstanceId).toContain("ExportJob-");
      expect(startOp.context.scheduleNewOrchestration).toHaveBeenCalled();
    });

    it("should throw when job is not Active", async () => {
      const startOp = createMockOperation("startExport");
      // State is Pending by default (initializeState)
      await expect(entity.run(startOp as any)).rejects.toThrow("Export job must be in Active status to run.");
    });
  });

  describe("delete operation", () => {
    it("should set state to null (delete entity)", async () => {
      // Create a job first
      const createOp = createMockOperation("create", {
        jobId: "test-job-1",
        completedTimeFrom: new Date("2024-01-01"),
        mode: ExportMode.Batch,
        format: createExportFormat(ExportFormatKind.Jsonl),
        destination: { container: "exports" },
        maxInstancesPerBatch: 100,
        maxParallelExports: 10,
      } as ExportJobCreationOptions);

      await entity.run(createOp as any);

      const entity2 = new ExportJob();
      const deleteOp = createMockOperation("delete");
      deleteOp._stateHolder.value = { ...createOp._stateHolder.value! };

      await entity2.run(deleteOp as any);

      // State should be null after delete
      expect(deleteOp._stateHolder.value).toBeNull();
    });
  });
});
