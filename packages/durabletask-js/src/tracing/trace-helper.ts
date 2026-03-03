// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { TRACER_NAME, DurableTaskAttributes, TaskType, createSpanName, createTimerSpanName } from "./constants";
import {
  getOtelApi,
  createPbTraceContextFromSpan,
  createParentContextFromPb,
} from "./trace-context-utils";
import type { Span, Tracer } from "@opentelemetry/api";

// Cached tracer instance to avoid repeated lookups. The tracer is created once
// and reused for the lifetime of the process. This is safe because the OTEL JS
// SDK returns a proxy tracer from `trace.getTracer()` that dynamically delegates
// to the current global tracer provider, so provider swaps (e.g., in tests via
// `setGlobalTracerProvider`) are handled transparently.
let _cachedTracer: Tracer | undefined;

/**
 * Returns the OTEL API and tracer, or undefined if OTEL is not available.
 * Caches the tracer instance for efficiency.
 */
function getTracingContext(): { otel: typeof import("@opentelemetry/api"); tracer: Tracer } | undefined {
  const otel = getOtelApi();
  if (!otel) return undefined;

  if (!_cachedTracer) {
    _cachedTracer = otel.trace.getTracer(TRACER_NAME);
  }

  return { otel, tracer: _cachedTracer };
}

/**
 * Gets the Durable Task tracer from the OpenTelemetry API.
 * Returns undefined if OpenTelemetry is not installed.
 */
export function getTracer(): Tracer | undefined {
  return getTracingContext()?.tracer;
}

/**
 * Information about an orchestration span for replay continuity.
 *
 * `spanId` is a DurableTask-specific replay correlation identifier. On the first
 * execution it equals the actual OTEL span ID. On replays, it is carried forward
 * from the first execution so all replay iterations share a stable identifier,
 * even though each replay creates a new OTEL span with its own spanId.
 */
export interface OrchestrationSpanInfo {
  spanId: string;
  /**
   * The start time from the first execution, persisted across replays in
   * OrchestrationTraceContext. On replay invocations this is the original
   * first-execution time, which may differ from the OTEL span's actual
   * startTime (which is always the current wall-clock time).
   */
  startTime: Date;
}

/**
 * Creates a Producer span for scheduling a new orchestration (client-side).
 * Injects the W3C trace context into the CreateInstanceRequest.
 *
 * @param req - The CreateInstanceRequest to inject trace context into.
 * @returns The span (or undefined if OTEL is not available). Caller must end it.
 */
export function startSpanForNewOrchestration(req: pb.CreateInstanceRequest): Span | undefined {
  const ctx = getTracingContext();
  if (!ctx) return undefined;

  const name = req.getName();
  const version = req.getVersion()?.getValue();
  const instanceId = req.getInstanceid();
  const spanName = createSpanName(TaskType.CREATE_ORCHESTRATION, name, version);

  const span = ctx.tracer.startSpan(spanName, {
    kind: ctx.otel.SpanKind.PRODUCER,
    attributes: {
      [DurableTaskAttributes.TYPE]: TaskType.ORCHESTRATION,
      [DurableTaskAttributes.TASK_NAME]: name,
      [DurableTaskAttributes.TASK_INSTANCE_ID]: instanceId,
      ...(version ? { [DurableTaskAttributes.TASK_VERSION]: version } : {}),
      ...(req.getExecutionid()?.getValue()
        ? { [DurableTaskAttributes.TASK_EXECUTION_ID]: req.getExecutionid()!.getValue() }
        : {}),
    },
  });

  // Inject trace context into the proto request
  const pbCtx = createPbTraceContextFromSpan(span);
  if (pbCtx) {
    req.setParenttracecontext(pbCtx);
  }

  return span;
}

/**
 * Creates a Server span for orchestration execution.
 * Handles replay by reusing the same span identity across multiple invocations.
 *
 * @param executionStartedEvent - The proto ExecutionStartedEvent.
 * @param orchestrationTraceContext - The OrchestrationTraceContext from the request (for replay).
 * @param instanceId - The orchestration instance ID.
 * @returns An object with the span and span info for the response, or undefined if OTEL is not available.
 */
