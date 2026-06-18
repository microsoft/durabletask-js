// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../src/proto/orchestrator_service_pb";
import {
  getMethodNameForAction,
  getWrongActionTypeError,
  getNonDeterminismError,
  getNewEventSummary,
  getActionSummary,
  isSuspendable,
} from "../src/worker/index";
import { NonDeterminismError } from "../src/task/exception/non-determinism-error";

/**
 * Creates an OrchestratorAction with the given action type set.
 */
function createActionWithType(
  actionCase: pb.OrchestratorAction.OrchestratoractiontypeCase,
): pb.OrchestratorAction {
  const action = new pb.OrchestratorAction();

  switch (actionCase) {
    case pb.OrchestratorAction.OrchestratoractiontypeCase.SCHEDULETASK:
      action.setScheduletask(new pb.ScheduleTaskAction());
      break;
    case pb.OrchestratorAction.OrchestratoractiontypeCase.CREATETIMER:
      action.setCreatetimer(new pb.CreateTimerAction());
      break;
    case pb.OrchestratorAction.OrchestratoractiontypeCase.CREATESUBORCHESTRATION:
      action.setCreatesuborchestration(new pb.CreateSubOrchestrationAction());
      break;
    case pb.OrchestratorAction.OrchestratoractiontypeCase.COMPLETEORCHESTRATION:
      action.setCompleteorchestration(new pb.CompleteOrchestrationAction());
      break;
    case pb.OrchestratorAction.OrchestratoractiontypeCase.SENDEVENT:
      action.setSendevent(new pb.SendEventAction());
      break;
    case pb.OrchestratorAction.OrchestratoractiontypeCase.SENDENTITYMESSAGE:
      action.setSendentitymessage(new pb.SendEntityMessageAction());
      break;
    case pb.OrchestratorAction.OrchestratoractiontypeCase.TERMINATEORCHESTRATION:
      action.setTerminateorchestration(new pb.TerminateOrchestrationAction());
      break;
  }

  return action;
}

function createSendEntityMessageAction(
  configure: (message: pb.SendEntityMessageAction) => void,
): pb.OrchestratorAction {
  const sendEntityMessage = new pb.SendEntityMessageAction();
  configure(sendEntityMessage);

  const action = new pb.OrchestratorAction();
  action.setSendentitymessage(sendEntityMessage);
  return action;
}

