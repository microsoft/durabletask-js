// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/** Thrown when an orchestration ID reuse request matches an existing dedupe status. */
export class OrchestrationAlreadyExistsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "OrchestrationAlreadyExistsError";
  }
}
