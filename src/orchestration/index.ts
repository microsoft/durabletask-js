import * as pb from "../proto/orchestrator_service_pb";
import { FailureDetails } from "../task/failure-details";
import { OrchestrationStatus, parseGrpcValue } from "./enum/orchestration-status.enum";
import { PurgeResult } from "./orchestration-purge-result";
import { OrchestrationState } from "./orchestration-state";

export function newOrchestrationState(
  instanceId: string,
  res?: pb.GetInstanceResponse,
): OrchestrationState | undefined {
  if (!res || !res.getExists()) {
    return;
  }

  let state = res.getOrchestrationstate();
  let failureDetails;

  const failureDetailsErrorMessage = state?.getFailuredetails()?.getErrormessage();
  const failureDetailsErrorType = state?.getFailuredetails()?.getErrortype();

  if (state && failureDetailsErrorMessage && failureDetailsErrorType) {
    failureDetails = new FailureDetails(
      failureDetailsErrorMessage,
      failureDetailsErrorType,
      state.getFailuredetails()?.getStacktrace()?.toString(),
    );
  }

  const status = OrchestrationStatus[state?.getOrchestrationstatus() ?? 0];

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

  return new OrchestrationState(
    instanceId,
    state?.getName() ?? "",
    parseGrpcValue(state?.getOrchestrationstatus() ?? 0),
    new Date(tsCreatedParsed),
    new Date(tsUpdatedParsed),
    state?.getInput()?.toString(),
    state?.getOutput()?.toString(),
    state?.getCustomstatus()?.toString(),
    failureDetails,
  );
}

export function newPurgeResult(res: pb.PurgeInstancesResponse): PurgeResult | undefined {
  if (!res || !res.getDeletedinstancecount()) {
    return;
  }

  return new PurgeResult(res.getDeletedinstancecount());
}
