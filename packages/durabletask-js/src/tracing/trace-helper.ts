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
  const spanName = createSpanName(TaskType.ACTIVITY, name);

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
 */
export function emitSpanForTimer(
  orchestrationSpan: Span,
  orchestrationName: string,
  fireAt: Date,
  timerId: number,
): void {
  const ctx = getTracingContext();
  if (!ctx) return;

  const spanName = createTimerSpanName(orchestrationName);
  const parentContext = ctx.otel.trace.setSpan(ctx.otel.context.active(), orchestrationSpan);

  const span = ctx.tracer.startSpan(
    spanName,
    {
      kind: ctx.otel.SpanKind.INTERNAL,
      attributes: {
        [DurableTaskAttributes.TYPE]: TaskType.TIMER,
        [DurableTaskAttributes.TASK_TASK_ID]: timerId,
        [DurableTaskAttributes.FIRE_AT]: fireAt.toISOString(),
      },
    },
    parentContext,
  );

  span.end();
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
 */
export function processActionsForTracing(
  orchestrationSpan: Span | undefined | null,
  actions: pb.OrchestratorAction[],
  orchestrationName: string,
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
      emitSpanForTimer(orchestrationSpan, orchestrationName, fireAt, action.getId());
    } else if (action.hasSendevent()) {
      const sendEvent = action.getSendevent()!;
      emitSpanForEventSent(orchestrationSpan, sendEvent.getName(), sendEvent.getInstance()?.getInstanceid());
    }
  }
}
