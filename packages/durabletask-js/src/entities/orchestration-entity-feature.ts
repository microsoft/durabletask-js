// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Task } from "../task/task";
import { EntityInstanceId } from "./entity-instance-id";
import { CallEntityOptions, SignalEntityOptions } from "./signal-entity-options";

/**
 * Result of checking if currently in a critical section.
 */
export interface CriticalSectionInfo {
  /**
   * Whether the orchestration is currently inside a critical section.
   */
  inSection: boolean;

  /**
   * The entities that are locked in the current critical section.
   * Only populated when inSection is true.
   */
  lockedEntities?: EntityInstanceId[];
}

/**
 * A disposable object that releases entity locks when disposed.
 *
 * @remarks
 * Use this to release locks acquired via `lockEntities`.
 * Typically used in a try/finally block to ensure locks are released.
 */
export interface LockHandle {
  /**
   * Releases all entity locks held by this lock handle.
   */
  release(): void;
}

/**
 * Feature for interacting with durable entities from an orchestration.
 *
 * @remarks
 * This feature provides methods to call and signal entities from within an orchestration.
 * - `callEntity` waits for a response from the entity.
 * - `signalEntity` is a one-way (fire-and-forget) operation that doesn't wait for a response.
 * - `lockEntities` acquires locks on multiple entities for critical sections.
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
   */
  signalEntity(
    id: EntityInstanceId,
    operationName: string,
    input?: unknown,
    options?: SignalEntityOptions,
  ): void;

  /**
   * Acquires locks on one or more entities for a critical section.
   *
   * @param entityIds - The entities to lock. Order doesn't matter; they will be sorted internally.
   * @returns A task that completes when all locks are acquired, with a handle to release the locks.
   *
   * @remarks
   * This method acquires exclusive locks on all specified entities, ensuring that no other
   * orchestration can access them until the locks are released. Locks are acquired in a
   * globally consistent order (sorted by entity ID) to prevent deadlocks.
   *
   * Use the returned LockHandle to release the locks when the critical section is complete.
   * It's recommended to release locks in a finally block to ensure they're always released.
   *
   * While holding locks:
   * - You can call (but not signal) the locked entities
   * - You cannot call sub-orchestrations
   * - You cannot acquire additional locks (no nested critical sections)
   */
  lockEntities(...entityIds: EntityInstanceId[]): Task<LockHandle>;

  /**
   * Checks whether the orchestration is currently inside a critical section.
   *
   * @returns Information about the current critical section state.
   *
   */
  isInCriticalSection(): CriticalSectionInfo;
}
