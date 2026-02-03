// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Options for terminating orchestration instances.
 */
export interface TerminateInstanceOptions {
  /**
   * Whether to recursively terminate sub-orchestrations as well.
   * When true, all child orchestrations spawned by the target orchestration
   * will also be terminated.
   *
   * @default false
   */
  recursive?: boolean;

  /**
   * The optional output to set for the terminated orchestrator instance.
   */
  output?: any;
}
