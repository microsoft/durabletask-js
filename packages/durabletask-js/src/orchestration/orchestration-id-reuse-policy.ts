// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { OrchestrationStatus, toProtobuf } from "./enum/orchestration-status.enum";

const REPLACEABLE_RUNTIME_STATUSES: readonly OrchestrationStatus[] = [
  OrchestrationStatus.RUNNING,
  OrchestrationStatus.COMPLETED,
  OrchestrationStatus.FAILED,
  OrchestrationStatus.CANCELED,
  OrchestrationStatus.TERMINATED,
  OrchestrationStatus.PENDING,
  OrchestrationStatus.SUSPENDED,
];

/**
 * Controls whether a new orchestration rejects or atomically replaces an existing instance.
 *
 * The current shared protocol does not support an atomic no-op/IGNORE action.
 */
export interface OrchestrationIdReusePolicy {
  /**
   * Existing instances in one of these runtime statuses produce a duplicate-ID error.
   *
   * Instances in every other supported runtime status are atomically replaced. An empty
   * list makes every supported runtime status replaceable. Omitting the policy preserves the
   * backend's default duplicate-ID behavior.
   */
  readonly dedupeStatuses: readonly OrchestrationStatus[];
}

/** @hidden Converts the public deduplication policy to the wire-level replacement policy. */
export function toProtobufOrchestrationIdReusePolicy(
  policy: OrchestrationIdReusePolicy,
): pb.OrchestrationIdReusePolicy {
  const dedupeStatuses = new Set(policy.dedupeStatuses.map(toProtobuf));
  const replaceableStatuses = REPLACEABLE_RUNTIME_STATUSES.map(toProtobuf).filter(
    (status) => !dedupeStatuses.has(status),
  );

  const result = new pb.OrchestrationIdReusePolicy();
  result.setReplaceablestatusList(replaceableStatuses);
  return result;
}
