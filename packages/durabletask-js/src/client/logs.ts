// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Centralized log definitions for the Durable Task Client.
 *
 * Event IDs and message templates are aligned with the .NET Durable Task SDK
 * (see: https://github.com/microsoft/durabletask-dotnet/blob/main/src/Client/Grpc/Logs.cs).
 *
 * Event ID ranges:
 * - 40–46: Client operations (from .NET)
 * - 47–55: JS-specific client operations
 */

import { Logger } from "../types/logger.type";
import { emitLog } from "../utils/emit-log";

// ── Logger category ──────────────────────────────────────────────────────────

/** Category for client-related logs. */
const CATEGORY_CLIENT = "Microsoft.DurableTask.Client";

// ── Event IDs (matching .NET) ────────────────────────────────────────────────

/** @internal */ export const EVENT_SCHEDULING_ORCHESTRATION = 40;
/** @internal */ export const EVENT_WAITING_FOR_INSTANCE_START = 42;
/** @internal */ export const EVENT_WAITING_FOR_INSTANCE_COMPLETION = 43;
/** @internal */ export const EVENT_TERMINATING_INSTANCE = 44;
/** @internal */ export const EVENT_PURGING_INSTANCE_METADATA = 45;
/** @internal */ export const EVENT_PURGING_INSTANCES = 46;

// ── JS-specific Event IDs ────────────────────────────────────────────────────

/** @internal */ export const EVENT_RAISING_EVENT = 47;
/** @internal */ export const EVENT_SUSPENDING_INSTANCE = 48;
/** @internal */ export const EVENT_RESUMING_INSTANCE = 49;
/** @internal */ export const EVENT_REWINDING_INSTANCE = 50;
/** @internal */ export const EVENT_RESTARTING_INSTANCE = 51;
/** @internal */ export const EVENT_INSTANCE_COMPLETED = 52;
/** @internal */ export const EVENT_INSTANCE_FAILED = 53;
/** @internal */ export const EVENT_INSTANCE_TERMINATED = 54;

// ═══════════════════════════════════════════════════════════════════════════════
// Client Operation Logs (Event IDs 40–46, matching .NET)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Logs that a new orchestration is being scheduled.
 * Matches .NET EventId 40: "Scheduling new {name} orchestration with instance ID '{instanceId}' and {sizeInBytes} bytes of input data."
 */
export function schedulingOrchestration(
  logger: Logger,
  instanceId: string,
  name: string,
  sizeInBytes: number,
): void {
  emitLog(logger, "info", {
    eventId: EVENT_SCHEDULING_ORCHESTRATION,
    category: CATEGORY_CLIENT,
    properties: { instanceId, name, sizeInBytes },
  }, `Scheduling new ${name} orchestration with instance ID '${instanceId}' and ${sizeInBytes} bytes of input data.`);
}

/**
 * Logs that the client is waiting for an instance to start.
 * Matches .NET EventId 42: "Waiting for instance '{instanceId}' to start."
 */
export function waitingForInstanceStart(logger: Logger, instanceId: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_WAITING_FOR_INSTANCE_START,
    category: CATEGORY_CLIENT,
    properties: { instanceId },
  }, `Waiting for instance '${instanceId}' to start.`);
}

/**
 * Logs that the client is waiting for an instance to complete, fail, or terminate.
 * Matches .NET EventId 43: "Waiting for instance '{instanceId}' to complete, fail, or terminate."
 */
export function waitingForInstanceCompletion(logger: Logger, instanceId: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_WAITING_FOR_INSTANCE_COMPLETION,
    category: CATEGORY_CLIENT,
    properties: { instanceId },
  }, `Waiting for instance '${instanceId}' to complete, fail, or terminate.`);
}

/**
 * Logs that an instance is being terminated.
 * Matches .NET EventId 44: "Terminating instance '{instanceId}'."
 */
