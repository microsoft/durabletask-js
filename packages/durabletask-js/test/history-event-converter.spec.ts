// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import * as pb from "../src/proto/orchestrator_service_pb";
import { convertProtoHistoryEvent } from "../src/utils/history-event-converter";
import { HistoryEventType } from "../src/orchestration/history-event";

/**
 * Helper function to create a mock Timestamp.
 */
function createMockTimestamp(date: Date): Timestamp {
  const timestamp = new Timestamp();
  timestamp.setSeconds(Math.floor(date.getTime() / 1000));
  timestamp.setNanos((date.getTime() % 1000) * 1000000);
  return timestamp;
}

/**
 * Helper function to create a mock StringValue.
 */
function createMockStringValue(value: string): StringValue {
  const stringValue = new StringValue();
  stringValue.setValue(value);
  return stringValue;
}

/**
 * Helper function to create a base HistoryEvent with common properties.
 */
function createBaseHistoryEvent(eventId: number, timestamp?: Date): pb.HistoryEvent {
  const event = new pb.HistoryEvent();
  event.setEventid(eventId);
  if (timestamp) {
    event.setTimestamp(createMockTimestamp(timestamp));
  }
  return event;
}

describe("convertProtoHistoryEvent", () => {
  describe("ExecutionStarted event", () => {
    it("should convert ExecutionStartedEvent with minimal fields", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(1, new Date("2024-01-01T00:00:00Z"));
      const executionStarted = new pb.ExecutionStartedEvent();
      executionStarted.setName("TestOrchestrator");
      protoEvent.setExecutionstarted(executionStarted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.ExecutionStarted);
      expect(result?.eventId).toBe(1);
      if (result?.type === HistoryEventType.ExecutionStarted) {
        expect(result.name).toBe("TestOrchestrator");
      }
    });

    it("should convert ExecutionStartedEvent with all fields", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(1, new Date("2024-01-01T00:00:00Z"));
      const executionStarted = new pb.ExecutionStartedEvent();
      executionStarted.setName("TestOrchestrator");
      executionStarted.setVersion(createMockStringValue("1.0"));
      executionStarted.setInput(createMockStringValue(JSON.stringify({ data: "test" })));

      const orchInstance = new pb.OrchestrationInstance();
      orchInstance.setInstanceid("instance-123");
      orchInstance.setExecutionid(createMockStringValue("exec-456"));
      executionStarted.setOrchestrationinstance(orchInstance);

      const scheduledTime = createMockTimestamp(new Date("2024-01-01T01:00:00Z"));
      executionStarted.setScheduledstarttimestamp(scheduledTime);

      protoEvent.setExecutionstarted(executionStarted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.ExecutionStarted);
      if (result?.type === HistoryEventType.ExecutionStarted) {
        expect(result.name).toBe("TestOrchestrator");
        expect(result.version).toBe("1.0");
        expect(result.input).toBe(JSON.stringify({ data: "test" }));
        expect(result.orchestrationInstance?.instanceId).toBe("instance-123");
        expect(result.orchestrationInstance?.executionId).toBe("exec-456");
        expect(result.scheduledStartTimestamp).toBeDefined();
      }
    });

    it("should return undefined when ExecutionStartedEvent is not set", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(1, new Date("2024-01-01T00:00:00Z"));
      protoEvent.clearExecutionstarted();
      // Force the event type case to EXECUTIONSTARTED but don't set the event
      (protoEvent as any).getEventtypeCase = () => pb.HistoryEvent.EventtypeCase.EXECUTIONSTARTED;
      (protoEvent as any).getExecutionstarted = () => undefined;

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("ExecutionCompleted event", () => {
    it("should convert ExecutionCompletedEvent with success result", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(2, new Date("2024-01-01T00:01:00Z"));
      const executionCompleted = new pb.ExecutionCompletedEvent();
      executionCompleted.setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      executionCompleted.setResult(createMockStringValue(JSON.stringify({ result: "success" })));
      protoEvent.setExecutioncompleted(executionCompleted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.ExecutionCompleted);
      if (result?.type === HistoryEventType.ExecutionCompleted) {
        expect(result.orchestrationStatus).toBe("ORCHESTRATION_STATUS_COMPLETED");
        expect(result.result).toBe(JSON.stringify({ result: "success" }));
        expect(result.failureDetails).toBeUndefined();
      }
    });

    it("should convert ExecutionCompletedEvent with failure details", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(2, new Date("2024-01-01T00:01:00Z"));
      const executionCompleted = new pb.ExecutionCompletedEvent();
      executionCompleted.setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("TestError");
      failureDetails.setErrormessage("Test error message");
      failureDetails.setStacktrace(createMockStringValue("Error stack trace"));
      executionCompleted.setFailuredetails(failureDetails);
      protoEvent.setExecutioncompleted(executionCompleted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.ExecutionCompleted);
      if (result?.type === HistoryEventType.ExecutionCompleted) {
        expect(result.orchestrationStatus).toBe("ORCHESTRATION_STATUS_FAILED");
        expect(result.failureDetails).toBeDefined();
        expect(result.failureDetails?.errorType).toBe("TestError");
        expect(result.failureDetails?.message).toBe("Test error message");
        expect(result.failureDetails?.stackTrace).toBe("Error stack trace");
      }
    });
  });

  describe("ExecutionTerminated event", () => {
    it("should convert ExecutionTerminatedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(3, new Date("2024-01-01T00:02:00Z"));
      const executionTerminated = new pb.ExecutionTerminatedEvent();
      executionTerminated.setInput(createMockStringValue("Terminated reason"));
      executionTerminated.setRecurse(true);
      protoEvent.setExecutionterminated(executionTerminated);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.ExecutionTerminated);
      if (result?.type === HistoryEventType.ExecutionTerminated) {
        expect(result.input).toBe("Terminated reason");
        expect(result.recurse).toBe(true);
      }
    });
  });

  describe("ExecutionSuspended event", () => {
    it("should convert ExecutionSuspendedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(4, new Date("2024-01-01T00:03:00Z"));
      const executionSuspended = new pb.ExecutionSuspendedEvent();
      executionSuspended.setInput(createMockStringValue("Suspended reason"));
      protoEvent.setExecutionsuspended(executionSuspended);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.ExecutionSuspended);
      if (result?.type === HistoryEventType.ExecutionSuspended) {
        expect(result.input).toBe("Suspended reason");
      }
    });
  });

  describe("ExecutionResumed event", () => {
    it("should convert ExecutionResumedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(5, new Date("2024-01-01T00:04:00Z"));
      const executionResumed = new pb.ExecutionResumedEvent();
      executionResumed.setInput(createMockStringValue("Resumed reason"));
      protoEvent.setExecutionresumed(executionResumed);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.ExecutionResumed);
      if (result?.type === HistoryEventType.ExecutionResumed) {
        expect(result.input).toBe("Resumed reason");
      }
    });
  });

  describe("ExecutionRewound event", () => {
    it("should convert ExecutionRewoundEvent with all fields", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(6, new Date("2024-01-01T00:05:00Z"));
      const executionRewound = new pb.ExecutionRewoundEvent();
      executionRewound.setReason(createMockStringValue("Rewind reason"));
      executionRewound.setParentexecutionid(createMockStringValue("parent-exec-123"));
      executionRewound.setInstanceid(createMockStringValue("instance-123"));
      executionRewound.setName(createMockStringValue("TestOrchestrator"));
      executionRewound.setVersion(createMockStringValue("1.0"));
      executionRewound.setInput(createMockStringValue(JSON.stringify({ data: "rewound" })));

      const traceContext = new pb.TraceContext();
      traceContext.setTraceparent("00-trace-123");
      traceContext.setSpanid("span-456");
      traceContext.setTracestate(createMockStringValue("state=value"));
      executionRewound.setParenttracecontext(traceContext);

      protoEvent.setExecutionrewound(executionRewound);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.ExecutionRewound);
      if (result?.type === HistoryEventType.ExecutionRewound) {
        expect(result.reason).toBe("Rewind reason");
        expect(result.parentExecutionId).toBe("parent-exec-123");
        expect(result.instanceId).toBe("instance-123");
        expect(result.name).toBe("TestOrchestrator");
        expect(result.version).toBe("1.0");
        expect(result.input).toBe(JSON.stringify({ data: "rewound" }));
        expect(result.parentTraceContext?.traceParent).toBe("00-trace-123");
        expect(result.parentTraceContext?.spanId).toBe("span-456");
        expect(result.parentTraceContext?.traceState).toBe("state=value");
      }
    });
  });

  describe("TaskScheduled event", () => {
    it("should convert TaskScheduledEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(7, new Date("2024-01-01T00:06:00Z"));
      const taskScheduled = new pb.TaskScheduledEvent();
      taskScheduled.setName("TestActivity");
      taskScheduled.setVersion(createMockStringValue("2.0"));
      taskScheduled.setInput(createMockStringValue(JSON.stringify({ param: "value" })));
      protoEvent.setTaskscheduled(taskScheduled);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.TaskScheduled);
      if (result?.type === HistoryEventType.TaskScheduled) {
        expect(result.name).toBe("TestActivity");
        expect(result.version).toBe("2.0");
        expect(result.input).toBe(JSON.stringify({ param: "value" }));
      }
    });
  });

  describe("TaskCompleted event", () => {
    it("should convert TaskCompletedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(8, new Date("2024-01-01T00:07:00Z"));
      const taskCompleted = new pb.TaskCompletedEvent();
      taskCompleted.setTaskscheduledid(7);
      taskCompleted.setResult(createMockStringValue(JSON.stringify({ output: "done" })));
      protoEvent.setTaskcompleted(taskCompleted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.TaskCompleted);
      if (result?.type === HistoryEventType.TaskCompleted) {
        expect(result.taskScheduledId).toBe(7);
        expect(result.result).toBe(JSON.stringify({ output: "done" }));
      }
    });
  });

  describe("TaskFailed event", () => {
    it("should convert TaskFailedEvent with failure details", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(9, new Date("2024-01-01T00:08:00Z"));
      const taskFailed = new pb.TaskFailedEvent();
      taskFailed.setTaskscheduledid(7);

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("ActivityError");
      failureDetails.setErrormessage("Activity failed");
      taskFailed.setFailuredetails(failureDetails);
      protoEvent.setTaskfailed(taskFailed);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.TaskFailed);
      if (result?.type === HistoryEventType.TaskFailed) {
        expect(result.taskScheduledId).toBe(7);
        expect(result.failureDetails?.errorType).toBe("ActivityError");
        expect(result.failureDetails?.message).toBe("Activity failed");
      }
    });
  });

  describe("SubOrchestrationInstanceCreated event", () => {
    it("should convert SubOrchestrationInstanceCreatedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(10, new Date("2024-01-01T00:09:00Z"));
      const subOrchCreated = new pb.SubOrchestrationInstanceCreatedEvent();
      subOrchCreated.setName("SubOrchestrator");
      subOrchCreated.setInstanceid("sub-instance-123");
      subOrchCreated.setVersion(createMockStringValue("1.0"));
      subOrchCreated.setInput(createMockStringValue(JSON.stringify({ subInput: "data" })));
      protoEvent.setSuborchestrationinstancecreated(subOrchCreated);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.SubOrchestrationInstanceCreated);
      if (result?.type === HistoryEventType.SubOrchestrationInstanceCreated) {
        expect(result.name).toBe("SubOrchestrator");
        expect(result.instanceId).toBe("sub-instance-123");
        expect(result.version).toBe("1.0");
        expect(result.input).toBe(JSON.stringify({ subInput: "data" }));
      }
    });
  });

  describe("SubOrchestrationInstanceCompleted event", () => {
    it("should convert SubOrchestrationInstanceCompletedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(11, new Date("2024-01-01T00:10:00Z"));
      const subOrchCompleted = new pb.SubOrchestrationInstanceCompletedEvent();
      subOrchCompleted.setTaskscheduledid(10);
      subOrchCompleted.setResult(createMockStringValue(JSON.stringify({ subResult: "completed" })));
      protoEvent.setSuborchestrationinstancecompleted(subOrchCompleted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.SubOrchestrationInstanceCompleted);
      if (result?.type === HistoryEventType.SubOrchestrationInstanceCompleted) {
        expect(result.taskScheduledId).toBe(10);
        expect(result.result).toBe(JSON.stringify({ subResult: "completed" }));
      }
    });
  });

  describe("SubOrchestrationInstanceFailed event", () => {
    it("should convert SubOrchestrationInstanceFailedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(12, new Date("2024-01-01T00:11:00Z"));
      const subOrchFailed = new pb.SubOrchestrationInstanceFailedEvent();
      subOrchFailed.setTaskscheduledid(10);

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("SubOrchestrationError");
      failureDetails.setErrormessage("Sub-orchestration failed");
      subOrchFailed.setFailuredetails(failureDetails);
      protoEvent.setSuborchestrationinstancefailed(subOrchFailed);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.SubOrchestrationInstanceFailed);
      if (result?.type === HistoryEventType.SubOrchestrationInstanceFailed) {
        expect(result.taskScheduledId).toBe(10);
        expect(result.failureDetails?.errorType).toBe("SubOrchestrationError");
        expect(result.failureDetails?.message).toBe("Sub-orchestration failed");
      }
    });
  });

  describe("TimerCreated event", () => {
    it("should convert TimerCreatedEvent", () => {
      // Arrange
      const fireAt = new Date("2024-01-01T01:00:00Z");
      const protoEvent = createBaseHistoryEvent(13, new Date("2024-01-01T00:12:00Z"));
      const timerCreated = new pb.TimerCreatedEvent();
      timerCreated.setFireat(createMockTimestamp(fireAt));
      protoEvent.setTimercreated(timerCreated);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.TimerCreated);
      if (result?.type === HistoryEventType.TimerCreated) {
        expect(result.fireAt.getTime()).toBe(fireAt.getTime());
      }
    });

    it("should use default date when fireAt is not set", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(13, new Date("2024-01-01T00:12:00Z"));
      const timerCreated = new pb.TimerCreatedEvent();
      protoEvent.setTimercreated(timerCreated);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.TimerCreated);
      if (result?.type === HistoryEventType.TimerCreated) {
        expect(result.fireAt.getTime()).toBe(new Date(0).getTime());
      }
    });
  });

  describe("TimerFired event", () => {
    it("should convert TimerFiredEvent", () => {
      // Arrange
      const fireAt = new Date("2024-01-01T01:00:00Z");
      const protoEvent = createBaseHistoryEvent(14, new Date("2024-01-01T01:00:00Z"));
      const timerFired = new pb.TimerFiredEvent();
      timerFired.setFireat(createMockTimestamp(fireAt));
      timerFired.setTimerid(13);
      protoEvent.setTimerfired(timerFired);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.TimerFired);
      if (result?.type === HistoryEventType.TimerFired) {
        expect(result.fireAt.getTime()).toBe(fireAt.getTime());
        expect(result.timerId).toBe(13);
      }
    });
  });

  describe("OrchestratorStarted event", () => {
    it("should convert OrchestratorStartedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(15, new Date("2024-01-01T00:14:00Z"));
      const orchestratorStarted = new pb.OrchestratorStartedEvent();
      protoEvent.setOrchestratorstarted(orchestratorStarted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.OrchestratorStarted);
      expect(result?.eventId).toBe(15);
    });
  });

  describe("OrchestratorCompleted event", () => {
    it("should convert OrchestratorCompletedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(16, new Date("2024-01-01T00:15:00Z"));
      const orchestratorCompleted = new pb.OrchestratorCompletedEvent();
      protoEvent.setOrchestratorcompleted(orchestratorCompleted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.OrchestratorCompleted);
      expect(result?.eventId).toBe(16);
    });
  });

  describe("EventSent event", () => {
    it("should convert EventSentEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(17, new Date("2024-01-01T00:16:00Z"));
      const eventSent = new pb.EventSentEvent();
      eventSent.setName("TestEvent");
      eventSent.setInstanceid("target-instance-123");
      eventSent.setInput(createMockStringValue(JSON.stringify({ eventData: "payload" })));
      protoEvent.setEventsent(eventSent);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.EventSent);
      if (result?.type === HistoryEventType.EventSent) {
        expect(result.name).toBe("TestEvent");
        expect(result.instanceId).toBe("target-instance-123");
        expect(result.input).toBe(JSON.stringify({ eventData: "payload" }));
      }
    });
  });

  describe("EventRaised event", () => {
    it("should convert EventRaisedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(18, new Date("2024-01-01T00:17:00Z"));
      const eventRaised = new pb.EventRaisedEvent();
      eventRaised.setName("ReceivedEvent");
      eventRaised.setInput(createMockStringValue(JSON.stringify({ received: "data" })));
      protoEvent.setEventraised(eventRaised);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.EventRaised);
      if (result?.type === HistoryEventType.EventRaised) {
        expect(result.name).toBe("ReceivedEvent");
        expect(result.input).toBe(JSON.stringify({ received: "data" }));
      }
    });
  });

  describe("GenericEvent event", () => {
    it("should convert GenericEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(19, new Date("2024-01-01T00:18:00Z"));
      const genericEvent = new pb.GenericEvent();
      genericEvent.setData(createMockStringValue(JSON.stringify({ generic: "data" })));
      protoEvent.setGenericevent(genericEvent);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.GenericEvent);
      if (result?.type === HistoryEventType.GenericEvent) {
        expect(result.data).toBe(JSON.stringify({ generic: "data" }));
      }
    });
  });

  describe("HistoryState event", () => {
    it("should convert HistoryStateEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(20, new Date("2024-01-01T00:19:00Z"));
      const historyState = new pb.HistoryStateEvent();
      protoEvent.setHistorystate(historyState);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.HistoryState);
      expect(result?.eventId).toBe(20);
    });
  });

  describe("ContinueAsNew event", () => {
    it("should convert ContinueAsNewEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(21, new Date("2024-01-01T00:20:00Z"));
      const continueAsNew = new pb.ContinueAsNewEvent();
      continueAsNew.setInput(createMockStringValue(JSON.stringify({ newInput: "data" })));
      protoEvent.setContinueasnew(continueAsNew);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.ContinueAsNew);
      if (result?.type === HistoryEventType.ContinueAsNew) {
        expect(result.input).toBe(JSON.stringify({ newInput: "data" }));
      }
    });
  });

  describe("EntityOperationSignaled event", () => {
    it("should convert EntityOperationSignaledEvent", () => {
      // Arrange
      const scheduledTime = new Date("2024-01-01T02:00:00Z");
      const protoEvent = createBaseHistoryEvent(22, new Date("2024-01-01T00:21:00Z"));
      const entityOpSignaled = new pb.EntityOperationSignaledEvent();
      entityOpSignaled.setRequestid("request-123");
      entityOpSignaled.setOperation("testOperation");
      entityOpSignaled.setTargetinstanceid(createMockStringValue("entity-instance-456"));
      entityOpSignaled.setScheduledtime(createMockTimestamp(scheduledTime));
      entityOpSignaled.setInput(createMockStringValue(JSON.stringify({ signal: "data" })));
      protoEvent.setEntityoperationsignaled(entityOpSignaled);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.EntityOperationSignaled);
      if (result?.type === HistoryEventType.EntityOperationSignaled) {
        expect(result.requestId).toBe("request-123");
        expect(result.operation).toBe("testOperation");
        expect(result.targetInstanceId).toBe("entity-instance-456");
        expect(result.scheduledTime?.getTime()).toBe(scheduledTime.getTime());
        expect(result.input).toBe(JSON.stringify({ signal: "data" }));
      }
    });
  });

  describe("EntityOperationCalled event", () => {
    it("should convert EntityOperationCalledEvent", () => {
      // Arrange
      const scheduledTime = new Date("2024-01-01T02:00:00Z");
      const protoEvent = createBaseHistoryEvent(23, new Date("2024-01-01T00:22:00Z"));
      const entityOpCalled = new pb.EntityOperationCalledEvent();
      entityOpCalled.setRequestid("request-456");
      entityOpCalled.setOperation("callOperation");
      entityOpCalled.setTargetinstanceid(createMockStringValue("entity-target-789"));
      entityOpCalled.setParentinstanceid(createMockStringValue("parent-instance-123"));
      entityOpCalled.setScheduledtime(createMockTimestamp(scheduledTime));
      entityOpCalled.setInput(createMockStringValue(JSON.stringify({ call: "data" })));
      protoEvent.setEntityoperationcalled(entityOpCalled);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.EntityOperationCalled);
      if (result?.type === HistoryEventType.EntityOperationCalled) {
        expect(result.requestId).toBe("request-456");
        expect(result.operation).toBe("callOperation");
        expect(result.targetInstanceId).toBe("entity-target-789");
        expect(result.parentInstanceId).toBe("parent-instance-123");
        expect(result.scheduledTime?.getTime()).toBe(scheduledTime.getTime());
        expect(result.input).toBe(JSON.stringify({ call: "data" }));
      }
    });
  });

  describe("EntityOperationCompleted event", () => {
    it("should convert EntityOperationCompletedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(24, new Date("2024-01-01T00:23:00Z"));
      const entityOpCompleted = new pb.EntityOperationCompletedEvent();
      entityOpCompleted.setRequestid("request-789");
      entityOpCompleted.setOutput(createMockStringValue(JSON.stringify({ output: "result" })));
      protoEvent.setEntityoperationcompleted(entityOpCompleted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.EntityOperationCompleted);
      if (result?.type === HistoryEventType.EntityOperationCompleted) {
        expect(result.requestId).toBe("request-789");
        expect(result.output).toBe(JSON.stringify({ output: "result" }));
      }
    });
  });

  describe("EntityOperationFailed event", () => {
    it("should convert EntityOperationFailedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(25, new Date("2024-01-01T00:24:00Z"));
      const entityOpFailed = new pb.EntityOperationFailedEvent();
      entityOpFailed.setRequestid("request-failed-123");

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("EntityError");
      failureDetails.setErrormessage("Entity operation failed");
      entityOpFailed.setFailuredetails(failureDetails);
      protoEvent.setEntityoperationfailed(entityOpFailed);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.EntityOperationFailed);
      if (result?.type === HistoryEventType.EntityOperationFailed) {
        expect(result.requestId).toBe("request-failed-123");
        expect(result.failureDetails?.errorType).toBe("EntityError");
        expect(result.failureDetails?.message).toBe("Entity operation failed");
      }
    });
  });

  describe("EntityLockRequested event", () => {
    it("should convert EntityLockRequestedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(26, new Date("2024-01-01T00:25:00Z"));
      const entityLockRequested = new pb.EntityLockRequestedEvent();
      entityLockRequested.setCriticalsectionid("critical-section-123");
      entityLockRequested.setLocksetList(["entity1", "entity2", "entity3"]);
      entityLockRequested.setPosition(2);
      entityLockRequested.setParentinstanceid(createMockStringValue("parent-orch-456"));
      protoEvent.setEntitylockrequested(entityLockRequested);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.EntityLockRequested);
      if (result?.type === HistoryEventType.EntityLockRequested) {
        expect(result.criticalSectionId).toBe("critical-section-123");
        expect(result.lockSet).toEqual(["entity1", "entity2", "entity3"]);
        expect(result.position).toBe(2);
        expect(result.parentInstanceId).toBe("parent-orch-456");
      }
    });
  });

  describe("EntityLockGranted event", () => {
    it("should convert EntityLockGrantedEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(27, new Date("2024-01-01T00:26:00Z"));
      const entityLockGranted = new pb.EntityLockGrantedEvent();
      entityLockGranted.setCriticalsectionid("critical-section-granted-123");
      protoEvent.setEntitylockgranted(entityLockGranted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.EntityLockGranted);
      if (result?.type === HistoryEventType.EntityLockGranted) {
        expect(result.criticalSectionId).toBe("critical-section-granted-123");
      }
    });
  });

  describe("EntityUnlockSent event", () => {
    it("should convert EntityUnlockSentEvent", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(28, new Date("2024-01-01T00:27:00Z"));
      const entityUnlockSent = new pb.EntityUnlockSentEvent();
      entityUnlockSent.setCriticalsectionid("critical-section-unlock-123");
      entityUnlockSent.setParentinstanceid(createMockStringValue("parent-unlock-456"));
      entityUnlockSent.setTargetinstanceid(createMockStringValue("target-entity-789"));
      protoEvent.setEntityunlocksent(entityUnlockSent);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.type).toBe(HistoryEventType.EntityUnlockSent);
      if (result?.type === HistoryEventType.EntityUnlockSent) {
        expect(result.criticalSectionId).toBe("critical-section-unlock-123");
        expect(result.parentInstanceId).toBe("parent-unlock-456");
        expect(result.targetInstanceId).toBe("target-entity-789");
      }
    });
  });

  describe("Unknown event type", () => {
    it("should return undefined for unknown event type", () => {
      // Arrange
      const protoEvent = createBaseHistoryEvent(99, new Date("2024-01-01T00:00:00Z"));
      // Don't set any event type

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("Timestamp handling", () => {
    it("should use default date when timestamp is not set", () => {
      // Arrange
      const protoEvent = new pb.HistoryEvent();
      protoEvent.setEventid(1);
      const executionStarted = new pb.ExecutionStartedEvent();
      executionStarted.setName("TestOrchestrator");
      protoEvent.setExecutionstarted(executionStarted);

      // Act
      const result = convertProtoHistoryEvent(protoEvent);

      // Assert
      expect(result).toBeDefined();
      expect(result?.timestamp.getTime()).toBe(new Date(0).getTime());
    });
  });
});
