// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { TaskEntity } from "../src/entities/task-entity";
import { ITaskEntity, EntityFactory } from "../src/entities/task-entity";
import { TaskEntityOperation } from "../src/entities/task-entity-operation";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { NoOpLogger } from "../src/types/logger.type";

/**
 * Test entity for worker tests.
 */
class CounterEntity extends TaskEntity<number> {
  increment(): number {
    this.state++;
    return this.state;
  }

  protected initializeState(): number {
    return 0;
  }
}

const COMPLETION_TOKEN = "test-completion-token";

/**
 * Creates a mock gRPC stub that captures the EntityBatchResult passed to
 * completeEntityTask.
 */
function createMockStub(): {
  stub: stubs.TaskHubSidecarServiceClient;
  capturedResult: pb.EntityBatchResult | null;
} {
  let capturedResult: pb.EntityBatchResult | null = null;

  const stub = {
    completeEntityTask: (
      result: pb.EntityBatchResult,
      metadata: any,
      callback: (err: any, res: any) => void,
    ) => {
      capturedResult = result;
      callback(null, {});
    },
  } as unknown as stubs.TaskHubSidecarServiceClient;

  return {
    stub,
    get capturedResult() {
      return capturedResult;
    },
  };
}

/**
 * Creates a minimal EntityBatchRequest for testing.
 */
function createEntityBatchRequest(entityName: string, entityKey: string): pb.EntityBatchRequest {
  const req = new pb.EntityBatchRequest();
  req.setInstanceid(`@${entityName}@${entityKey}`);

  const opRequest = new pb.OperationRequest();
  opRequest.setOperation("increment");
  opRequest.setRequestid("req-1");
  req.setOperationsList([opRequest]);

  return req;
}

/**
 * Creates a minimal EntityRequest (V2) for testing.
 */
function createEntityRequestV2(entityName: string, entityKey: string): pb.EntityRequest {
  const req = new pb.EntityRequest();
  req.setInstanceid(`@${entityName}@${entityKey}`);

  const historyEvent = new pb.HistoryEvent();
  const signaled = new pb.EntityOperationSignaledEvent();
  signaled.setOperation("increment");
  signaled.setRequestid("req-1");
  historyEvent.setEntityoperationsignaled(signaled);
  req.setOperationrequestsList([historyEvent]);

  return req;
}


