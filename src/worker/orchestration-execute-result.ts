// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";

export class OrchestrationExecuteResult {
  actions: pb.OrchestratorAction[];
  customStatus: string;

  constructor(actions: pb.OrchestratorAction[], customStatus: string) {
    this.actions = actions;
    this.customStatus = customStatus;
  }
}
