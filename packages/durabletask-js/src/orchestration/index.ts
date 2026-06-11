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

  const tsCreated = state?.getCreatedtimestamp();
  const tsUpdated = state?.getLastupdatedtimestamp();

  const createdAt = tsCreated ? tsCreated.toDate() : new Date(0);
  const lastUpdatedAt = tsUpdated ? tsUpdated.toDate() : new Date(0);

  const tags = mapToRecord(state?.getTagsMap());

  return new OrchestrationState(
    instanceId,
    state?.getName() ?? "",
    fromProtobuf(state?.getOrchestrationstatus() ?? 0),
    createdAt,
    lastUpdatedAt,
    state?.getInput()?.getValue(),
    state?.getOutput()?.getValue(),
    state?.getCustomstatus()?.getValue(),
    failureDetails,
    tags,
  );
}
