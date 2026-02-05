// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export { TRACER_NAME, DurableTaskAttributes, TaskType, createSpanName, createTimerSpanName } from "./constants";

export {
  parseTraceparent,
  createTraceparent,
  generateSpanId,
  createPbTraceContext,
  getOtelApi,
  extractTraceparentFromSpan,
  createParentContextFromPb,
} from "./trace-context-utils";

export {
  getTracer,
  OrchestrationSpanInfo,
  startSpanForNewOrchestration,
  startSpanForOrchestrationExecution,
  startSpanForSchedulingTask,
  startSpanForTaskExecution,
  startSpanForSchedulingSubOrchestration,
  emitSpanForTimer,
  emitSpanForEventSent,
  startSpanForEventRaisedFromClient,
  setSpanError,
  setSpanOk,
  endSpan,
  createOrchestrationTraceContextPb,
  processActionsForTracing,
} from "./trace-helper";
