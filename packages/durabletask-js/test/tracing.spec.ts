// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  parseTraceparent,
  createTraceparent,
  generateSpanId,
  TRACER_NAME,
  DurableTaskAttributes,
  TaskType,
  createSpanName,
  createTimerSpanName,
} from "../src/tracing/index";

import {
  createPbTraceContext,
  createPbTraceContextFromSpan,
  getOtelApi,
  extractTraceparentFromSpan,
  createParentContextFromPb,
} from "../src/tracing/trace-context-utils";

import {
  startSpanForNewOrchestration,
  startSpanForOrchestrationExecution,
  startSpanForTaskExecution,
  startSpanForEventRaisedFromClient,
  emitSpanForTimer,
  emitSpanForEventSent,
  processActionsForTracing,
  createOrchestrationTraceContextPb,
  setOrchestrationStatusFromActions,
  emitRetroactiveActivityClientSpan,
  emitRetroactiveSubOrchClientSpan,
  processNewEventsForTracing,
  setSpanError,
  setSpanOk,
  endSpan,
} from "../src/tracing/trace-helper";

import * as pb from "../src/proto/orchestrator_service_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";

// Import OTEL packages once at module level
import * as otel from "@opentelemetry/api";
import { BasicTracerProvider, SimpleSpanProcessor, InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";

// Shared test infrastructure - single provider for the entire test file
let exporter: InMemorySpanExporter;
let provider: BasicTracerProvider;
let previousTracerProvider: otel.TracerProvider | undefined;

beforeAll(() => {
  exporter = new InMemorySpanExporter();
  provider = new BasicTracerProvider();
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

  // Save the current global tracer provider to restore it after this suite
  previousTracerProvider = otel.trace.getTracerProvider();

  // Register this test-specific provider as the global tracer provider
  provider.register();
});

afterAll(async () => {
  await provider.shutdown();

  // Restore the previous global tracer provider to avoid leaking state to other tests
  if (previousTracerProvider) {
    otel.trace.setGlobalTracerProvider(previousTracerProvider);
  }
});

beforeEach(() => {
  exporter.reset();
});

describe("Tracing Constants", () => {
  it("should have the correct tracer name", () => {
    expect(TRACER_NAME).toBe("Microsoft.DurableTask");
  });

  it("should have all expected attribute keys", () => {
    expect(DurableTaskAttributes.TYPE).toBe("durabletask.type");
    expect(DurableTaskAttributes.TASK_NAME).toBe("durabletask.task.name");
    expect(DurableTaskAttributes.TASK_INSTANCE_ID).toBe("durabletask.task.instance_id");
    expect(DurableTaskAttributes.TASK_VERSION).toBe("durabletask.task.version");
    expect(DurableTaskAttributes.TASK_TASK_ID).toBe("durabletask.task.task_id");
    expect(DurableTaskAttributes.FIRE_AT).toBe("durabletask.fire_at");
    expect(DurableTaskAttributes.EVENT_TARGET_INSTANCE_ID).toBe("durabletask.event.target_instance_id");
  });

  it("should have all expected task types", () => {
    expect(TaskType.ORCHESTRATION).toBe("orchestration");
    expect(TaskType.ACTIVITY).toBe("activity");
    expect(TaskType.TIMER).toBe("timer");
    expect(TaskType.ORCHESTRATION_EVENT).toBe("orchestration_event");
    expect(TaskType.CREATE_ORCHESTRATION).toBe("create_orchestration");
  });
});

describe("createSpanName", () => {
  it("should create a span name without version", () => {
    expect(createSpanName("orchestration", "MyOrch")).toBe("orchestration:MyOrch");
  });

  it("should create a span name with version", () => {
    expect(createSpanName("orchestration", "MyOrch", "1.0.0")).toBe("orchestration:MyOrch@(1.0.0)");
  });

  it("should handle empty version string", () => {
    expect(createSpanName("activity", "MyActivity", "")).toBe("activity:MyActivity");
  });
});

describe("createTimerSpanName", () => {
  it("should create a timer span name", () => {
    expect(createTimerSpanName("MyOrch")).toBe("orchestration:MyOrch:timer");
  });
});

describe("parseTraceparent", () => {
  it("should parse a valid traceparent string", () => {
    const result = parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01");
    expect(result).toBeDefined();
    expect(result!.traceId).toBe("0af7651916cd43dd8448eb211c80319c");
    expect(result!.spanId).toBe("b7ad6b7169203331");
    expect(result!.traceFlags).toBe(1);
  });

  it("should parse traceparent with traceFlags 00", () => {
    const result = parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00");
    expect(result).toBeDefined();
    expect(result!.traceFlags).toBe(0);
  });

  it("should return undefined for invalid traceparent", () => {
    expect(parseTraceparent("invalid")).toBeUndefined();
    expect(parseTraceparent("")).toBeUndefined();
    expect(parseTraceparent("00-123-456-01")).toBeUndefined();
  });

  it("should return undefined for traceparent with wrong number of parts", () => {
    expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331")).toBeUndefined();
    expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01-extra")).toBeUndefined();
  });
});

describe("createTraceparent", () => {
  it("should create a valid traceparent string", () => {
    const result = createTraceparent("0af7651916cd43dd8448eb211c80319c", "b7ad6b7169203331", 1);
    expect(result).toBe("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01");
  });

  it("should create traceparent with traceFlags 0", () => {
    const result = createTraceparent("0af7651916cd43dd8448eb211c80319c", "b7ad6b7169203331", 0);
    expect(result).toBe("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00");
  });

  it("should round-trip with parseTraceparent", () => {
    const original = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
    const parsed = parseTraceparent(original)!;
    const recreated = createTraceparent(parsed.traceId, parsed.spanId, parsed.traceFlags);
    expect(recreated).toBe(original);
  });
});

describe("generateSpanId", () => {
  it("should generate a 16-character hex string", () => {
    const spanId = generateSpanId();
    expect(spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  it("should generate unique span IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateSpanId());
    }
    // With 100 random 8-byte values, collisions should be astronomically unlikely
    expect(ids.size).toBe(100);
  });
});

describe("createPbTraceContext", () => {
  it("should create a protobuf TraceContext with traceparent only", () => {
    const traceparent = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
    const pbCtx = createPbTraceContext(traceparent);

    expect(pbCtx).toBeInstanceOf(pb.TraceContext);
    expect(pbCtx.getTraceparent()).toBe(traceparent);
    expect(pbCtx.getTracestate()).toBeUndefined();
  });

  it("should create a protobuf TraceContext with tracestate", () => {
    const traceparent = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
    const tracestate = "congo=ucfJifl5GOE,rojo=00f067aa0ba902b7";
    const pbCtx = createPbTraceContext(traceparent, tracestate);

    expect(pbCtx.getTraceparent()).toBe(traceparent);
    expect(pbCtx.getTracestate()?.getValue()).toBe(tracestate);
  });
});

describe("getOtelApi", () => {
  it("should return the OpenTelemetry API when available", () => {
    const otel = getOtelApi();
    // @opentelemetry/api is a devDependency, so it should be available
    expect(otel).toBeDefined();
    expect(otel!.trace).toBeDefined();
    expect(otel!.context).toBeDefined();
    expect(otel!.SpanKind).toBeDefined();
    expect(otel!.SpanStatusCode).toBeDefined();
  });
});

describe("Trace Helper Integration", () => {
  it("should create spans via the tracer", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("test-span");
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe("test-span");
  });

  it("should extract traceparent from an active span", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("extract-test");

    const result = extractTraceparentFromSpan(span);
    expect(result).toBeDefined();
    expect(result!.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);

    span.end();
  });

  it("should create parent context from protobuf TraceContext", () => {
    const traceparent = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
    const pbCtx = createPbTraceContext(traceparent);

    const parentContext = createParentContextFromPb(pbCtx);
    expect(parentContext).toBeDefined();

    // Verify we can create a child span from the context
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const childSpan = tracer.startSpan("child-span", {}, parentContext!);
    childSpan.end();

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe("child-span");
    // The child span should have the parent's trace ID
    expect(spans[0].spanContext().traceId).toBe("0af7651916cd43dd8448eb211c80319c");
  });

  it("should return undefined for createParentContextFromPb with no input", () => {
    const result = createParentContextFromPb(undefined);
    expect(result).toBeUndefined();
  });
});

