// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class OrchestratorNotRegisteredError extends Error {
  constructor(name?: string) {
    super(`Orchestrator '${name}' does not exist.`);
    this.name = "OrchestratorNotRegisteredError";
  }
}