describe("TaskHubGrpcWorker", () => {
  describe("Entity Registration", () => {
    describe("addEntity", () => {
      it("should register an entity factory", () => {
        // Arrange
        const worker = new TaskHubGrpcWorker("localhost:4001");

        function myCounter(): ITaskEntity {
          return new CounterEntity();
        }

        // Act
        const name = worker.addEntity(myCounter);

        // Assert
        expect(name).toBe("mycounter"); // Normalized to lowercase
      });

      it("should throw if worker is running", async () => {
        // Arrange
        const worker = new TaskHubGrpcWorker("localhost:4001");
        (worker as any)._isRunning = true; // Simulate running state

        function myCounter(): ITaskEntity {
          return new CounterEntity();
        }

        // Act & Assert
        expect(() => worker.addEntity(myCounter)).toThrow("Cannot add entity while worker is running.");
      });

      it("should register multiple entities", () => {
        // Arrange
        const worker = new TaskHubGrpcWorker("localhost:4001");

        function counter(): ITaskEntity {
          return new CounterEntity();
        }

        function greeter(): ITaskEntity {
          return {
            run: (op: TaskEntityOperation) => `Hello, ${op.name}!`,
          };
        }

        // Act
        const name1 = worker.addEntity(counter);
        const name2 = worker.addEntity(greeter);

        // Assert
        expect(name1).toBe("counter");
        expect(name2).toBe("greeter");
      });
    });

    describe("addNamedEntity", () => {
      it("should register an entity with explicit name", () => {
        // Arrange
        const worker = new TaskHubGrpcWorker("localhost:4001");
        const factory: EntityFactory = () => new CounterEntity();

        // Act
        const name = worker.addNamedEntity("MyCounter", factory);

        // Assert
        expect(name).toBe("mycounter"); // Normalized to lowercase
      });

      it("should throw if worker is running", () => {
        // Arrange
        const worker = new TaskHubGrpcWorker("localhost:4001");
        (worker as any)._isRunning = true; // Simulate running state
        const factory: EntityFactory = () => new CounterEntity();

        // Act & Assert
        expect(() => worker.addNamedEntity("MyCounter", factory)).toThrow(
          "Cannot add entity while worker is running.",
        );
      });

      it("should throw for duplicate entity names", () => {
        // Arrange
        const worker = new TaskHubGrpcWorker("localhost:4001");
        const factory1: EntityFactory = () => new CounterEntity();
        const factory2: EntityFactory = () => new CounterEntity();

        // Act
        worker.addNamedEntity("counter", factory1);

        // Assert
        expect(() => worker.addNamedEntity("Counter", factory2)).toThrow(
          "An entity named 'Counter' already exists.",
        );
      });
    });
  });

  describe("Registration coexistence", () => {
    it("should allow registering entities alongside orchestrators and activities", () => {
      // Arrange
      const worker = new TaskHubGrpcWorker("localhost:4001");

      // eslint-disable-next-line require-yield
      const orchestrator = function* testOrchestrator(): any {
        return "done";
      };

      const activity = function testActivity(): string {
        return "result";
      };

      function testEntity(): ITaskEntity {
        return new CounterEntity();
      }

      // Act - should not throw
      worker.addOrchestrator(orchestrator);
      worker.addActivity(activity);
      worker.addEntity(testEntity);

      // Assert - no exceptions thrown, registration successful
      expect(true).toBe(true);
    });
  });

  describe("Entity Execution Tracking", () => {
    it("should track V1 entity execution in _pendingWorkItems", async () => {
      // Arrange
      const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
      const factory: EntityFactory = () => new CounterEntity();
      worker.addNamedEntity("counter", factory);

      const mockStub = createMockStub();
      const req = createEntityBatchRequest("counter", "key1");

      // Act - call _executeEntity via the wrapper (which tracks the work item)
      (worker as any)._executeEntity(req, COMPLETION_TOKEN, mockStub.stub);

      // Assert - the promise should be tracked while executing
      const pendingWorkItems: Set<Promise<void>> = (worker as any)._pendingWorkItems;
      expect(pendingWorkItems.size).toBe(1);

      // Wait for completion
      await Promise.all(pendingWorkItems);

      // After completion, it should be removed
      expect(pendingWorkItems.size).toBe(0);
    });

    it("should remove V1 entity execution from _pendingWorkItems after completion", async () => {
      // Arrange
      const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
      const factory: EntityFactory = () => new CounterEntity();
      worker.addNamedEntity("counter", factory);

      const mockStub = createMockStub();
      const req = createEntityBatchRequest("counter", "key1");

      // Act
      (worker as any)._executeEntity(req, COMPLETION_TOKEN, mockStub.stub);

      const pendingWorkItems: Set<Promise<void>> = (worker as any)._pendingWorkItems;

      // Wait for completion
      await Promise.all(pendingWorkItems);

      // Assert - should have been cleaned up
      expect(pendingWorkItems.size).toBe(0);
      expect(mockStub.capturedResult).not.toBeNull();
      expect(mockStub.capturedResult!.getCompletiontoken()).toBe(COMPLETION_TOKEN);
    });

    it("should track V2 entity execution in _pendingWorkItems", async () => {
      // Arrange
      const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
      const factory: EntityFactory = () => new CounterEntity();
      worker.addNamedEntity("counter", factory);

      const mockStub = createMockStub();
      const req = createEntityRequestV2("counter", "key1");

      // Act - call _executeEntityV2 via the wrapper (which tracks the work item)
      (worker as any)._executeEntityV2(req, COMPLETION_TOKEN, mockStub.stub);

      // Assert - the promise should be tracked while executing
      const pendingWorkItems: Set<Promise<void>> = (worker as any)._pendingWorkItems;
      expect(pendingWorkItems.size).toBe(1);

      // Wait for completion
      await Promise.all(pendingWorkItems);

      // After completion, it should be removed
      expect(pendingWorkItems.size).toBe(0);
    });

    it("should remove V1 entity execution from _pendingWorkItems even when entity is not found", async () => {
      // Arrange
      const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
      // Do NOT register any entity — the entity lookup will fail

      const mockStub = createMockStub();
      const req = createEntityBatchRequest("nonexistent", "key1");

      // Act
      (worker as any)._executeEntity(req, COMPLETION_TOKEN, mockStub.stub);

      const pendingWorkItems: Set<Promise<void>> = (worker as any)._pendingWorkItems;
      expect(pendingWorkItems.size).toBe(1);

      // Wait for completion
      await Promise.all(pendingWorkItems);

      // Assert - should be cleaned up even on error path
      expect(pendingWorkItems.size).toBe(0);
      expect(mockStub.capturedResult).not.toBeNull();
    });

    it("should track multiple concurrent entity executions in _pendingWorkItems", async () => {
      // Arrange
      const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
      const factory: EntityFactory = () => new CounterEntity();
      worker.addNamedEntity("counter", factory);

      const mockStub1 = createMockStub();
      const mockStub2 = createMockStub();
      const req1 = createEntityBatchRequest("counter", "key1");
      const req2 = createEntityBatchRequest("counter", "key2");

      // Act - fire two concurrent entity executions
      (worker as any)._executeEntity(req1, "token-1", mockStub1.stub);
      (worker as any)._executeEntity(req2, "token-2", mockStub2.stub);

      // Assert - both should be tracked
      const pendingWorkItems: Set<Promise<void>> = (worker as any)._pendingWorkItems;
      expect(pendingWorkItems.size).toBe(2);

      // Wait for all to complete
      await Promise.all(pendingWorkItems);

      // Both should be cleaned up
      expect(pendingWorkItems.size).toBe(0);
    });
  });
});
