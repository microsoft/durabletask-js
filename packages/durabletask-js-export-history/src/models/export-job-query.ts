// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExportJobStatus } from "./export-job-status";

/**
 * Query parameters for listing export jobs.
 */
export interface ExportJobQuery {
  /**
   * Optional status filter.
   */
  readonly status?: ExportJobStatus;

  /**
   * Optional prefix filter for job IDs.
   */
  readonly jobIdPrefix?: string;

  /**
   * Optional filter for jobs created after this time.
   */
  readonly createdFrom?: Date;

  /**
   * Optional filter for jobs created before this time.
   */
  readonly createdTo?: Date;

  /**
   * The number of results per page.
   * @default 100
   */
  readonly pageSize?: number;

  /**
   * A continuation token from a previous query.
   */
  readonly continuationToken?: string;
}

/**
 * Default page size for listing export jobs.
 */
export const DEFAULT_EXPORT_JOB_QUERY_PAGE_SIZE = 100;