describe("Trace Helper - startSpanForNewOrchestration", () => {
  it("should create a Producer span for a new orchestration", () => {
    const req = new pb.CreateInstanceRequest();
    req.setName("MyOrchestration");
    req.setInstanceid("test-instance-123");

    const span = startSpanForNewOrchestration(req);
    expect(span).toBeDefined();
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe("create_orchestration:MyOrchestration");
    expect(spans[0].kind).toBe(otel.SpanKind.PRODUCER);
    expect(spans[0].attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.ORCHESTRATION);
    expect(spans[0].attributes[DurableTaskAttributes.TASK_NAME]).toBe("MyOrchestration");
    expect(spans[0].attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBe("test-instance-123");
  });

  it("should inject trace context into the CreateInstanceRequest", () => {
    const req = new pb.CreateInstanceRequest();
    req.setName("MyOrchestration");
    req.setInstanceid("test-instance-456");

    const span = startSpanForNewOrchestration(req);
    span!.end();

    // The parenttracecontext should be set on the request
    const traceCtx = req.getParenttracecontext();
    expect(traceCtx).toBeDefined();
    expect(traceCtx!.getTraceparent()).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
  });

  it("should include version in span name and attributes when provided", () => {
    const req = new pb.CreateInstanceRequest();
    req.setName("MyOrchestration");
    req.setInstanceid("test-instance-789");
    const versionValue = new StringValue();
    versionValue.setValue("2.0.0");
    req.setVersion(versionValue);

    const span = startSpanForNewOrchestration(req);
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].name).toBe("create_orchestration:MyOrchestration@(2.0.0)");
    expect(spans[0].attributes[DurableTaskAttributes.TASK_VERSION]).toBe("2.0.0");
  });
});

describe("Trace Helper - error paths", () => {
  it("startSpanForNewOrchestration should handle request with no version gracefully", () => {
    const req = new pb.CreateInstanceRequest();
    req.setName("NoVersionOrch");
    req.setInstanceid("no-version-instance");

    const span = startSpanForNewOrchestration(req);
    expect(span).toBeDefined();
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].name).toBe("create_orchestration:NoVersionOrch");
    expect(spans[0].attributes[DurableTaskAttributes.TASK_VERSION]).toBeUndefined();
  });

  it("startSpanForNewOrchestration should handle empty name", () => {
    const req = new pb.CreateInstanceRequest();
    req.setName("");
    req.setInstanceid("empty-name-instance");

    const span = startSpanForNewOrchestration(req);
    expect(span).toBeDefined();
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].name).toBe("create_orchestration:");
  });

  it("startSpanForOrchestrationExecution should handle event with no parent trace context", () => {
    const event = new pb.ExecutionStartedEvent();
    event.setName("NoParentCtxOrch");

    const result = startSpanForOrchestrationExecution(event, undefined, "no-ctx-instance");
    expect(result).toBeDefined();
    result!.span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].name).toBe("orchestration:NoParentCtxOrch");
    expect(spans[0].kind).toBe(otel.SpanKind.SERVER);
  });

  it("startSpanForOrchestrationExecution should handle OrchestrationTraceContext with missing spanId", () => {
    const event = new pb.ExecutionStartedEvent();
    event.setName("MissingSpanIdOrch");

    // OrchestrationTraceContext with start time but no spanId
    const orchTraceCtx = new pb.OrchestrationTraceContext();
    const startTimestamp = new Timestamp();
    startTimestamp.fromDate(new Date("2025-06-15T10:00:00Z"));
    orchTraceCtx.setSpanstarttime(startTimestamp);
    // Deliberately not setting spanId

    const result = startSpanForOrchestrationExecution(event, orchTraceCtx, "missing-spanid-instance");
    expect(result).toBeDefined();
    result!.span.end();

    const spans = exporter.getFinishedSpans();
    // Should treat as first execution (not replay) since spanId is missing
    expect(result!.spanInfo.spanId).toBe(spans[0].spanContext().spanId);
    expect(spans[0].attributes[DurableTaskAttributes.REPLAY_SPAN_ID]).toBeUndefined();
  });

  it("startSpanForOrchestrationExecution should handle OrchestrationTraceContext with missing startTime", () => {
    const event = new pb.ExecutionStartedEvent();
    event.setName("MissingStartTimeOrch");

    // OrchestrationTraceContext with spanId but no start time
    const orchTraceCtx = new pb.OrchestrationTraceContext();
    const spanIdValue = new StringValue();
    spanIdValue.setValue("aabbccdd11223344");
    orchTraceCtx.setSpanid(spanIdValue);
    // Deliberately not setting spanstarttime

    const result = startSpanForOrchestrationExecution(event, orchTraceCtx, "missing-starttime-instance");
    expect(result).toBeDefined();
    result!.span.end();

    const spans = exporter.getFinishedSpans();
    // Should treat as first execution (not replay) since startTime is missing
    expect(result!.spanInfo.spanId).toBe(spans[0].spanContext().spanId);
    expect(spans[0].attributes[DurableTaskAttributes.REPLAY_SPAN_ID]).toBeUndefined();
  });

  it("startSpanForTaskExecution should handle request with no parent trace context", () => {
    const req = new pb.ActivityRequest();
    req.setName("NoCtxActivity");
    req.setTaskid(1);

    const orchInstance = new pb.OrchestrationInstance();
    orchInstance.setInstanceid("parent-orch");
    req.setOrchestrationinstance(orchInstance);

    const span = startSpanForTaskExecution(req);
    expect(span).toBeDefined();
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].name).toBe("activity:NoCtxActivity");
    // Should still create a valid span, just without a parent
    expect(spans[0].kind).toBe(otel.SpanKind.SERVER);
  });

  it("startSpanForTaskExecution should handle request with no orchestration instance", () => {
    const req = new pb.ActivityRequest();
    req.setName("NoInstanceActivity");
    req.setTaskid(2);
    // Deliberately not setting orchestration instance

    const span = startSpanForTaskExecution(req);
    expect(span).toBeDefined();
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].name).toBe("activity:NoInstanceActivity");
    expect(spans[0].attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBe("");
  });

  it("setSpanError should record exception for Error instances", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("error-exception-test");

    const error = new Error("test error with stack");
    setSpanError(span, error);
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].status.code).toBe(otel.SpanStatusCode.ERROR);
    expect(spans[0].status.message).toBe("test error with stack");
    // Should have recorded the exception event
    expect(spans[0].events.length).toBeGreaterThanOrEqual(1);
    expect(spans[0].events[0].name).toBe("exception");
  });

  it("setSpanError should not record exception for non-Error types", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("non-error-exception-test");

    setSpanError(span, "string error");
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].status.code).toBe(otel.SpanStatusCode.ERROR);
    // Should not have recorded an exception event for string errors
    expect(spans[0].events.length).toBe(0);
  });

  it("endSpan should not throw when span.end() throws", () => {
    const mockSpan = {
      end: () => {
        throw new Error("span already ended");
      },
    } as unknown as import("@opentelemetry/api").Span;

    expect(() => endSpan(mockSpan)).not.toThrow();
  });
});

