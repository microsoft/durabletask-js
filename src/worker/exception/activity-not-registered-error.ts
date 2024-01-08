// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class ActivityNotRegisteredError extends Error {
  constructor(name: string) {
    super(`Activity function '${name}' is not registered.`);
    this.name = "ActivityNotRegisteredError";
  }
}
