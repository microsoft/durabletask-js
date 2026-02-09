// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../../proto/orchestrator_service_pb";
import { FailureDetails } from "../failure-details";

export class TaskFailedError extends Error {
  private _details: FailureDetails;

  constructor(message: string, details: pb.TaskFailureDetails) {
    super(message);
    this.name = "TaskFailedError";

    this._details = new FailureDetails(
      details.getErrormessage(),
      details.getErrortype(),
      details?.getStacktrace()?.getValue(),
    );
  }

  get details(): FailureDetails {
    return this._details;
  }
}