describe("Trace Helper - startSpanForTaskExecution", () => {
  it("should create a Server span for activity execution", () => {
    const req = new pb.ActivityRequest();
    req.setName("MyActivity");
    req.setTaskid(42);

    const orchInstance = new pb.OrchestrationInstance();
    orchInstance.setInstanceid("parent-orch-id");
    req.setOrchestrationinstance(orchInstance);

    const span = startSpanForTaskExecution(req);
    expect(span).toBeDefined();
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe("activity:MyActivity");
    expect(spans[0].kind).toBe(otel.SpanKind.SERVER);
    expect(spans[0].attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.ACTIVITY);
    expect(spans[0].attributes[DurableTaskAttributes.TASK_NAME]).toBe("MyActivity");
    expect(spans[0].attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBe("parent-orch-id");
    expect(spans[0].attributes[DurableTaskAttributes.TASK_TASK_ID]).toBe(42);
  });

  it("should parent span to trace context from ActivityRequest", () => {
    const parentTraceparent = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";

    const req = new pb.ActivityRequest();
    req.setName("MyActivity");
    req.setTaskid(1);

    const parentCtx = createPbTraceContext(parentTraceparent);
    req.setParenttracecontext(parentCtx);

    const orchInstance = new pb.OrchestrationInstance();
    orchInstance.setInstanceid("parent-orch-id");
    req.setOrchestrationinstance(orchInstance);

    const span = startSpanForTaskExecution(req);
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    // The span should be parented to the given trace ID
    expect(spans[0].spanContext().traceId).toBe("0af7651916cd43dd8448eb211c80319c");
  });
});

describe("Trace Helper - setSpanError and setSpanOk", () => {
  it("should set span status to ERROR with message", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("error-test");

    setSpanError(span, new Error("Something went wrong"));
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].status.code).toBe(otel.SpanStatusCode.ERROR);
    expect(spans[0].status.message).toBe("Something went wrong");
  });

  it("should set span status to OK", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("ok-test");

    setSpanOk(span);
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].status.code).toBe(otel.SpanStatusCode.OK);
  });

  it("should safely handle null/undefined span", () => {
    expect(() => setSpanError(undefined, new Error("test"))).not.toThrow();
    expect(() => setSpanOk(undefined)).not.toThrow();
    expect(() => endSpan(undefined)).not.toThrow();
    expect(() => endSpan(null)).not.toThrow();
  });
});

describe("Trace Helper - processActionsForTracing", () => {
  it("should inject trace context for ScheduleTaskAction without creating a span", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const parentSpan = tracer.startSpan("parent-orch");

    const scheduleTask = new pb.ScheduleTaskAction();
    scheduleTask.setName("MyActivity");

    const action = new pb.OrchestratorAction();
    action.setId(1);
    action.setScheduletask(scheduleTask);

    processActionsForTracing(parentSpan, [action], "MyOrchestration");
    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    // Should have only the parent span — no Client span created (matching .NET)
    expect(spans.length).toBe(1);

    // Trace context should have been injected into the action
    const traceCtx = scheduleTask.getParenttracecontext();
    expect(traceCtx).toBeDefined();
    expect(traceCtx!.getTraceparent()).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
  });

  it("should inject trace context for CreateSubOrchestrationAction without creating a span", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const parentSpan = tracer.startSpan("parent-orch");

    const createSubOrch = new pb.CreateSubOrchestrationAction();
    createSubOrch.setName("SubOrch");
    createSubOrch.setInstanceid("sub-orch-id");

    const action = new pb.OrchestratorAction();
    action.setId(2);
    action.setCreatesuborchestration(createSubOrch);

    processActionsForTracing(parentSpan, [action], "MyOrchestration");
    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    // Should have only the parent span — no Client span created (matching .NET)
    expect(spans.length).toBe(1);

    // Trace context should have been injected
    const traceCtx = createSubOrch.getParenttracecontext();
    expect(traceCtx).toBeDefined();
    expect(traceCtx!.getTraceparent()).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
  });

  it("should skip timer actions (timers are emitted retroactively from TimerFired events)", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const parentSpan = tracer.startSpan("parent-orch");

    const fireAt = new Timestamp();
    fireAt.fromDate(new Date("2025-01-01T00:00:00Z"));

    const createTimer = new pb.CreateTimerAction();
    createTimer.setFireat(fireAt);

    const action = new pb.OrchestratorAction();
    action.setId(3);
    action.setCreatetimer(createTimer);

    processActionsForTracing(parentSpan, [action], "MyOrchestration");
    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    const timerSpan = spans.find((s: any) => s.name === "orchestration:MyOrchestration:timer");
    expect(timerSpan).toBeUndefined();
  });

  it("should create spans for SendEventAction", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const parentSpan = tracer.startSpan("parent-orch");

    const sendEvent = new pb.SendEventAction();
    sendEvent.setName("ApprovalEvent");
    const targetInstance = new pb.OrchestrationInstance();
    targetInstance.setInstanceid("target-instance-1");
    sendEvent.setInstance(targetInstance);

    const action = new pb.OrchestratorAction();
    action.setId(4);
    action.setSendevent(sendEvent);

    processActionsForTracing(parentSpan, [action], "MyOrchestration");
    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    const eventSpan = spans.find((s: any) => s.name === "orchestration_event:ApprovalEvent");
    expect(eventSpan).toBeDefined();
    expect(eventSpan!.kind).toBe(otel.SpanKind.PRODUCER);
    expect(eventSpan!.attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.EVENT);
    expect(eventSpan!.attributes[DurableTaskAttributes.TASK_NAME]).toBe("ApprovalEvent");
    expect(eventSpan!.attributes[DurableTaskAttributes.EVENT_TARGET_INSTANCE_ID]).toBe("target-instance-1");
  });

  it("should create spans for SendEventAction without target instance", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const parentSpan = tracer.startSpan("parent-orch");

    const sendEvent = new pb.SendEventAction();
    sendEvent.setName("EventNoTarget");

    const action = new pb.OrchestratorAction();
    action.setId(5);
    action.setSendevent(sendEvent);

    processActionsForTracing(parentSpan, [action], "MyOrchestration");
    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    const eventSpan = spans.find((s: any) => s.name === "orchestration_event:EventNoTarget");
    expect(eventSpan).toBeDefined();
    expect(eventSpan!.kind).toBe(otel.SpanKind.PRODUCER);
    expect(eventSpan!.attributes[DurableTaskAttributes.EVENT_TARGET_INSTANCE_ID]).toBeUndefined();
  });

  it("should not throw when orchestrationSpan is null or undefined", () => {
    expect(() => processActionsForTracing(null, [], "test")).not.toThrow();
    expect(() => processActionsForTracing(undefined, [], "test")).not.toThrow();
  });
});

