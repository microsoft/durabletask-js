// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class PurgeResult {
  deletedInstanceCount: number;

  constructor(deletedInstanceCount: number) {
    this.deletedInstanceCount = deletedInstanceCount;
  }
}
