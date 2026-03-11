// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { useExportHistoryWorker, createExportHistoryClient } from "../src/builders/use-export-history";
import {
  EXPORT_JOB_ENTITY_NAME,
  EXPORT_JOB_ORCHESTRATOR_NAME,
  EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME,
  EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
  LIST_TERMINAL_INSTANCES_ACTIVITY_NAME,
} from "../src/constants";
import { ExportHistoryClient } from "../src/client/export-history-client";

describe("Builder Extensions", () => {
  describe("useExportHistoryWorker", () => {
    it("should register all components with the worker", () => {
      const mockWorker = {
        addNamedEntity: jest.fn(),
        addNamedOrchestrator: jest.fn(),
        addNamedActivity: jest.fn(),
      };

      const mockClient = {
        listInstanceIds: jest.fn(),
        getOrchestrationState: jest.fn(),
        getOrchestrationHistory: jest.fn(),
      };

      const storageOptions = {
        connectionString: "UseDevelopmentStorage=true",
        containerName: "export-history",
      };

      useExportHistoryWorker(mockWorker as any, {
        client: mockClient as any,
        storageOptions,
      });

      // Verify entity registration
      expect(mockWorker.addNamedEntity).toHaveBeenCalledWith(
        EXPORT_JOB_ENTITY_NAME,
        expect.any(Function),
      );

      // Verify orchestrator registrations
      expect(mockWorker.addNamedOrchestrator).toHaveBeenCalledWith(
        EXPORT_JOB_ORCHESTRATOR_NAME,
        expect.any(Function),
      );
      expect(mockWorker.addNamedOrchestrator).toHaveBeenCalledWith(
        EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME,
        expect.any(Function),
      );

      // Verify activity registrations
      expect(mockWorker.addNamedActivity).toHaveBeenCalledWith(
        LIST_TERMINAL_INSTANCES_ACTIVITY_NAME,
        expect.any(Function),
      );
      expect(mockWorker.addNamedActivity).toHaveBeenCalledWith(
        EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
        expect.any(Function),
      );
    });

    it("should throw when connectionString is missing", () => {
      const mockWorker = {
        addNamedEntity: jest.fn(),
        addNamedOrchestrator: jest.fn(),
        addNamedActivity: jest.fn(),
      };

      expect(() =>
        useExportHistoryWorker(mockWorker as any, {
          client: {} as any,
          storageOptions: {
            connectionString: "",
            containerName: "export-history",
          },
        }),
      ).toThrow("connectionString");
    });

    it("should throw when containerName is missing", () => {
      const mockWorker = {
        addNamedEntity: jest.fn(),
        addNamedOrchestrator: jest.fn(),
        addNamedActivity: jest.fn(),
      };

      expect(() =>
        useExportHistoryWorker(mockWorker as any, {
          client: {} as any,
          storageOptions: {
            connectionString: "UseDevelopmentStorage=true",
            containerName: "",
          },
        }),
      ).toThrow("containerName");
    });
  });

  describe("createExportHistoryClient", () => {
    it("should create an ExportHistoryClient instance", () => {
      const mockClient = {} as any;
      const storageOptions = {
        connectionString: "UseDevelopmentStorage=true",
        containerName: "export-history",
      };

      const exportClient = createExportHistoryClient(mockClient, storageOptions);
      expect(exportClient).toBeInstanceOf(ExportHistoryClient);
    });

    it("should throw when connectionString is missing", () => {
      expect(() =>
        createExportHistoryClient({} as any, {
          connectionString: "",
          containerName: "export-history",
        }),
      ).toThrow("connectionString");
    });

    it("should throw when containerName is missing", () => {
      expect(() =>
        createExportHistoryClient({} as any, {
          connectionString: "UseDevelopmentStorage=true",
          containerName: "",
        }),
      ).toThrow("containerName");
    });
  });
});
