// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { convertFailureDetails } from "../utils/failure-details.util";
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
  const failureDetails = convertFailureDetails(state?.getFailuredetails());

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