export function startSpanForOrchestrationExecution(
  executionStartedEvent: pb.ExecutionStartedEvent,
  orchestrationTraceContext: pb.OrchestrationTraceContext | undefined,
  instanceId: string,
): { span: Span; spanInfo: OrchestrationSpanInfo } | undefined {
  const ctx = getTracingContext();
  if (!ctx) return undefined;

  const name = executionStartedEvent.getName();
  const version = executionStartedEvent.getVersion()?.getValue();
  const spanName = createSpanName(TaskType.ORCHESTRATION, name, version);

  // Determine the parent context from the ExecutionStartedEvent's parentTraceContext
  const parentPbCtx = executionStartedEvent.getParenttracecontext();
  const parentContext = createParentContextFromPb(parentPbCtx);

  // Check if we have an OrchestrationTraceContext from a previous replay
  const existingSpanId = orchestrationTraceContext?.getSpanid()?.getValue();
  const existingStartTime = orchestrationTraceContext?.getSpanstarttime()?.toDate();
  const isReplay = !!(existingSpanId && existingStartTime);

  // Always use the current time for the OTEL span start so that replay spans
  // don't appear artificially long (the original start may be days/months ago).
  const spanStartTime = new Date();

  // The persisted startTime in OrchestrationSpanInfo keeps the original
  // first-execution time for storage in OrchestrationTraceContext.
  const persistedStartTime = isReplay ? existingStartTime! : spanStartTime;

  const span = ctx.tracer.startSpan(
    spanName,
    {
      kind: ctx.otel.SpanKind.SERVER,
      startTime: spanStartTime,
      attributes: {
        [DurableTaskAttributes.TYPE]: TaskType.ORCHESTRATION,
        [DurableTaskAttributes.TASK_NAME]: name,
        [DurableTaskAttributes.TASK_INSTANCE_ID]: instanceId,
        ...(version ? { [DurableTaskAttributes.TASK_VERSION]: version } : {}),
      },
    },
    parentContext,
  );

  let spanId: string;
  if (isReplay) {
    // Replay: carry forward the original span ID as a correlation identifier.
    // The OTEL span gets its own new spanId (we cannot override it), so we
    // store the original as an attribute for cross-replay correlation.
    spanId = existingSpanId!;
    span.setAttribute(DurableTaskAttributes.REPLAY_SPAN_ID, spanId);
    // Record the original execution start time as an attribute for correlation,
    // since the OTEL span itself starts at the current time.
    span.setAttribute(DurableTaskAttributes.REPLAY_START_TIME, existingStartTime!.toISOString());
  } else {
    // First execution: use the actual OTEL span ID so the stored identifier
    // matches the real span that appears in traces.
    spanId = span.spanContext().spanId;
  }

  return {
    span,
    spanInfo: { spanId, startTime: persistedStartTime },
  };
}

/**
 * Creates a Client span for scheduling an activity task (worker-side, within orchestration execution).
 * Injects trace context into the ScheduleTaskAction.
 *
 * @param orchestrationSpan - The parent orchestration span.
 * @param action - The ScheduleTaskAction to inject trace context into.
 * @param taskId - The sequential task ID.
 */
export function startSpanForSchedulingTask(
  orchestrationSpan: Span,
  action: pb.ScheduleTaskAction,
  taskId: number,
): void {
  const ctx = getTracingContext();
  if (!ctx) return;

  const name = action.getName();
  const version = action.getVersion()?.getValue();
  const spanName = createSpanName(TaskType.ACTIVITY, name, version);

  // Create a context with the orchestration span as parent
  const parentContext = ctx.otel.trace.setSpan(ctx.otel.context.active(), orchestrationSpan);

  const span = ctx.tracer.startSpan(
    spanName,
    {
      kind: ctx.otel.SpanKind.CLIENT,
      attributes: {
        [DurableTaskAttributes.TYPE]: TaskType.ACTIVITY,
        [DurableTaskAttributes.TASK_NAME]: name,
        [DurableTaskAttributes.TASK_TASK_ID]: taskId,
        ...(version ? { [DurableTaskAttributes.TASK_VERSION]: version } : {}),
      },
    },
    parentContext,
  );

  // Inject trace context into the action
  const pbCtx = createPbTraceContextFromSpan(span);
  if (pbCtx) {
    action.setParenttracecontext(pbCtx);
  }

  // End the span immediately - it represents the act of scheduling, not execution
  span.end();
}

