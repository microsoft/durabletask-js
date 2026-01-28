// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId } from "../src/entities/entity-instance-id";
import { LockHandle } from "../src/entities/orchestration-entity-feature";
import { OrchestrationExecutor } from "../src/worker/orchestration-executor";
import { Registry } from "../src/worker/registry";
import * as pb from "../src/proto/orchestrator_service_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";

// Helper functions for creating history events
function createOrchestratorStartedEvent(timestamp: Date = new Date()): pb.HistoryEvent {
  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  const ts = new Timestamp();
  ts.fromDate(timestamp);
  event.setTimestamp(ts);
  const orchStarted = new pb.OrchestratorStartedEvent();
  event.setOrchestratorstarted(orchStarted);
  return event;
}

function createExecutionStartedEvent(
  name: string,
  input?: unknown,
  instanceId: string = "test-instance",
): pb.HistoryEvent {
  const event = new pb.HistoryEvent();
  event.setEventid(1);
  const ts = new Timestamp();
  ts.fromDate(new Date());
  event.setTimestamp(ts);

  const execStarted = new pb.ExecutionStartedEvent();
  execStarted.setName(name);
  if (input !== undefined) {
    const inputValue = new StringValue();
    inputValue.setValue(JSON.stringify(input));
    execStarted.setInput(inputValue);
  }

  const orchInstance = new pb.OrchestrationInstance();
  orchInstance.setInstanceid(instanceId);
  execStarted.setOrchestrationinstance(orchInstance);

  event.setExecutionstarted(execStarted);
  return event;
}

function createEntityLockGrantedEvent(criticalSectionId: string): pb.HistoryEvent {
  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  const ts = new Timestamp();
  ts.fromDate(new Date());
  event.setTimestamp(ts);

  const lockGranted = new pb.EntityLockGrantedEvent();
  lockGranted.setCriticalsectionid(criticalSectionId);
  event.setEntitylockgranted(lockGranted);
  return event;
}

