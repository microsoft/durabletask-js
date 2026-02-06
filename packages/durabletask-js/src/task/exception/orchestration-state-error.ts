// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class OrchestrationStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrchestrationStateError";
  }
}
