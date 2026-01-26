// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskEntityOperation } from "../src/entities/task-entity-operation";
import { TaskEntityContext } from "../src/entities/task-entity-context";
import { TaskEntityState } from "../src/entities/task-entity-state";
import { EntityInstanceId } from "../src/entities/entity-instance-id";

describe("TaskEntityOperation", () => {
  // Helper to create a mock context
  function createMockContext(entityId: EntityInstanceId): TaskEntityContext {
    return {
      id: entityId,
      signalEntity: () => {},
      scheduleNewOrchestration: () => "generated-id",
    };
  }

  // Helper to create a mock state
  function createMockState(initialState: unknown): TaskEntityState {
    let currentState = initialState;
    let hasState = initialState !== undefined && initialState !== null;
    return {
      get hasState() {
        return hasState;
      },
      getState: <T>(defaultValue?: T) => (hasState ? (currentState as T) : defaultValue),
      setState: (state) => {
        currentState = state;
        hasState = state !== undefined && state !== null;
      },
    };
  }

  // Helper to create a mock operation
  function createMockOperation(
    name: string,
    input: unknown = undefined,
    entityId = new EntityInstanceId("counter", "myCounter"),
    initialState: unknown = undefined,
  ): TaskEntityOperation {
    const context = createMockContext(entityId);
    const state = createMockState(initialState);
    return {
      name,
      context,
      state,
      get hasInput() {
        return input !== undefined;
      },
      getInput: <T>() => input as T | undefined,
    };
  }

  describe("interface structure", () => {
    it("should define name as a string property", () => {
      const op = createMockOperation("increment");
      expect(typeof op.name).toBe("string");
    });

    it("should define context property", () => {
      const op = createMockOperation("increment");
      expect(op.context).toBeDefined();
      expect(op.context.id).toBeInstanceOf(EntityInstanceId);
    });

    it("should define state property", () => {
      const op = createMockOperation("increment");
      expect(op.state).toBeDefined();
      expect(typeof op.state.hasState).toBe("boolean");
    });

    it("should define hasInput as a boolean property", () => {
      const op = createMockOperation("increment");
      expect(typeof op.hasInput).toBe("boolean");
    });

    it("should define getInput as a method", () => {
      const op = createMockOperation("increment");
      expect(typeof op.getInput).toBe("function");
    });
  });

  describe("semantic contract", () => {
    describe("name property", () => {
      it("should return the operation name", () => {
        const op = createMockOperation("add");
        expect(op.name).toBe("add");
      });

      it("should preserve case of operation name", () => {
        const op = createMockOperation("AddItem");
        expect(op.name).toBe("AddItem");
      });
    });

    describe("context property", () => {
      it("should provide access to entity ID", () => {
        const entityId = new EntityInstanceId("myEntity", "key123");
        const op = createMockOperation("test", undefined, entityId);
        expect(op.context.id.name).toBe("myentity");
        expect(op.context.id.key).toBe("key123");
      });

      it("should provide signalEntity method", () => {
        const op = createMockOperation("test");
        expect(() =>
          op.context.signalEntity(new EntityInstanceId("other", "key"), "ping"),
        ).not.toThrow();
      });

      it("should provide scheduleNewOrchestration method", () => {
        const op = createMockOperation("test");
        const instanceId = op.context.scheduleNewOrchestration("TestOrch");
        expect(typeof instanceId).toBe("string");
      });
    });

    describe("state property", () => {
      it("should have hasState=false when no initial state", () => {
        const op = createMockOperation("test");
        expect(op.state.hasState).toBe(false);
      });

      it("should have hasState=true with initial state", () => {
        const op = createMockOperation("test", undefined, undefined, { count: 5 });
        expect(op.state.hasState).toBe(true);
      });

      it("should allow getting state", () => {
        const op = createMockOperation("test", undefined, undefined, { count: 10 });
        expect(op.state.getState<{ count: number }>()?.count).toBe(10);
      });

      it("should allow setting state", () => {
        const op = createMockOperation("test", undefined, undefined, { count: 0 });
        op.state.setState({ count: 42 });
        expect(op.state.getState<{ count: number }>()?.count).toBe(42);
      });
    });

    describe("hasInput property", () => {
      it("should return false when no input provided", () => {
        const op = createMockOperation("reset");
        expect(op.hasInput).toBe(false);
      });

      it("should return true when input is provided", () => {
        const op = createMockOperation("add", 5);
        expect(op.hasInput).toBe(true);
      });

      it("should return true for null input (explicit null is input)", () => {
        const op = createMockOperation("setNull", null);
        expect(op.hasInput).toBe(true);
      });

      it("should return true for falsy inputs like 0", () => {
        const op = createMockOperation("setZero", 0);
        expect(op.hasInput).toBe(true);
      });
    });

    describe("getInput method", () => {
      it("should return undefined when no input", () => {
        const op = createMockOperation("noInput");
        expect(op.getInput()).toBeUndefined();
      });

      it("should return primitive input", () => {
        const op = createMockOperation("addNumber", 42);
        expect(op.getInput<number>()).toBe(42);
      });

      it("should return object input", () => {
        const op = createMockOperation("update", { name: "Bob", age: 30 });
        const input = op.getInput<{ name: string; age: number }>();
        expect(input?.name).toBe("Bob");
        expect(input?.age).toBe(30);
      });

      it("should return array input", () => {
        const op = createMockOperation("setItems", [1, 2, 3]);
        expect(op.getInput<number[]>()).toEqual([1, 2, 3]);
      });
    });
  });
});
