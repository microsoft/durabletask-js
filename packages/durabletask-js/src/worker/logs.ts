// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Centralized log definitions for the Durable Task Worker.
 *
 * Event IDs and message templates are aligned with the .NET Durable Task SDK
 * (see: https://github.com/microsoft/durabletask-dotnet/blob/main/src/Worker/Core/Logs.cs).
 *
 * Event ID ranges:
 * - 15: Entity operation errors (from .NET)
 * - 55: Retry handler evaluation (from .NET)
 * - 600–605: Core orchestration/activity lifecycle (from .NET)
 * - 700–799: JS-specific worker lifecycle events
 */

import { Logger } from "../types/logger.type";
import { emitLog } from "../utils/emit-log";
import { toErrorMessage } from "../utils/error.util";

// ── Logger categories (matching .NET: Microsoft.DurableTask.Worker.*) ────────

/** Category for orchestration-related logs. */
const CATEGORY_ORCHESTRATIONS = "Microsoft.DurableTask.Worker.Orchestrations";

/** Category for activity-related logs. */
const CATEGORY_ACTIVITIES = "Microsoft.DurableTask.Worker.Activities";

/** Category for general worker logs. */
const CATEGORY_WORKER = "Microsoft.DurableTask.Worker";

/** Category for entity-related logs. */
const CATEGORY_ENTITIES = "Microsoft.DurableTask.Worker.Entities";

// ── Event IDs (matching .NET) ────────────────────────────────────────────────

/** @internal */ export const EVENT_RETRYING_TASK = 55;
/** @internal */ export const EVENT_ORCHESTRATION_STARTED = 600;
/** @internal */ export const EVENT_ORCHESTRATION_COMPLETED = 601;
/** @internal */ export const EVENT_ORCHESTRATION_FAILED = 602;
/** @internal */ export const EVENT_ACTIVITY_STARTED = 603;
/** @internal */ export const EVENT_ACTIVITY_COMPLETED = 604;
/** @internal */ export const EVENT_ACTIVITY_FAILED = 605;

// ── JS-specific Event IDs (700+ range) ──────────────────────────────────────

/** @internal */ export const EVENT_WORKER_CONNECTED = 700;
/** @internal */ export const EVENT_WORKER_ERROR = 701;
/** @internal */ export const EVENT_STREAM_ENDED = 702;
/** @internal */ export const EVENT_STREAM_RETRY = 703;
/** @internal */ export const EVENT_STREAM_ERROR = 704;
/** @internal */ export const EVENT_WORK_ITEM_RECEIVED = 705;
/** @internal */ export const EVENT_SHUTDOWN_WAITING = 706;
/** @internal */ export const EVENT_SHUTDOWN_COMPLETED = 707;
/** @internal */ export const EVENT_SHUTDOWN_TIMEOUT = 708;
/** @internal */ export const EVENT_CONNECTION_RETRY = 709;
/** @internal */ export const EVENT_ORCHESTRATION_REBUILDING = 710;
/** @internal */ export const EVENT_ORCHESTRATION_PROCESSING = 711;
/** @internal */ export const EVENT_ORCHESTRATION_WAITING = 712;
/** @internal */ export const EVENT_ORCHESTRATION_RETURNING_ACTIONS = 713;
/** @internal */ export const EVENT_ORCHESTRATION_SUSPENDED = 714;
/** @internal */ export const EVENT_ORCHESTRATION_TERMINATED = 715;
/** @internal */ export const EVENT_ORCHESTRATION_EVENT_RAISED = 716;
/** @internal */ export const EVENT_ORCHESTRATION_EVENT_BUFFERED = 717;
/** @internal */ export const EVENT_ORCHESTRATION_NO_TASKS = 718;
/** @internal */ export const EVENT_ORCHESTRATION_PROCESSING_EVENT = 719;
/** @internal */ export const EVENT_ORCHESTRATION_SUSPENDED_BUFFERING = 720;
/** @internal */ export const EVENT_ORCHESTRATION_UNKNOWN_EVENT = 721;
/** @internal */ export const EVENT_ORCHESTRATION_EVENT_ERROR = 722;
/** @internal */ export const EVENT_ORCHESTRATION_UNEXPECTED_EVENT = 723;
/** @internal */ export const EVENT_UNKNOWN_WORK_ITEM = 724;
/** @internal */ export const EVENT_VERSION_MISMATCH_FAIL = 730;
/** @internal */ export const EVENT_VERSION_MISMATCH_ABANDON = 731;
/** @internal */ export const EVENT_EXECUTION_ERROR = 732;
/** @internal */ export const EVENT_COMPLETION_ERROR = 733;
/** @internal */ export const EVENT_ACTIVITY_EXECUTION_ERROR = 734;
/** @internal */ export const EVENT_ACTIVITY_RESPONSE_ERROR = 735;
/** @internal */ export const EVENT_STREAM_ERROR_INFO = 736;

// ── Entity-specific Event IDs (740+ range) ──────────────────────────────────

/** @internal */ export const EVENT_ENTITY_REQUEST_RECEIVED = 740;
/** @internal */ export const EVENT_ENTITY_INSTANCE_ID_PARSE_ERROR = 741;
/** @internal */ export const EVENT_ENTITY_NOT_FOUND = 742;
/** @internal */ export const EVENT_ENTITY_EXECUTION_FAILED = 743;
/** @internal */ export const EVENT_ENTITY_RESPONSE_DELIVERY_FAILED = 744;
/** @internal */ export const EVENT_ENTITY_UNKNOWN_OPERATION_EVENT = 745;
/** @internal */ export const EVENT_ENTITY_EVENT_IGNORED = 746;

// ═══════════════════════════════════════════════════════════════════════════════
// Orchestration Lifecycle Logs (Event IDs 600–602, matching .NET)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Logs that an orchestration has started execution.
 * Matches .NET EventId 600: "'{Name}' orchestration with ID '{InstanceId}' started."
 */
export function orchestrationStarted(logger: Logger, instanceId: string, name: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_STARTED,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId, name },
  }, `'${name}' orchestration with ID '${instanceId}' started.`);
}

