// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { TaskEntity } from "../src/entities/task-entity";
import { ITaskEntity, EntityFactory } from "../src/entities/task-entity";
import { TaskEntityOperation } from "../src/entities/task-entity-operation";

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
});
