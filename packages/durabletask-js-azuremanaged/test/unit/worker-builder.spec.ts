// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DurableTaskAzureManagedWorkerBuilder, createAzureManagedWorkerBuilder } from "../../src/worker-builder";
import { TaskEntity, ITaskEntity, TaskEntityOperation } from "@microsoft/durabletask-js";

// Simple test entity for registration testing
class CounterEntity extends TaskEntity<number> {
  add(operation: TaskEntityOperation): void {
    const amount = operation.getInput<number>() ?? 1;
    this.state = (this.state ?? 0) + amount;
  }
}

// Factory functions for testing
function createCounterEntity(): ITaskEntity {
  return new CounterEntity();
}

describe("DurableTaskAzureManagedWorkerBuilder", () => {
  const ENDPOINT = "localhost:8080";
  const TASKHUB = "test";

  describe("addEntity", () => {
    it("should register an entity factory and return the builder for chaining", () => {
      const builder = new DurableTaskAzureManagedWorkerBuilder();

      const result = builder.endpoint(ENDPOINT, TASKHUB, null).addEntity(createCounterEntity);

      expect(result).toBe(builder);
    });

    it("should register an entity that gets added to the worker on build", () => {
      const builder = new DurableTaskAzureManagedWorkerBuilder();

      const worker = builder.endpoint(ENDPOINT, TASKHUB, null).addEntity(createCounterEntity).build();

      // The worker should have the entity registered. We verify by checking that
      // attempting to register it again with the same name throws a duplicate error.
      expect(() => worker.addNamedEntity("createCounterEntity", createCounterEntity)).toThrow();
    });
  });

  describe("addNamedEntity", () => {
    it("should register a named entity factory and return the builder for chaining", () => {
      const builder = new DurableTaskAzureManagedWorkerBuilder();

      const result = builder.endpoint(ENDPOINT, TASKHUB, null).addNamedEntity("MyCounter", createCounterEntity);

      expect(result).toBe(builder);
    });

    it("should register a named entity that gets added to the worker on build", () => {
      const builder = new DurableTaskAzureManagedWorkerBuilder();

      const worker = builder.endpoint(ENDPOINT, TASKHUB, null).addNamedEntity("MyCounter", createCounterEntity).build();

      // Entity names are lowercased. Registering the same lowercased name should throw.
      expect(() => worker.addNamedEntity("mycounter", createCounterEntity)).toThrow();
    });
  });

  describe("fluent chaining with entities", () => {
    it("should support registering orchestrators, activities, and entities together", () => {
      const orchestrator = async function* testOrchestrator() {
        yield;
        return "done";
      };
      const activity = async () => "result";

      const builder = new DurableTaskAzureManagedWorkerBuilder();

      const worker = builder
        .endpoint(ENDPOINT, TASKHUB, null)
        .addNamedOrchestrator("myOrch", orchestrator)
        .addNamedActivity("myActivity", activity)
        .addNamedEntity("MyCounter", createCounterEntity)
        .build();

      expect(worker).toBeDefined();
    });
  });

  describe("createAzureManagedWorkerBuilder", () => {
    it("should create a builder that supports entity registration", () => {
      const builder = createAzureManagedWorkerBuilder(ENDPOINT, TASKHUB, null);

      const result = builder.addNamedEntity("MyCounter", createCounterEntity);

      expect(result).toBe(builder);
    });
  });
});
