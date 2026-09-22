// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class ActivityNotRegisteredError extends Error {
  constructor(name: string, version?: string) {
    super(`Activity function '${name}'${version ? ` with version '${version}'` : ""} is not registered.`);
    this.name = "ActivityNotRegisteredError";
  }
}
