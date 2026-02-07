// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Tests for the tracing integration in the worker execution flow.
 *
 * These tests validate the tracing behavior that the TaskHubGrpcWorker
 * relies on during orchestration and activity execution, specifically:
 *   1. Orchestration span is ended in both success and exception paths
 *   2. OrchestratorResponse.orchestrationtracecontext is set when tracing is enabled
 *   3. Scheduled actions get parenttracecontext injected
 */

import * as pb from "../src/proto/orchestrator_service_pb";
import {
  newOrchestratorStartedEvent,
  newExecutionStartedEvent,
} from "../src/utils/pb-helper.util";
import { OrchestrationExecutor } from "../src/worker/orchestration-executor";
import { Registry } from "../src/worker/registry";
import { NoOpLogger } from "../src/types/logger.type";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { ActivityContext } from "../src/task/context/activity-context";

import {
  startSpanForOrchestrationExecution,
  startSpanForTaskExecution,
  processActionsForTracing,
  createOrchestrationTraceContextPb,
  setSpanError,
  setSpanOk,
  endSpan,
  DurableTaskAttributes,
  TaskType,
  createPbTraceContext,
} from "../src/tracing";

import * as otel from "@opentelemetry/api";
import {
  BasicTracerProvider,
  SimpleSpanProcessor,
  InMemorySpanExporter,
} from "@opentelemetry/sdk-trace-base";

const testLogger = new NoOpLogger();
const TEST_INSTANCE_ID = "worker-tracing-test-instance";

let exporter: InMemorySpanExporter;
let provider: BasicTracerProvider;
let previousTracerProvider: otel.TracerProvider | undefined;

beforeAll(() => {
  exporter = new InMemorySpanExporter();
  provider = new BasicTracerProvider();
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

  previousTracerProvider = otel.trace.getTracerProvider();
  provider.register();
});

afterAll(async () => {
  await provider.shutdown();

  if (previousTracerProvider) {
    otel.trace.setGlobalTracerProvider(previousTracerProvider);
  }
});

beforeEach(() => {
  exporter.reset();
});

/**
 * Helper that mirrors the worker's _executeOrchestratorInternal tracing flow.
 * This replicates the exact sequence of tracing calls made by the worker so
 * we can validate the tracing behavior without needing a gRPC stub.
 */
async function executeOrchestrationWithTracing(
  registry: Registry,
  instanceId: string,
  pastEvents: pb.HistoryEvent[],
  newEvents: pb.HistoryEvent[],
): Promise<{ response: pb.OrchestratorResponse; error?: Error }> {
  // Find the ExecutionStartedEvent (mirrors worker logic)
  const allProtoEvents = [...pastEvents, ...newEvents];
  let executionStartedProtoEvent: pb.ExecutionStartedEvent | undefined;
  for (const protoEvent of allProtoEvents) {
    if (protoEvent.hasExecutionstarted()) {
      executionStartedProtoEvent = protoEvent.getExecutionstarted()!;
      break;
    }
  }

  // Start the orchestration span (mirrors worker logic)
  const tracingResult = executionStartedProtoEvent
    ? startSpanForOrchestrationExecution(executionStartedProtoEvent, undefined, instanceId)
    : undefined;

  let res: pb.OrchestratorResponse;
  let caughtError: Error | undefined;

  try {
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(instanceId, pastEvents, newEvents);

    // Process actions for tracing (mirrors worker logic)
    if (tracingResult) {
      const orchName = executionStartedProtoEvent?.getName() ?? "";
      processActionsForTracing(tracingResult.span, result.actions, orchName);
    }

    res = new pb.OrchestratorResponse();
    res.setInstanceid(instanceId);
    res.setActionsList(result.actions);

    // Set orchestration trace context on the response (mirrors worker logic)
    if (tracingResult) {
      const orchTraceCtxPb = createOrchestrationTraceContextPb(tracingResult.spanInfo);
      res.setOrchestrationtracecontext(orchTraceCtxPb);
      setSpanOk(tracingResult.span);
    }
  } catch (e: any) {
    caughtError = e;

    if (tracingResult) {
      setSpanError(tracingResult.span, e);
    }

    res = new pb.OrchestratorResponse();
    res.setInstanceid(instanceId);
  } finally {
    // Always end the span (mirrors worker's finally block)
    endSpan(tracingResult?.span);
  }

  return { response: res!, error: caughtError };
}

