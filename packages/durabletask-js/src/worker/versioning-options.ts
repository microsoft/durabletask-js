// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Strategy for matching orchestration and activity versions when processing work items.
 */
export enum VersionMatchStrategy {
  /**
   * No version filtering. Local registration lookup still uses the requested version.
   */
  None = 0,

  /**
   * Only process work items that match the worker's version using version comparison.
   */
  Strict = 1,

  /**
   * Process work items with the current version or older versions.
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
 * Options for version-based worker acceptance and default child orchestration versions.
 */
export interface VersioningOptions {
  /**
   * The version of the worker. This is used for version matching when processing orchestrations.
   */
  version?: string;

  /**
   * The default version for sub-orchestrations scheduled by this worker without an explicit
   * version. An explicit empty string selects the unversioned child. This does not change
   * the parent's version or activity versions. Top-level starts use the client's defaultVersion.
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
