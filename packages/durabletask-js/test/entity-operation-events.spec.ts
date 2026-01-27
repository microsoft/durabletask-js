// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationExecutor } from "../src/worker/orchestration-executor";
import { Registry } from "../src/worker/registry";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { EntityInstanceId } from "../src/entities/entity-instance-id";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as ph from "../src/utils/pb-helper.util";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Task } from "../src/task/task";

/**
 * Creates a new EntityOperationCompletedEvent history event.
 */
function newEntityOperationCompletedEvent(
  eventId: number,
  requestId: string,
  output?: string,
): pb.HistoryEvent {
  const completedEvent = new pb.EntityOperationCompletedEvent();
  completedEvent.setRequestid(requestId);

  if (output !== undefined) {
    const outputValue = new StringValue();
    outputValue.setValue(output);
    completedEvent.setOutput(outputValue);
  }

  const event = new pb.HistoryEvent();
  event.setEventid(eventId);
  event.setEntityoperationcompleted(completedEvent);

  return event;
}

/**
 * Creates a new EntityOperationFailedEvent history event.
 */
function newEntityOperationFailedEvent(
  eventId: number,
  requestId: string,
  errorType: string,
  errorMessage: string,
): pb.HistoryEvent {
  const failureDetails = new pb.TaskFailureDetails();
  failureDetails.setErrortype(errorType);
  failureDetails.setErrormessage(errorMessage);

  const failedEvent = new pb.EntityOperationFailedEvent();
  failedEvent.setRequestid(requestId);
  failedEvent.setFailuredetails(failureDetails);

  const event = new pb.HistoryEvent();
  event.setEventid(eventId);
  event.setEntityoperationfailed(failedEvent);

  return event;
}