/**
 * Logs that an orchestration has completed execution.
 * Matches .NET EventId 601: "'{Name}' orchestration with ID '{InstanceId}' completed."
 */
export function orchestrationCompleted(logger: Logger, instanceId: string, name: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_COMPLETED,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId, name },
  }, `'${name}' orchestration with ID '${instanceId}' completed.`);
}

/**
 * Logs that an orchestration has failed.
 * Matches .NET EventId 602: "'{Name}' orchestration with ID '{InstanceId}' failed."
 */
export function orchestrationFailed(logger: Logger, instanceId: string, name: string, error?: Error): void {
  emitLog(logger, "error", {
    eventId: EVENT_ORCHESTRATION_FAILED,
    category: CATEGORY_ORCHESTRATIONS,
    properties: {
      instanceId,
      name,
      error: error?.message,
      ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
    },
  }, `'${name}' orchestration with ID '${instanceId}' failed.`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Activity Lifecycle Logs (Event IDs 603–605, matching .NET)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Logs that an activity has started execution.
 * Matches .NET EventId 603: "'{Name}' activity of orchestration ID '{InstanceId}' started."
 */
export function activityStarted(logger: Logger, instanceId: string, name: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ACTIVITY_STARTED,
    category: CATEGORY_ACTIVITIES,
    properties: { instanceId, name },
  }, `'${name}' activity of orchestration ID '${instanceId}' started.`);
}

/**
 * Logs that an activity has completed execution.
 * Matches .NET EventId 604: "'{Name}' activity of orchestration ID '{InstanceId}' completed."
 */
export function activityCompleted(logger: Logger, instanceId: string, name: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ACTIVITY_COMPLETED,
    category: CATEGORY_ACTIVITIES,
    properties: { instanceId, name },
  }, `'${name}' activity of orchestration ID '${instanceId}' completed.`);
}

/**
 * Logs that an activity has failed.
 * Matches .NET EventId 605: "'{Name}' activity of orchestration ID '{InstanceId}' failed."
 */
