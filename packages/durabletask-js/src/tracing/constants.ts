// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * The name of the OpenTelemetry tracer used by the Durable Task SDK.
 * This is consistent across all language SDKs for cross-language trace correlation.
 */
export const TRACER_NAME = "Microsoft.DurableTask";

/**
 * Semantic attribute keys for Durable Task spans.
 * These follow the conventions established by the .NET SDK for cross-language consistency.
 */
export const DurableTaskAttributes = {
  /** The type of durable task (e.g., "orchestration", "activity"). */
  TYPE: "durabletask.type",
  /** The name of the task (orchestration or activity name). */
  TASK_NAME: "durabletask.task.name",
  /** The version of the task. */
  TASK_VERSION: "durabletask.task.version",
  /** The instance ID of the orchestration. */
  TASK_INSTANCE_ID: "durabletask.task.instance_id",
  /** The execution ID of the orchestration. */
  TASK_EXECUTION_ID: "durabletask.task.execution_id",
  /** The status of the orchestration (e.g., "COMPLETED", "FAILED"). */
  TASK_STATUS: "durabletask.task.status",
  /** The sequential task ID within an orchestration. */
  TASK_TASK_ID: "durabletask.task.task_id",
  /** The target instance ID for event operations. */
  EVENT_TARGET_INSTANCE_ID: "durabletask.event.target_instance_id",
  /** The fire-at time for timer operations. */
  FIRE_AT: "durabletask.fire_at",
  /**
   * The DurableTask replay span ID. This is the OTEL span ID from the first
   * execution of an orchestration, carried forward across replays for correlation.
   * It may differ from the current OTEL span's spanId on replay invocations.
   */
  REPLAY_SPAN_ID: "durabletask.task.replay_span_id",
  /**
   * The original start time of the orchestration from its first execution,
   * carried forward across replays for correlation. This is stored as an
   * ISO-8601 string attribute so that replay spans can start at the current
   * time (avoiding artificially long span durations) while still preserving
   * a reference to the original execution start.
   */
  REPLAY_START_TIME: "durabletask.task.replay_start_time",
} as const;

/**
 * Task type values used in the `durabletask.type` attribute.
 */
export const TaskType = {
  ORCHESTRATION: "orchestration",
  ACTIVITY: "activity",
  EVENT: "event",
  TIMER: "timer",
  CREATE_ORCHESTRATION: "create_orchestration",
  ORCHESTRATION_EVENT: "orchestration_event",
} as const;

/**
 * Creates a span name following the Durable Task naming convention.
 *
 * Format: "{type}:{name}" or "{type}:{name}@({version})"
 *
 * @param type - The task type (e.g., "orchestration", "activity").
 * @param name - The task name.
 * @param version - An optional task version.
 * @returns The formatted span name.
 */
export function createSpanName(type: string, name: string, version?: string): string {
  if (version) {
    return `${type}:${name}@(${version})`;
  }
  return `${type}:${name}`;
}

/**
 * Creates a timer span name following the Durable Task naming convention.
 *
 * Format: "orchestration:{orchName}:timer"
 *
 * @param orchestrationName - The name of the parent orchestration.
 * @returns The formatted timer span name.
 */
export function createTimerSpanName(orchestrationName: string): string {
  return `${TaskType.ORCHESTRATION}:${orchestrationName}:${TaskType.TIMER}`;
}
