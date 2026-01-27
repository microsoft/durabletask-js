// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Task } from "../task/task";
import { EntityInstanceId } from "./entity-instance-id";
import { CallEntityOptions, SignalEntityOptions } from "./signal-entity-options";

/**
 * Feature for interacting with durable entities from an orchestration.
 *
 * @remarks
 * This feature provides methods to call and signal entities from within an orchestration.
 * - `callEntity` waits for a response from the entity.
 * - `signalEntity` is a one-way (fire-and-forget) operation that doesn't wait for a response.
 *
 * Dotnet reference: src/Abstractions/Entities/TaskOrchestrationEntityFeature.cs
 */
export interface OrchestrationEntityFeature {
  /**
   * Calls an operation on an entity and waits for it to complete.
   *
   * @typeParam TResult - The result type of the entity operation.
   * @param id - The target entity instance ID.
   * @param operationName - The name of the operation to invoke.
   * @param input - Optional input to pass to the operation.
   * @param options - Optional call options.
   * @returns A task that completes when the entity operation finishes, with the operation result.
   * @throws {EntityOperationFailedException} If the entity operation fails with an unhandled exception.
   *
   * @remarks
   * Unlike `signalEntity`, this method waits for the entity to process the operation
   * and returns the result. If the entity operation throws an exception, this method
   * will throw an `EntityOperationFailedException` containing the failure details.
   *
   * Dotnet reference: TaskOrchestrationEntityFeature.CallEntityAsync
   */
  callEntity<TResult = void>(
    id: EntityInstanceId,
    operationName: string,
    input?: unknown,
    options?: CallEntityOptions,
  ): Task<TResult>;

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
