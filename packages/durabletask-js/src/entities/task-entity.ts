// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskEntityContext } from "./task-entity-context";
import { TaskEntityOperation } from "./task-entity-operation";

/**
 * The task entity contract.
 *
 * @remarks
 * This is the core interface that all entities must implement.
 * The state of an entity can be retrieved and updated via the operation's state property.
 */
export interface ITaskEntity {
  /**
   * Runs an operation for this entity.
   *
   * @param operation - The operation to run.
   * @returns The response to the caller, if any. Can be a Promise for async operations.
   */
  run(operation: TaskEntityOperation): unknown | Promise<unknown>;
}

/**
 * Type for entity factory functions that create entity instances.
 */
export type EntityFactory<T extends ITaskEntity = ITaskEntity> = () => T;

/**
 * An ITaskEntity which dispatches its operations to methods on the class.
 *
 * @typeParam TState - The state type held by this entity.
 *
 * @remarks
 * **Method Binding**
 *
 * When using this base class, all public methods will be considered valid entity operations.
 * - Operation matching is case insensitive.
 * - Error is thrown if no matching method is found for an operation.
 *
 * **Entity State**
 *
 * Entity state will be hydrated into the `state` property. The state is initialized
 * via `initializeState()` when there is no current state.
 *
 * **Implicit Operations**
 *
 * This class supports the `delete` operation implicitly. When `delete` is called and no
 * explicit delete method exists, the entity state is set to null (deleted).
 * To override this behavior, implement a `delete()` method on your entity.
 */
export abstract class TaskEntity<TState> implements ITaskEntity {
  /**
   * Gets or sets the state for this entity.
   *
   * @remarks
   * This will be hydrated as part of `run()`. `initializeState()` will be called
   * when state is null/undefined at the start of an operation.
   *
   * Setting to null or undefined will delete the entity state.
   */
  protected state!: TState;

  /**
   * Gets the entity context.
   */
  protected get context(): TaskEntityContext | undefined {
    return this._context;
  }

  /**
   * The current context. Set during run().
   */
  private _context: TaskEntityContext | undefined;

  /**
   * Runs an operation for this entity.
   *
   * @param operation - The operation to run.
   * @returns The response to the caller, if any.
   */
  async run(operation: TaskEntityOperation): Promise<unknown> {
    this._context = operation.context;

    // Hydrate state
    const existingState = operation.state.getState<TState>();
    if (existingState === undefined || existingState === null) {
      this.state = this.initializeState();
    } else {
      this.state = existingState;
    }

    // Try to dispatch to a method on this class
    const result = this.dispatch(operation);

    // Handle async results
    const resolvedResult = await Promise.resolve(result);
    operation.state.setState(this.state);

    return resolvedResult;
  }

  /**
   * Initializes the entity state. This is only called when there is no current state.
   *
   * @returns The initial entity state.
   *
   * @remarks
   * The default implementation returns an empty object cast to TState.
   * Override this method to provide custom initialization logic.
   */
  protected initializeState(): TState {
    return {} as TState;
  }

  /**
   * Dispatches the operation to the appropriate method on this class.
   *
   * @param operation - The operation to dispatch.
   * @returns The result of the method invocation.
   */
  private dispatch(operation: TaskEntityOperation): unknown {
    const operationName = operation.name.toLowerCase();

    // Find a method that matches the operation name (case-insensitive)
    const methodName = this.findMethod(operationName);

    if (methodName) {
      // Get the method and invoke it
      const method = (this as unknown as Record<string, unknown>)[methodName];
      if (typeof method === "function") {
        // Bind to this and call with input if present
        const boundMethod = method.bind(this);
        if (operation.hasInput) {
          return boundMethod(operation.getInput());
        }
        return boundMethod();
      }
    }

    // Try implicit operations
    if (this.tryDispatchImplicit(operation)) {
      return undefined;
    }

    // No matching method found
    throw new Error(`No suitable method found for entity operation '${operation.name}'.`);
  }

  /**
   * Finds a method on this class that matches the operation name (case-insensitive).
   *
   * @param operationName - The operation name (already lowercased).
   * @returns The actual method name if found, undefined otherwise.
   */
  private findMethod(operationName: string): string | undefined {
    // Get all own property names of this instance and its prototype chain
    const proto = Object.getPrototypeOf(this);
    const methodNames = Object.getOwnPropertyNames(proto);

    // Find a method that matches case-insensitively
    for (const name of methodNames) {
      if (name.toLowerCase() === operationName) {
        const prop = (this as unknown as Record<string, unknown>)[name];
        // Skip non-functions and built-in methods
        if (typeof prop === "function" && name !== "constructor" && name !== "run") {
          return name;
        }
      }
    }

    return undefined;
  }

  /**
   * Tries to dispatch implicit operations.
   *
   * @param operation - The operation to dispatch.
   * @returns True if an implicit operation was handled, false otherwise.
   */
  private tryDispatchImplicit(operation: TaskEntityOperation): boolean {
    // Handle implicit "delete" operation
    if (operation.name.toLowerCase() === "delete") {
      operation.state.setState(null);
      this.state = null as unknown as TState;
      return true;
    }

    return false;
  }
}
