import * as pb from "../../proto/orchestrator_service_pb";

export function fromProtobuf(val: pb.OrchestrationStatus): OrchestrationStatus {
  const values = Object.values(OrchestrationStatus);
  const valIdx = values.findIndex((v) => v == (val as number));

  // Return the entry of the OrchestrationStatus enum at index
  const entries = Object.entries(OrchestrationStatus);
  return entries[valIdx][1] as OrchestrationStatus;
}

export function toProtobuf(val: OrchestrationStatus): pb.OrchestrationStatus {
  const values = Object.values(pb.OrchestrationStatus);
  const valIdx = values.findIndex((v) => v == (val as number));

  // Return the entry of the OrchestrationStatus enum at index
  const entries = Object.entries(pb.OrchestrationStatus);
  return entries[valIdx][1] as pb.OrchestrationStatus;
}

export enum OrchestrationStatus {
  RUNNING = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING,
  COMPLETED = pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
  FAILED = pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
  TERMINATED = pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED,
  CONTINUED_AS_NEW = pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW,
  PENDING = pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING,
  SUSPENDED = pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED,
}
