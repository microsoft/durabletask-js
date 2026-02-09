// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ITaskEntity, TaskEntity, EntityFactory } from "../src/entities/task-entity";
import { TaskEntityOperation } from "../src/entities/task-entity-operation";
import { TaskEntityContext } from "../src/entities/task-entity-context";
import { TaskEntityState } from "../src/entities/task-entity-state";
import { EntityInstanceId } from "../src/entities/entity-instance-id";

// Helper to create mock operation
function createMockOperation(
  name: string,
  input: unknown = undefined,
  initialState: unknown = undefined,
): { operation: TaskEntityOperation; stateChanges: unknown[] } {
  const stateChanges: unknown[] = [];
  let currentState = initialState;
  let hasState = initialState !== undefined && initialState !== null;

  const mockState: TaskEntityState = {
    get hasState() {
      return hasState;
    },
    getState: <T>(defaultValue?: T) => (hasState ? (currentState as unknown as T) : defaultValue),
    setState: (state) => {
      stateChanges.push(state);
      currentState = state;
      hasState = state !== undefined && state !== null;
    },
  };

  const mockContext: TaskEntityContext = {
    id: new EntityInstanceId("testEntity", "testKey"),
    signalEntity: () => {},
    scheduleNewOrchestration: () => "generated-id",
  };

  const operation: TaskEntityOperation = {
    name,
    context: mockContext,
    state: mockState,
    get hasInput() {
      return input !== undefined;
    },
    getInput: <T>() => input as T | undefined,
  };

  return { operation, stateChanges };
}

describe("ITaskEntity", () => {
  it("should define run method that accepts TaskEntityOperation", () => {
    const entity: ITaskEntity = {
      run: () => Promise.resolve("result"),
    };
    expect(typeof entity.run).toBe("function");
  });

  it("should allow returning Promise from run", async () => {
    const entity: ITaskEntity = {
      run: async () => "async result",
    };
    const { operation } = createMockOperation("test");
    const result = await entity.run(operation);
    expect(result).toBe("async result");
  });

  it("should allow returning synchronous value from run", async () => {
    const entity: ITaskEntity = {
      run: () => "sync result",
    };
    const { operation } = createMockOperation("test");
    const result = await Promise.resolve(entity.run(operation));
    expect(result).toBe("sync result");
  });
});

describe("EntityFactory", () => {
  it("should be a function that creates an entity", () => {
    const factory: EntityFactory = () => ({
      run: () => Promise.resolve(),
    });
    const entity = factory();
    expect(entity.run).toBeDefined();
  });
});

