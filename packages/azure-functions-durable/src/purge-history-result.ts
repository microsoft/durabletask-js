// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Statistics about a purge-history operation, matching the classic Durable Functions v3
 * `PurgeHistoryResult` shape. Returned by {@link DurableFunctionsClient.purgeInstanceHistory}.
 */
export class PurgeHistoryResult {
  /**
   * @param instancesDeleted - The number of orchestration instances that were purged.
   */
  constructor(public readonly instancesDeleted: number) {}
}
