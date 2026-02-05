// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationStatus } from "./enum/orchestration-status.enum";

/**
 * Default page size when not supplied.
 */
export const DEFAULT_PAGE_SIZE = 100;

/**
 * A filter for querying orchestration instances.
 */
export interface OrchestrationQuery {
  /**
   * Filter by orchestrations created on or after this date.
   */
  createdFrom?: Date;

  /**
   * Filter by orchestrations created on or before this date.
   */
  createdTo?: Date;

  /**
   * Filter by orchestration runtime statuses.
   */
  statuses?: OrchestrationStatus[];

  /**
   * Names of task hubs to query across.
   */
  taskHubNames?: string[];

  /**
   * Prefix of instance IDs to include.
   */
  instanceIdPrefix?: string;

  /**
   * Maximum number of items to include per page.
   * @default 100
   */
  pageSize?: number;

  /**
   * Whether to include instance inputs and outputs in the query results.
   * @default false
   */
  fetchInputsAndOutputs?: boolean;

  /**
   * The continuation token to continue a paged query.
   */
  continuationToken?: string;
}

/**
 * Options for listing instance IDs with key-based pagination.
 */
export interface ListInstanceIdsOptions {
  /**
   * Optional set of runtime statuses to filter by. If undefined, all statuses are included.
   */
  runtimeStatus?: OrchestrationStatus[];

  /**
   * Inclusive lower bound of the orchestration completed time filter.
   */
  completedTimeFrom?: Date;

  /**
   * Inclusive upper bound of the orchestration completed time filter.
   */
  completedTimeTo?: Date;

  /**
   * Maximum number of instance IDs to return in a single page.
   * @default 100
   */
  pageSize?: number;

  /**
   * Continuation key from the previous page. If undefined, listing starts from the beginning.
   */
  lastInstanceKey?: string;
}