/**
 * Creates a Server span for activity task execution (worker-side).
 *
 * @param req - The ActivityRequest containing the parent trace context.
 * @returns The span (or undefined if OTEL is not available). Caller must end it.
 */
export function startSpanForTaskExecution(req: pb.ActivityRequest): Span | undefined {
  const ctx = getTracingContext();
  if (!ctx) return undefined;

  const name = req.getName();
  const version = req.getVersion()?.getValue();
  const spanName = createSpanName(TaskType.ACTIVITY, name, version);

  const parentPbCtx = req.getParenttracecontext();
  const parentContext = createParentContextFromPb(parentPbCtx);

  const instanceId = req.getOrchestrationinstance()?.getInstanceid() ?? "";

  const span = ctx.tracer.startSpan(
    spanName,
    {
      kind: ctx.otel.SpanKind.SERVER,
      attributes: {
        [DurableTaskAttributes.TYPE]: TaskType.ACTIVITY,
        [DurableTaskAttributes.TASK_NAME]: name,
        [DurableTaskAttributes.TASK_INSTANCE_ID]: instanceId,
        [DurableTaskAttributes.TASK_TASK_ID]: req.getTaskid(),
        ...(version ? { [DurableTaskAttributes.TASK_VERSION]: version } : {}),
      },
    },
    parentContext,
  );

  return span;
}

/**
 * Creates a Client span for scheduling a sub-orchestration (worker-side, within orchestration execution).
 * Injects trace context into the CreateSubOrchestrationAction.
 *
 * @param orchestrationSpan - The parent orchestration span.
 * @param action - The CreateSubOrchestrationAction to inject trace context into.
 * @param taskId - The sequential task ID.
 */
export function startSpanForSchedulingSubOrchestration(
  orchestrationSpan: Span,
  action: pb.CreateSubOrchestrationAction,
  taskId: number,
): void {
  const ctx = getTracingContext();
  if (!ctx) return;

  const name = action.getName();
  const version = action.getVersion()?.getValue();
  const instanceId = action.getInstanceid();
  const spanName = createSpanName(TaskType.ORCHESTRATION, name, version);

  const parentContext = ctx.otel.trace.setSpan(ctx.otel.context.active(), orchestrationSpan);

  const span = ctx.tracer.startSpan(
    spanName,
    {
      kind: ctx.otel.SpanKind.CLIENT,
      attributes: {
        [DurableTaskAttributes.TYPE]: TaskType.ORCHESTRATION,
        [DurableTaskAttributes.TASK_NAME]: name,
        [DurableTaskAttributes.TASK_INSTANCE_ID]: instanceId,
        [DurableTaskAttributes.TASK_TASK_ID]: taskId,
        ...(version ? { [DurableTaskAttributes.TASK_VERSION]: version } : {}),
      },
    },
    parentContext,
  );

  // Inject trace context into the action
  const pbCtx = createPbTraceContextFromSpan(span);
  if (pbCtx) {
    action.setParenttracecontext(pbCtx);
  }

  // End the span immediately - it represents the act of scheduling
  span.end();
}

/**
 * Emits a span for a timer being created within an orchestration.
 *
 * @param orchestrationSpan - The parent orchestration span.
 * @param orchestrationName - The name of the parent orchestration.
 * @param fireAt - When the timer fires.
 * @param timerId - The timer's sequential ID.
 * @param instanceId - The orchestration instance ID.
 */
export function emitSpanForTimer(
  orchestrationSpan: Span,
  orchestrationName: string,
  fireAt: Date,
  timerId: number,
  instanceId?: string,
  startTime?: Date,
): void {
  const ctx = getTracingContext();
  if (!ctx) return;

  const spanName = createTimerSpanName(orchestrationName);
  const parentContext = ctx.otel.trace.setSpan(ctx.otel.context.active(), orchestrationSpan);

  const span = ctx.tracer.startSpan(
    spanName,
    {
      kind: ctx.otel.SpanKind.INTERNAL,
      startTime: startTime,
      attributes: {
        [DurableTaskAttributes.TYPE]: TaskType.TIMER,
        [DurableTaskAttributes.TASK_NAME]: orchestrationName,
        [DurableTaskAttributes.TASK_TASK_ID]: timerId,
        [DurableTaskAttributes.FIRE_AT]: fireAt.toISOString(),
        ...(instanceId ? { [DurableTaskAttributes.TASK_INSTANCE_ID]: instanceId } : {}),
      },
    },
    parentContext,
  );

  span.end();
}

