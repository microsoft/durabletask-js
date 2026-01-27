// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "./entity-instance-id";
import { SignalEntityOptions } from "./signal-entity-options";

/**
 * Feature for interacting with durable entities from an orchestration.
 *
 * @remarks
 * This feature provides methods to signal entities from within an orchestration.
 * Signaling is a one-way (fire-and-forget) operation that doesn't wait for a response.
 *
 * Dotnet reference: src/Abstractions/Entities/TaskOrchestrationEntityFeature.cs
 */
export interface OrchestrationEntityFeature {
  /**
   * Signals an operation on an entity without waiting for a response.
   *
   * @param id - The target entity instance ID.
   * @param operationName - The name of the operation to invoke.
   * @param input - Optional input to pass to the operation.
   * @param options - Optional signal options (e.g., scheduled time).
   *
   * @remarks
   * This is a fire-and-forget operation. The orchestration will not wait for
   * the entity operation to complete. Use `callEntity` if you need to wait
   * for a response.
   *
   * Dotnet reference: TaskOrchestrationEntityFeature.SignalEntityAsync
   */
  signalEntity(
    id: EntityInstanceId,
    operationName: string,
    input?: unknown,
    options?: SignalEntityOptions,
  ): void;
}
