// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * A query for fetching entities.
 *
 * @example
 * ```typescript
 * // Query for all counters
 * const query: EntityQuery = {
 *   instanceIdStartsWith: "counter@",
 *   includeState: true,
 *   pageSize: 100
 * };
 *
 * // Query for entities with specific key prefix
 * const query2: EntityQuery = {
 *   instanceIdStartsWith: "counter@user-",
 *   includeState: false
 * };
 * ```
 */
export interface EntityQuery {
  /**
   * Optional starts-with expression for the entity instance ID.
   *
   * Entity IDs are expressed as `@{name}@{key}`. The starting "@" may be included or left out.
   *
   * - To query for an exact entity name, include the separator "@". e.g.: `"exactNameMatch@"`.
   * - To query for an entity name starts with, leave out the separator "@". e.g.: `"namePrefixMatch"`.
   * - To query for an entity name match **and** a key prefix, include name match, the separator "@",
   *   and finally the key prefix. e.g. `"exactNameMatch@keyPrefixMatch"`.
   *
   * Note: The name portion will be normalized to lowercase.
   */
  instanceIdStartsWith?: string;

  /**
   * Get entity instances which were last modified after the provided time.
   */
  lastModifiedFrom?: Date;

  /**
   * Get entity instances which were last modified before the provided time.
   */
  lastModifiedTo?: Date;

  /**
   * Whether to include state in the query results. Defaults to true.
   */
  includeState?: boolean;

  /**
   * Whether to include metadata about transient entities. Defaults to false.
   *
   * Transient entities are entities that do not have an application-defined state,
   * but for which the storage provider is tracking metadata for synchronization purposes.
   * For example, a transient entity may be observed when the entity is in the process
   * of being created or deleted, or when the entity has been locked by a critical section.
   * By default, transient entities are not included in queries since they are considered
   * to "not exist" from the perspective of the user application.
   */
  includeTransient?: boolean;

  /**
   * The size of each page to return. If undefined, the page size is determined by the backend.
   */
  pageSize?: number;

  /**
   * The continuation token to resume a previous query.
   */
  continuationToken?: string;
}

/**
 * Normalizes the instanceIdStartsWith prefix according to entity ID format rules.
 *
 * - Prefixes "@" if not already present
 * - Lowercases the name portion (everything up to the second "@")
 * - Preserves the key portion case
 *
 * @param prefix - The raw prefix value.
 * @returns The normalized prefix, or undefined if input is undefined/null.
 *
 * @example
 * ```typescript
 * normalizeInstanceIdPrefix("Counter") // returns "@counter"
 * normalizeInstanceIdPrefix("Counter@") // returns "@counter@"
 * normalizeInstanceIdPrefix("Counter@User-123") // returns "@counter@User-123"
 * normalizeInstanceIdPrefix("@Counter@User-123") // returns "@counter@User-123"
 * ```
 */
export function normalizeInstanceIdPrefix(prefix: string | undefined | null): string | undefined {
  if (prefix === undefined || prefix === null) {
    return undefined;
  }

  // Prefix '@' if filter value provided and not already prefixed with '@'
  const prefixed = prefix.length === 0 || prefix[0] !== "@" ? `@${prefix}` : prefix;

  // Check if there is a name-key separator in the string
  const separatorPos = prefixed.indexOf("@", 1);

  if (separatorPos !== -1) {
    // Selectively normalize only the part up until that separator (the name portion)
    const namePart = prefixed.substring(0, separatorPos).toLowerCase();
    const keyPart = prefixed.substring(separatorPos);
    return namePart + keyPart;
  } else {
    // Normalize the entire prefix (it's all name, no key portion)
    return prefixed.toLowerCase();
  }
}

/**
 * Creates an EntityQuery with normalized values.
 *
 * @param query - The raw query parameters.
 * @returns A new EntityQuery with normalized instanceIdStartsWith.
 */
export function createEntityQuery(query: EntityQuery): EntityQuery {
  return {
    ...query,
    instanceIdStartsWith: normalizeInstanceIdPrefix(query.instanceIdStartsWith),
  };
}