/**
 * Emits a retroactive Client-kind span for a completed/failed task or sub-orchestration.
 * Common helper for activity and sub-orchestration retroactive spans.
 */
function emitRetroactiveClientSpan(
  orchestrationSpan: Span,
  taskType: string,
  taskName: string,
  version: string | undefined,
  instanceId: string,
  startTime?: Date,
  failureMessage?: string,
  taskId?: number,
): void {
  const ctx = getTracingContext();
  if (!ctx) return;

  const spanName = createSpanName(taskType, taskName, version);
  const parentContext = ctx.otel.trace.setSpan(ctx.otel.context.active(), orchestrationSpan);

  const span = ctx.tracer.startSpan(
    spanName,
    {
      kind: ctx.otel.SpanKind.CLIENT,
      startTime: startTime,
      attributes: {
        [DurableTaskAttributes.TYPE]: taskType,
        [DurableTaskAttributes.TASK_NAME]: taskName,
        [DurableTaskAttributes.TASK_INSTANCE_ID]: instanceId,
        ...(version ? { [DurableTaskAttributes.TASK_VERSION]: version } : {}),
        ...(taskId !== undefined ? { [DurableTaskAttributes.TASK_TASK_ID]: taskId } : {}),
      },
    },
    parentContext,
  );

  if (failureMessage) {
    span.setStatus({ code: ctx.otel.SpanStatusCode.ERROR, message: failureMessage });
  }

  span.end();
}

/**
 * Emits a retroactive Client-kind span for a completed/failed activity task.
 * This matches the .NET SDK pattern (EmitTraceActivityForTaskCompleted/Failed) where
 * client spans are emitted at completion time with startTime from the original
 * TaskScheduled event timestamp, providing accurate scheduling-to-completion duration.
 *
 * @param orchestrationSpan - The parent orchestration span.
 * @param taskName - The activity name.
 * @param version - The activity version (optional).
 * @param instanceId - The orchestration instance ID.
 * @param taskId - The task's sequential ID.
 * @param startTime - The scheduling timestamp from the TaskScheduled history event.
 * @param failureMessage - If the task failed, the error message.
 */
export function emitRetroactiveActivityClientSpan(
  orchestrationSpan: Span,
  taskName: string,
  version: string | undefined,
  instanceId: string,
  taskId: number,
  startTime?: Date,
  failureMessage?: string,
): void {
  emitRetroactiveClientSpan(
    orchestrationSpan, TaskType.ACTIVITY, taskName, version,
    instanceId, startTime, failureMessage, taskId,
  );
}

/**
 * Emits a retroactive Client-kind span for a completed/failed sub-orchestration.
 * Matches .NET SDK's EmitTraceActivityForSubOrchestrationCompleted/Failed pattern.
 *
 * @param orchestrationSpan - The parent orchestration span.
 * @param subOrchName - The sub-orchestration name.
 * @param version - The sub-orchestration version (optional).
 * @param instanceId - The parent orchestration instance ID.
 * @param startTime - The scheduling timestamp from the SubOrchestrationInstanceCreated event.
 * @param failureMessage - If the sub-orchestration failed, the error message.
 */
export function emitRetroactiveSubOrchClientSpan(
  orchestrationSpan: Span,
  subOrchName: string,
  version: string | undefined,
  instanceId: string,
  startTime?: Date,
  failureMessage?: string,
): void {
  emitRetroactiveClientSpan(
    orchestrationSpan, TaskType.ORCHESTRATION, subOrchName, version,
    instanceId, startTime, failureMessage,
  );
}