describe("Trace Helper - createOrchestrationTraceContextPb", () => {
  it("should create an OrchestrationTraceContext protobuf message", () => {
    const spanInfo = {
      spanId: "b7ad6b7169203331",
      startTime: new Date("2025-01-01T12:00:00Z"),
    };

    const pbCtx = createOrchestrationTraceContextPb(spanInfo);

    expect(pbCtx).toBeInstanceOf(pb.OrchestrationTraceContext);
    expect(pbCtx.getSpanid()?.getValue()).toBe("b7ad6b7169203331");
    expect(pbCtx.getSpanstarttime()?.toDate()).toEqual(new Date("2025-01-01T12:00:00Z"));
  });
});

describe("Trace Helper - startSpanForOrchestrationExecution", () => {
  it("should create a Server span for first orchestration execution", () => {
    const event = new pb.ExecutionStartedEvent();
    event.setName("MyOrchestration");
    const parentTraceparent = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
    const parentCtx = createPbTraceContext(parentTraceparent);
    event.setParenttracecontext(parentCtx);

    const result = startSpanForOrchestrationExecution(event, undefined, "test-instance-1");
    expect(result).toBeDefined();
    expect(result!.span).toBeDefined();
    expect(result!.spanInfo.startTime).toBeInstanceOf(Date);

    result!.span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);

    // On first execution, spanInfo.spanId should equal the actual OTEL span ID
    expect(result!.spanInfo.spanId).toBe(spans[0].spanContext().spanId);

    expect(spans[0].name).toBe("orchestration:MyOrchestration");
    expect(spans[0].kind).toBe(otel.SpanKind.SERVER);
    expect(spans[0].attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.ORCHESTRATION);
    expect(spans[0].attributes[DurableTaskAttributes.TASK_NAME]).toBe("MyOrchestration");
    expect(spans[0].attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBe("test-instance-1");
    // No REPLAY_SPAN_ID or REPLAY_START_TIME attribute on first execution
    expect(spans[0].attributes[DurableTaskAttributes.REPLAY_SPAN_ID]).toBeUndefined();
    expect(spans[0].attributes[DurableTaskAttributes.REPLAY_START_TIME]).toBeUndefined();
    // The span should be parented to the given trace ID
    expect(spans[0].spanContext().traceId).toBe("0af7651916cd43dd8448eb211c80319c");
  });

  it("should reuse span identity on replay (existing OrchestrationTraceContext)", () => {
    const event = new pb.ExecutionStartedEvent();
    event.setName("ReplayOrch");

    // Simulate an OrchestrationTraceContext from a previous execution
    const orchTraceCtx = new pb.OrchestrationTraceContext();
    const spanIdValue = new StringValue();
    spanIdValue.setValue("aabbccdd11223344");
    orchTraceCtx.setSpanid(spanIdValue);
    const startTimestamp = new Timestamp();
    startTimestamp.fromDate(new Date("2025-06-15T10:00:00Z"));
    orchTraceCtx.setSpanstarttime(startTimestamp);

    const result = startSpanForOrchestrationExecution(event, orchTraceCtx, "replay-instance");
    expect(result).toBeDefined();

    // SpanInfo should carry forward the original span ID from the first execution
    expect(result!.spanInfo.spanId).toBe("aabbccdd11223344");
    expect(result!.spanInfo.startTime).toEqual(new Date("2025-06-15T10:00:00Z"));

    result!.span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe("orchestration:ReplayOrch");
    expect(spans[0].kind).toBe(otel.SpanKind.SERVER);

    // The OTEL span has its own spanId (different from the stored replay correlation ID)
    expect(spans[0].spanContext().spanId).not.toBe("aabbccdd11223344");
    // The original span ID is stored as a REPLAY_SPAN_ID attribute for correlation
    expect(spans[0].attributes[DurableTaskAttributes.REPLAY_SPAN_ID]).toBe("aabbccdd11223344");
    // The original start time is stored as a REPLAY_START_TIME attribute
    expect(spans[0].attributes[DurableTaskAttributes.REPLAY_START_TIME]).toBe("2025-06-15T10:00:00.000Z");

    // The OTEL span itself should start near the current time, not the original replay time
    const spanStartMs = spans[0].startTime[0] * 1000 + spans[0].startTime[1] / 1e6;
    const nowMs = Date.now();
    expect(nowMs - spanStartMs).toBeLessThan(5000); // within 5 seconds of now
  });

  it("should generate new span ID on first execution (no OrchestrationTraceContext)", () => {
    const event = new pb.ExecutionStartedEvent();
    event.setName("FirstRunOrch");

    const result = startSpanForOrchestrationExecution(event, undefined, "first-run-instance");
    expect(result).toBeDefined();

    result!.span.end();

    const spans = exporter.getFinishedSpans();
    // SpanInfo.spanId should equal the actual OTEL span ID on first execution
    expect(result!.spanInfo.spanId).toBe(spans[0].spanContext().spanId);
    expect(result!.spanInfo.startTime).toBeInstanceOf(Date);
  });

  it("should include version in span name and attributes when provided", () => {
    const event = new pb.ExecutionStartedEvent();
    event.setName("VersionedOrch");
    const versionValue = new StringValue();
    versionValue.setValue("3.0.0");
    event.setVersion(versionValue);

    const result = startSpanForOrchestrationExecution(event, undefined, "versioned-instance");
    expect(result).toBeDefined();
    result!.span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].name).toBe("orchestration:VersionedOrch@(3.0.0)");
    expect(spans[0].attributes[DurableTaskAttributes.TASK_VERSION]).toBe("3.0.0");
  });
});