export function activityFailed(logger: Logger, instanceId: string, name: string, error?: Error): void {
  emitLog(logger, "error", {
    eventId: EVENT_ACTIVITY_FAILED,
    category: CATEGORY_ACTIVITIES,
    properties: {
      instanceId,
      name,
      error: error?.message,
      errorDetails: error ? toErrorMessage(error) : undefined,
      errorStack: error?.stack,
    },
  }, `'${name}' activity of orchestration ID '${instanceId}' failed.`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Retry Logs (Event ID 55, matching .NET)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Logs that a failed task is being retried.
 * Matches .NET EventId 55: "{instanceId}: Evaluating custom retry handler for failed '{name}' task. Attempt = {attempt}."
 */
export function retryingTask(logger: Logger, instanceId: string, name: string, attempt: number): void {
  emitLog(logger, "info", {
    eventId: EVENT_RETRYING_TASK,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId, name, attempt },
  }, `${instanceId}: Evaluating custom retry handler for failed '${name}' task. Attempt = ${attempt}.`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// JS-specific Worker Lifecycle Logs (Event IDs 700+)
// ═══════════════════════════════════════════════════════════════════════════════

export function workerConnected(logger: Logger, hostAddress: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_WORKER_CONNECTED,
    category: CATEGORY_WORKER,
    properties: { hostAddress },
  }, `Successfully connected to ${hostAddress}. Waiting for work items...`);
}

export function workerError(logger: Logger, error: unknown): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "error", {
    eventId: EVENT_WORKER_ERROR,
    category: CATEGORY_WORKER,
    properties: { error: msg },
  }, `Worker error: ${msg}`);
}

export function streamEnded(logger: Logger): void {
  emitLog(logger, "info", {
    eventId: EVENT_STREAM_ENDED,
    category: CATEGORY_WORKER,
  }, "Stream ended");
}

export function streamRetry(logger: Logger, delayMs: number): void {
  emitLog(logger, "info", {
    eventId: EVENT_STREAM_RETRY,
    category: CATEGORY_WORKER,
    properties: { delayMs },
  }, `Stream abruptly closed, will retry in ${delayMs}ms...`);
}

export function streamError(logger: Logger, error: unknown): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "error", {
    eventId: EVENT_STREAM_ERROR,
    category: CATEGORY_WORKER,
    properties: { error: msg },
  }, `Error on grpc stream: ${msg}`);
}

export function connectionRetry(logger: Logger, delayMs: number): void {
  emitLog(logger, "info", {
    eventId: EVENT_CONNECTION_RETRY,
    category: CATEGORY_WORKER,
    properties: { delayMs },
  }, `Connection will be retried in ${delayMs}ms...`);
}

export function workItemReceived(logger: Logger, type: string, instanceId?: string): void {
  const msg = instanceId
    ? `Received "${type}" work item with instance id '${instanceId}'`
    : `Received "${type}" work item`;
  emitLog(logger, "info", {
    eventId: EVENT_WORK_ITEM_RECEIVED,
    category: CATEGORY_WORKER,
    properties: { type, instanceId },
  }, msg);
}

export function unknownWorkItem(logger: Logger): void {
  emitLog(logger, "info", {
    eventId: EVENT_UNKNOWN_WORK_ITEM,
    category: CATEGORY_WORKER,
    properties: { type: "Unknown" },
  }, "Received unknown type of work item");
}

export function shutdownWaiting(logger: Logger, pendingCount: number): void {
  emitLog(logger, "info", {
    eventId: EVENT_SHUTDOWN_WAITING,
    category: CATEGORY_WORKER,
    properties: { pendingCount },
  }, `Waiting for ${pendingCount} pending work item(s) to complete...`);
}

export function shutdownCompleted(logger: Logger): void {
  emitLog(logger, "info", {
    eventId: EVENT_SHUTDOWN_COMPLETED,
    category: CATEGORY_WORKER,
  }, "All pending work items completed.");
}

export function shutdownTimeout(logger: Logger, message: string): void {
  emitLog(logger, "warn", {
    eventId: EVENT_SHUTDOWN_TIMEOUT,
    category: CATEGORY_WORKER,
    properties: { message },
  }, `${message}. Forcing shutdown.`);
}

export function versionMismatchFail(logger: Logger, instanceId: string, errorType: string, errorMessage: string): void {
  emitLog(logger, "warn", {
    eventId: EVENT_VERSION_MISMATCH_FAIL,
    category: CATEGORY_WORKER,
    properties: { instanceId, errorType, errorMessage },
  }, `${errorType} for instance '${instanceId}': ${errorMessage}. Failing orchestration.`);
}

