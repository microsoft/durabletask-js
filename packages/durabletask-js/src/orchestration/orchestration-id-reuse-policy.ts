// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { OrchestrationStatus, toProtobuf } from "./enum/orchestration-status.enum";

/** Runtime statuses supported by orchestration ID deduplication, matching the .NET SDK. */
export const ValidDedupeStatuses: readonly OrchestrationStatus[] = Object.freeze([
  OrchestrationStatus.COMPLETED,
  OrchestrationStatus.FAILED,
  OrchestrationStatus.TERMINATED,
  OrchestrationStatus.CANCELED,
  OrchestrationStatus.PENDING,
  OrchestrationStatus.RUNNING,
  OrchestrationStatus.SUSPENDED,
]);

/** @hidden Validates orchestration ID deduplication options. */
export function validateDedupeStatuses(dedupeStatuses: readonly OrchestrationStatus[]): void {
  for (const status of dedupeStatuses) {
    if (!ValidDedupeStatuses.includes(status)) {
      throw new TypeError(`Invalid orchestration runtime status: '${status}' for deduplication.`);
    }
  }
}

/** @hidden Validates deduplication options for clients that terminate reusable running instances themselves. */
export function validateDedupeStatusesForReplacement(dedupeStatuses: readonly OrchestrationStatus[]): void {
  validateDedupeStatuses(dedupeStatuses);
  const dedupeStatusSet = new Set(dedupeStatuses);
  if (
    dedupeStatusSet.has(OrchestrationStatus.TERMINATED) &&
    [OrchestrationStatus.RUNNING, OrchestrationStatus.PENDING, OrchestrationStatus.SUSPENDED].some(
      (status) => !dedupeStatusSet.has(status),
    )
  ) {
    throw new TypeError(
      "Invalid dedupe statuses: cannot include 'Terminated' while also allowing reuse of running instances, " +
        "because the running instance would be terminated and then immediately conflict with the dedupe check.",
    );
  }
}

/** @hidden Converts the public deduplication policy to the wire-level replacement policy. */
export function toProtobufOrchestrationIdReusePolicy(
  dedupeStatuses: readonly OrchestrationStatus[],
): pb.OrchestrationIdReusePolicy {
  validateDedupeStatuses(dedupeStatuses);
  const dedupeStatusSet = new Set(dedupeStatuses.map(toProtobuf));
  const replaceableStatuses = ValidDedupeStatuses.map(toProtobuf).filter((status) => !dedupeStatusSet.has(status));

  const result = new pb.OrchestrationIdReusePolicy();
  result.setReplaceablestatusList(replaceableStatuses);
  return result;
}
