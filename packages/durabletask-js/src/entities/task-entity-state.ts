// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Represents the persisted state of an entity.
 *
 * @remarks
 * This interface provides methods for getting and setting entity state during operation execution.
 * Setting state to null or undefined will delete the entity state.
 */
export interface TaskEntityState {
  /**
   * Gets a value indicating whether this entity currently has state.
   *
   * @returns true if the entity has state; false if the entity has not been initialized or was deleted.
   */
  readonly hasState: boolean;

  /**
   * Gets the current state of the entity.
   *
   * @typeParam T - The type to retrieve the state as.
   * @param defaultValue - Optional default value to return if no state is present.
   * @returns The entity state, or the default value if no state is present.
   *
   * @remarks
   * If no state is present, the defaultValue will be returned but it will NOT be persisted.
   * You must call setState() to persist state changes.
   */
  getState<T>(defaultValue?: T): T | undefined;

  /**
   * Sets the entity state.
   *
   * @param state - The state to set. Setting null or undefined will delete the entity state.
   *
   * @remarks
   * Setting state to null or undefined will effectively delete the entity.
   * The state will be serialized to JSON for persistence.
   */
  setState(state: unknown): void;
}
