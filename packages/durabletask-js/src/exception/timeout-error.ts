// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class TimeoutError extends Error {
  constructor(message: string = "The operation timed out.") {
    super(message);
    this.name = "TimeoutError";
  }
}
