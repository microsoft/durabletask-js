// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class PurgeResult {
  deletedInstanceCount: number;

  /**
   * `true` if the purge finished, `false` if it is partial, or `undefined` if the backend
   * did not report completion. The deleted instance count alone does not indicate completion.
   */
  isComplete?: boolean;

  constructor(deletedInstanceCount: number, isComplete?: boolean) {
    this.deletedInstanceCount = deletedInstanceCount;
    this.isComplete = isComplete;
  }
}