export function versionMismatchAbandon(logger: Logger, instanceId: string, errorType: string, errorMessage: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_VERSION_MISMATCH_ABANDON,
    category: CATEGORY_WORKER,
    properties: { instanceId, errorType, errorMessage },
  }, `${errorType} for instance '${instanceId}': ${errorMessage}. Abandoning work item.`);
}

export function executionError(logger: Logger, instanceId: string, error: unknown): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "error", {
    eventId: EVENT_EXECUTION_ERROR,
    category: CATEGORY_WORKER,
    properties: { instanceId, error: msg },
  }, `An error occurred while trying to execute instance '${instanceId}': ${msg}`);
}

export function completionError(logger: Logger, instanceId: string, error: unknown): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "error", {
    eventId: EVENT_COMPLETION_ERROR,
    category: CATEGORY_WORKER,
    properties: { instanceId, error: msg },
  }, `An error occurred while trying to complete instance '${instanceId}': ${msg}`);
}

export function activityExecutionError(logger: Logger, activityName: string, error: unknown): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "error", {
    eventId: EVENT_ACTIVITY_EXECUTION_ERROR,
    category: CATEGORY_ACTIVITIES,
    properties: { activityName, error: msg },
  }, `An error occurred while trying to execute activity '${activityName}': ${msg}`);
}

export function activityResponseError(
  logger: Logger,
  activityName: string,
  taskId: number,
  instanceId: string,
  error: unknown,
): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "error", {
    eventId: EVENT_ACTIVITY_RESPONSE_ERROR,
    category: CATEGORY_ACTIVITIES,
    properties: { activityName, taskId, instanceId, error: msg },
  }, `Failed to deliver activity response for '${activityName}#${taskId}' of orchestration ID '${instanceId}' to sidecar: ${msg}`);
}

// ── Orchestration Executor internal logs ─────────────────────────────────────

export function orchestrationRebuilding(logger: Logger, instanceId: string, eventCount: number): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_REBUILDING,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId, eventCount },
  }, `${instanceId}: Rebuilding local state with ${eventCount} history event...`);
}

export function orchestrationProcessing(logger: Logger, instanceId: string, eventCount: number, summary: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_PROCESSING,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId, eventCount, summary },
  }, `${instanceId}: Processing ${eventCount} new history event(s): ${summary}`);
}

export function orchestrationWaiting(logger: Logger, instanceId: string, taskCount: number, eventCount: number): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_WAITING,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId, taskCount, eventCount },
  }, `${instanceId}: Waiting for ${taskCount} task(s) and ${eventCount} event(s) to complete...`);
}

export function orchestrationReturningActions(logger: Logger, instanceId: string, actionCount: number): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_RETURNING_ACTIONS,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId, actionCount },
  }, `${instanceId}: Returning ${actionCount} action(s)`);
}

export function orchestrationSuspended(logger: Logger, instanceId: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_SUSPENDED,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId },
  }, `${instanceId}: Execution suspended`);
}

export function orchestrationTerminated(logger: Logger, instanceId: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_TERMINATED,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId },
  }, `${instanceId}: Execution terminated`);
}

export function orchestrationEventRaised(logger: Logger, instanceId: string, eventName: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_EVENT_RAISED,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId, eventName },
  }, `${instanceId}: Event raised: ${eventName}`);
}

export function orchestrationEventBuffered(logger: Logger, instanceId: string, eventName: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_EVENT_BUFFERED,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId, eventName },
  }, `${instanceId}: Event ${eventName} has been buffered as there are no tasks waiting for it.`);
}

export function orchestrationNoTasks(logger: Logger, resultType: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_NO_TASKS,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { resultType },
  }, `An orchestrator was returned that doesn't schedule any tasks (type = ${resultType})`);
}

export function orchestrationProcessingEvent(logger: Logger, eventTypeName: string, eventType: number): void {
  emitLog(logger, "debug", {
    eventId: EVENT_ORCHESTRATION_PROCESSING_EVENT,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { eventTypeName, eventType },
  }, `Processing event type ${eventTypeName} (${eventType})`);
}

