// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { FailureDetails } from "../task/failure-details";
import { OrchestrationStatus } from "./enum/orchestration-status.enum";
import { OrchestrationFailedError } from "./exception/orchestration-failed-error";

export class OrchestrationState {
  instanceId: string;
  name: string;
  runtimeStatus: OrchestrationStatus;
  createdAt: Date;
  lastUpdatedAt: Date;
  serializedInput?: string;
  serializedOutput?: string;
  serializedCustomStatus?: string;
  failureDetails?: FailureDetails;
  tags?: Record<string, string>;

  constructor(
    instanceId: string,
    name: string,
    runtimeStatus: OrchestrationStatus,
    createdAt: Date,
    lastUpdatedAt: Date,
    serializedInput?: string,
    serializedOutput?: string,
    serializedCustomStatus?: string,
    failureDetails?: FailureDetails,
    tags?: Record<string, string>,
  ) {
    this.instanceId = instanceId;
    this.name = name;
    this.runtimeStatus = runtimeStatus;
    this.createdAt = createdAt;
    this.lastUpdatedAt = lastUpdatedAt;
    this.serializedInput = serializedInput;
    this.serializedOutput = serializedOutput;
    this.serializedCustomStatus = serializedCustomStatus;
    this.failureDetails = failureDetails;
    this.tags = tags;
  }

  /** Gets whether the current runtimeStatus is RUNNING. */
  get isRunning(): boolean {
    return this.runtimeStatus === OrchestrationStatus.RUNNING;
  }

  /**
   * Gets whether the current runtimeStatus is COMPLETED, FAILED, or TERMINATED.
   * Completion does not imply success. All other statuses, including CANCELED,
   * return false, matching the .NET SDK.
   */
  get isCompleted(): boolean {
    return (
      this.runtimeStatus === OrchestrationStatus.COMPLETED ||
      this.runtimeStatus === OrchestrationStatus.FAILED ||
      this.runtimeStatus === OrchestrationStatus.TERMINATED
    );
  }

  raiseIfFailed(): void {
    if (this.failureDetails) {
      throw new OrchestrationFailedError(
        `Orchestration '${this.instanceId}' failed: ${this.failureDetails.message}`,
        this.failureDetails,
      );
    }

    // Also check the runtime status for cases where failure details were
    // dropped (e.g., empty error message/type from the sidecar).
    // Without this check, a FAILED orchestration with missing details would
    // silently pass through raiseIfFailed().
    if (this.runtimeStatus === OrchestrationStatus.FAILED) {
      const syntheticDetails = new FailureDetails(
        "Unknown error",
        "UnknownError",
      );
      throw new OrchestrationFailedError(
        `Orchestration '${this.instanceId}' failed: ${syntheticDetails.message}`,
        syntheticDetails,
      );
    }
  }
}