describe("Trace Helper - emitSpanForTimer", () => {
  it("should create an Internal span for a timer", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const parentSpan = tracer.startSpan("parent-orch-timer");
    const fireAt = new Date("2025-07-01T12:00:00Z");

    emitSpanForTimer(parentSpan, "TimerOrch", fireAt, 5);
    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    const timerSpan = spans.find((s: any) => s.name === "orchestration:TimerOrch:timer");
    expect(timerSpan).toBeDefined();
    expect(timerSpan!.kind).toBe(otel.SpanKind.INTERNAL);
    expect(timerSpan!.attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.TIMER);
    expect(timerSpan!.attributes[DurableTaskAttributes.TASK_TASK_ID]).toBe(5);
    expect(timerSpan!.attributes[DurableTaskAttributes.FIRE_AT]).toBe("2025-07-01T12:00:00.000Z");
  });
});

describe("Trace Helper - emitSpanForEventSent", () => {
  it("should create a Producer span for sending an event", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const parentSpan = tracer.startSpan("parent-orch-event");

    emitSpanForEventSent(parentSpan, "ApprovalEvent", "target-instance-1");
    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    const eventSpan = spans.find((s: any) => s.name === "orchestration_event:ApprovalEvent");
    expect(eventSpan).toBeDefined();
    expect(eventSpan!.kind).toBe(otel.SpanKind.PRODUCER);
    expect(eventSpan!.attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.EVENT);
    expect(eventSpan!.attributes[DurableTaskAttributes.TASK_NAME]).toBe("ApprovalEvent");
    expect(eventSpan!.attributes[DurableTaskAttributes.EVENT_TARGET_INSTANCE_ID]).toBe("target-instance-1");
  });

  it("should handle missing target instance ID", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const parentSpan = tracer.startSpan("parent-orch-event2");

    emitSpanForEventSent(parentSpan, "EventNoTarget");
    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    const eventSpan = spans.find((s: any) => s.name === "orchestration_event:EventNoTarget");
    expect(eventSpan).toBeDefined();
    expect(eventSpan!.attributes[DurableTaskAttributes.EVENT_TARGET_INSTANCE_ID]).toBeUndefined();
  });
});

describe("Trace Helper - startSpanForEventRaisedFromClient", () => {
  it("should create a Producer span for raising an event from the client", () => {
    const span = startSpanForEventRaisedFromClient("MyEvent", "target-instance-42");
    expect(span).toBeDefined();
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe("orchestration_event:MyEvent");
    expect(spans[0].kind).toBe(otel.SpanKind.PRODUCER);
    expect(spans[0].attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.EVENT);
    expect(spans[0].attributes[DurableTaskAttributes.TASK_NAME]).toBe("MyEvent");
    expect(spans[0].attributes[DurableTaskAttributes.EVENT_TARGET_INSTANCE_ID]).toBe("target-instance-42");
  });
});

describe("createPbTraceContextFromSpan", () => {
  it("should return undefined when OTEL reports an invalid span context", () => {
    // Create a span with an explicitly invalid (all-zeros) span context
    const invalidSpanContext: otel.SpanContext = {
      traceId: "00000000000000000000000000000000",
      spanId: "0000000000000000",
      traceFlags: otel.TraceFlags.NONE,
    };
    const nonRecordingSpan = otel.trace.wrapSpanContext(invalidSpanContext);

    const result = createPbTraceContextFromSpan(nonRecordingSpan);
    expect(result).toBeUndefined();
  });

  it("should correctly format traceparent with hex-padded flags (flags=0)", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    // Start a span; the default traceFlags from the SDK is SAMPLED (0x01),
    // but we verify the hex padding by checking the formatted string.
    const span = tracer.startSpan("pb-from-span-flags-test");
    const spanCtx = span.spanContext();

    const result = createPbTraceContextFromSpan(span);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(pb.TraceContext);

    const traceparent = result!.getTraceparent();
    // Verify full W3C traceparent format
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
    // Verify components match the span context
    expect(traceparent).toContain(spanCtx.traceId);
    expect(traceparent).toContain(spanCtx.spanId);
    // Verify flags are zero-padded to 2 hex chars
    const flagsHex = (spanCtx.traceFlags & 0xff).toString(16).padStart(2, "0");
    expect(traceparent).toBe(`00-${spanCtx.traceId}-${spanCtx.spanId}-${flagsHex}`);

    span.end();
  });

  it("should set spanId on the protobuf trace context", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("pb-from-span-spanid-test");
    const spanCtx = span.spanContext();

    const result = createPbTraceContextFromSpan(span);
    expect(result).toBeDefined();
    expect(result!.getSpanid()).toBe(spanCtx.spanId);

    span.end();
  });

  it("should include tracestate when present on the span context", () => {
    // Create a span context with a tracestate
    const traceState = otel.createTraceState("vendor1=value1,vendor2=value2");
    const parentSpanContext: otel.SpanContext = {
      traceId: "aaaabbbbccccdddd1111222233334444",
      spanId: "1122334455667788",
      traceFlags: otel.TraceFlags.SAMPLED,
      isRemote: true,
      traceState,
    };
    const parentContext = otel.trace.setSpanContext(otel.ROOT_CONTEXT, parentSpanContext);
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const childSpan = tracer.startSpan("pb-from-span-tracestate-test", {}, parentContext);

    const result = createPbTraceContextFromSpan(childSpan);
    expect(result).toBeDefined();

    // The child span inherits the parent traceId but gets a new spanId.
    // Tracestate should propagate from the parent.
    const tracestateValue = result!.getTracestate()?.getValue();
    expect(tracestateValue).toBeDefined();
    expect(tracestateValue).toContain("vendor1=value1");
    expect(tracestateValue).toContain("vendor2=value2");

    childSpan.end();
  });

  it("should exclude tracestate when not present on the span context", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("pb-from-span-no-tracestate-test");

    const result = createPbTraceContextFromSpan(span);
    expect(result).toBeDefined();
    // No tracestate was set, so the protobuf field should be absent
    expect(result!.getTracestate()).toBeUndefined();

    span.end();
  });

  it("should produce a result consistent with createPbTraceContext + extractTraceparentFromSpan", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("pb-from-span-roundtrip-test");

    // Method under test: direct path
    const direct = createPbTraceContextFromSpan(span);

    // Reference path: extract then create
    const extracted = extractTraceparentFromSpan(span);
    const reference = createPbTraceContext(extracted!.traceparent, extracted!.tracestate);

    expect(direct).toBeDefined();
    expect(direct!.getTraceparent()).toBe(reference.getTraceparent());
    expect(direct!.getSpanid()).toBe(reference.getSpanid());

    span.end();
  });
});

describe("Trace Helper - setSpanError with unknown types", () => {
  it("should handle string error", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("string-error-test");

    setSpanError(span, "plain string error");
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].status.code).toBe(otel.SpanStatusCode.ERROR);
    expect(spans[0].status.message).toBe("plain string error");
  });

  it("should handle non-Error non-string error (unknown type)", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("unknown-error-test");

    setSpanError(span, 42);
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].status.code).toBe(otel.SpanStatusCode.ERROR);
    expect(spans[0].status.message).toBe("42");
  });

  it("should handle null/undefined error gracefully", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("null-error-test");

    setSpanError(span, null);
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].status.code).toBe(otel.SpanStatusCode.ERROR);
    expect(spans[0].status.message).toBe("null");
  });
});

