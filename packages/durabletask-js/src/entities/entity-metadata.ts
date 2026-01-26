// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "./entity-instance-id";

/**
 * Represents metadata about a durable entity instance.
 *
 * @typeParam T - The type of the entity state. Defaults to `unknown`.
 *
 * @example
 * ```typescript
 * // Metadata with typed state
 * const metadata: EntityMetadata<number> = {
 *   id: new EntityInstanceId("counter", "user-123"),
 *   lastModifiedTime: new Date(),
 *   backlogQueueSize: 0,
 *   includesState: true,
 *   state: 42
 * };
 * ```
 */
export interface EntityMetadata<T = unknown> {
  /**
   * The unique identifier of the entity.
   */
  readonly id: EntityInstanceId;

  /**
   * The time when the entity was last modified.
   */
  readonly lastModifiedTime: Date;

  /**
   * The size of the backlog queue, if there is a backlog and if that metric is supported by the backend.
   */
  readonly backlogQueueSize: number;

  /**
   * The instance ID of the orchestration that has locked this entity, or undefined if the entity is not locked.
   */
  readonly lockedBy?: string;

  /**
   * Indicates whether this metadata response includes the entity state.
   *
   * Queries can exclude the state of the entity from the metadata that is retrieved.
   */
  readonly includesState: boolean;

  /**
   * The state of the entity, if {@link includesState} is true.
   *
   * @throws {Error} If accessed when {@link includesState} is false.
   */
  readonly state?: T;
}

/**
 * Creates an EntityMetadata object from raw data.
 *
 * @param id - The entity instance ID.
 * @param lastModifiedTime - The last modified time.
 * @param backlogQueueSize - The backlog queue size.
 * @param lockedBy - The orchestration instance ID holding the lock, if any.
 * @param state - The entity state, if included.
 * @returns An EntityMetadata object.
 */
export function createEntityMetadata<T = unknown>(
  id: EntityInstanceId,
  lastModifiedTime: Date,
  backlogQueueSize: number,
  lockedBy: string | undefined,
  state: T | undefined
): EntityMetadata<T> {
  const includesState = state !== undefined;

  return {
    id,
    lastModifiedTime,
    backlogQueueSize,
    lockedBy,
    includesState,
    get state(): T | undefined {
      if (!includesState) {
        throw new Error("Cannot retrieve state when includesState is false");
      }
      return state;
    },
  };
}

/**
 * Creates an EntityMetadata object without state.
 *
 * @param id - The entity instance ID.
 * @param lastModifiedTime - The last modified time.
 * @param backlogQueueSize - The backlog queue size.
 * @param lockedBy - The orchestration instance ID holding the lock, if any.
 * @returns An EntityMetadata object with includesState set to false.
 */
export function createEntityMetadataWithoutState(
  id: EntityInstanceId,
  lastModifiedTime: Date,
  backlogQueueSize: number,
  lockedBy: string | undefined
): EntityMetadata<never> {
  return {
    id,
    lastModifiedTime,
    backlogQueueSize,
    lockedBy,
    includesState: false,
    get state(): never {
      throw new Error("Cannot retrieve state when includesState is false");
    },
  };
}
