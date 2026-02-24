// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  ORCHESTRATOR_INSTANCE_ID_PREFIX,
  EXPORT_JOB_ENTITY_NAME,
  EXPORT_JOB_ORCHESTRATOR_NAME,
  EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME,
  EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME,
  LIST_TERMINAL_INSTANCES_ACTIVITY_NAME,
  getOrchestratorInstanceId,
} from "../src/constants";

describe("Constants", () => {
  it("should define the orchestrator instance ID prefix", () => {
    expect(ORCHESTRATOR_INSTANCE_ID_PREFIX).toBe("ExportJob-");
  });

  it("should define the export job entity name", () => {
    expect(EXPORT_JOB_ENTITY_NAME).toBe("ExportJob");
  });

  it("should define orchestrator names", () => {
    expect(EXPORT_JOB_ORCHESTRATOR_NAME).toBe("ExportJobOrchestrator");
    expect(EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME).toBe("ExecuteExportJobOperationOrchestrator");
  });

  it("should define activity names", () => {
    expect(EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME).toBe("ExportInstanceHistoryActivity");
    expect(LIST_TERMINAL_INSTANCES_ACTIVITY_NAME).toBe("ListTerminalInstancesActivity");
  });

  describe("getOrchestratorInstanceId", () => {
    it("should generate instance ID with prefix", () => {
      expect(getOrchestratorInstanceId("job-123")).toBe("ExportJob-job-123");
    });

    it("should handle empty job ID", () => {
      expect(getOrchestratorInstanceId("")).toBe("ExportJob-");
    });
  });
});