/**
 * Processes new history events to emit retroactive spans for completed/failed tasks,
 * sub-orchestrations, and fired timers. This follows the .NET SDK pattern where the
 * worker emits these spans before the orchestrator executor runs.
 *
 * @param orchestrationSpan - The orchestration span (parent for retroactive spans).
 * @param pastEvents - The past (replay) history events to look up scheduling events.
 * @param newEvents - The new history events to process for completions/failures.
 * @param instanceId - The orchestration instance ID.
 * @param orchestrationName - The orchestration name (for timer spans).
 */
export function processNewEventsForTracing(
  orchestrationSpan: Span | undefined | null,
  pastEvents: pb.HistoryEvent[],
  newEvents: pb.HistoryEvent[],
  instanceId: string,
  orchestrationName: string,
): void {
  if (!orchestrationSpan) return;
  if (!getTracingContext()) return;

  // Build lookup maps from past events
  const taskScheduledEvents = new Map<number, pb.HistoryEvent>();
  const subOrchCreatedEvents = new Map<number, pb.HistoryEvent>();
  const timerCreatedEvents = new Map<number, pb.HistoryEvent>();

  for (const event of pastEvents) {
    const eventId = event.getEventid();
    if (event.hasTaskscheduled()) {
      taskScheduledEvents.set(eventId, event);
    } else if (event.hasSuborchestrationinstancecreated()) {
      subOrchCreatedEvents.set(eventId, event);
    } else if (event.hasTimercreated()) {
      timerCreatedEvents.set(eventId, event);
    }
  }

  // Process new events for completions, failures, and timer firings
  for (const newEvent of newEvents) {
    if (newEvent.hasTaskcompleted()) {
      const taskCompleted = newEvent.getTaskcompleted()!;
      const scheduledEvent = taskScheduledEvents.get(taskCompleted.getTaskscheduledid());
      if (scheduledEvent) {
        const taskScheduled = scheduledEvent.getTaskscheduled()!;
        emitRetroactiveActivityClientSpan(
          orchestrationSpan,
          taskScheduled.getName(),
          taskScheduled.getVersion()?.getValue(),
          instanceId,
          scheduledEvent.getEventid(),
          scheduledEvent.getTimestamp()?.toDate(),
        );
      }
    } else if (newEvent.hasTaskfailed()) {
      const taskFailed = newEvent.getTaskfailed()!;
      const scheduledEvent = taskScheduledEvents.get(taskFailed.getTaskscheduledid());
      if (scheduledEvent) {
        const taskScheduled = scheduledEvent.getTaskscheduled()!;
        const failureMessage =
          taskFailed.getFailuredetails()?.getErrormessage() ?? "Unspecified task activity failure";
        emitRetroactiveActivityClientSpan(
          orchestrationSpan,
          taskScheduled.getName(),
          taskScheduled.getVersion()?.getValue(),
          instanceId,
          scheduledEvent.getEventid(),
          scheduledEvent.getTimestamp()?.toDate(),
          failureMessage,
        );
      }
    } else if (newEvent.hasSuborchestrationinstancecompleted()) {
      const subOrchCompleted = newEvent.getSuborchestrationinstancecompleted()!;
      const createdEvent = subOrchCreatedEvents.get(subOrchCompleted.getTaskscheduledid());
      if (createdEvent) {
        const subOrchCreated = createdEvent.getSuborchestrationinstancecreated()!;
        emitRetroactiveSubOrchClientSpan(
          orchestrationSpan,
          subOrchCreated.getName(),
          subOrchCreated.getVersion()?.getValue(),
          instanceId,
          createdEvent.getTimestamp()?.toDate(),
        );
      }
    } else if (newEvent.hasSuborchestrationinstancefailed()) {
      const subOrchFailed = newEvent.getSuborchestrationinstancefailed()!;
      const createdEvent = subOrchCreatedEvents.get(subOrchFailed.getTaskscheduledid());
      if (createdEvent) {
        const subOrchCreated = createdEvent.getSuborchestrationinstancecreated()!;
        const failureMessage =
          subOrchFailed.getFailuredetails()?.getErrormessage() ?? "Unspecified sub-orchestration failure";
        emitRetroactiveSubOrchClientSpan(
          orchestrationSpan,
          subOrchCreated.getName(),
          subOrchCreated.getVersion()?.getValue(),
          instanceId,
          createdEvent.getTimestamp()?.toDate(),
          failureMessage,
        );
      }
    } else if (newEvent.hasTimerfired()) {
      const timerFired = newEvent.getTimerfired()!;
      const timerId = timerFired.getTimerid();
      const createdEvent = timerCreatedEvents.get(timerId);
      const fireAt = timerFired.getFireat()?.toDate() ?? new Date();
      emitSpanForTimer(
        orchestrationSpan,
        orchestrationName,
        fireAt,
        timerId,
        instanceId,
        createdEvent?.getTimestamp()?.toDate(),
      );
    }
  }
}