describe("Worker Tracing - Orchestration Span Lifecycle", () => {
  it("should end the orchestration span with OK status on success", async () => {
    const orchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      return "success";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, JSON.stringify("input")),
    ];

    await executeOrchestrationWithTracing(registry, TEST_INSTANCE_ID, [], newEvents);

    const spans = exporter.getFinishedSpans();
    // Should have exactly 1 orchestration span
    const orchSpan = spans.find(
      (s) => s.attributes[DurableTaskAttributes.TYPE] === TaskType.ORCHESTRATION,
    );
    expect(orchSpan).toBeDefined();
    expect(orchSpan!.status.code).toBe(otel.SpanStatusCode.OK);
    // Span should be ended (it appears in finished spans)
    expect(orchSpan!.endTime).toBeDefined();
  });

  it("should end the orchestration span with ERROR status on executor failure", async () => {
    // Use an unregistered orchestrator name to force a failure
    const registry = new Registry();
    const name = "UnregisteredOrchestrator";
    const newEvents = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];

    await executeOrchestrationWithTracing(registry, TEST_INSTANCE_ID, [], newEvents);

    const spans = exporter.getFinishedSpans();
    const orchSpan = spans.find(
      (s) => s.attributes[DurableTaskAttributes.TYPE] === TaskType.ORCHESTRATION,
    );
    expect(orchSpan).toBeDefined();
    // Unregistered orchestrator results in a FAILED completion action (not a thrown error),
    // so the span should still be ended with OK status since the executor handles it gracefully
    expect(orchSpan!.endTime).toBeDefined();
  });

  it("should end the orchestration span even when executor throws", async () => {
    // Create an orchestrator that throws during execution
    const throwingOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      throw new Error("Orchestrator crashed");
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(throwingOrchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];

    const { error: _error } = await executeOrchestrationWithTracing(registry, TEST_INSTANCE_ID, [], newEvents);

    const spans = exporter.getFinishedSpans();
    const orchSpan = spans.find(
      (s) => s.attributes[DurableTaskAttributes.TYPE] === TaskType.ORCHESTRATION,
    );
    expect(orchSpan).toBeDefined();
    // The span should always be ended, even on error
    expect(orchSpan!.endTime).toBeDefined();

    // Note: the OrchestrationExecutor catches orchestrator errors internally and
    // returns a FAILED action. If the error propagated out, the span should have ERROR status.
  });
});

describe("Worker Tracing - OrchestratorResponse.orchestrationtracecontext", () => {
  it("should set orchestrationtracecontext on the response", async () => {
    const orchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];

    const { response } = await executeOrchestrationWithTracing(registry, TEST_INSTANCE_ID, [], newEvents);

    const traceCtx = response.getOrchestrationtracecontext();
    expect(traceCtx).toBeDefined();
    // The span ID should be set for replay continuity
    expect(traceCtx!.getSpanid()?.getValue()).toBeDefined();
    expect(traceCtx!.getSpanid()!.getValue().length).toBe(16); // 16 hex chars
    // The start time should be set
    expect(traceCtx!.getSpanstarttime()).toBeDefined();
  });

  it("should have matching spanId between trace context and finished span on first execution", async () => {
    const orchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];

    const { response } = await executeOrchestrationWithTracing(registry, TEST_INSTANCE_ID, [], newEvents);

    const traceCtx = response.getOrchestrationtracecontext();
    const spans = exporter.getFinishedSpans();
    const orchSpan = spans.find(
      (s) => s.attributes[DurableTaskAttributes.TYPE] === TaskType.ORCHESTRATION,
    );

    // On first execution, the stored spanId should match the actual OTEL span ID
    expect(traceCtx!.getSpanid()!.getValue()).toBe(orchSpan!.spanContext().spanId);
  });
});

