// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Constants used by the export history feature.
 */

/**
 * Prefix for export job orchestrator instance IDs.
 */
export const ORCHESTRATOR_INSTANCE_ID_PREFIX = "ExportJob-";

/**
 * The name of the ExportJob entity.
 */
export const EXPORT_JOB_ENTITY_NAME = "ExportJob";

/**
 * The name of the ExportJobOrchestrator.
 */
export const EXPORT_JOB_ORCHESTRATOR_NAME = "ExportJobOrchestrator";

/**
 * The name of the ExecuteExportJobOperationOrchestrator.
 */
export const EXECUTE_EXPORT_JOB_OPERATION_ORCHESTRATOR_NAME = "ExecuteExportJobOperationOrchestrator";

/**
 * The name of the ExportInstanceHistoryActivity.
 */
export const EXPORT_INSTANCE_HISTORY_ACTIVITY_NAME = "ExportInstanceHistoryActivity";

/**
 * The name of the ListTerminalInstancesActivity.
 */
export const LIST_TERMINAL_INSTANCES_ACTIVITY_NAME = "ListTerminalInstancesActivity";

/**
 * Gets the orchestrator instance ID for a given export job ID.
 * @param jobId The export job ID.
 * @returns The orchestrator instance ID.
 */
export function getOrchestratorInstanceId(jobId: string): string {
  return `${ORCHESTRATOR_INSTANCE_ID_PREFIX}${jobId}`;
}