/**
 * Emits a span for sending an event to another orchestration.
 *
 * @param orchestrationSpan - The parent orchestration span.
 * @param eventName - The name of the event.
 * @param targetInstanceId - The target orchestration instance ID.
 */
export function emitSpanForEventSent(
  orchestrationSpan: Span,
  eventName: string,
  targetInstanceId?: string,
): void {
  const ctx = getTracingContext();
  if (!ctx) return;

  const spanName = createSpanName(TaskType.ORCHESTRATION_EVENT, eventName);
  const parentContext = ctx.otel.trace.setSpan(ctx.otel.context.active(), orchestrationSpan);

  const span = ctx.tracer.startSpan(
    spanName,
    {
      kind: ctx.otel.SpanKind.PRODUCER,
      attributes: {
        [DurableTaskAttributes.TYPE]: TaskType.EVENT,
        [DurableTaskAttributes.TASK_NAME]: eventName,
        ...(targetInstanceId ? { [DurableTaskAttributes.EVENT_TARGET_INSTANCE_ID]: targetInstanceId } : {}),
      },
    },
    parentContext,
  );

  span.end();
}

/**
 * Creates a Producer span for raising an event from the client.
 *
 * @param eventName - The name of the event.
 * @param instanceId - The target orchestration instance ID.
 * @returns The span (or undefined if OTEL is not available). Caller must end it.
 */
export function startSpanForEventRaisedFromClient(eventName: string, instanceId: string): Span | undefined {
  const ctx = getTracingContext();
  if (!ctx) return undefined;

  const spanName = createSpanName(TaskType.ORCHESTRATION_EVENT, eventName);

  const span = ctx.tracer.startSpan(spanName, {
    kind: ctx.otel.SpanKind.PRODUCER,
    attributes: {
      [DurableTaskAttributes.TYPE]: TaskType.EVENT,
      [DurableTaskAttributes.TASK_NAME]: eventName,
      [DurableTaskAttributes.EVENT_TARGET_INSTANCE_ID]: instanceId,
    },
  });

  return span;
}

/**
 * Sets span status to error and records the error.
 *
 * @param span - The span to set error status on.
 * @param error - The error to record.
 */
export function setSpanError(span: Span | undefined | null, error: unknown): void {
  const otel = getOtelApi();
  if (!otel || !span) return;

  const message =
    typeof error === "string" ? error : error instanceof Error ? error.message : String(error);
  span.setStatus({ code: otel.SpanStatusCode.ERROR, message });
  if (error instanceof Error) {
    span.recordException(error);
  }
}

/**
 * Sets span status to OK.
 *
 * @param span - The span to set OK status on.
 */
export function setSpanOk(span: Span | undefined | null): void {
  const otel = getOtelApi();
  if (!otel || !span) return;

  span.setStatus({ code: otel.SpanStatusCode.OK });
}

/**
 * Safely ends a span, ignoring errors.
 *
 * @param span - The span to end.
 */
export function endSpan(span: Span | undefined | null): void {
  if (!span) return;
  try {
    span.end();
  } catch {
    // Ignore errors when ending spans
  }
}

/**
 * Sets the orchestration completion status attribute on the span.
 * This records the final status (e.g. "Completed", "Failed") as a span attribute,
 * matching the .NET SDK behavior.
 *
 * @param span - The orchestration span.
 * @param actions - The orchestrator actions to inspect for completion status.
 */