export function orchestrationSuspendedBuffering(logger: Logger): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_SUSPENDED_BUFFERING,
    category: CATEGORY_ORCHESTRATIONS,
  }, "Suspended, buffering event");
}

export function orchestrationUnknownEvent(logger: Logger, eventTypeName: string, eventType: number): void {
  emitLog(logger, "info", {
    eventId: EVENT_ORCHESTRATION_UNKNOWN_EVENT,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { eventTypeName, eventType },
  }, `Unknown history event type: ${eventTypeName} (value: ${eventType}), skipping...`);
}

export function orchestrationEventError(logger: Logger, eventTypeName: string, error: unknown): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "error", {
    eventId: EVENT_ORCHESTRATION_EVENT_ERROR,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { eventTypeName, error: msg },
  }, `Could not process the event ${eventTypeName} due to error ${msg}`);
}

export function orchestrationUnexpectedEvent(
  logger: Logger,
  instanceId: string,
  eventType: string,
  eventId?: number,
): void {
  const msg = eventId !== undefined
    ? `${instanceId}: Ignoring unexpected ${eventType} event with ID = ${eventId}`
    : `${instanceId}: Ignoring ${eventType} event with undefined ID`;
  emitLog(logger, "warn", {
    eventId: EVENT_ORCHESTRATION_UNEXPECTED_EVENT,
    category: CATEGORY_ORCHESTRATIONS,
    properties: { instanceId, eventType, eventId },
  }, msg);
}

export function streamErrorInfo(logger: Logger, error: unknown): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "info", {
    eventId: EVENT_STREAM_ERROR_INFO,
    category: CATEGORY_WORKER,
    properties: { error: msg },
  }, `Stream error: ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Entity Lifecycle Logs (Event IDs 740+)
// ═══════════════════════════════════════════════════════════════════════════════

export function entityRequestReceived(logger: Logger, instanceId: string, requestType: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ENTITY_REQUEST_RECEIVED,
    category: CATEGORY_ENTITIES,
    properties: { instanceId, requestType },
  }, `Received "${requestType}" work item for entity '${instanceId}'`);
}

export function entityInstanceIdParseError(logger: Logger, instanceId: string, error: unknown): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "error", {
    eventId: EVENT_ENTITY_INSTANCE_ID_PARSE_ERROR,
    category: CATEGORY_ENTITIES,
    properties: { instanceId, error: msg },
  }, `Failed to parse entity instance id '${instanceId}': ${msg}`);
}

export function entityNotFound(logger: Logger, entityName: string): void {
  emitLog(logger, "warn", {
    eventId: EVENT_ENTITY_NOT_FOUND,
    category: CATEGORY_ENTITIES,
    properties: { entityName },
  }, `No entity named '${entityName}' was found.`);
}

export function entityExecutionFailed(logger: Logger, entityName: string, error: unknown): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "error", {
    eventId: EVENT_ENTITY_EXECUTION_FAILED,
    category: CATEGORY_ENTITIES,
    properties: {
      entityName,
      error: msg,
      ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
    },
  }, `An error occurred while trying to execute entity '${entityName}': ${msg}`);
}

export function entityResponseDeliveryFailed(logger: Logger, error: unknown): void {
  const msg = toErrorMessage(error);
  emitLog(logger, "error", {
    eventId: EVENT_ENTITY_RESPONSE_DELIVERY_FAILED,
    category: CATEGORY_ENTITIES,
    properties: { error: msg },
  }, `Failed to deliver entity response to sidecar: ${msg}`);
}

export function entityUnknownOperationEventType(logger: Logger, eventType: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_ENTITY_UNKNOWN_OPERATION_EVENT,
    category: CATEGORY_ENTITIES,
    properties: { eventType },
  }, `Skipping unknown entity operation event type: ${eventType}`);
}

export function entityEventIgnored(
  logger: Logger,
  instanceId: string,
  eventType: string,
  reason: string,
): void {
  emitLog(logger, "warn", {
    eventId: EVENT_ENTITY_EVENT_IGNORED,
    category: CATEGORY_ENTITIES,
    properties: { instanceId, eventType, reason },
  }, `${instanceId}: Ignoring ${eventType}: ${reason}`);
}
