// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Registry } from "../src/worker/registry";
import { TaskEntity } from "../src/entities/task-entity";
import { TaskEntityOperation } from "../src/entities/task-entity-operation";
import { ITaskEntity, EntityFactory } from "../src/entities/task-entity";

/**
 * Test entity for registry tests.
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

/**
 * Simple functional entity for testing.
 */
function _simpleEntity(): ITaskEntity {
  return {
    run(operation: TaskEntityOperation): unknown {
      return operation.name;
    },
  };
}

describe("Registry", () => {
  describe("Entity Registration", () => {
    describe("addEntity", () => {
      it("should register an entity factory with auto-detected name", () => {
        // Arrange
        const registry = new Registry();

        // Named factory function
        function myCounter(): ITaskEntity {
          return new CounterEntity();
        }

        // Act
        const name = registry.addEntity(myCounter);

        // Assert
        expect(name).toBe("mycounter"); // Normalized to lowercase
        expect(registry.getEntity("myCounter")).toBe(myCounter);
        expect(registry.getEntity("MYCOUNTER")).toBe(myCounter);
      });

      it("should throw if factory is null", () => {
        // Arrange
        const registry = new Registry();

        // Act & Assert
        expect(() => registry.addEntity(null as any)).toThrow("An entity factory argument is required.");
      });

      it("should throw if entity with same name already exists", () => {
        // Arrange
        const registry = new Registry();
        function counter(): ITaskEntity {
          return new CounterEntity();
        }

        // Act
        registry.addEntity(counter);

        // Assert
        expect(() => registry.addEntity(counter)).toThrow("An entity named 'counter' already exists.");
      });
    });

    describe("addNamedEntity", () => {
      it("should register an entity factory with explicit name", () => {
        // Arrange
        const registry = new Registry();
        const factory: EntityFactory = () => new CounterEntity();

        // Act
        registry.addNamedEntity("MyEntity", factory);

        // Assert
        expect(registry.getEntity("MyEntity")).toBe(factory);
        expect(registry.getEntity("myentity")).toBe(factory); // Case-insensitive
        expect(registry.getEntity("MYENTITY")).toBe(factory); // Case-insensitive
      });

      it("should throw if name is empty", () => {
        // Arrange
        const registry = new Registry();
        const factory: EntityFactory = () => new CounterEntity();

        // Act & Assert
        expect(() => registry.addNamedEntity("", factory)).toThrow("A non-empty entity name is required.");
      });

      it("should throw if factory is null", () => {
        // Arrange
        const registry = new Registry();

        // Act & Assert
        expect(() => registry.addNamedEntity("test", null as any)).toThrow(
          "An entity factory argument is required.",
        );
      });

      it("should throw if entity with same name already exists (case-insensitive)", () => {
        // Arrange
        const registry = new Registry();
        const factory1: EntityFactory = () => new CounterEntity();
        const factory2: EntityFactory = () => new CounterEntity();

        // Act
        registry.addNamedEntity("Counter", factory1);

        // Assert - same name different case should fail
        expect(() => registry.addNamedEntity("COUNTER", factory2)).toThrow(
          "An entity named 'COUNTER' already exists.",
        );
      });
    });

    describe("getEntity", () => {
      it("should return undefined for non-existent entity", () => {
        // Arrange
        const registry = new Registry();

        // Act & Assert
        expect(registry.getEntity("nonexistent")).toBeUndefined();
      });

      it("should return undefined for empty name", () => {
        // Arrange
        const registry = new Registry();

        // Act & Assert
        expect(registry.getEntity("")).toBeUndefined();
      });

      it("should return the correct entity factory (case-insensitive)", () => {
        // Arrange
        const registry = new Registry();
        const factory: EntityFactory = () => new CounterEntity();
        registry.addNamedEntity("counter", factory);

        // Act & Assert
        expect(registry.getEntity("counter")).toBe(factory);
        expect(registry.getEntity("Counter")).toBe(factory);
        expect(registry.getEntity("COUNTER")).toBe(factory);
        expect(registry.getEntity("CoUnTeR")).toBe(factory);
      });
    });
  });

  describe("Orchestrator Registration", () => {
    it("should not interfere with entity registration", () => {
      // Arrange
      const registry = new Registry();
      const entityFactory: EntityFactory = () => new CounterEntity();
      const orchestrator = function myOrchestrator(): void {};

      // Act
      registry.addOrchestrator(orchestrator);
      registry.addNamedEntity("myEntity", entityFactory);

      // Assert
      expect(registry.getOrchestrator("myOrchestrator")).toBe(orchestrator);
      expect(registry.getEntity("myEntity")).toBe(entityFactory);
    });
  });

  describe("Activity Registration", () => {
    it("should not interfere with entity registration", () => {
      // Arrange
      const registry = new Registry();
      const entityFactory: EntityFactory = () => new CounterEntity();
      const activity = function myActivity(): string {
        return "result";
      };

      // Act
      registry.addActivity(activity);
      registry.addNamedEntity("myEntity", entityFactory);

      // Assert
      expect(registry.getActivity("myActivity")).toBe(activity);
      expect(registry.getEntity("myEntity")).toBe(entityFactory);
    });
  });
});