export function setOrchestrationStatusFromActions(
  span: Span | undefined | null,
  actions: pb.OrchestratorAction[],
): void {
  if (!span) return;

  for (const action of actions) {
    if (action.hasCompleteorchestration()) {
      const completeAction = action.getCompleteorchestration()!;
      const status = completeAction.getOrchestrationstatus();
      const statusName = orchestrationStatusToString(status);
      if (statusName) {
        span.setAttribute(DurableTaskAttributes.TASK_STATUS, statusName);
      }
      break;
    }
  }
}

/** Maps protobuf OrchestrationStatus enum to a human-readable string. */
const orchestrationStatusNames: Record<number, string> = {
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING]: "Running",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED]: "Completed",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW]: "ContinuedAsNew",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED]: "Failed",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED]: "Canceled",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED]: "Terminated",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING]: "Pending",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED]: "Suspended",
};

function orchestrationStatusToString(status: pb.OrchestrationStatus): string | undefined {
  return orchestrationStatusNames[status];
}

/**
 * Creates an OrchestrationTraceContext protobuf message for the orchestrator response.
 *
 * @param spanInfo - The span info to encode.
 * @returns The OrchestrationTraceContext protobuf message.
 */
export function createOrchestrationTraceContextPb(spanInfo: OrchestrationSpanInfo): pb.OrchestrationTraceContext {
  const orchTraceCtx = new pb.OrchestrationTraceContext();

  const spanIdValue = new StringValue();
  spanIdValue.setValue(spanInfo.spanId);
  orchTraceCtx.setSpanid(spanIdValue);

  const startTimestamp = new Timestamp();
  startTimestamp.fromDate(spanInfo.startTime);
  orchTraceCtx.setSpanstarttime(startTimestamp);

  return orchTraceCtx;
}

/**
 * Processes orchestrator actions to inject trace context for distributed tracing.
 * This is called after the orchestration executor returns its actions.
 *
 * @param orchestrationSpan - The orchestration span (parent for action spans).
 * @param actions - The OrchestratorAction list to process.
 * @param orchestrationName - The name of the orchestration (for timer spans).
 * @param instanceId - The orchestration instance ID (for enriching span attributes).
 */
export function processActionsForTracing(
  orchestrationSpan: Span | undefined | null,
  actions: pb.OrchestratorAction[],
  orchestrationName: string,
  instanceId?: string,
): void {
  if (!orchestrationSpan) return;

  for (const action of actions) {
    if (action.hasScheduletask()) {
      const scheduleTask = action.getScheduletask()!;
      startSpanForSchedulingTask(orchestrationSpan, scheduleTask, action.getId());
    } else if (action.hasCreatesuborchestration()) {
      const createSubOrch = action.getCreatesuborchestration()!;
      startSpanForSchedulingSubOrchestration(orchestrationSpan, createSubOrch, action.getId());
    } else if (action.hasCreatetimer()) {
      const createTimer = action.getCreatetimer()!;
      const fireAt = createTimer.getFireat()?.toDate() ?? new Date();
      emitSpanForTimer(orchestrationSpan, orchestrationName, fireAt, action.getId(), instanceId);
    } else if (action.hasSendevent()) {
      const sendEvent = action.getSendevent()!;
      emitSpanForEventSent(orchestrationSpan, sendEvent.getName(), sendEvent.getInstance()?.getInstanceid());
    } else if (action.hasSendentitymessage()) {
      const sendEntityMsg = action.getSendentitymessage()!;
      if (sendEntityMsg.hasEntityoperationcalled()) {
        const callEvent = sendEntityMsg.getEntityoperationcalled()!;
        emitSpanForEntityCall(
          orchestrationSpan,
          callEvent.getOperation(),
          callEvent.getTargetinstanceid()?.getValue(),
          action.getId(),
        );
      } else if (sendEntityMsg.hasEntityoperationsignaled()) {
        const signalEvent = sendEntityMsg.getEntityoperationsignaled()!;
        emitSpanForEntitySignal(
          orchestrationSpan,
          signalEvent.getOperation(),
          signalEvent.getTargetinstanceid()?.getValue(),
          action.getId(),
        );
      } else if (sendEntityMsg.hasEntitylockrequested()) {
        emitSpanForEntityLockRequest(
          orchestrationSpan,
          action.getId(),
        );
      }
    }
  }
}

