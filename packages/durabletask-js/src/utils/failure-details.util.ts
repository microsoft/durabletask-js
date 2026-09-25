// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { FailureDetails } from "../task/failure-details";

export function convertFailureDetails(details: pb.TaskFailureDetails): FailureDetails;
export function convertFailureDetails(details: pb.TaskFailureDetails | undefined): FailureDetails | undefined;
export function convertFailureDetails(details: pb.TaskFailureDetails | undefined): FailureDetails | undefined {
  if (!details) {
    return undefined;
  }

  return new FailureDetails(
    details.getErrormessage(),
    details.getErrortype(),
    details.getStacktrace()?.getValue(),
    convertFailureDetails(details.getInnerfailure()),
  );
}
