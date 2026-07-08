// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  EntityFactory,
  EntityInstanceId,
  ITaskEntity,
  TaskEntityOperation,
} from "@microsoft/durabletask-js";

/**
 * Classic Durable Functions (v3) entity context, exposed to migrating entity functions as
 * `context.df`.
 *
 * @remarks
 * This is an adapter over the core durabletask {@link TaskEntityOperation}. It lets entity bodies
 * written against the legacy `durable-functions` `context.df.*` API run unchanged on the
 * gRPC/durabletask engine.
 */
export class DurableEntityContext {
  private _result: unknown;
  private _resultSet = false;
  private readonly _isNewlyConstructed: boolean;

  constructor(private readonly _operation: TaskEntityOperation) {
    this._isNewlyConstructed = !_operation.state.hasState;
  }

  /** The name of the current operation. */
  get operationName(): string {
    return this._operation.name;
  }

  /** The entity type name (lowercased). */
  get entityName(): string {
    return this._operation.context.id.name;
  }

  /** The entity instance key (case-preserved). */
  get entityKey(): string {
    return this._operation.context.id.key;
  }

  /** The entity instance ID in `@name@key` form. */
  get instanceId(): string {
    return this._operation.context.id.toString();
  }

  /** The entity instance ID as an {@link EntityInstanceId} object. */
  get entityId(): EntityInstanceId {
    return this._operation.context.id;
  }

  /** Whether this entity had no state prior to the current operation (freshly constructed). */
  get isNewlyConstructed(): boolean {
    return this._isNewlyConstructed;
  }

  /** Gets the input for the current operation. */
  getInput<T = unknown>(): T | undefined {
    return this._operation.getInput<T>();
  }

  /**
   * Gets the current entity state.
   *
   * @param initializer - Optional zero-argument callable providing the initial state when none exists.
   */
  getState<T = unknown>(initializer?: () => T): T | undefined {
    const defaultValue = typeof initializer === "function" ? initializer() : undefined;
    return this._operation.state.getState<T>(defaultValue);
  }

  /** Sets the entity state. Passing `null`/`undefined` deletes the entity. */
  setState(state: unknown): void {
    this._operation.state.setState(state);
  }

  /** Sets the result (return value) of the current operation. */
  return(result: unknown): void {
    this._result = result;
    this._resultSet = true;
  }

  /** Deletes this entity after the operation completes. */
  destructOnExit(): void {
    this._operation.state.setState(undefined);
  }

  /**
   * Signals another entity operation without waiting for a response (fire-and-forget).
   *
   * @param entityId - The target entity.
   * @param operationName - The name of the operation to invoke.
   * @param operationInput - Optional input for the operation.
   */
  signalEntity(
    entityId: EntityInstanceId,
    operationName: string,
    operationInput?: unknown,
  ): void {
    this._operation.context.signalEntity(entityId, operationName, operationInput);
  }

  /** @hidden Returns the explicitly-set result, or the provided fallback when none was set. */
  resolveResult(fallback: unknown): unknown {
    return this._resultSet ? this._result : fallback;
  }
}

/** The object passed to a classic (v3) entity function; its `df` is the durable entity context. */
export interface ClassicEntityContext {
  df: DurableEntityContext;
}

/**
 * A classic Durable Functions (v3) entity: a single-argument function that reads and mutates state
 * through `context.df.*`.
 */
export type ClassicEntity = (context: ClassicEntityContext) => unknown | Promise<unknown>;

/**
 * Adapts an entity handler for registration on the core worker.
 *
 * @remarks
 * Core-native entities are zero-argument factories (`() => ITaskEntity`) and are returned
 * unchanged. Classic v3 entities declare a single `context` parameter and use `context.df.*`; those
 * are wrapped in a factory whose operation dispatch forwards to the core operation.
 */
export function wrapEntity(handler: EntityFactory | ClassicEntity): EntityFactory {
  if (typeof handler === "function" && handler.length >= 1) {
    const classic = handler as ClassicEntity;
    return () => new ClassicEntityAdapter(classic);
  }
  return handler as EntityFactory;
}

/** @hidden Bridges a classic v3 entity function to the core {@link ITaskEntity} contract. */
class ClassicEntityAdapter implements ITaskEntity {
  constructor(private readonly _fn: ClassicEntity) {}

  async run(operation: TaskEntityOperation): Promise<unknown> {
    const df = new DurableEntityContext(operation);
    const returned = await Promise.resolve(this._fn({ df }));
    return df.resolveResult(returned);
  }
}
