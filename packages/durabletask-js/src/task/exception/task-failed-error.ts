// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../../proto/orchestrator_service_pb";
import { FailureDetails } from "../failure-details";
import { convertFailureDetails } from "../../utils/failure-details.util";

export class TaskFailedError extends Error {
  private _details: FailureDetails;

  constructor(message: string, details: pb.TaskFailureDetails) {
    super(message);
    this.name = "TaskFailedError";

    this._details = convertFailureDetails(details);
  }

  get details(): FailureDetails {
    return this._details;
  }
}
