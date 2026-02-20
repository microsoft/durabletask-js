// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

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
    it("should create state with NotStarted status", () => {
      const state = createInitialExportJobState();
      expect(state.status).toBe(ExportJobStatus.NotStarted);
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
        destination: { container: "exports" },
      });

      expect(options.completedTimeFrom).toEqual(new Date("2024-01-01"));
      expect(options.destination).toEqual({ container: "exports" });
      expect(options.mode).toBe(ExportMode.Batch);
      expect(options.format.kind).toBe(ExportFormatKind.Jsonl);
      expect(options.maxInstancesPerBatch).toBe(DEFAULT_MAX_INSTANCES_PER_BATCH);
      expect(options.maxParallelExports).toBe(DEFAULT_MAX_PARALLEL_EXPORTS);
    });

    it("should accept custom values", () => {
      const opts = createExportJobCreationOptions({
        jobId: "test-job-2",
        completedTimeFrom: new Date("2024-01-01"),
        completedTimeTo: new Date("2024-06-01"),
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
      expect(opts.completedTimeTo).toEqual(new Date("2024-06-01"));
      expect(opts.destination?.prefix).toBe("my-prefix");
    });
  });

  describe("ExportJobStatus", () => {
    it("should have all expected values", () => {
      expect(ExportJobStatus.NotStarted).toBe("NotStarted");
      expect(ExportJobStatus.Active).toBe("Active");
      expect(ExportJobStatus.Completed).toBe("Completed");
      expect(ExportJobStatus.Failed).toBe("Failed");
    });
  });

  describe("isValidTransition", () => {
    it("should allow create from NotStarted to Active", () => {
      expect(isValidTransition("create", ExportJobStatus.NotStarted, ExportJobStatus.Active)).toBe(true);
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

    it("should not allow markAsCompleted from NotStarted", () => {
      expect(isValidTransition("markAsCompleted", ExportJobStatus.NotStarted, ExportJobStatus.Completed)).toBe(false);
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
      expect(DEFAULT_MAX_PARALLEL_EXPORTS).toBe(10);
      expect(DEFAULT_SCHEMA_VERSION).toBe("1.0");
      expect(DEFAULT_EXPORT_JOB_QUERY_PAGE_SIZE).toBe(100);
    });
  });
});