describe("OrchestrationExecutor Entity Operation Events", () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  describe("ENTITYOPERATIONCOMPLETED", () => {
    it("should complete entity call task with result", async () => {
      // Arrange
      let callResult: number | undefined;
      const orchestrator = async function* (ctx: OrchestrationContext): AsyncGenerator<Task<number>, number, number> {
        const entityId = new EntityInstanceId("counter", "my-counter");
        const result: number = yield ctx.entities.callEntity<number>(entityId, "get");
        callResult = result;
        return result;
      };

      registry.addNamedOrchestrator("TestOrchestrator", orchestrator);

      const executor = new OrchestrationExecutor(registry);

      // Create the initial events
      const oldEvents: pb.HistoryEvent[] = [];
      const newEvents: pb.HistoryEvent[] = [
        ph.newOrchestratorStartedEvent(new Date()),
        ph.newExecutionStartedEvent("TestOrchestrator", "test-instance", undefined),
      ];

      // First execution - should create the callEntity action
      const actions1 = await executor.execute("test-instance", oldEvents, newEvents);

      // Verify the action was created
      expect(actions1.length).toBe(1);
      const action = actions1[0];
      expect(action.hasSendentitymessage()).toBe(true);
      expect(action.getSendentitymessage()!.hasEntityoperationcalled()).toBe(true);

      const callEvent = action.getSendentitymessage()!.getEntityoperationcalled()!;
      const requestId = callEvent.getRequestid();

      // Second execution - with the completed event
      const oldEvents2 = [...newEvents];
      const newEvents2 = [
        ph.newOrchestratorStartedEvent(new Date()),
        newEntityOperationCompletedEvent(100, requestId, "42"),
      ];

      const actions2 = await executor.execute("test-instance", oldEvents2, newEvents2);

      // Assert
      expect(callResult).toBe(42);
      expect(actions2.length).toBe(1);
      expect(actions2[0].hasCompleteorchestration()).toBe(true);
    });

    it("should handle null result", async () => {
      // Arrange
      let callResult: unknown = "not-set";
      const orchestrator = async function* (ctx: OrchestrationContext): AsyncGenerator<Task<void>, string, unknown> {
        const entityId = new EntityInstanceId("counter", "my-counter");
        const result: unknown = yield ctx.entities.callEntity(entityId, "reset");
        callResult = result;
        return "done";
      };

      registry.addNamedOrchestrator("TestOrchestrator", orchestrator);

      const executor = new OrchestrationExecutor(registry);

      const oldEvents: pb.HistoryEvent[] = [];
      const newEvents: pb.HistoryEvent[] = [
        ph.newOrchestratorStartedEvent(new Date()),
        ph.newExecutionStartedEvent("TestOrchestrator", "test-instance", undefined),
      ];

      const actions1 = await executor.execute("test-instance", oldEvents, newEvents);
      const requestId = actions1[0].getSendentitymessage()!.getEntityoperationcalled()!.getRequestid();

      // Complete with no output (null)
      const oldEvents2 = [...newEvents];
      const newEvents2 = [
        ph.newOrchestratorStartedEvent(new Date()),
        newEntityOperationCompletedEvent(100, requestId, undefined),
      ];

      await executor.execute("test-instance", oldEvents2, newEvents2);

      // Assert
      expect(callResult).toBeUndefined();
    });

    it("should handle complex object result", async () => {
      // Arrange
      let callResult: unknown;
      type Profile = { name: string; age: number };
      const orchestrator = async function* (ctx: OrchestrationContext): AsyncGenerator<Task<Profile>, Profile, Profile> {
        const entityId = new EntityInstanceId("user", "user-123");
        const result: Profile = yield ctx.entities.callEntity<Profile>(entityId, "getProfile");
        callResult = result;
        return result;
      };

      registry.addNamedOrchestrator("TestOrchestrator", orchestrator);

      const executor = new OrchestrationExecutor(registry);

      const oldEvents: pb.HistoryEvent[] = [];
      const newEvents: pb.HistoryEvent[] = [
        ph.newOrchestratorStartedEvent(new Date()),
        ph.newExecutionStartedEvent("TestOrchestrator", "test-instance", undefined),
      ];

      const actions1 = await executor.execute("test-instance", oldEvents, newEvents);
      const requestId = actions1[0].getSendentitymessage()!.getEntityoperationcalled()!.getRequestid();

      const resultObject = { name: "John", age: 30 };
      const oldEvents2 = [...newEvents];
      const newEvents2 = [
        ph.newOrchestratorStartedEvent(new Date()),
        newEntityOperationCompletedEvent(100, requestId, JSON.stringify(resultObject)),
      ];

      await executor.execute("test-instance", oldEvents2, newEvents2);

      // Assert
      expect(callResult).toEqual(resultObject);
    });
  });

  describe("ENTITYOPERATIONFAILED", () => {
    it("should fail entity call task with error details", async () => {
      // Arrange
      let caughtError: Error | undefined;
      const orchestrator = async function* (ctx: OrchestrationContext): AsyncGenerator<Task<number>, string, number> {
        const entityId = new EntityInstanceId("counter", "my-counter");
        try {
          yield ctx.entities.callEntity<number>(entityId, "badOperation");
        } catch (e) {
          caughtError = e as Error;
        }
        return "handled";
      };

      registry.addNamedOrchestrator("TestOrchestrator", orchestrator);

      const executor = new OrchestrationExecutor(registry);

      const oldEvents: pb.HistoryEvent[] = [];
      const newEvents: pb.HistoryEvent[] = [
        ph.newOrchestratorStartedEvent(new Date()),
        ph.newExecutionStartedEvent("TestOrchestrator", "test-instance", undefined),
      ];

      const actions1 = await executor.execute("test-instance", oldEvents, newEvents);
      const requestId = actions1[0].getSendentitymessage()!.getEntityoperationcalled()!.getRequestid();

      // Fail the operation
      const oldEvents2 = [...newEvents];
      const newEvents2 = [
        ph.newOrchestratorStartedEvent(new Date()),
        newEntityOperationFailedEvent(100, requestId, "InvalidOperationError", "Operation not supported"),
      ];

      await executor.execute("test-instance", oldEvents2, newEvents2);

      // Assert
      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toContain("badOperation");
      expect(caughtError!.message).toContain("Operation not supported");
    });

    it("should propagate failure to orchestration if not caught", async () => {
      // Arrange
      const orchestrator = async function* (ctx: OrchestrationContext): AsyncGenerator<Task<number>, string, number> {
        const entityId = new EntityInstanceId("counter", "my-counter");
        yield ctx.entities.callEntity<number>(entityId, "badOperation");
        return "should not reach here";
      };

      registry.addNamedOrchestrator("TestOrchestrator", orchestrator);

      const executor = new OrchestrationExecutor(registry);

      const oldEvents: pb.HistoryEvent[] = [];
      const newEvents: pb.HistoryEvent[] = [
        ph.newOrchestratorStartedEvent(new Date()),
        ph.newExecutionStartedEvent("TestOrchestrator", "test-instance", undefined),
      ];

      const actions1 = await executor.execute("test-instance", oldEvents, newEvents);
      const requestId = actions1[0].getSendentitymessage()!.getEntityoperationcalled()!.getRequestid();

      // Fail the operation
      const oldEvents2 = [...newEvents];
      const newEvents2 = [
        ph.newOrchestratorStartedEvent(new Date()),
        newEntityOperationFailedEvent(100, requestId, "Error", "Something went wrong"),
      ];

      const actions2 = await executor.execute("test-instance", oldEvents2, newEvents2);

      // Assert - orchestration should fail
      expect(actions2.length).toBe(1);
      expect(actions2[0].hasCompleteorchestration()).toBe(true);
      const completeAction = actions2[0].getCompleteorchestration()!;
      expect(completeAction.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    });
  });

  describe("Multiple entity calls", () => {
    it("should handle multiple concurrent entity calls", async () => {
      // Arrange
      let result1: number | undefined;
      let result2: number | undefined;
      const orchestrator = async function* (ctx: OrchestrationContext): AsyncGenerator<Task<number>, number, number> {
        const counter1 = new EntityInstanceId("counter", "counter-1");
        const counter2 = new EntityInstanceId("counter", "counter-2");

        // Start both calls
        const task1 = ctx.entities.callEntity<number>(counter1, "get");
        const task2 = ctx.entities.callEntity<number>(counter2, "get");

        // Wait for first
        result1 = yield task1;
        // Wait for second
        result2 = yield task2;

        return (result1 ?? 0) + (result2 ?? 0);
      };

      registry.addNamedOrchestrator("TestOrchestrator", orchestrator);

      const executor = new OrchestrationExecutor(registry);

      const oldEvents: pb.HistoryEvent[] = [];
      const newEvents: pb.HistoryEvent[] = [
        ph.newOrchestratorStartedEvent(new Date()),
        ph.newExecutionStartedEvent("TestOrchestrator", "test-instance", undefined),
      ];

      const actions1 = await executor.execute("test-instance", oldEvents, newEvents);

      // Verify two actions were created
      expect(actions1.length).toBe(2);
      const requestId1 = actions1[0].getSendentitymessage()!.getEntityoperationcalled()!.getRequestid();
      const requestId2 = actions1[1].getSendentitymessage()!.getEntityoperationcalled()!.getRequestid();

      // Complete both calls
      const oldEvents2 = [...newEvents];
      const newEvents2 = [
        ph.newOrchestratorStartedEvent(new Date()),
        newEntityOperationCompletedEvent(100, requestId1, "10"),
        newEntityOperationCompletedEvent(101, requestId2, "20"),
      ];

      const actions2 = await executor.execute("test-instance", oldEvents2, newEvents2);

      // Assert
      expect(result1).toBe(10);
      expect(result2).toBe(20);
      expect(actions2.length).toBe(1);
      expect(actions2[0].hasCompleteorchestration()).toBe(true);
      expect(actions2[0].getCompleteorchestration()!.getResult()?.getValue()).toBe("30");
    });
  });
});
