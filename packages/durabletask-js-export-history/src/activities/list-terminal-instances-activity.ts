// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationStatus } from "@microsoft/durabletask-js";
import { ExportCheckpoint } from "../models";

/**
 * Input for listing terminal instances activity.
 */
export interface ListTerminalInstancesRequest {
  /**
   * The earliest completed time to include.
   */
  readonly completedTimeFrom: Date;

  /**
   * The latest completed time to include.
   */
  readonly completedTimeTo?: Date;

  /**
   * Optional list of runtime statuses to include.
   */
  readonly runtimeStatus?: OrchestrationStatus[];

  /**
   * The last instance key from previous pagination.
   */
  readonly lastInstanceKey?: string;

  /**
   * The maximum number of instances per batch.
   */
  readonly maxInstancesPerBatch: number;
}

/**
 * A page of instances for export.
 */
export interface InstancePage {
  /**
   * The list of instance IDs.
   */
  readonly instanceIds: string[];

  /**
   * The next checkpoint for pagination.
   */
  readonly nextCheckpoint: ExportCheckpoint;
}

/**
 * Creates the ListTerminalInstancesActivity function.
 * This activity lists terminal orchestration instances using the configured filters and checkpoint.
 *
 * @param client The TaskHubGrpcClient to use for listing instances.
 * @returns An activity function that lists terminal instance IDs.
 */
export function createListTerminalInstancesActivity(client: {
  listInstanceIds: (options?: {
    runtimeStatus?: OrchestrationStatus[];
    completedTimeFrom?: Date;
    completedTimeTo?: Date;
    pageSize?: number;
    lastInstanceKey?: string;
  }) => Promise<{ values: readonly string[]; continuationToken?: string }>;
}) {
  return async function listTerminalInstancesActivity(
    _context: unknown,
    input: ListTerminalInstancesRequest,
  ): Promise<InstancePage> {
    if (!input) {
      throw new Error("input is required");
    }

    // Dates arrive as ISO strings after JSON round-tripping through orchestration input.
    // Convert them back to Date objects for the client API.
    const completedTimeFrom = input.completedTimeFrom
      ? new Date(input.completedTimeFrom)
      : undefined;
    const completedTimeTo = input.completedTimeTo
      ? new Date(input.completedTimeTo)
      : undefined;

    const page = await client.listInstanceIds({
      runtimeStatus: input.runtimeStatus,
      completedTimeFrom,
      completedTimeTo,
      pageSize: input.maxInstancesPerBatch,
      lastInstanceKey: input.lastInstanceKey,
    });

    return {
      instanceIds: [...page.values],
      nextCheckpoint: { lastInstanceKey: page.continuationToken },
    };
  };
}