describe("Trace Helper - execution_id on creation spans", () => {
  it("should include execution_id when present on CreateInstanceRequest", () => {
    const req = new pb.CreateInstanceRequest();
    req.setName("MyOrchestration");
    req.setInstanceid("test-instance");
    const execId = new StringValue();
    execId.setValue("exec-abc-123");
    req.setExecutionid(execId);

    const span = startSpanForNewOrchestration(req);
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].attributes[DurableTaskAttributes.TASK_EXECUTION_ID]).toBe("exec-abc-123");
  });

  it("should not include execution_id when not present", () => {
    const req = new pb.CreateInstanceRequest();
    req.setName("MyOrchestration");
    req.setInstanceid("test-instance");

    const span = startSpanForNewOrchestration(req);
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].attributes[DurableTaskAttributes.TASK_EXECUTION_ID]).toBeUndefined();
  });
});

describe("Trace Helper - version on activity execution spans", () => {
  it("should include version in span name and attributes when provided", () => {
    const req = new pb.ActivityRequest();
    req.setName("MyActivity");
    req.setTaskid(1);
    const versionValue = new StringValue();
    versionValue.setValue("1.5.0");
    req.setVersion(versionValue);

    const orchInstance = new pb.OrchestrationInstance();
    orchInstance.setInstanceid("parent-orch-id");
    req.setOrchestrationinstance(orchInstance);

    const span = startSpanForTaskExecution(req);
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].name).toBe("activity:MyActivity@(1.5.0)");
    expect(spans[0].attributes[DurableTaskAttributes.TASK_VERSION]).toBe("1.5.0");
  });

  it("should not include version when not present", () => {
    const req = new pb.ActivityRequest();
    req.setName("MyActivity");
    req.setTaskid(1);

    const orchInstance = new pb.OrchestrationInstance();
    orchInstance.setInstanceid("parent-orch-id");
    req.setOrchestrationinstance(orchInstance);

    const span = startSpanForTaskExecution(req);
    span!.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].name).toBe("activity:MyActivity");
    expect(spans[0].attributes[DurableTaskAttributes.TASK_VERSION]).toBeUndefined();
  });
});

describe("Trace Helper - timer span enrichment", () => {
  it("should include name and instance_id on timer spans", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const parentSpan = tracer.startSpan("parent-orch-timer-enriched");
    const fireAt = new Date("2025-07-01T12:00:00Z");

    emitSpanForTimer(parentSpan, "EnrichedOrch", fireAt, 7, "instance-enriched-123");
    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    const timerSpan = spans.find((s: any) => s.name === "orchestration:EnrichedOrch:timer");
    expect(timerSpan).toBeDefined();
    expect(timerSpan!.attributes[DurableTaskAttributes.TASK_NAME]).toBe("EnrichedOrch");
    expect(timerSpan!.attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBe("instance-enriched-123");
  });

  it("should omit instance_id when not provided", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const parentSpan = tracer.startSpan("parent-orch-timer-no-id");
    const fireAt = new Date("2025-07-01T12:00:00Z");

    emitSpanForTimer(parentSpan, "NoIdOrch", fireAt, 8);
    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    const timerSpan = spans.find((s: any) => s.name === "orchestration:NoIdOrch:timer");
    expect(timerSpan).toBeDefined();
    expect(timerSpan!.attributes[DurableTaskAttributes.TASK_NAME]).toBe("NoIdOrch");
    expect(timerSpan!.attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBeUndefined();
  });
});

describe("Trace Helper - setOrchestrationStatusFromActions", () => {
  it("should set status attribute for completed orchestration and OK span status", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("orch-status-test");

    const completeAction = new pb.CompleteOrchestrationAction();
    completeAction.setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

    const action = new pb.OrchestratorAction();
    action.setCompleteorchestration(completeAction);

    setOrchestrationStatusFromActions(span, [action]);
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].attributes[DurableTaskAttributes.TASK_STATUS]).toBe("Completed");
    expect(spans[0].status.code).toBe(otel.SpanStatusCode.OK);
  });

  it("should set status attribute for failed orchestration and ERROR span status", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("orch-status-failed");

    const completeAction = new pb.CompleteOrchestrationAction();
    completeAction.setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    const resultValue = new StringValue();
    resultValue.setValue("User code threw an error");
    completeAction.setResult(resultValue);

    const action = new pb.OrchestratorAction();
    action.setCompleteorchestration(completeAction);

    setOrchestrationStatusFromActions(span, [action]);
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].attributes[DurableTaskAttributes.TASK_STATUS]).toBe("Failed");
    expect(spans[0].status.code).toBe(otel.SpanStatusCode.ERROR);
    expect(spans[0].status.message).toBe("User code threw an error");
  });

  it("should not set status when no completion action present", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("orch-status-none");

    const action = new pb.OrchestratorAction();
    action.setScheduletask(new pb.ScheduleTaskAction());

    setOrchestrationStatusFromActions(span, [action]);
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].attributes[DurableTaskAttributes.TASK_STATUS]).toBeUndefined();
  });

  it("should safely handle null/undefined span", () => {
    const action = new pb.OrchestratorAction();
    action.setCompleteorchestration(new pb.CompleteOrchestrationAction());

    // Should not throw
    setOrchestrationStatusFromActions(null, [action]);
    setOrchestrationStatusFromActions(undefined, [action]);
  });

  it("should handle terminated status", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("orch-status-terminated");

    const completeAction = new pb.CompleteOrchestrationAction();
    completeAction.setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);

    const action = new pb.OrchestratorAction();
    action.setCompleteorchestration(completeAction);

    setOrchestrationStatusFromActions(span, [action]);
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].attributes[DurableTaskAttributes.TASK_STATUS]).toBe("Terminated");
  });

  it("should handle continued_as_new status", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const span = tracer.startSpan("orch-status-can");

    const completeAction = new pb.CompleteOrchestrationAction();
    completeAction.setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW);

    const action = new pb.OrchestratorAction();
    action.setCompleteorchestration(completeAction);

    setOrchestrationStatusFromActions(span, [action]);
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans[0].attributes[DurableTaskAttributes.TASK_STATUS]).toBe("ContinuedAsNew");
  });
});

