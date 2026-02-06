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
    expect(createTimerSpanName("MyOrch")).toBe("timer:MyOrch");
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
    expect(spans[0].attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.CREATE_ORCHESTRATION);
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
  it("should create spans for ScheduleTaskAction", () => {
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
    // Should have parent + child (schedule task)
    expect(spans.length).toBe(2);

    const childSpan = spans.find((s: any) => s.name === "activity:MyActivity");
    expect(childSpan).toBeDefined();
    expect(childSpan!.kind).toBe(otel.SpanKind.CLIENT);

    // Trace context should have been injected into the action
    const traceCtx = scheduleTask.getParenttracecontext();
    expect(traceCtx).toBeDefined();
    expect(traceCtx!.getTraceparent()).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);
  });

  it("should create spans for CreateSubOrchestrationAction", () => {
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
    const childSpan = spans.find((s: any) => s.name === "create_orchestration:SubOrch");
    expect(childSpan).toBeDefined();
    expect(childSpan!.kind).toBe(otel.SpanKind.CLIENT);
  });

  it("should create spans for CreateTimerAction", () => {
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
    const timerSpan = spans.find((s: any) => s.name === "timer:MyOrchestration");
    expect(timerSpan).toBeDefined();
    expect(timerSpan!.kind).toBe(otel.SpanKind.INTERNAL);
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
    expect(eventSpan!.attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.ORCHESTRATION_EVENT);
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
    const timerSpan = spans.find((s: any) => s.name === "timer:TimerOrch");
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
    expect(eventSpan!.attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.ORCHESTRATION_EVENT);
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
    expect(spans[0].attributes[DurableTaskAttributes.TYPE]).toBe(TaskType.ORCHESTRATION_EVENT);
    expect(spans[0].attributes[DurableTaskAttributes.TASK_NAME]).toBe("MyEvent");
    expect(spans[0].attributes[DurableTaskAttributes.EVENT_TARGET_INSTANCE_ID]).toBe("target-instance-42");
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
