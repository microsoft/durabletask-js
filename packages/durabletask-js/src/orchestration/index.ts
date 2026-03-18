// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { FailureDetails } from "../task/failure-details";
import { fromProtobuf } from "./enum/orchestration-status.enum";
import { OrchestrationState } from "./orchestration-state";
import { mapToRecord } from "../utils/tags.util";

export function newOrchestrationState(
  instanceId: string,
  res?: pb.GetInstanceResponse,
): OrchestrationState | undefined {
  if (!res || !res.getExists()) {
    return;
  }

  const state = res.getOrchestrationstate();
  let failureDetails;

  const protoFailureDetails = state?.getFailuredetails();
  if (protoFailureDetails) {
    failureDetails = new FailureDetails(
      protoFailureDetails.getErrormessage(),
      protoFailureDetails.getErrortype(),
      protoFailureDetails.getStacktrace()?.getValue(),
    );
  }

  // Convert Timestamp seconds and nanos to Date
  const tsCreated = state?.getCreatedtimestamp();
  const tsUpdated = state?.getLastupdatedtimestamp();

  let tsCreatedParsed = new Date();
  let tsUpdatedParsed = new Date();

  if (tsCreated) {
    tsCreatedParsed = new Date(tsCreated.getSeconds() * 1000 + tsCreated.getNanos() / 1000000);
  }

  if (tsUpdated) {
    tsUpdatedParsed = new Date(tsUpdated.getSeconds() * 1000 + tsUpdated.getNanos() / 1000000);
  }

  const tags = mapToRecord(state?.getTagsMap());

  return new OrchestrationState(
    instanceId,
    state?.getName() ?? "",
    fromProtobuf(state?.getOrchestrationstatus() ?? 0),
    new Date(tsCreatedParsed),
    new Date(tsUpdatedParsed),
    state?.getInput()?.getValue(),
    state?.getOutput()?.getValue(),
    state?.getCustomstatus()?.getValue(),
    failureDetails,
    tags,
  );
}