function emitSpanForEntityOperation(
  orchestrationSpan: Span,
  operationName: string,
  taskType: string,
  getSpanKind: (otel: any) => any,
  targetInstanceId?: string,
  taskId?: number,
): void {
  const otel = getOtelApi();
  const tracer = getTracer();
  if (!otel || !tracer) return;

  const spanName = createSpanName(taskType, operationName);
  const parentContext = otel.trace.setSpan(otel.context.active(), orchestrationSpan);

  const span = tracer.startSpan(
    spanName,
    {
      kind: getSpanKind(otel),
      attributes: {
        [DurableTaskAttributes.TYPE]: taskType,
        [DurableTaskAttributes.ENTITY_OPERATION]: operationName,
        ...(targetInstanceId ? { [DurableTaskAttributes.ENTITY_INSTANCE_ID]: targetInstanceId } : {}),
        ...(taskId !== undefined ? { [DurableTaskAttributes.TASK_TASK_ID]: taskId } : {}),
      },
    },
    parentContext,
  );

  span.end();
}

/**
 * Emits a span for calling an entity from an orchestration (request/response).
 *
 * @param orchestrationSpan - The parent orchestration span.
 * @param operationName - The entity operation name.
 * @param targetInstanceId - The target entity instance ID.
 * @param taskId - The sequential task ID.
 */
export function emitSpanForEntityCall(
  orchestrationSpan: Span,
  operationName: string,
  targetInstanceId?: string,
  taskId?: number,
): void {
  emitSpanForEntityOperation(
    orchestrationSpan,
    operationName,
    TaskType.CALL_ENTITY,
    (otel) => otel.SpanKind.CLIENT,
    targetInstanceId,
    taskId,
  );
}

/**
 * Emits a span for signaling an entity from an orchestration (fire-and-forget).
 *
 * @param orchestrationSpan - The parent orchestration span.
 * @param operationName - The entity operation name.
 * @param targetInstanceId - The target entity instance ID.
 * @param taskId - The sequential task ID.
 */
export function emitSpanForEntitySignal(
  orchestrationSpan: Span,
  operationName: string,
  targetInstanceId?: string,
  taskId?: number,
): void {
  emitSpanForEntityOperation(
    orchestrationSpan,
    operationName,
    TaskType.SIGNAL_ENTITY,
    (otel) => otel.SpanKind.PRODUCER,
    targetInstanceId,
    taskId,
  );
}

/**
 * Emits a span for requesting entity locks from an orchestration.
 *
 * @param orchestrationSpan - The parent orchestration span.
 * @param taskId - The sequential task ID.
 */
export function emitSpanForEntityLockRequest(
  orchestrationSpan: Span,
  taskId: number,
): void {
  const otel = getOtelApi();
  const tracer = getTracer();
  if (!otel || !tracer) return;

  const spanName = `${TaskType.ENTITY}:lock_request`;
  const parentContext = otel.trace.setSpan(otel.context.active(), orchestrationSpan);

  const span = tracer.startSpan(
    spanName,
    {
      kind: otel.SpanKind.INTERNAL,
      attributes: {
        [DurableTaskAttributes.TYPE]: TaskType.ENTITY,
        [DurableTaskAttributes.TASK_TASK_ID]: taskId,
      },
    },
    parentContext,
  );

  span.end();
}

/**
 * Creates a Producer span for signaling an entity from the client.
 *
 * @param entityId - The target entity instance ID string.
 * @param operationName - The entity operation name.
 * @returns The span (or undefined if OTEL is not available). Caller must end it.
 */
export function startSpanForSignalEntityFromClient(
  entityId: string,
  operationName: string,
): Span | undefined {
  const otel = getOtelApi();
  const tracer = getTracer();
  if (!otel || !tracer) return undefined;

  const spanName = createSpanName(TaskType.SIGNAL_ENTITY, operationName);

  const span = tracer.startSpan(spanName, {
    kind: otel.SpanKind.PRODUCER,
    attributes: {
      [DurableTaskAttributes.TYPE]: TaskType.SIGNAL_ENTITY,
      [DurableTaskAttributes.ENTITY_OPERATION]: operationName,
      [DurableTaskAttributes.ENTITY_INSTANCE_ID]: entityId,
    },
  });

  return span;
}
