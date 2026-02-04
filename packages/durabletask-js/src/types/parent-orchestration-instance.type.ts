// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Represents the parent orchestration instance details for a sub-orchestration.
 *
 * This information is available when an orchestration is started as a sub-orchestration
 * by another orchestration. It provides details about the parent that started this
 * orchestration, which can be useful for debugging and tracing.
 */
export interface ParentOrchestrationInstance {
  /**
   * The name of the parent orchestration.
   */
  name: string;

  /**
   * The unique instance ID of the parent orchestration.
   */
  instanceId: string;

  /**
   * The task scheduled ID that corresponds to this sub-orchestration in the parent's history.
   */
  taskScheduledId: number;
}