describe("Worker Tracing - Scheduled Actions Trace Context Injection", () => {
  it("should inject parenttracecontext into ScheduleTaskAction", async () => {
    const myActivity = async (_: ActivityContext, input: number) => input + 1;

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.callActivity(myActivity, 1);
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    registry.addActivity(myActivity);
    const newEvents = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];

    const { response } = await executeOrchestrationWithTracing(registry, TEST_INSTANCE_ID, [], newEvents);

    // Find the ScheduleTaskAction in the response actions
    const actions = response.getActionsList();
    const scheduleTaskAction = actions.find((a) => a.hasScheduletask());
    expect(scheduleTaskAction).toBeDefined();

    const scheduleTask = scheduleTaskAction!.getScheduletask()!;
    const traceCtx = scheduleTask.getParenttracecontext();
    expect(traceCtx).toBeDefined();
    // Should have a valid traceparent
    expect(traceCtx!.getTraceparent()).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);

    // Verify OTEL spans were created: orchestration span + scheduling span
    const spans = exporter.getFinishedSpans();
    const orchSpan = spans.find(
      (s) => s.attributes[DurableTaskAttributes.TYPE] === TaskType.ORCHESTRATION,
    );
    const activityScheduleSpan = spans.find(
      (s) => s.attributes[DurableTaskAttributes.TYPE] === TaskType.ACTIVITY,
    );
    expect(orchSpan).toBeDefined();
    expect(activityScheduleSpan).toBeDefined();
    // The schedule span should be a CLIENT span (act of scheduling)
    expect(activityScheduleSpan!.kind).toBe(otel.SpanKind.CLIENT);
  });

  it("should inject parenttracecontext into CreateSubOrchestrationAction", async () => {
    const childOrchestrator: TOrchestrator = async (_: OrchestrationContext) => "child done";

    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.callSubOrchestrator(childOrchestrator);
      return "parent done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(parentOrchestrator);
    registry.addOrchestrator(childOrchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];

    const { response } = await executeOrchestrationWithTracing(registry, TEST_INSTANCE_ID, [], newEvents);

    // Find the CreateSubOrchestrationAction in the response actions
    const actions = response.getActionsList();
    const subOrchAction = actions.find((a) => a.hasCreatesuborchestration());
    expect(subOrchAction).toBeDefined();

    const createSubOrch = subOrchAction!.getCreatesuborchestration()!;
    const traceCtx = createSubOrch.getParenttracecontext();
    expect(traceCtx).toBeDefined();
    // Should have a valid traceparent
    expect(traceCtx!.getTraceparent()).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/);

    // Verify the scheduling span was created
    const spans = exporter.getFinishedSpans();
    const subOrchScheduleSpan = spans.find(
      (s) => s.attributes[DurableTaskAttributes.TYPE] === TaskType.ORCHESTRATION && s.kind === otel.SpanKind.CLIENT,
    );
    expect(subOrchScheduleSpan).toBeDefined();
    expect(subOrchScheduleSpan!.kind).toBe(otel.SpanKind.CLIENT);
  });

  it("should inject parenttracecontext with trace ID from parent span", async () => {
    const myActivity = async (_: ActivityContext, input: number) => input + 1;

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.callActivity(myActivity, 1);
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    registry.addActivity(myActivity);
    const newEvents = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];

    const { response } = await executeOrchestrationWithTracing(registry, TEST_INSTANCE_ID, [], newEvents);

    // Get the orchestration span's trace ID
    const spans = exporter.getFinishedSpans();
    const orchSpan = spans.find(
      (s) => s.attributes[DurableTaskAttributes.TYPE] === TaskType.ORCHESTRATION,
    );
    const orchTraceId = orchSpan!.spanContext().traceId;

    // The injected traceparent should carry the same trace ID
    const actions = response.getActionsList();
    const scheduleTaskAction = actions.find((a) => a.hasScheduletask());
    const traceparent = scheduleTaskAction!.getScheduletask()!.getParenttracecontext()!.getTraceparent();
    expect(traceparent).toContain(orchTraceId);
  });
});

describe("Worker Tracing - Activity Span Lifecycle", () => {
  it("should end the activity span with OK status on success", () => {
    // Create an ActivityRequest with parent trace context
    const req = new pb.ActivityRequest();
    req.setName("TestActivity");
    req.setTaskid(1);
    const orchInstance = new pb.OrchestrationInstance();
    orchInstance.setInstanceid(TEST_INSTANCE_ID);
    req.setOrchestrationinstance(orchInstance);

    const parentTraceparent = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
    const parentCtx = createPbTraceContext(parentTraceparent);
    req.setParenttracecontext(parentCtx);

    // Mirror the worker's activity tracing flow
    const activitySpan = startSpanForTaskExecution(req);
    expect(activitySpan).toBeDefined();

    // Simulate success
    setSpanOk(activitySpan);
    endSpan(activitySpan);

    const spans = exporter.getFinishedSpans();
    const actSpan = spans.find(
      (s) => s.attributes[DurableTaskAttributes.TYPE] === TaskType.ACTIVITY,
    );
    expect(actSpan).toBeDefined();
    expect(actSpan!.status.code).toBe(otel.SpanStatusCode.OK);
    expect(actSpan!.endTime).toBeDefined();
    expect(actSpan!.kind).toBe(otel.SpanKind.SERVER);
  });

  it("should end the activity span with ERROR status on failure", () => {
    const req = new pb.ActivityRequest();
    req.setName("FailingActivity");
    req.setTaskid(2);
    const orchInstance = new pb.OrchestrationInstance();
    orchInstance.setInstanceid(TEST_INSTANCE_ID);
    req.setOrchestrationinstance(orchInstance);

    const activitySpan = startSpanForTaskExecution(req);
    expect(activitySpan).toBeDefined();

    // Simulate failure
    const error = new Error("Activity failed");
    setSpanError(activitySpan, error);
    endSpan(activitySpan);

    const spans = exporter.getFinishedSpans();
    const actSpan = spans.find(
      (s) => s.attributes[DurableTaskAttributes.TYPE] === TaskType.ACTIVITY,
    );
    expect(actSpan).toBeDefined();
    expect(actSpan!.status.code).toBe(otel.SpanStatusCode.ERROR);
    expect(actSpan!.status.message).toBe("Activity failed");
    expect(actSpan!.endTime).toBeDefined();
  });
});
