// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class StopIterationError extends Error {
  value: any;

  constructor(value: any) {
    super("Stop Iteration");
    this.name = "StopIterationError";
    this.value = value;
  }
}
