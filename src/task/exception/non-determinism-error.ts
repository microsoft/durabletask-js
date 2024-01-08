// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class NonDeterminismError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "NonDeterminismError";
  }
}
