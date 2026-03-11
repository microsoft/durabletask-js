// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationStatus } from "@microsoft/durabletask-js";

/**
 * Filter criteria for selecting orchestration instances to export.
 */
export interface ExportFilter {
  /**
   * The earliest completed time to include (inclusive).
   */
  readonly completedTimeFrom: Date;

  /**
   * The latest completed time to include (exclusive). If undefined, includes all future.
   */
  readonly completedTimeTo?: Date;

  /**
   * Optional list of runtime statuses to include. If undefined, includes all terminal statuses.
   */
  readonly runtimeStatus?: OrchestrationStatus[];
}
