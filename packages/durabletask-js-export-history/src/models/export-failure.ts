// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Records a failed export attempt for an individual instance.
 */
export interface ExportFailure {
  /**
   * The instance ID that failed to export.
   */
  readonly instanceId: string;

  /**
   * The reason for the failure.
   */
  readonly reason: string;

  /**
   * The number of export attempts made.
   */
  readonly attemptCount: number;

  /**
   * The timestamp of the last attempt.
   */
  readonly lastAttempt: Date;
}
