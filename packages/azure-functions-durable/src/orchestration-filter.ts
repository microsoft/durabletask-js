// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationRuntimeStatus } from "./orchestration-status";

/**
 * Filter for selecting orchestration instances by creation time and/or runtime status,
 * matching the classic Durable Functions v3 `OrchestrationFilter` shape. Used by
 * {@link DurableFunctionsClient.getStatusBy} and {@link DurableFunctionsClient.purgeInstanceHistoryBy}.
 */
export interface OrchestrationFilter {
  /** Select orchestration instances created at or after this time. */
  createdTimeFrom?: Date;
  /** Select orchestration instances created at or before this time. */
  createdTimeTo?: Date;
  /** Select orchestration instances whose runtime status matches any value in this array. */
  runtimeStatus?: OrchestrationRuntimeStatus[];
}