describe("TaskEntity", () => {
  // A simple counter entity for testing
  class CounterEntity extends TaskEntity<{ count: number }> {
    add(amount: number): number {
      this.state.count += amount;
      return this.state.count;
    }

    get(): number {
      return this.state.count;
    }

    reset(): void {
      this.state.count = 0;
    }

    protected initializeState(): { count: number } {
      return { count: 0 };
    }
  }

  describe("method dispatch", () => {
    it("should dispatch to method matching operation name", async () => {
      const entity = new CounterEntity();
      const { operation } = createMockOperation("add", 5, { count: 10 });

      const result = await entity.run(operation);

      expect(result).toBe(15);
    });

    it("should be case-insensitive for operation names", async () => {
      const entity = new CounterEntity();
      const { operation: op1 } = createMockOperation("ADD", 3, { count: 0 });
      const { operation: op2 } = createMockOperation("Add", 3, { count: 0 });
      const { operation: op3 } = createMockOperation("add", 3, { count: 0 });

      const result1 = await entity.run(op1);
      const result2 = await entity.run(op2);
      const result3 = await entity.run(op3);

      expect(result1).toBe(3);
      expect(result2).toBe(3);
      expect(result3).toBe(3);
    });

    it("should throw error for unknown operation", async () => {
      const entity = new CounterEntity();
      const { operation } = createMockOperation("unknownOp", undefined, { count: 0 });

      await expect(entity.run(operation)).rejects.toThrow(
        "No suitable method found for entity operation 'unknownOp'",
      );
    });

    it("should call method without input when no input provided", async () => {
      const entity = new CounterEntity();
      const { operation } = createMockOperation("get", undefined, { count: 42 });

      const result = await entity.run(operation);

      expect(result).toBe(42);
    });

    it("should call method with input when input provided", async () => {
      const entity = new CounterEntity();
      const { operation } = createMockOperation("add", 100, { count: 0 });

      const result = await entity.run(operation);

      expect(result).toBe(100);
    });
  });

  describe("state management", () => {
    it("should hydrate state from operation", async () => {
      const entity = new CounterEntity();
      const { operation } = createMockOperation("get", undefined, { count: 999 });

      const result = await entity.run(operation);

      expect(result).toBe(999);
    });

    it("should call initializeState when no state exists", async () => {
      const entity = new CounterEntity();
      const { operation } = createMockOperation("get", undefined, undefined);

      const result = await entity.run(operation);

      expect(result).toBe(0); // Default from initializeState
    });

    it("should persist state after operation", async () => {
      const entity = new CounterEntity();
      const { operation, stateChanges } = createMockOperation("add", 10, { count: 5 });

      await entity.run(operation);

      expect(stateChanges).toHaveLength(1);
      expect(stateChanges[0]).toEqual({ count: 15 });
    });
  });

  describe("implicit delete operation", () => {
    it("should delete state when 'delete' operation is called", async () => {
      const entity = new CounterEntity();
      const { operation, stateChanges } = createMockOperation("delete", undefined, { count: 100 });

      await entity.run(operation);

      // The last state change should be null (deletion)
      expect(stateChanges[stateChanges.length - 1]).toBeNull();
    });

    it("should handle delete case-insensitively", async () => {
      const entity = new CounterEntity();
      const { operation, stateChanges } = createMockOperation("DELETE", undefined, { count: 50 });

      await entity.run(operation);

      expect(stateChanges[stateChanges.length - 1]).toBeNull();
    });
  });

  describe("async methods", () => {
    class AsyncEntity extends TaskEntity<{ value: string }> {
      async fetchData(): Promise<string> {
        // Simulate async operation
        return new Promise((resolve) => {
          setTimeout(() => resolve("async data"), 10);
        });
      }

      async processInput(input: string): Promise<string> {
        this.state.value = input;
        return `processed: ${input}`;
      }

      protected initializeState(): { value: string } {
        return { value: "" };
      }
    }

    it("should handle async methods", async () => {
      const entity = new AsyncEntity();
      const { operation } = createMockOperation("fetchData", undefined, { value: "" });

      const result = await entity.run(operation);

      expect(result).toBe("async data");
    });

    it("should handle async methods with input", async () => {
      const entity = new AsyncEntity();
      const { operation, stateChanges } = createMockOperation(
        "processInput",
        "test input",
        { value: "" },
      );

      const result = await entity.run(operation);

      expect(result).toBe("processed: test input");
      expect((stateChanges[0] as { value: string }).value).toBe("test input");
    });
  });

  describe("context access", () => {
    class ContextAwareEntity extends TaskEntity<{ signals: number }> {
      signalOther(): void {
        // Access context to signal another entity
        if (this.context) {
          this.context.signalEntity(
            new EntityInstanceId("other", "key"),
            "ping",
          );
          this.state.signals++;
        }
      }

      getId(): string {
        return this.context?.id.toString() ?? "";
      }

      protected initializeState(): { signals: number } {
        return { signals: 0 };
      }
    }

    it("should provide access to context during operation", async () => {
      const entity = new ContextAwareEntity();
      const { operation } = createMockOperation("getId", undefined, { signals: 0 });

      const result = await entity.run(operation);

      expect(result).toBe("@testentity@testKey");
    });

    it("should allow signaling entities through context", async () => {
      const entity = new ContextAwareEntity();
      const { operation, stateChanges } = createMockOperation(
        "signalOther",
        undefined,
        { signals: 0 },
      );

      await entity.run(operation);

      expect((stateChanges[0] as { signals: number }).signals).toBe(1);
    });
  });

  describe("custom delete override", () => {
    class EntityWithCustomDelete extends TaskEntity<{ deleted: boolean }> {
      delete(): string {
        this.state.deleted = true;
        return "custom delete";
      }

      protected initializeState(): { deleted: boolean } {
        return { deleted: false };
      }
    }

    it("should use custom delete method when defined", async () => {
      const entity = new EntityWithCustomDelete();
      const { operation, stateChanges } = createMockOperation(
        "delete",
        undefined,
        { deleted: false },
      );

      const result = await entity.run(operation);

      expect(result).toBe("custom delete");
      expect((stateChanges[0] as { deleted: boolean }).deleted).toBe(true);
    });
  });

  describe("multi-level inheritance", () => {
    // Base entity class with shared operations
    abstract class BaseEntity extends TaskEntity<{ value: number }> {
      baseOp(): string {
        return "from-base";
      }

      sharedOp(): string {
        return "base-shared";
      }

      protected initializeState(): { value: number } {
        return { value: 0 };
      }
    }

    // Mid-level entity class
    class MidEntity extends BaseEntity {
      midOp(): string {
        return "from-mid";
      }

      // Override sharedOp from BaseEntity
      sharedOp(): string {
        return "mid-shared";
      }
    }

    // Leaf-level entity class (three levels deep)
    class LeafEntity extends MidEntity {
      leafOp(): string {
        return "from-leaf";
      }
    }

    it("should find methods defined on the immediate class", async () => {
      const entity = new MidEntity();
      const { operation } = createMockOperation("midOp", undefined, { value: 0 });

      const result = await entity.run(operation);

      expect(result).toBe("from-mid");
    });

    it("should find methods defined on a base class", async () => {
      const entity = new MidEntity();
      const { operation } = createMockOperation("baseOp", undefined, { value: 0 });

      const result = await entity.run(operation);

      expect(result).toBe("from-base");
    });

    it("should use overridden methods from derived class", async () => {
      const entity = new MidEntity();
      const { operation } = createMockOperation("sharedOp", undefined, { value: 0 });

      const result = await entity.run(operation);

      // MidEntity overrides sharedOp, so findMethod finds it on MidEntity's prototype first
      expect(result).toBe("mid-shared");
    });

    it("should find methods across three-level inheritance chain", async () => {
      const entity = new LeafEntity();

      // Method on LeafEntity
      const { operation: op1 } = createMockOperation("leafOp", undefined, { value: 0 });
      expect(await entity.run(op1)).toBe("from-leaf");

      // Method on MidEntity
      const { operation: op2 } = createMockOperation("midOp", undefined, { value: 0 });
      expect(await entity.run(op2)).toBe("from-mid");

      // Method on BaseEntity
      const { operation: op3 } = createMockOperation("baseOp", undefined, { value: 0 });
      expect(await entity.run(op3)).toBe("from-base");
    });

    it("should be case-insensitive for inherited methods", async () => {
      const entity = new LeafEntity();
      const { operation } = createMockOperation("BASEOP", undefined, { value: 0 });

      const result = await entity.run(operation);

      expect(result).toBe("from-base");
    });

    it("should throw for unknown operations on inherited entities", async () => {
      const entity = new LeafEntity();
      const { operation } = createMockOperation("nonExistent", undefined, { value: 0 });

      await expect(entity.run(operation)).rejects.toThrow(
        "No suitable method found for entity operation 'nonExistent'",
      );
    });
  });
});