export function terminatingInstance(logger: Logger, instanceId: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_TERMINATING_INSTANCE,
    category: CATEGORY_CLIENT,
    properties: { instanceId },
  }, `Terminating instance '${instanceId}'.`);
}

/**
 * Logs that instance metadata is being purged.
 * Matches .NET EventId 45: "Purging instance metadata '{instanceId}'."
 */
export function purgingInstanceMetadata(logger: Logger, instanceId: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_PURGING_INSTANCE_METADATA,
    category: CATEGORY_CLIENT,
    properties: { instanceId },
  }, `Purging instance metadata '${instanceId}'.`);
}

/**
 * Logs that instances are being purged with filter criteria.
 * Matches .NET EventId 46: "Purging instances with filter: { CreatedFrom = {createdFrom}, CreatedTo = {createdTo}, Statuses = {statuses} }"
 */
export function purgingInstances(
  logger: Logger,
  createdFrom?: Date,
  createdTo?: Date,
  statuses?: string,
): void {
  emitLog(logger, "info", {
    eventId: EVENT_PURGING_INSTANCES,
    category: CATEGORY_CLIENT,
    properties: { createdFrom: createdFrom?.toISOString(), createdTo: createdTo?.toISOString(), statuses },
  }, `Purging instances with filter: { CreatedFrom = ${createdFrom?.toISOString() ?? "N/A"}, CreatedTo = ${createdTo?.toISOString() ?? "N/A"}, Statuses = ${statuses ?? "N/A"} }`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// JS-specific Client Logs (Event IDs 47–54)
// ═══════════════════════════════════════════════════════════════════════════════

export function raisingEvent(logger: Logger, instanceId: string, eventName: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_RAISING_EVENT,
    category: CATEGORY_CLIENT,
    properties: { instanceId, eventName },
  }, `Raising event '${eventName}' for instance '${instanceId}'.`);
}

export function suspendingInstance(logger: Logger, instanceId: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_SUSPENDING_INSTANCE,
    category: CATEGORY_CLIENT,
    properties: { instanceId },
  }, `Suspending instance '${instanceId}'.`);
}

export function resumingInstance(logger: Logger, instanceId: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_RESUMING_INSTANCE,
    category: CATEGORY_CLIENT,
    properties: { instanceId },
  }, `Resuming instance '${instanceId}'.`);
}

export function rewindingInstance(logger: Logger, instanceId: string, reason: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_REWINDING_INSTANCE,
    category: CATEGORY_CLIENT,
    properties: { instanceId, reason },
  }, `Rewinding instance '${instanceId}' with reason: ${reason}.`);
}

export function restartingInstance(
  logger: Logger,
  instanceId: string,
  restartWithNewInstanceId: boolean,
): void {
  emitLog(logger, "info", {
    eventId: EVENT_RESTARTING_INSTANCE,
    category: CATEGORY_CLIENT,
    properties: { instanceId, restartWithNewInstanceId },
  }, `Restarting instance '${instanceId}' with restartWithNewInstanceId=${restartWithNewInstanceId}.`);
}

export function instanceCompleted(logger: Logger, instanceId: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_INSTANCE_COMPLETED,
    category: CATEGORY_CLIENT,
    properties: { instanceId },
  }, `Instance '${instanceId}' completed.`);
}

export function instanceFailed(
  logger: Logger,
  instanceId: string,
  errorType: string,
  errorMessage: string,
): void {
  emitLog(logger, "error", {
    eventId: EVENT_INSTANCE_FAILED,
    category: CATEGORY_CLIENT,
    properties: { instanceId, errorType, errorMessage },
  }, `Instance '${instanceId}' failed: [${errorType}] ${errorMessage}`);
}

export function instanceTerminated(logger: Logger, instanceId: string): void {
  emitLog(logger, "info", {
    eventId: EVENT_INSTANCE_TERMINATED,
    category: CATEGORY_CLIENT,
    properties: { instanceId },
  }, `Instance '${instanceId}' was terminated.`);
}