describe("Trace Helper - processActionsForTracing with instanceId", () => {
  it("should pass instanceId to event spans", () => {
    const tracer = otel.trace.getTracer(TRACER_NAME);
    const orchSpan = tracer.startSpan("orch-with-instance");

    const sendEvent = new pb.SendEventAction();
    sendEvent.setName("TestEvent");
    const instance = new pb.OrchestrationInstance();
    instance.setInstanceid("target-instance-99");
    sendEvent.setInstance(instance);

    const action = new pb.OrchestratorAction();
    action.setId(10);
    action.setSendevent(sendEvent);

    processActionsForTracing(orchSpan, [action], "TestOrch", "source-orch-instance-42");
    orchSpan.end();

    const spans = exporter.getFinishedSpans();
    const eventSpan = spans.find((s: any) => s.name === "orchestration_event:TestEvent");
    expect(eventSpan).toBeDefined();
    expect(eventSpan!.attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBe("source-orch-instance-42");
    expect(eventSpan!.attributes[DurableTaskAttributes.EVENT_TARGET_INSTANCE_ID]).toBe("target-instance-99");
  });
});

describe("Retroactive span emission", () => {
  beforeEach(() => {
    exporter.reset();
  });

  describe("emitRetroactiveActivityClientSpan", () => {
    it("should emit a Client span with historical startTime for completed activities", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("parent-orch");
      const schedulingTime = new Date("2025-01-15T10:00:00Z");

      emitRetroactiveActivityClientSpan(
        orchSpan,
        "GetWeather",
        "1.0",
        "instance-abc",
        5,
        schedulingTime,
      );
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const clientSpan = spans.find((s: any) => s.name === "activity:GetWeather@(1.0)");
      expect(clientSpan).toBeDefined();
      expect(clientSpan!.kind).toBe(otel.SpanKind.CLIENT);
      expect(clientSpan!.attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.ACTIVITY);
      expect(clientSpan!.attributes[DurableTaskAttributes.TASK_NAME]).toBe("GetWeather");
      expect(clientSpan!.attributes[DurableTaskAttributes.TASK_VERSION]).toBe("1.0");
      expect(clientSpan!.attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBe("instance-abc");
      expect(clientSpan!.attributes[DurableTaskAttributes.TASK_TASK_ID]).toBe(5);
      // Verify historical startTime is used
      expect(clientSpan!.startTime[0]).toBe(Math.floor(schedulingTime.getTime() / 1000));
    });

    it("should set error status for failed activities", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("parent-orch");

      emitRetroactiveActivityClientSpan(
        orchSpan,
        "FailingTask",
        undefined,
        "instance-def",
        7,
        new Date(),
        "Task timed out",
      );
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const clientSpan = spans.find((s: any) => s.name === "activity:FailingTask");
      expect(clientSpan).toBeDefined();
      expect(clientSpan!.status.code).toBe(otel.SpanStatusCode.ERROR);
      expect(clientSpan!.status.message).toBe("Task timed out");
    });

    it("should work without version", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("parent-orch");

      emitRetroactiveActivityClientSpan(
        orchSpan,
        "SimpleTask",
        undefined,
        "instance-ghi",
        3,
      );
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const clientSpan = spans.find((s: any) => s.name === "activity:SimpleTask");
      expect(clientSpan).toBeDefined();
      expect(clientSpan!.attributes[DurableTaskAttributes.TASK_VERSION]).toBeUndefined();
    });
  });

  describe("emitRetroactiveSubOrchClientSpan", () => {
    it("should emit a Client span for completed sub-orchestrations", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("parent-orch");
      const schedulingTime = new Date("2025-02-20T14:30:00Z");

      emitRetroactiveSubOrchClientSpan(
        orchSpan,
        "ChildWorkflow",
        "2.0",
        "parent-instance",
        schedulingTime,
      );
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const clientSpan = spans.find((s: any) => s.name === "orchestration:ChildWorkflow@(2.0)");
      expect(clientSpan).toBeDefined();
      expect(clientSpan!.kind).toBe(otel.SpanKind.CLIENT);
      expect(clientSpan!.attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.ORCHESTRATION);
      expect(clientSpan!.attributes[DurableTaskAttributes.TASK_NAME]).toBe("ChildWorkflow");
      expect(clientSpan!.attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBe("parent-instance");
      expect(clientSpan!.startTime[0]).toBe(Math.floor(schedulingTime.getTime() / 1000));
    });

    it("should set error status for failed sub-orchestrations", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("parent-orch");

      emitRetroactiveSubOrchClientSpan(
        orchSpan,
        "FailingChild",
        undefined,
        "parent-instance",
        new Date(),
        "Sub-orchestration crashed",
      );
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const clientSpan = spans.find((s: any) => s.name === "orchestration:FailingChild");
      expect(clientSpan).toBeDefined();
      expect(clientSpan!.status.code).toBe(otel.SpanStatusCode.ERROR);
    });
  });

  describe("emitSpanForTimer with startTime", () => {
    it("should use historical startTime for timer spans", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("parent-orch");
      const creationTime = new Date("2025-03-01T08:00:00Z");
      const fireTime = new Date("2025-03-01T08:05:00Z");

      emitSpanForTimer(orchSpan, "TimerOrch", fireTime, 42, "timer-instance", creationTime);
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const timerSpan = spans.find((s: any) => s.name === "orchestration:TimerOrch:timer");
      expect(timerSpan).toBeDefined();
      expect(timerSpan!.kind).toBe(otel.SpanKind.INTERNAL);
      expect(timerSpan!.startTime[0]).toBe(Math.floor(creationTime.getTime() / 1000));
    });
  });

  describe("processNewEventsForTracing", () => {
    function makeHistoryEvent(eventId: number, timestampDate?: Date): pb.HistoryEvent {
      const event = new pb.HistoryEvent();
      event.setEventid(eventId);
      if (timestampDate) {
        const ts = new Timestamp();
        ts.fromDate(timestampDate);
        event.setTimestamp(ts);
      }
      return event;
    }

    it("should emit retroactive Client span for TaskCompleted", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("test-orch");
      const schedulingTime = new Date("2025-01-10T09:00:00Z");

      // Past event: TaskScheduled
      const pastEvent = makeHistoryEvent(1, schedulingTime);
      const taskScheduled = new pb.TaskScheduledEvent();
      taskScheduled.setName("ProcessData");
      pastEvent.setTaskscheduled(taskScheduled);

      // New event: TaskCompleted
      const newEvent = makeHistoryEvent(2);
      const taskCompleted = new pb.TaskCompletedEvent();
      taskCompleted.setTaskscheduledid(1);
      newEvent.setTaskcompleted(taskCompleted);

      processNewEventsForTracing(orchSpan, [pastEvent], [newEvent], "instance-123", "MainOrch");
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const clientSpan = spans.find((s: any) => s.name === "activity:ProcessData");
      expect(clientSpan).toBeDefined();
      expect(clientSpan!.kind).toBe(otel.SpanKind.CLIENT);
      expect(clientSpan!.attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBe("instance-123");
      expect(clientSpan!.startTime[0]).toBe(Math.floor(schedulingTime.getTime() / 1000));
    });

    it("should emit retroactive Client span with error for TaskFailed", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("test-orch");

      const pastEvent = makeHistoryEvent(3, new Date());
      const taskScheduled = new pb.TaskScheduledEvent();
      taskScheduled.setName("RiskyOperation");
      pastEvent.setTaskscheduled(taskScheduled);

      const newEvent = makeHistoryEvent(4);
      const taskFailed = new pb.TaskFailedEvent();
      taskFailed.setTaskscheduledid(3);
      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrormessage("Connection refused");
      taskFailed.setFailuredetails(failureDetails);
      newEvent.setTaskfailed(taskFailed);

      processNewEventsForTracing(orchSpan, [pastEvent], [newEvent], "instance-456", "MainOrch");
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const clientSpan = spans.find((s: any) => s.name === "activity:RiskyOperation");
      expect(clientSpan).toBeDefined();
      expect(clientSpan!.status.code).toBe(otel.SpanStatusCode.ERROR);
      expect(clientSpan!.status.message).toBe("Connection refused");
    });

    it("should emit retroactive Client span for SubOrchestrationCompleted", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("test-orch");
      const schedulingTime = new Date("2025-02-01T10:00:00Z");

      const pastEvent = makeHistoryEvent(5, schedulingTime);
      const subOrchCreated = new pb.SubOrchestrationInstanceCreatedEvent();
      subOrchCreated.setName("ChildWorkflow");
      pastEvent.setSuborchestrationinstancecreated(subOrchCreated);

      const newEvent = makeHistoryEvent(6);
      const subOrchCompleted = new pb.SubOrchestrationInstanceCompletedEvent();
      subOrchCompleted.setTaskscheduledid(5);
      newEvent.setSuborchestrationinstancecompleted(subOrchCompleted);

      processNewEventsForTracing(orchSpan, [pastEvent], [newEvent], "parent-789", "MainOrch");
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const clientSpan = spans.find((s: any) => s.name === "orchestration:ChildWorkflow");
      expect(clientSpan).toBeDefined();
      expect(clientSpan!.kind).toBe(otel.SpanKind.CLIENT);
      expect(clientSpan!.attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.ORCHESTRATION);
      expect(clientSpan!.startTime[0]).toBe(Math.floor(schedulingTime.getTime() / 1000));
    });

    it("should emit retroactive Client span with error for SubOrchestrationFailed", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("test-orch");

      const pastEvent = makeHistoryEvent(7, new Date());
      const subOrchCreated = new pb.SubOrchestrationInstanceCreatedEvent();
      subOrchCreated.setName("FailingChild");
      pastEvent.setSuborchestrationinstancecreated(subOrchCreated);

      const newEvent = makeHistoryEvent(8);
      const subOrchFailed = new pb.SubOrchestrationInstanceFailedEvent();
      subOrchFailed.setTaskscheduledid(7);
      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrormessage("Child orchestration crashed");
      subOrchFailed.setFailuredetails(failureDetails);
      newEvent.setSuborchestrationinstancefailed(subOrchFailed);

      processNewEventsForTracing(orchSpan, [pastEvent], [newEvent], "parent-xyz", "MainOrch");
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const clientSpan = spans.find((s: any) => s.name === "orchestration:FailingChild");
      expect(clientSpan).toBeDefined();
      expect(clientSpan!.status.code).toBe(otel.SpanStatusCode.ERROR);
    });

    it("should emit timer span with historical startTime for TimerFired", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("test-orch");
      const timerCreationTime = new Date("2025-03-01T12:00:00Z");
      const timerFireTime = new Date("2025-03-01T12:05:00Z");

      // Past event: TimerCreated
      const pastEvent = makeHistoryEvent(10, timerCreationTime);
      pastEvent.setTimercreated(new pb.TimerCreatedEvent());

      // New event: TimerFired
      const newEvent = makeHistoryEvent(11);
      const timerFired = new pb.TimerFiredEvent();
      timerFired.setTimerid(10);
      const fireAtTs = new Timestamp();
      fireAtTs.fromDate(timerFireTime);
      timerFired.setFireat(fireAtTs);
      newEvent.setTimerfired(timerFired);

      processNewEventsForTracing(orchSpan, [pastEvent], [newEvent], "timer-instance", "TimerOrch");
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const timerSpan = spans.find((s: any) => s.name === "orchestration:TimerOrch:timer");
      expect(timerSpan).toBeDefined();
      expect(timerSpan!.kind).toBe(otel.SpanKind.INTERNAL);
      expect(timerSpan!.attributes[DurableTaskAttributes.TASK_INSTANCE_ID]).toBe("timer-instance");
      expect(timerSpan!.startTime[0]).toBe(Math.floor(timerCreationTime.getTime() / 1000));
    });

    it("should handle multiple completions in a single batch", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("test-orch");

      // Two past TaskScheduled events
      const past1 = makeHistoryEvent(1, new Date("2025-01-01T10:00:00Z"));
      const ts1 = new pb.TaskScheduledEvent();
      ts1.setName("TaskA");
      past1.setTaskscheduled(ts1);

      const past2 = makeHistoryEvent(2, new Date("2025-01-01T10:01:00Z"));
      const ts2 = new pb.TaskScheduledEvent();
      ts2.setName("TaskB");
      past2.setTaskscheduled(ts2);

      // Two new TaskCompleted events
      const new1 = makeHistoryEvent(3);
      const tc1 = new pb.TaskCompletedEvent();
      tc1.setTaskscheduledid(1);
      new1.setTaskcompleted(tc1);

      const new2 = makeHistoryEvent(4);
      const tc2 = new pb.TaskCompletedEvent();
      tc2.setTaskscheduledid(2);
      new2.setTaskcompleted(tc2);

      processNewEventsForTracing(orchSpan, [past1, past2], [new1, new2], "batch-instance", "BatchOrch");
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      const taskASpan = spans.find((s: any) => s.name === "activity:TaskA");
      const taskBSpan = spans.find((s: any) => s.name === "activity:TaskB");
      expect(taskASpan).toBeDefined();
      expect(taskBSpan).toBeDefined();
    });

    it("should not emit spans when orchestration span is null", () => {
      const pastEvent = makeHistoryEvent(1, new Date());
      const taskScheduled = new pb.TaskScheduledEvent();
      taskScheduled.setName("Orphan");
      pastEvent.setTaskscheduled(taskScheduled);

      const newEvent = makeHistoryEvent(2);
      const taskCompleted = new pb.TaskCompletedEvent();
      taskCompleted.setTaskscheduledid(1);
      newEvent.setTaskcompleted(taskCompleted);

      processNewEventsForTracing(null, [pastEvent], [newEvent], "instance", "Orch");

      const spans = exporter.getFinishedSpans();
      expect(spans.find((s: any) => s.name === "activity:Orphan")).toBeUndefined();
    });

    it("should skip events with no matching past event", () => {
      const tracer = otel.trace.getTracer(TRACER_NAME);
      const orchSpan = tracer.startSpan("test-orch");

      // New event referencing non-existent past event
      const newEvent = makeHistoryEvent(2);
      const taskCompleted = new pb.TaskCompletedEvent();
      taskCompleted.setTaskscheduledid(999);
      newEvent.setTaskcompleted(taskCompleted);

      processNewEventsForTracing(orchSpan, [], [newEvent], "instance", "Orch");
      orchSpan.end();

      const spans = exporter.getFinishedSpans();
      // Only the parent orch span should exist
      expect(spans.length).toBe(1);
    });
  });
});
