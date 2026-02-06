// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../../proto/orchestrator_service_pb";

// Pre-built reverse maps for efficient O(1) conversions
const protoToClient = new Map<pb.OrchestrationStatus, OrchestrationStatus>();
const clientToProto = new Map<OrchestrationStatus, pb.OrchestrationStatus>();


export function fromProtobuf(val: pb.OrchestrationStatus): OrchestrationStatus {
  const result = protoToClient.get(val);
  if (result === undefined) {
    throw new Error(`Unknown protobuf OrchestrationStatus value: ${val}`);
  }
  return result;
}

export function toProtobuf(val: OrchestrationStatus): pb.OrchestrationStatus {
  const result = clientToProto.get(val);
  if (result === undefined) {
    throw new Error(`Unknown OrchestrationStatus value: ${val}`);
  }
  return result;
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

// Initialize the reverse maps now that both enums are defined.
// Both enums share the same numeric values; cast through number to satisfy TypeScript.
// An invariant check guards against silent drift between the two enums.
for (const [name, value] of Object.entries(OrchestrationStatus)) {
  if (typeof value === "number") {
    const numValue = value as number;
    const expectedProtoKey = `ORCHESTRATION_STATUS_${name}`;
    // Verify the proto enum has this key with the same numeric value (plain object, no reverse mapping)
    const protoValue = (pb.OrchestrationStatus as unknown as Record<string, number>)[expectedProtoKey];
    if (protoValue !== numValue) {
      throw new Error(
        `Enum drift detected: OrchestrationStatus.${name} (${numValue}) does not match ` +
        `pb.OrchestrationStatus.${expectedProtoKey} (${protoValue}).`,
      );
    }
    protoToClient.set(numValue as pb.OrchestrationStatus, numValue as OrchestrationStatus);
    clientToProto.set(numValue as OrchestrationStatus, numValue as pb.OrchestrationStatus);
  }
}
