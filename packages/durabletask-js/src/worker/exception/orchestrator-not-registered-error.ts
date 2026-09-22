// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class OrchestratorNotRegisteredError extends Error {
  constructor(name?: string, version?: string) {
    super(`Orchestrator '${name}'${version ? ` with version '${version}'` : ""} does not exist.`);
    this.name = "OrchestratorNotRegisteredError";
  }
}
