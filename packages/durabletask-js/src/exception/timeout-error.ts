// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class TimeoutError extends Error {
  constructor() {
    super("TimeoutError");
    this.name = "TimeoutError";
  }
}
