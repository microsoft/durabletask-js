// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskEntityContext } from "./task-entity-context";
import { TaskEntityState } from "./task-entity-state";

/**
 * Describes a single operation for a TaskEntity.
 *
 * @remarks
 * This interface encapsulates all information about an operation request:
 * - The operation name
 * - The operation input (if any)
 * - The entity context (for signaling other entities, scheduling orchestrations)
 * - The entity state (for reading/writing persistent state)
 *
 * Dotnet reference: src/Abstractions/Entities/TaskEntityOperation.cs
 */
export interface TaskEntityOperation {
  /**
   * Gets the name of the operation.
   *
   * @remarks
   * Operation names are case-insensitive when dispatched by the base TaskEntity class.
   */
  readonly name: string;

  /**
   * Gets the context for this entity operation.
   *
   * @remarks
   * The context provides access to entity identity and methods for
   * signaling other entities or scheduling orchestrations.
   */
  readonly context: TaskEntityContext;

  /**
   * Gets the state of the entity.
   *
   * @remarks
   * Use the state object to read and write the entity's persistent state.
   * Setting state to null/undefined will delete the entity.
   */
  readonly state: TaskEntityState;

  /**
   * Gets a value indicating whether this operation has input.
   *
   * @returns true if the operation has input; false otherwise.
   */
  readonly hasInput: boolean;

  /**
   * Gets the input for this operation.
   *
   * @typeParam T - The type to deserialize the input as.
   * @returns The deserialized input, or undefined if there is no input.
   */
  getInput<T>(): T | undefined;
}
