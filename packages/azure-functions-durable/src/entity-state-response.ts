// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * The response returned by {@link DurableFunctionsClient.readEntityState}, matching the classic
 * Durable Functions v3 `EntityStateResponse` shape.
 *
 * @typeParam T - The entity state type.
 */
export class EntityStateResponse<T = unknown> {
  /**
   * @param entityExists - Whether the entity exists (has state).
   * @param entityState - The entity state, present only when {@link entityExists} is true.
   */
  constructor(
    public readonly entityExists: boolean,
    public readonly entityState?: T,
  ) {}
}
