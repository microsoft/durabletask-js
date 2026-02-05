// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Strategy for matching orchestration versions when processing work items.
 */
export enum VersionMatchStrategy {
  /**
   * No version matching - process all orchestrations regardless of version.
   */
  None = 0,

  /**
   * Only process orchestrations that exactly match the worker's version.
   */
  Strict = 1,

  /**
   * Process orchestrations with the current version or older versions.
   * Uses semantic versioning comparison.
   */
  CurrentOrOlder = 2,
}

/**
 * Strategy for handling version mismatches when processing work items.
 */
export enum VersionFailureStrategy {
  /**
   * Reject the work item and let it be picked up by another worker.
   * The orchestration will be retried by a compatible worker.
   */
  Reject = 0,

  /**
   * Fail the orchestration with a version mismatch error.
   * This will mark the orchestration as failed.
   */
  Fail = 1,
}

/**
 * Options for configuring version-based filtering of orchestrations.
 */
export interface VersioningOptions {
  /**
   * The version of the worker. This is used for version matching when processing orchestrations.
   */
  version?: string;

  /**
   * The default version to use when starting new orchestrations without an explicit version.
   * This is used by the client when scheduling new orchestrations.
   */
  defaultVersion?: string;

  /**
   * The strategy for matching orchestration versions.
   * @default VersionMatchStrategy.None
   */
  matchStrategy?: VersionMatchStrategy;

  /**
   * The strategy for handling version mismatches.
   * @default VersionFailureStrategy.Reject
   */
  failureStrategy?: VersionFailureStrategy;
}
