// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationState, OrchestrationStatus } from "@microsoft/durabletask-js";

/**
 * The runtime status of an orchestration instance (classic Durable Functions v3 shape).
 */
export enum OrchestrationRuntimeStatus {
  Running = "Running",
  Completed = "Completed",
  ContinuedAsNew = "ContinuedAsNew",
  Failed = "Failed",
  Canceled = "Canceled",
  Terminated = "Terminated",
  Pending = "Pending",
  Suspended = "Suspended",
}

/** Fields used to construct a {@link DurableOrchestrationStatus}. */
export interface DurableOrchestrationStatusInit {
  name: string;
  instanceId: string;
  createdTime: Date;
  lastUpdatedTime: Date;
  input: unknown;
  output: unknown;
  runtimeStatus: OrchestrationRuntimeStatus;
  customStatus?: unknown;
  history?: unknown[];
}

/**
 * Represents the status of a durable orchestration instance, matching the classic Durable Functions
 * v3 `DurableOrchestrationStatus` shape. Returned by {@link DurableFunctionsClient.getStatus}.
 */
export class DurableOrchestrationStatus {
  readonly name: string;
  readonly instanceId: string;
  readonly createdTime: Date;
  readonly lastUpdatedTime: Date;
  readonly input: unknown;
  readonly output: unknown;
  readonly runtimeStatus: OrchestrationRuntimeStatus;
  readonly customStatus?: unknown;
  readonly history?: unknown[];

  constructor(init: DurableOrchestrationStatusInit) {
    this.name = init.name;
    this.instanceId = init.instanceId;
    this.createdTime = init.createdTime;
    this.lastUpdatedTime = init.lastUpdatedTime;
    this.input = init.input;
    this.output = init.output;
    this.runtimeStatus = init.runtimeStatus;
    this.customStatus = init.customStatus;
    this.history = init.history;
  }
}

/** Maps the core {@link OrchestrationStatus} enum to the classic v3 {@link OrchestrationRuntimeStatus}. */
export function toOrchestrationRuntimeStatus(status: OrchestrationStatus): OrchestrationRuntimeStatus {
  switch (status) {
    case OrchestrationStatus.RUNNING:
      return OrchestrationRuntimeStatus.Running;
    case OrchestrationStatus.COMPLETED:
      return OrchestrationRuntimeStatus.Completed;
    case OrchestrationStatus.CONTINUED_AS_NEW:
      return OrchestrationRuntimeStatus.ContinuedAsNew;
    case OrchestrationStatus.FAILED:
      return OrchestrationRuntimeStatus.Failed;
    case OrchestrationStatus.TERMINATED:
      return OrchestrationRuntimeStatus.Terminated;
    case OrchestrationStatus.PENDING:
      return OrchestrationRuntimeStatus.Pending;
    case OrchestrationStatus.SUSPENDED:
      return OrchestrationRuntimeStatus.Suspended;
    default:
      return OrchestrationRuntimeStatus.Pending;
  }
}

/** Maps a classic v3 {@link OrchestrationRuntimeStatus} back to the core {@link OrchestrationStatus}. */
export function fromOrchestrationRuntimeStatus(status: OrchestrationRuntimeStatus): OrchestrationStatus {
  switch (status) {
    case OrchestrationRuntimeStatus.Running:
      return OrchestrationStatus.RUNNING;
    case OrchestrationRuntimeStatus.Completed:
      return OrchestrationStatus.COMPLETED;
    case OrchestrationRuntimeStatus.ContinuedAsNew:
      return OrchestrationStatus.CONTINUED_AS_NEW;
    case OrchestrationRuntimeStatus.Failed:
      return OrchestrationStatus.FAILED;
    case OrchestrationRuntimeStatus.Terminated:
    case OrchestrationRuntimeStatus.Canceled:
      return OrchestrationStatus.TERMINATED;
    case OrchestrationRuntimeStatus.Suspended:
      return OrchestrationStatus.SUSPENDED;
    case OrchestrationRuntimeStatus.Pending:
    default:
      return OrchestrationStatus.PENDING;
  }
}

/**
 * Maps a core {@link OrchestrationState} into the classic v3 {@link DurableOrchestrationStatus}.
 *
 * Payloads are deserialized with `JSON.parse`, matching the plain-JSON wire contract the core client
 * and worker use.
 */
export function toDurableOrchestrationStatus(state: OrchestrationState): DurableOrchestrationStatus {
  return new DurableOrchestrationStatus({
    name: state.name,
    instanceId: state.instanceId,
    createdTime: state.createdAt,
    lastUpdatedTime: state.lastUpdatedAt,
    input: parseJson(state.serializedInput),
    output: parseJson(state.serializedOutput),
    runtimeStatus: toOrchestrationRuntimeStatus(state.runtimeStatus),
    customStatus: parseJson(state.serializedCustomStatus),
  });
}

/** @hidden */
function parseJson(value: string | undefined): unknown {
  return value === undefined || value === "" ? undefined : JSON.parse(value);
}