describe("Worker helper functions", () => {
  describe("getMethodNameForAction", () => {
    it("should return 'callActivity' for SCHEDULETASK", () => {
      const action = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.SCHEDULETASK);
      expect(getMethodNameForAction(action)).toBe("callActivity");
    });

    it("should return 'createTimer' for CREATETIMER", () => {
      const action = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.CREATETIMER);
      expect(getMethodNameForAction(action)).toBe("createTimer");
    });

    it("should return 'callSubOrchestrator' for CREATESUBORCHESTRATION", () => {
      const action = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.CREATESUBORCHESTRATION);
      expect(getMethodNameForAction(action)).toBe("callSubOrchestrator");
    });

    it("should return 'completeOrchestration' for COMPLETEORCHESTRATION", () => {
      const action = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.COMPLETEORCHESTRATION);
      expect(getMethodNameForAction(action)).toBe("completeOrchestration");
    });

    it("should return 'sendEvent' for SENDEVENT", () => {
      const action = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.SENDEVENT);
      expect(getMethodNameForAction(action)).toBe("sendEvent");
    });

    it("should return 'sendEntityMessage' for SENDENTITYMESSAGE with unknown subtype", () => {
      const action = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.SENDENTITYMESSAGE);
      expect(getMethodNameForAction(action)).toBe("sendEntityMessage");
    });

    it("should return 'callEntity' for SENDENTITYMESSAGE entity operation call", () => {
      const action = createSendEntityMessageAction((message) => {
        message.setEntityoperationcalled(new pb.EntityOperationCalledEvent());
      });
      expect(getMethodNameForAction(action)).toBe("callEntity");
    });

    it("should return 'signalEntity' for SENDENTITYMESSAGE entity operation signal", () => {
      const action = createSendEntityMessageAction((message) => {
        message.setEntityoperationsignaled(new pb.EntityOperationSignaledEvent());
      });
      expect(getMethodNameForAction(action)).toBe("signalEntity");
    });

    it("should return 'lockEntities' for SENDENTITYMESSAGE entity lock request", () => {
      const action = createSendEntityMessageAction((message) => {
        message.setEntitylockrequested(new pb.EntityLockRequestedEvent());
      });
      expect(getMethodNameForAction(action)).toBe("lockEntities");
    });

    it("should return 'lockRelease' for SENDENTITYMESSAGE entity unlock sent", () => {
      const action = createSendEntityMessageAction((message) => {
        message.setEntityunlocksent(new pb.EntityUnlockSentEvent());
      });
      expect(getMethodNameForAction(action)).toBe("lockRelease");
    });

    it("should return 'terminateOrchestration' for TERMINATEORCHESTRATION", () => {
      const action = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.TERMINATEORCHESTRATION);
      expect(getMethodNameForAction(action)).toBe("terminateOrchestration");
    });

    it("should throw for ORCHESTRATORACTIONTYPE_NOT_SET", () => {
      const action = new pb.OrchestratorAction();
      expect(() => getMethodNameForAction(action)).toThrow("Unknown action type: 0");
    });
  });

  describe("getWrongActionTypeError", () => {
    it("should return a NonDeterminismError with expected and actual method names", () => {
      const action = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.SENDEVENT);
      const error = getWrongActionTypeError(5, "callActivity", action);

      expect(error).toBeInstanceOf(NonDeterminismError);
      expect(error.message).toContain("callActivity");
      expect(error.message).toContain("sendEvent");
      expect(error.message).toContain("ID=5");
    });

    it("should return a NonDeterminismError for entity message action", () => {
      const action = createSendEntityMessageAction((message) => {
        message.setEntityoperationcalled(new pb.EntityOperationCalledEvent());
      });
      const error = getWrongActionTypeError(3, "createTimer", action);

      expect(error).toBeInstanceOf(NonDeterminismError);
      expect(error.message).toContain("createTimer");
      expect(error.message).toContain("callEntity");
      expect(error.message).toContain("ID=3");
    });

    it("should return a NonDeterminismError for terminate orchestration action", () => {
      const action = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.TERMINATEORCHESTRATION);
      const error = getWrongActionTypeError(7, "callSubOrchestrator", action);

      expect(error).toBeInstanceOf(NonDeterminismError);
      expect(error.message).toContain("callSubOrchestrator");
      expect(error.message).toContain("terminateOrchestration");
      expect(error.message).toContain("ID=7");
    });
  });

  describe("getNonDeterminismError", () => {
    it("should return a NonDeterminismError with task ID and action name", () => {
      const error = getNonDeterminismError(42, "callActivity");

      expect(error).toBeInstanceOf(NonDeterminismError);
      expect(error.message).toContain("callActivity");
      expect(error.message).toContain("ID=42");
    });
  });

  describe("getNewEventSummary", () => {
    it("should return '[]' for empty events", () => {
      expect(getNewEventSummary([])).toBe("[]");
    });

    it("should return single event type name for one event", () => {
      const event = new pb.HistoryEvent();
      event.setTaskcompleted(new pb.TaskCompletedEvent());
      const result = getNewEventSummary([event]);
      expect(result).toBe("[TASKCOMPLETED]");
    });

    it("should return grouped counts for multiple events", () => {
      const event1 = new pb.HistoryEvent();
      event1.setTaskcompleted(new pb.TaskCompletedEvent());
      const event2 = new pb.HistoryEvent();
      event2.setTaskcompleted(new pb.TaskCompletedEvent());
      const result = getNewEventSummary([event1, event2]);
      expect(result).toContain("TASKCOMPLETED=2");
    });
  });

  describe("getActionSummary", () => {
    it("should return '[]' for empty actions", () => {
      expect(getActionSummary([])).toBe("[]");
    });

    it("should return action type name for single action", () => {
      const action = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.SCHEDULETASK);
      const result = getActionSummary([action]);
      expect(result).toBe("SCHEDULETASK");
    });

    it("should return grouped counts for multiple actions", () => {
      const action1 = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.SCHEDULETASK);
      const action2 = createActionWithType(pb.OrchestratorAction.OrchestratoractiontypeCase.CREATETIMER);
      const result = getActionSummary([action1, action2]);
      expect(result).toContain("SCHEDULETASK=1");
      expect(result).toContain("CREATETIMER=1");
    });
  });

  describe("isSuspendable", () => {
    it("should return false for EXECUTIONRESUMED", () => {
      const event = new pb.HistoryEvent();
      event.setExecutionresumed(new pb.ExecutionResumedEvent());
      expect(isSuspendable(event)).toBe(false);
    });

    it("should return false for EXECUTIONTERMINATED", () => {
      const event = new pb.HistoryEvent();
      event.setExecutionterminated(new pb.ExecutionTerminatedEvent());
      expect(isSuspendable(event)).toBe(false);
    });

    it("should return true for other events like TASKCOMPLETED", () => {
      const event = new pb.HistoryEvent();
      event.setTaskcompleted(new pb.TaskCompletedEvent());
      expect(isSuspendable(event)).toBe(true);
    });
  });
});
