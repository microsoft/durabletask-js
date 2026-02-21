// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationStatus } from "@microsoft/durabletask-js";
import {
  ExportJobStatus,
  ExportMode,
  ExportFormatKind,
  createExportFormat,
  createInitialExportJobState,
  createExportJobCreationOptions,
  isValidTransition,
  DEFAULT_MAX_INSTANCES_PER_BATCH,
  DEFAULT_MAX_PARALLEL_EXPORTS,
  DEFAULT_SCHEMA_VERSION,
  DEFAULT_EXPORT_JOB_QUERY_PAGE_SIZE,
} from "../src/models";
import { ExportJobClientValidationError } from "../src/errors";

describe("Models", () => {
  describe("ExportMode", () => {
    it("should have Batch and Continuous values", () => {
      expect(ExportMode.Batch).toBe("Batch");
      expect(ExportMode.Continuous).toBe("Continuous");
    });
  });

  describe("ExportFormatKind", () => {
    it("should have Jsonl and Json values", () => {
      expect(ExportFormatKind.Jsonl).toBe("Jsonl");
      expect(ExportFormatKind.Json).toBe("Json");
    });
  });

  describe("createExportFormat", () => {
    it("should create format with default schema version", () => {
      const format = createExportFormat(ExportFormatKind.Jsonl);
      expect(format.kind).toBe(ExportFormatKind.Jsonl);
      expect(format.schemaVersion).toBe(DEFAULT_SCHEMA_VERSION);
    });

    it("should create format with custom schema version", () => {
      const format = createExportFormat(ExportFormatKind.Json, "2.0");
      expect(format.kind).toBe(ExportFormatKind.Json);
      expect(format.schemaVersion).toBe("2.0");
    });
  });

  describe("createInitialExportJobState", () => {
    it("should create state with Pending status", () => {
      const state = createInitialExportJobState();
      expect(state.status).toBe(ExportJobStatus.Pending);
      expect(state.scannedInstances).toBe(0);
      expect(state.exportedInstances).toBe(0);
      expect(state.config).toBeUndefined();
      expect(state.orchestratorInstanceId).toBeUndefined();
      expect(state.lastError).toBeUndefined();
      expect(state.checkpoint).toBeUndefined();
    });
  });

  describe("createExportJobCreationOptions", () => {
    it("should create options with required fields and defaults", () => {
      const options = createExportJobCreationOptions({
        jobId: "test-job",
        completedTimeFrom: new Date("2024-01-01"),
        completedTimeTo: new Date("2024-06-01"),
        destination: { container: "exports" },
      });

      expect(options.completedTimeFrom).toEqual(new Date("2024-01-01"));
      expect(options.completedTimeTo).toEqual(new Date("2024-06-01"));
      expect(options.destination).toEqual({ container: "exports" });
      expect(options.mode).toBe(ExportMode.Batch);
      expect(options.format.kind).toBe(ExportFormatKind.Jsonl);
      expect(options.maxInstancesPerBatch).toBe(DEFAULT_MAX_INSTANCES_PER_BATCH);
      expect(options.maxParallelExports).toBe(DEFAULT_MAX_PARALLEL_EXPORTS);
      // Default runtimeStatus should be all terminal statuses
      expect(options.runtimeStatus).toEqual([
        OrchestrationStatus.COMPLETED,
        OrchestrationStatus.FAILED,
        OrchestrationStatus.TERMINATED,
      ]);
    });

    it("should accept custom values for Continuous mode", () => {
      const opts = createExportJobCreationOptions({
        jobId: "test-job-2",
        completedTimeFrom: new Date("2024-01-01"),
        destination: { container: "exports", prefix: "my-prefix" },
        mode: ExportMode.Continuous,
        format: createExportFormat(ExportFormatKind.Json),
        maxInstancesPerBatch: 50,
        maxParallelExports: 5,
      });

      expect(opts.mode).toBe(ExportMode.Continuous);
      expect(opts.format.kind).toBe(ExportFormatKind.Json);
      expect(opts.maxInstancesPerBatch).toBe(50);
      expect(opts.maxParallelExports).toBe(5);
      expect(opts.completedTimeTo).toBeUndefined();
      expect(opts.destination?.prefix).toBe("my-prefix");
    });

    it("should throw when Batch mode is missing completedTimeTo", () => {
      expect(() =>
        createExportJobCreationOptions({
          jobId: "test-job",
          completedTimeFrom: new Date("2024-01-01"),
          mode: ExportMode.Batch,
        }),
      ).toThrow(ExportJobClientValidationError);
    });

    it("should throw when completedTimeTo <= completedTimeFrom", () => {
      expect(() =>
        createExportJobCreationOptions({
          jobId: "test-job",
          completedTimeFrom: new Date("2024-06-01"),
          completedTimeTo: new Date("2024-01-01"),
          mode: ExportMode.Batch,
        }),
      ).toThrow("must be greater than");
    });

    it("should throw when completedTimeTo is in the future", () => {
      const futureDate = new Date(Date.now() + 86400000);
      expect(() =>
        createExportJobCreationOptions({
          jobId: "test-job",
          completedTimeFrom: new Date("2024-01-01"),
          completedTimeTo: futureDate,
          mode: ExportMode.Batch,
        }),
      ).toThrow("cannot be in the future");
    });

    it("should throw when Continuous mode has completedTimeTo", () => {
      expect(() =>
        createExportJobCreationOptions({
          jobId: "test-job",
          completedTimeFrom: new Date("2024-01-01"),
          completedTimeTo: new Date("2024-06-01"),
          mode: ExportMode.Continuous,
        }),
      ).toThrow("not allowed for Continuous");
    });

    it("should throw when maxInstancesPerBatch is out of range", () => {
      expect(() =>
        createExportJobCreationOptions({
          jobId: "test-job",
          completedTimeFrom: new Date("2024-01-01"),
          completedTimeTo: new Date("2024-06-01"),
          mode: ExportMode.Batch,
          maxInstancesPerBatch: 0,
        }),
      ).toThrow("MaxInstancesPerBatch");
      expect(() =>
        createExportJobCreationOptions({
          jobId: "test-job",
          completedTimeFrom: new Date("2024-01-01"),
          completedTimeTo: new Date("2024-06-01"),
          mode: ExportMode.Batch,
          maxInstancesPerBatch: 1001,
        }),
      ).toThrow("MaxInstancesPerBatch");
    });

    it("should throw when runtimeStatus contains non-terminal status", () => {
      expect(() =>
        createExportJobCreationOptions({
          jobId: "test-job",
          completedTimeFrom: new Date("2024-01-01"),
          completedTimeTo: new Date("2024-06-01"),
          mode: ExportMode.Batch,
          runtimeStatus: [OrchestrationStatus.RUNNING],
        }),
      ).toThrow("terminal orchestration statuses only");
    });
  });

  describe("ExportJobStatus", () => {
    it("should have all expected values", () => {
      expect(ExportJobStatus.Pending).toBe("Pending");
      expect(ExportJobStatus.Active).toBe("Active");
      expect(ExportJobStatus.Completed).toBe("Completed");
      expect(ExportJobStatus.Failed).toBe("Failed");
    });
  });

  describe("isValidTransition", () => {
    it("should allow create from Pending to Active", () => {
      expect(isValidTransition("create", ExportJobStatus.Pending, ExportJobStatus.Active)).toBe(true);
    });

    it("should not allow create from Active to Active", () => {
      expect(isValidTransition("create", ExportJobStatus.Active, ExportJobStatus.Active)).toBe(false);
    });

    it("should allow markAsCompleted from Active to Completed", () => {
      expect(isValidTransition("markAsCompleted", ExportJobStatus.Active, ExportJobStatus.Completed)).toBe(true);
    });

    it("should allow markAsFailed from Active to Failed", () => {
      expect(isValidTransition("markAsFailed", ExportJobStatus.Active, ExportJobStatus.Failed)).toBe(true);
    });

    it("should not allow markAsCompleted from Pending", () => {
      expect(isValidTransition("markAsCompleted", ExportJobStatus.Pending, ExportJobStatus.Completed)).toBe(false);
    });

    it("should return false for commitCheckpoint (not a state transition)", () => {
      expect(isValidTransition("commitCheckpoint", ExportJobStatus.Active, ExportJobStatus.Active)).toBe(false);
    });

    it("should return false for unknown operations", () => {
      expect(isValidTransition("unknownOp", ExportJobStatus.Active, ExportJobStatus.Completed)).toBe(false);
    });
  });

  describe("constants", () => {
    it("should have expected default values", () => {
      expect(DEFAULT_MAX_INSTANCES_PER_BATCH).toBe(100);
      expect(DEFAULT_MAX_PARALLEL_EXPORTS).toBe(32);
      expect(DEFAULT_SCHEMA_VERSION).toBe("1.0");
      expect(DEFAULT_EXPORT_JOB_QUERY_PAGE_SIZE).toBe(100);
    });
  });
});
