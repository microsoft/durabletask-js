// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RuntimeOrchestrationContext } from "../src/worker/runtime-orchestration-context";
import { EntityInstanceId } from "../src/entities/entity-instance-id";
import * as pb from "../src/proto/orchestrator_service_pb";

describe("RuntimeOrchestrationContext", () => {
  describe("entities property", () => {
    it("should return an entity feature", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");

      // Act
      const entities = ctx.entities;

      // Assert
      expect(entities).toBeDefined();
      expect(typeof entities.signalEntity).toBe("function");
    });
  });

  describe("signalEntity", () => {
    it("should create a SendEntityMessageAction with signaled event", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");

      // Act
      ctx.entities.signalEntity(entityId, "increment", 5);

      // Assert
      const actions = Object.values(ctx._pendingActions);
      expect(actions.length).toBe(1);

      const action = actions[0];
      expect(action.getId()).toBe(1);
      expect(action.hasSendentitymessage()).toBe(true);

      const sendEntityMessage = action.getSendentitymessage()!;
      expect(sendEntityMessage.hasEntityoperationsignaled()).toBe(true);

      const signalEvent = sendEntityMessage.getEntityoperationsignaled()!;
      expect(signalEvent.getOperation()).toBe("increment");
      expect(signalEvent.getInput()?.getValue()).toBe("5");
      expect(signalEvent.getTargetinstanceid()?.getValue()).toBe("@counter@my-counter");
      expect(signalEvent.getRequestid()).toBeDefined();
    });

    it("should handle signal without input", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");

      // Act
      ctx.entities.signalEntity(entityId, "reset");

      // Assert
      const actions = Object.values(ctx._pendingActions);
      expect(actions.length).toBe(1);

      const sendEntityMessage = actions[0].getSendentitymessage()!;
      const signalEvent = sendEntityMessage.getEntityoperationsignaled()!;
      expect(signalEvent.getOperation()).toBe("reset");
      expect(signalEvent.getInput()).toBeUndefined();
    });

    it("should handle complex object input", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("user", "user123");
      const input = { name: "John", age: 30, active: true };

      // Act
      ctx.entities.signalEntity(entityId, "updateProfile", input);

      // Assert
      const actions = Object.values(ctx._pendingActions);
      const signalEvent = actions[0].getSendentitymessage()!.getEntityoperationsignaled()!;
      expect(signalEvent.getInput()?.getValue()).toBe(JSON.stringify(input));
    });

    it("should set scheduled time when provided", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");
      const scheduledTime = new Date("2026-01-27T12:00:00Z");

      // Act
      ctx.entities.signalEntity(entityId, "increment", 1, { signalTime: scheduledTime });

      // Assert
      const actions = Object.values(ctx._pendingActions);
      const signalEvent = actions[0].getSendentitymessage()!.getEntityoperationsignaled()!;
      expect(signalEvent.hasScheduledtime()).toBe(true);
      const protoTime = signalEvent.getScheduledtime()!;
      expect(protoTime.toDate().toISOString()).toBe(scheduledTime.toISOString());
    });

    it("should generate unique request IDs for multiple signals", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");

      // Act
      ctx.entities.signalEntity(entityId, "increment", 1);
      ctx.entities.signalEntity(entityId, "increment", 2);
      ctx.entities.signalEntity(entityId, "increment", 3);

      // Assert
      const actions = Object.values(ctx._pendingActions);
      expect(actions.length).toBe(3);

      const requestIds = actions.map((a) =>
        a.getSendentitymessage()!.getEntityoperationsignaled()!.getRequestid(),
      );

      // All request IDs should be unique
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(3);
    });

    it("should use unique sequence numbers for action IDs", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");

      // Act
      ctx.entities.signalEntity(entityId, "op1");
      ctx.entities.signalEntity(entityId, "op2");

      // Assert
      const actions = Object.values(ctx._pendingActions);
      // Each signal uses two sequence numbers: one for action ID, one for request GUID
      // So action IDs are 1, 3 (not 1, 2)
      expect(actions[0].getId()).toBe(1);
      expect(actions[1].getId()).toBe(3);
      // All action IDs should be unique
      const ids = actions.map((a) => a.getId());
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should signal different entities", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const counter1 = new EntityInstanceId("counter", "counter-1");
      const counter2 = new EntityInstanceId("counter", "counter-2");
      const user = new EntityInstanceId("user", "user-123");

      // Act
      ctx.entities.signalEntity(counter1, "increment", 1);
      ctx.entities.signalEntity(counter2, "increment", 2);
      ctx.entities.signalEntity(user, "setName", "John");

      // Assert
      const actions = Object.values(ctx._pendingActions);
      expect(actions.length).toBe(3);

      const targetIds = actions.map((a) =>
        a.getSendentitymessage()!.getEntityoperationsignaled()!.getTargetinstanceid()?.getValue(),
      );

      expect(targetIds).toContain("@counter@counter-1");
      expect(targetIds).toContain("@counter@counter-2");
      expect(targetIds).toContain("@user@user-123");
    });
  });

  describe("newGuid", () => {
    it("should generate deterministic GUIDs based on sequence", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("my-orchestration");

      // Act
      const guid1 = ctx.newGuid();
      const guid2 = ctx.newGuid();
      const guid3 = ctx.newGuid();

      // Assert
      expect(guid1).toBe("my-orchestration:00000001");
      expect(guid2).toBe("my-orchestration:00000002");
      expect(guid3).toBe("my-orchestration:00000003");
    });

    it("should be replayable - same sequence produces same GUIDs", () => {
      // Arrange
      const ctx1 = new RuntimeOrchestrationContext("replay-test");
      const ctx2 = new RuntimeOrchestrationContext("replay-test");

      // Act
      const guids1 = [ctx1.newGuid(), ctx1.newGuid()];
      const guids2 = [ctx2.newGuid(), ctx2.newGuid()];

      // Assert
      expect(guids1).toEqual(guids2);
    });
  });

  describe("callEntity", () => {
    it("should create a SendEntityMessageAction with called event", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");

      // Act
      const task = ctx.entities.callEntity<number>(entityId, "get");

      // Assert
      expect(task).toBeDefined();
      const actions = Object.values(ctx._pendingActions);
      expect(actions.length).toBe(1);

      const action = actions[0];
      expect(action.getId()).toBe(1);
      expect(action.hasSendentitymessage()).toBe(true);

      const sendEntityMessage = action.getSendentitymessage()!;
      expect(sendEntityMessage.hasEntityoperationcalled()).toBe(true);

      const callEvent = sendEntityMessage.getEntityoperationcalled()!;
      expect(callEvent.getOperation()).toBe("get");
      expect(callEvent.getTargetinstanceid()?.getValue()).toBe("@counter@my-counter");
      expect(callEvent.getParentinstanceid()?.getValue()).toBe("test-instance");
      expect(callEvent.getRequestid()).toBeDefined();
    });

    it("should include input when provided", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");

      // Act
      ctx.entities.callEntity(entityId, "add", 42);

      // Assert
      const actions = Object.values(ctx._pendingActions);
      const callEvent = actions[0].getSendentitymessage()!.getEntityoperationcalled()!;
      expect(callEvent.getInput()?.getValue()).toBe("42");
    });

    it("should handle complex object input", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("user", "user123");
      const input = { name: "John", age: 30 };

      // Act
      ctx.entities.callEntity(entityId, "update", input);

      // Assert
      const actions = Object.values(ctx._pendingActions);
      const callEvent = actions[0].getSendentitymessage()!.getEntityoperationcalled()!;
      expect(callEvent.getInput()?.getValue()).toBe(JSON.stringify(input));
    });

    it("should return an incomplete task", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");

      // Act
      const task = ctx.entities.callEntity<number>(entityId, "get");

      // Assert
      expect(task.isComplete).toBe(false);
      expect(task.isFailed).toBe(false);
    });

    it("should track pending entity calls by requestId", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");

      // Act
      ctx.entities.callEntity<number>(entityId, "get");

      // Assert
      expect(ctx._entityFeature.pendingEntityCalls.size).toBe(1);
      const [requestId, callInfo] = [...ctx._entityFeature.pendingEntityCalls.entries()][0];
      expect(requestId).toBeDefined();
      expect(callInfo.entityId).toBe(entityId);
      expect(callInfo.operationName).toBe("get");
      expect(callInfo.task).toBeDefined();
    });

    it("should generate unique request IDs for multiple calls", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");

      // Act
      ctx.entities.callEntity(entityId, "get");
      ctx.entities.callEntity(entityId, "get");
      ctx.entities.callEntity(entityId, "get");

      // Assert
      expect(ctx._entityFeature.pendingEntityCalls.size).toBe(3);
      const requestIds = [...ctx._entityFeature.pendingEntityCalls.keys()];
      expect(new Set(requestIds).size).toBe(3);
    });

    it("should not set scheduled time (not supported for calls)", () => {
      // Arrange
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const entityId = new EntityInstanceId("counter", "my-counter");

      // Act - calls don't support scheduled time, unlike signals
      ctx.entities.callEntity(entityId, "get");

      // Assert
      const actions = Object.values(ctx._pendingActions);
      const callEvent = actions[0].getSendentitymessage()!.getEntityoperationcalled()!;
      expect(callEvent.hasScheduledtime()).toBe(false);
    });
  });
});
