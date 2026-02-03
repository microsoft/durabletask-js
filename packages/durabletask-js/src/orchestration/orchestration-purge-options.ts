// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Options for purging orchestration instances.
 */
export interface PurgeInstanceOptions {
  /**
   * Whether to recursively purge sub-orchestrations as well.
   * When true, all child orchestrations spawned by the target orchestration
   * will also be purged.
   *
   * Note: Recursive purging may not be supported by all backend implementations.
   *
   * @default false
   */
  recursive?: boolean;
}
