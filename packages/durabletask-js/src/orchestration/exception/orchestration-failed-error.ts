// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { FailureDetails } from "../../task/failure-details";

export class OrchestrationFailedError extends Error {
  private _failureDetails: FailureDetails;

  constructor(message: string, details: FailureDetails) {
    super(message);
    this.name = "OrchestrationFailedError";
    this._failureDetails = details;
  }

  get failureDetails(): FailureDetails {
    return this._failureDetails;
  }
}
