// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Represents the unique identifier for a durable entity instance.
 *
 * An entity ID is composed of two parts:
 * - **name**: The entity type name (normalized to lowercase)
 * - **key**: The entity instance key (case-preserved)
 *
 * The string representation follows the format: `@{name}@{key}`
 *
 * @example
 * ```typescript
 * // Create a new entity ID
 * const entityId = new EntityInstanceId("Counter", "user-123");
 * console.log(entityId.name); // "counter" (lowercased)
 * console.log(entityId.key);  // "user-123" (preserved)
 * console.log(entityId.toString()); // "@counter@user-123"
 *
 * // Parse from string
 * const parsed = EntityInstanceId.fromString("@counter@user-123");
 * ```
 */
export class EntityInstanceId {
  /**
   * The entity type name. Entity names are normalized to lowercase.
   */
  readonly name: string;

  /**
   * The entity instance key. Keys are case-preserved.
   */
  readonly key: string;

  /**
   * Creates a new EntityInstanceId.
   *
   * @param name - The entity type name. Will be normalized to lowercase.
   *               Must not be empty and must not contain '@' characters.
   * @param key - The entity instance key. Must not be null or undefined.
   * @throws {Error} If name is empty or contains '@' characters.
   * @throws {Error} If key is null or undefined.
   */
  constructor(name: string, key: string) {
    if (!name || name.length === 0) {
      throw new Error("Entity name must not be empty.");
    }

    if (name.includes("@")) {
      throw new Error("Entity names may not contain '@' characters.");
    }

    if (key === null || key === undefined) {
      throw new Error("Entity key must not be null or undefined.");
    }

    this.name = name.toLowerCase();
    this.key = key;
  }

  /**
   * Constructs an EntityInstanceId from its string representation.
   *
   * @param instanceId - The string representation of the entity ID in the format `@{name}@{key}`.
   * @returns The parsed EntityInstanceId.
   * @throws {Error} If the instanceId is empty or not in valid format.
   *
   * @example
   * ```typescript
   * const entityId = EntityInstanceId.fromString("@counter@user-123");
   * console.log(entityId.name); // "counter"
   * console.log(entityId.key);  // "user-123"
   * ```
   */
  static fromString(instanceId: string): EntityInstanceId {
    if (!instanceId || instanceId.length === 0) {
      throw new Error("Instance ID must not be empty.");
    }

    if (instanceId[0] !== "@") {
      throw new Error(`Instance ID '${instanceId}' is not a valid entity ID. Must start with '@'.`);
    }

    // Find the second '@' starting from position 1
    const separatorPos = instanceId.indexOf("@", 1);

    if (separatorPos <= 0) {
      throw new Error(`Instance ID '${instanceId}' is not a valid entity ID. Expected format: @name@key`);
    }

    const entityName = instanceId.substring(1, separatorPos);
    const entityKey = instanceId.substring(separatorPos + 1);

    if (entityName.length === 0) {
      throw new Error(`Instance ID '${instanceId}' is not a valid entity ID. Entity name is empty.`);
    }

    return new EntityInstanceId(entityName, entityKey);
  }

  /**
   * Returns the string representation of this entity ID.
   *
   * @returns The entity ID in the format `@{name}@{key}`.
   */
  toString(): string {
    return `@${this.name}@${this.key}`;
  }

  /**
   * Returns the JSON representation of this entity ID.
   * This is called automatically by JSON.stringify() to produce a compact string representation.
   *
   * @returns The entity ID as a string in the format `@{name}@{key}`.
   */
  toJSON(): string {
    return this.toString();
  }

  /**
   * Checks equality with another EntityInstanceId.
   *
   * @param other - The other EntityInstanceId to compare with.
   * @returns True if both name and key match, false otherwise.
   */
  equals(other: EntityInstanceId | null | undefined): boolean {
    if (!other) {
      return false;
    }
    return this.name === other.name && this.key === other.key;
  }
}
