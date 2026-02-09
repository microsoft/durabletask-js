// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Request parameters for cleaning entity storage.
 *
 * @example
 * ```typescript
 * // Use default cleaning parameters
 * const request = CleanEntityStorageRequest.default();
 *
 * // Custom cleaning parameters
 * const request: CleanEntityStorageRequest = {
 *   removeEmptyEntities: true,
 *   releaseOrphanedLocks: false
 * };
 * ```
 */
export interface CleanEntityStorageRequest {
  /**
   * Whether to remove empty entities. Defaults to true.
   *
   * An entity is considered empty, and is removed, if it has no state and is not locked.
   */
  removeEmptyEntities?: boolean;

  /**
   * Whether to release orphaned locks. Defaults to true.
   *
   * Locks are considered orphaned, and are released, if the orchestration that holds them
   * is not in a running state. This should not happen under normal circumstances, but can
   * occur if the orchestration instance holding the lock exhibits replay nondeterminism
   * failures, or if it is explicitly purged.
   */
  releaseOrphanedLocks?: boolean;

  /**
   * The continuation token to resume a previous clean operation.
   */
  continuationToken?: string;
}

/**
 * Creates a default CleanEntityStorageRequest with maximal cleaning that is safe to call at all times.
 *
 * @returns A CleanEntityStorageRequest with removeEmptyEntities and releaseOrphanedLocks both set to true.
 */
export function defaultCleanEntityStorageRequest(): CleanEntityStorageRequest {
  return {
    removeEmptyEntities: true,
    releaseOrphanedLocks: true,
    continuationToken: undefined,
  };
}

/**
 * Result of a clean entity storage operation.
 */
export interface CleanEntityStorageResult {
  /**
   * The number of empty entities that were removed.
   */
  emptyEntitiesRemoved: number;

  /**
   * The number of orphaned locks that were released.
   */
  orphanedLocksReleased: number;

  /**
   * The continuation token to continue the clean operation, if not complete.
   * If undefined, the clean operation is complete.
   */
  continuationToken?: string;
}
