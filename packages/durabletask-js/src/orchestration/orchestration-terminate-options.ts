// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Symbol used to identify TerminateInstanceOptions objects.
 * This prevents confusion when user output happens to have 'recursive' or 'output' properties.
 */
export const TERMINATE_OPTIONS_SYMBOL = Symbol.for("durabletask.TerminateInstanceOptions");

/**
 * Options for terminating orchestration instances.
 */
export interface TerminateInstanceOptions {
  /**
   * Internal marker to identify this as a TerminateInstanceOptions object.
   * @internal
   */
  readonly [TERMINATE_OPTIONS_SYMBOL]?: true;

  /**
   * Whether to recursively terminate sub-orchestrations as well.
   * When true, all child orchestrations spawned by the target orchestration
   * will also be terminated.
   *
   * @default false
   */
  recursive?: boolean;

  /**
   * The optional output to set for the terminated orchestrator instance.
   */
  output?: any;
}

/**
 * Creates a TerminateInstanceOptions object with proper type identification.
 * Use this function instead of creating plain objects to ensure correct behavior.
 *
 * @param options - The terminate options
 * @returns A properly typed TerminateInstanceOptions object
 *
 * @example
 * ```typescript
 * // Terminate with recursive option
 * await client.terminateOrchestration(instanceId, terminateOptions({ recursive: true }));
 *
 * // Terminate with output and recursive
 * await client.terminateOrchestration(instanceId, terminateOptions({
 *   output: { reason: "cancelled by user" },
 *   recursive: true
 * }));
 * ```
 */
export function terminateOptions(options: Omit<TerminateInstanceOptions, typeof TERMINATE_OPTIONS_SYMBOL>): TerminateInstanceOptions {
  return {
    ...options,
    [TERMINATE_OPTIONS_SYMBOL]: true as const,
  };
}

/**
 * Type guard to check if a value is a TerminateInstanceOptions object.
 * @internal
 */
export function isTerminateInstanceOptions(value: unknown): value is TerminateInstanceOptions {
  return (
    value !== null &&
    typeof value === "object" &&
    TERMINATE_OPTIONS_SYMBOL in value &&
    (value as TerminateInstanceOptions)[TERMINATE_OPTIONS_SYMBOL] === true
  );
}
