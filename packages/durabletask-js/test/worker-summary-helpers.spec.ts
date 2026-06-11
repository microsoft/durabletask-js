// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { getNewEventSummary, getActionSummary, getMethodNameForAction } from "../src/worker/index";
import * as pb from "../src/proto/orchestrator_service_pb";

describe("getNewEventSummary", () => {
  it("should return '[]' for empty array", () => {
    expect(getNewEventSummary([])).toBe("[]");
  });

  it("should return '[]' for undefined-like input", () => {
    expect(getNewEventSummary(undefined as never)).toBe("[]");
    expect(getNewEventSummary(null as never)).toBe("[]");
  });

  it("should return event type name for a single event", () => {
    const event = new pb.HistoryEvent();
    event.setTimerfired(new pb.TimerFiredEvent());
    expect(getNewEventSummary([event])).toBe("[TIMERFIRED]");
  });

  it("should return enum key name for event with EVENTTYPE_NOT_SET", () => {
    const event = new pb.HistoryEvent();
    // Event with no type set → getEventtypeCase() returns EVENTTYPE_NOT_SET (0)
    expect(getNewEventSummary([event])).toBe("[EVENTTYPE_NOT_SET]");
  });

  it("should return 'UNKNOWN' for a single event with unrecognized type value", () => {
    const event = new pb.HistoryEvent();
    // Simulate a future/unknown event type by stubbing getEventtypeCase
    jest.spyOn(event, "getEventtypeCase").mockReturnValue(9999 as pb.HistoryEvent.EventtypeCase);
    expect(getNewEventSummary([event])).toBe("[UNKNOWN]");
  });

  it("should return counts for multiple events of the same type", () => {
    const event1 = new pb.HistoryEvent();
    event1.setTaskcompleted(new pb.TaskCompletedEvent());
    const event2 = new pb.HistoryEvent();
    event2.setTaskcompleted(new pb.TaskCompletedEvent());

    expect(getNewEventSummary([event1, event2])).toBe("[TASKCOMPLETED=2]");
  });

  it("should return counts for multiple events of different types", () => {
    const event1 = new pb.HistoryEvent();
    event1.setTimerfired(new pb.TimerFiredEvent());
    const event2 = new pb.HistoryEvent();
    event2.setTaskcompleted(new pb.TaskCompletedEvent());
    const event3 = new pb.HistoryEvent();
    event3.setTimerfired(new pb.TimerFiredEvent());

    const result = getNewEventSummary([event1, event2, event3]);
    expect(result).toBe("[TIMERFIRED=2, TASKCOMPLETED=1]");
  });

  it("should use 'UNKNOWN' for unrecognized types in multi-event path", () => {
    const event1 = new pb.HistoryEvent();
    jest.spyOn(event1, "getEventtypeCase").mockReturnValue(9999 as pb.HistoryEvent.EventtypeCase);
    const event2 = new pb.HistoryEvent();
    event2.setTaskcompleted(new pb.TaskCompletedEvent());

    const result = getNewEventSummary([event1, event2]);
    expect(result).toBe("[UNKNOWN=1, TASKCOMPLETED=1]");
  });
});

describe("getActionSummary", () => {
  it("should return '[]' for empty array", () => {
    expect(getActionSummary([])).toBe("[]");
  });

  it("should return '[]' for undefined-like input", () => {
    expect(getActionSummary(undefined as never)).toBe("[]");
    expect(getActionSummary(null as never)).toBe("[]");
  });

  it("should return action type name for a single action", () => {
    const action = new pb.OrchestratorAction();
    action.setScheduletask(new pb.ScheduleTaskAction());
    expect(getActionSummary([action])).toBe("SCHEDULETASK");
  });

  it("should return 'UNKNOWN' for a single action with unrecognized type", () => {
    const action = new pb.OrchestratorAction();
    jest.spyOn(action, "getOrchestratoractiontypeCase").mockReturnValue(9999 as pb.OrchestratorAction.OrchestratoractiontypeCase);
    expect(getActionSummary([action])).toBe("UNKNOWN");
  });

  it("should return counts for multiple actions", () => {
    const action1 = new pb.OrchestratorAction();
    action1.setScheduletask(new pb.ScheduleTaskAction());
    const action2 = new pb.OrchestratorAction();
    action2.setCreatetimer(new pb.CreateTimerAction());
    const action3 = new pb.OrchestratorAction();
    action3.setScheduletask(new pb.ScheduleTaskAction());

    const result = getActionSummary([action1, action2, action3]);
    expect(result).toBe("[SCHEDULETASK=2, CREATETIMER=1]");
  });
});

describe("getMethodNameForAction", () => {
  it("should return 'callActivity' for SCHEDULETASK", () => {
    const action = new pb.OrchestratorAction();
    action.setScheduletask(new pb.ScheduleTaskAction());
    expect(getMethodNameForAction(action)).toBe("callActivity");
  });

  it("should return 'createTimer' for CREATETIMER", () => {
    const action = new pb.OrchestratorAction();
    action.setCreatetimer(new pb.CreateTimerAction());
    expect(getMethodNameForAction(action)).toBe("createTimer");
  });

  it("should return 'callSubOrchestrator' for CREATESUBORCHESTRATION", () => {
    const action = new pb.OrchestratorAction();
    action.setCreatesuborchestration(new pb.CreateSubOrchestrationAction());
    expect(getMethodNameForAction(action)).toBe("callSubOrchestrator");
  });

  it("should return 'completeOrchestration' for COMPLETEORCHESTRATION", () => {
    const action = new pb.OrchestratorAction();
    action.setCompleteorchestration(new pb.CompleteOrchestrationAction());
    expect(getMethodNameForAction(action)).toBe("completeOrchestration");
  });

  it("should throw for unrecognized action type", () => {
    const action = new pb.OrchestratorAction();
    // No action type set → ORCHESTRATORACTIONTYPE_NOT_SET (0)
    expect(() => getMethodNameForAction(action)).toThrow("Unknown action type");
  });
});
