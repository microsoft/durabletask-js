// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "./entity-instance-id";
import { SignalEntityOptions } from "./signal-entity-options";

/**
 * Options for scheduling a new orchestration from within an entity.
 */
export interface StartOrchestrationOptions {
  /**
   * The unique instance ID for the new orchestration.
   * If not specified, a new GUID will be generated.
   */
  readonly instanceId?: string;

  /**
   * The time at which to start the orchestration.
   * If not specified, the orchestration starts immediately.
   */
  readonly startAt?: Date;
}

/**
 * The context for a TaskEntity, providing access to entity identity
 * and methods for signaling other entities or scheduling orchestrations.
 *
 * @remarks
 * This context is available during entity operation execution and allows
 * the entity to interact with other entities and orchestrations.
 *
 * Dotnet reference: src/Abstractions/Entities/TaskEntityContext.cs
 */
export interface TaskEntityContext {
  /**
   * Gets the instance ID of this entity.
   */
  readonly id: EntityInstanceId;

  /**
   * Signals an entity operation (fire-and-forget).
   *
   * @param id - The entity to signal.
   * @param operationName - The name of the operation to invoke.
   * @param input - Optional input for the operation.
   * @param options - Optional signal options (e.g., scheduled delivery time).
   *
   * @remarks
   * Signals are one-way messages; the caller does not wait for a response.
   * The signal will be delivered asynchronously to the target entity.
   */
  signalEntity(
    id: EntityInstanceId,
    operationName: string,
    input?: unknown,
    options?: SignalEntityOptions,
  ): void;

  /**
   * Schedules a new orchestration to be started.
   *
   * @param name - The name of the orchestration to start.
   * @param input - Optional input for the orchestration.
   * @param options - Optional start options (e.g., instance ID, start time).
   * @returns The instance ID of the new orchestration.
   *
   * @remarks
   * The orchestration will be started asynchronously. The returned instance ID
   * can be used to query or manage the orchestration.
   */
  scheduleNewOrchestration(
    name: string,
    input?: unknown,
    options?: StartOrchestrationOptions,
  ): string;
}