describe("Entity Locking (Critical Sections)", () => {
  describe("lockEntities", () => {
    it("should throw when entity list is empty", async () => {
      // Arrange
      const registry = new Registry();
      let errorThrown: Error | null = null;

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        try {
          // This should throw
          yield ctx.entities.lockEntities();
        } catch (e) {
          errorThrown = e as Error;
        }
        return "done";
      });

      const executor = new OrchestrationExecutor(registry);
      const newEvents = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];

      // Act
      await executor.execute("test-instance", [], newEvents);

      // Assert
      expect(errorThrown).not.toBeNull();
      expect(errorThrown!.message).toContain("must not be empty");
    });

    it("should sort entities in lock request for determinism", async () => {
      // Arrange
      const registry = new Registry();
      let capturedActions: pb.OrchestratorAction[] = [];

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        // Lock in unsorted order: B, A, C
        const entityB = new EntityInstanceId("counter", "b");
        const entityA = new EntityInstanceId("counter", "a");
        const entityC = new EntityInstanceId("counter", "c");
        yield ctx.entities.lockEntities(entityB, entityA, entityC);
      });

      const executor = new OrchestrationExecutor(registry);
      const newEvents = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];

      // Act
      capturedActions = await executor.execute("test-instance", [], newEvents);

      // Assert - Find the lock request action
      const lockAction = capturedActions.find(
        (a) => a.getSendentitymessage()?.hasEntitylockrequested(),
      );
      expect(lockAction).toBeDefined();

      const lockEvent = lockAction!.getSendentitymessage()!.getEntitylockrequested()!;
      const lockSet = lockEvent.getLocksetList();

      // Should be sorted: a, b, c
      expect(lockSet.length).toBe(3);
      expect(lockSet[0]).toBe("@counter@a");
      expect(lockSet[1]).toBe("@counter@b");
      expect(lockSet[2]).toBe("@counter@c");
    });

    it("should remove duplicate entities", async () => {
      // Arrange
      const registry = new Registry();

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        // Lock with duplicates
        const entity1 = new EntityInstanceId("counter", "a");
        const entity2 = new EntityInstanceId("counter", "a"); // Duplicate
        const entity3 = new EntityInstanceId("counter", "b");
        yield ctx.entities.lockEntities(entity1, entity2, entity3);
      });

      const executor = new OrchestrationExecutor(registry);
      const newEvents = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];

      // Act
      const actions = await executor.execute("test-instance", [], newEvents);

      // Assert - Find the lock request action
      const lockAction = actions.find((a) => a.getSendentitymessage()?.hasEntitylockrequested());
      expect(lockAction).toBeDefined();

      const lockEvent = lockAction!.getSendentitymessage()!.getEntitylockrequested()!;
      const lockSet = lockEvent.getLocksetList();

      // Should have duplicates removed
      expect(lockSet.length).toBe(2);
      expect(lockSet).toContain("@counter@a");
      expect(lockSet).toContain("@counter@b");
    });

    it("should complete lock task when EntityLockGranted is received", async () => {
      // Arrange
      const registry = new Registry();
      let lockAcquired = false;

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        const entity = new EntityInstanceId("counter", "test");
        const lock: LockHandle = yield ctx.entities.lockEntities(entity);
        lockAcquired = true;
        lock.release();
        return "completed";
      });

      const executor = new OrchestrationExecutor(registry);

      // First execution - request lock
      const newEvents1 = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];
      const actions1 = await executor.execute("test-instance", [], newEvents1);

      // Find the critical section ID from the lock request
      const lockAction = actions1.find((a) => a.getSendentitymessage()?.hasEntitylockrequested());
      const criticalSectionId = lockAction!
        .getSendentitymessage()!
        .getEntitylockrequested()!
        .getCriticalsectionid();

      // Second execution - lock granted
      const executor2 = new OrchestrationExecutor(registry);
      const oldEvents = [createOrchestratorStartedEvent(), createExecutionStartedEvent("testOrchestration")];
      const newEvents2 = [
        createOrchestratorStartedEvent(),
        createEntityLockGrantedEvent(criticalSectionId),
      ];

      // Act
      const actions2 = await executor2.execute("test-instance", oldEvents, newEvents2);

      // Assert
      expect(lockAcquired).toBe(true);

      // Should have completion action with unlock action
      const completionAction = actions2.find((a) => a.hasCompleteorchestration());
      expect(completionAction).toBeDefined();
      expect(completionAction!.getCompleteorchestration()!.getOrchestrationstatus()).toBe(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
      );
    });
  });

  describe("isInCriticalSection", () => {
    it("should return false when not in critical section", async () => {
      // Arrange
      const registry = new Registry();
      let criticalSectionInfo: any = null;

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        criticalSectionInfo = ctx.entities.isInCriticalSection();
        return "done";
      });

      const executor = new OrchestrationExecutor(registry);
      const newEvents = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];

      // Act
      await executor.execute("test-instance", [], newEvents);

      // Assert
      expect(criticalSectionInfo).toEqual({ inSection: false });
    });

    it("should return true with locked entities when in critical section", async () => {
      // Arrange
      const registry = new Registry();
      let criticalSectionInfo: any = null;

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        const entityA = new EntityInstanceId("counter", "a");
        const entityB = new EntityInstanceId("counter", "b");
        const lock: LockHandle = yield ctx.entities.lockEntities(entityA, entityB);
        criticalSectionInfo = ctx.entities.isInCriticalSection();
        lock.release();
        return "done";
      });

      const executor = new OrchestrationExecutor(registry);

      // First execution - request lock
      const newEvents1 = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];
      const actions1 = await executor.execute("test-instance", [], newEvents1);

      // Find the critical section ID from the lock request
      const lockAction = actions1.find((a) => a.getSendentitymessage()?.hasEntitylockrequested());
      const criticalSectionId = lockAction!
        .getSendentitymessage()!
        .getEntitylockrequested()!
        .getCriticalsectionid();

      // Second execution - lock granted
      const executor2 = new OrchestrationExecutor(registry);
      const oldEvents = [createOrchestratorStartedEvent(), createExecutionStartedEvent("testOrchestration")];
      const newEvents2 = [
        createOrchestratorStartedEvent(),
        createEntityLockGrantedEvent(criticalSectionId),
      ];

      // Act
      await executor2.execute("test-instance", oldEvents, newEvents2);

      // Assert
      expect(criticalSectionInfo.inSection).toBe(true);
      expect(criticalSectionInfo.lockedEntities).toHaveLength(2);
      expect(criticalSectionInfo.lockedEntities.map((e: EntityInstanceId) => e.toString())).toContain(
        "@counter@a",
      );
      expect(criticalSectionInfo.lockedEntities.map((e: EntityInstanceId) => e.toString())).toContain(
        "@counter@b",
      );
    });
  });

  describe("lock release", () => {
    it("should send unlock messages when lock is released", async () => {
      // Arrange
      const registry = new Registry();

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        const entityA = new EntityInstanceId("counter", "a");
        const entityB = new EntityInstanceId("counter", "b");
        const lock: LockHandle = yield ctx.entities.lockEntities(entityA, entityB);
        lock.release();
        return "done";
      });

      const executor = new OrchestrationExecutor(registry);

      // First execution - request lock
      const newEvents1 = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];
      const actions1 = await executor.execute("test-instance", [], newEvents1);

      // Find the critical section ID from the lock request
      const lockAction = actions1.find((a) => a.getSendentitymessage()?.hasEntitylockrequested());
      const criticalSectionId = lockAction!
        .getSendentitymessage()!
        .getEntitylockrequested()!
        .getCriticalsectionid();

      // Second execution - lock granted
      const executor2 = new OrchestrationExecutor(registry);
      const oldEvents = [createOrchestratorStartedEvent(), createExecutionStartedEvent("testOrchestration")];
      const newEvents2 = [
        createOrchestratorStartedEvent(),
        createEntityLockGrantedEvent(criticalSectionId),
      ];

      // Act
      const actions2 = await executor2.execute("test-instance", oldEvents, newEvents2);

      // Assert - Should have unlock actions for both entities
      const unlockActions = actions2.filter((a) => a.getSendentitymessage()?.hasEntityunlocksent());
      expect(unlockActions.length).toBe(2);

      const unlockedEntities = unlockActions.map(
        (a) => a.getSendentitymessage()!.getEntityunlocksent()!.getTargetinstanceid()!.getValue(),
      );
      expect(unlockedEntities).toContain("@counter@a");
      expect(unlockedEntities).toContain("@counter@b");
    });

    it("should be idempotent - multiple releases should be safe", async () => {
      // Arrange
      const registry = new Registry();

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        const entity = new EntityInstanceId("counter", "a");
        const lock: LockHandle = yield ctx.entities.lockEntities(entity);
        lock.release();
        lock.release(); // Second release should be no-op
        lock.release(); // Third release should be no-op
        return "done";
      });

      const executor = new OrchestrationExecutor(registry);

      // First execution - request lock
      const newEvents1 = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];
      const actions1 = await executor.execute("test-instance", [], newEvents1);

      // Find the critical section ID from the lock request
      const lockAction = actions1.find((a) => a.getSendentitymessage()?.hasEntitylockrequested());
      const criticalSectionId = lockAction!
        .getSendentitymessage()!
        .getEntitylockrequested()!
        .getCriticalsectionid();

      // Second execution - lock granted
      const executor2 = new OrchestrationExecutor(registry);
      const oldEvents = [createOrchestratorStartedEvent(), createExecutionStartedEvent("testOrchestration")];
      const newEvents2 = [
        createOrchestratorStartedEvent(),
        createEntityLockGrantedEvent(criticalSectionId),
      ];

      // Act
      const actions2 = await executor2.execute("test-instance", oldEvents, newEvents2);

      // Assert - Should only have one unlock action (not three)
      const unlockActions = actions2.filter((a) => a.getSendentitymessage()?.hasEntityunlocksent());
      expect(unlockActions.length).toBe(1);
    });
  });

  describe("critical section validation", () => {
    it("should throw when trying to enter nested critical section", async () => {
      // Arrange
      const registry = new Registry();
      let errorThrown: Error | null = null;

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        const entityA = new EntityInstanceId("counter", "a");
        const entityB = new EntityInstanceId("counter", "b");
        const lock: LockHandle = yield ctx.entities.lockEntities(entityA);

        try {
          // This should throw - nested critical section
          yield ctx.entities.lockEntities(entityB);
        } catch (e) {
          errorThrown = e as Error;
        }

        lock.release();
        return "done";
      });

      const executor = new OrchestrationExecutor(registry);

      // First execution - request lock
      const newEvents1 = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];
      const actions1 = await executor.execute("test-instance", [], newEvents1);

      // Find the critical section ID from the lock request
      const lockAction = actions1.find((a) => a.getSendentitymessage()?.hasEntitylockrequested());
      const criticalSectionId = lockAction!
        .getSendentitymessage()!
        .getEntitylockrequested()!
        .getCriticalsectionid();

      // Second execution - lock granted
      const executor2 = new OrchestrationExecutor(registry);
      const oldEvents = [createOrchestratorStartedEvent(), createExecutionStartedEvent("testOrchestration")];
      const newEvents2 = [
        createOrchestratorStartedEvent(),
        createEntityLockGrantedEvent(criticalSectionId),
      ];

      // Act
      await executor2.execute("test-instance", oldEvents, newEvents2);

      // Assert
      expect(errorThrown).not.toBeNull();
      expect(errorThrown!.message).toContain("Must not enter another critical section");
    });

    it("should throw when signaling a locked entity from within critical section", async () => {
      // Arrange
      const registry = new Registry();
      let errorThrown: Error | null = null;

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        const entity = new EntityInstanceId("counter", "a");
        const lock: LockHandle = yield ctx.entities.lockEntities(entity);

        try {
          // This should throw - cannot signal a locked entity
          ctx.entities.signalEntity(entity, "increment");
        } catch (e) {
          errorThrown = e as Error;
        }

        lock.release();
        return "done";
      });

      const executor = new OrchestrationExecutor(registry);

      // First execution - request lock
      const newEvents1 = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];
      const actions1 = await executor.execute("test-instance", [], newEvents1);

      // Find the critical section ID from the lock request
      const lockAction = actions1.find((a) => a.getSendentitymessage()?.hasEntitylockrequested());
      const criticalSectionId = lockAction!
        .getSendentitymessage()!
        .getEntitylockrequested()!
        .getCriticalsectionid();

      // Second execution - lock granted
      const executor2 = new OrchestrationExecutor(registry);
      const oldEvents = [createOrchestratorStartedEvent(), createExecutionStartedEvent("testOrchestration")];
      const newEvents2 = [
        createOrchestratorStartedEvent(),
        createEntityLockGrantedEvent(criticalSectionId),
      ];

      // Act
      await executor2.execute("test-instance", oldEvents, newEvents2);

      // Assert
      expect(errorThrown).not.toBeNull();
      expect(errorThrown!.message).toContain("Must not signal a locked entity");
    });

    it("should throw when calling an unlocked entity from within critical section", async () => {
      // Arrange
      const registry = new Registry();
      let errorThrown: Error | null = null;

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        const entityA = new EntityInstanceId("counter", "a");
        const entityB = new EntityInstanceId("counter", "b"); // Not locked
        const lock: LockHandle = yield ctx.entities.lockEntities(entityA);

        try {
          // This should throw - entityB is not in the lock set
          yield ctx.entities.callEntity(entityB, "get");
        } catch (e) {
          errorThrown = e as Error;
        }

        lock.release();
        return "done";
      });

      const executor = new OrchestrationExecutor(registry);

      // First execution - request lock
      const newEvents1 = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];
      const actions1 = await executor.execute("test-instance", [], newEvents1);

      // Find the critical section ID from the lock request
      const lockAction = actions1.find((a) => a.getSendentitymessage()?.hasEntitylockrequested());
      const criticalSectionId = lockAction!
        .getSendentitymessage()!
        .getEntitylockrequested()!
        .getCriticalsectionid();

      // Second execution - lock granted
      const executor2 = new OrchestrationExecutor(registry);
      const oldEvents = [createOrchestratorStartedEvent(), createExecutionStartedEvent("testOrchestration")];
      const newEvents2 = [
        createOrchestratorStartedEvent(),
        createEntityLockGrantedEvent(criticalSectionId),
      ];

      // Act
      await executor2.execute("test-instance", oldEvents, newEvents2);

      // Assert
      expect(errorThrown).not.toBeNull();
      expect(errorThrown!.message).toContain("if it is not one of the locked entities");
    });

    it("should throw when calling entity before lock is granted", async () => {
      // Arrange
      const registry = new Registry();
      let errorThrown: Error | null = null;

      registry.addOrchestrator(async function* testOrchestration(ctx: any) {
        const entityA = new EntityInstanceId("counter", "a");

        // Get the lock task but don't yield it yet
        const lockTask = ctx.entities.lockEntities(entityA);

        try {
          // This should throw - lock not yet granted
          ctx.entities.callEntity(entityA, "get");
        } catch (e) {
          errorThrown = e as Error;
        }

        // Now yield the lock task
        yield lockTask;
        return "done";
      });

      const executor = new OrchestrationExecutor(registry);

      // Act - First execution starts the orchestrator
      const newEvents1 = [
        createOrchestratorStartedEvent(),
        createExecutionStartedEvent("testOrchestration"),
      ];
      await executor.execute("test-instance", [], newEvents1);

      // Assert - Error should have been thrown synchronously before yield
      expect(errorThrown).not.toBeNull();
      expect(errorThrown!.message).toContain("Must await the completion of the lock request prior to calling any entity");
    });
  });
});
