// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskEntityState } from "../src/entities/task-entity-state";

describe("TaskEntityState", () => {
  describe("interface structure", () => {
    it("should define hasState as a boolean property", () => {
      // Type check - the interface requires hasState to be a boolean
      const mockState: TaskEntityState = {
        hasState: true,
        getState: <T>(defaultValue?: T) => defaultValue,
        setState: () => {},
      };
      expect(typeof mockState.hasState).toBe("boolean");
    });

    it("should define getState as a method", () => {
      const mockState: TaskEntityState = {
        hasState: false,
        getState: <T>(defaultValue?: T) => defaultValue,
        setState: () => {},
      };
      expect(typeof mockState.getState).toBe("function");
    });

    it("should define setState as a method", () => {
      const mockState: TaskEntityState = {
        hasState: false,
        getState: <T>(defaultValue?: T) => defaultValue,
        setState: () => {},
      };
      expect(typeof mockState.setState).toBe("function");
    });
  });

  describe("semantic contract", () => {
    it("should return default value when no state exists", () => {
      const mockState: TaskEntityState = {
        hasState: false,
        getState: <T>(defaultValue?: T) => defaultValue,
        setState: () => {},
      };
      expect(mockState.getState({ count: 42 })).toEqual({ count: 42 });
    });

    it("should return state when state exists", () => {
      const storedState = { count: 10 };
      const mockState: TaskEntityState = {
        hasState: true,
        getState: <T>() => storedState as unknown as T,
        setState: () => {},
      };
      expect(mockState.getState()).toEqual({ count: 10 });
    });

    it("should track setState calls", () => {
      const setStateCalls: unknown[] = [];
      const mockState: TaskEntityState = {
        hasState: false,
        getState: <T>(defaultValue?: T) => defaultValue,
        setState: (state) => setStateCalls.push(state),
      };

      mockState.setState({ value: "test" });
      mockState.setState(null);

      expect(setStateCalls).toHaveLength(2);
      expect(setStateCalls[0]).toEqual({ value: "test" });
      expect(setStateCalls[1]).toBeNull();
    });

    it("should document deletion semantics (null deletes state)", () => {
      // This test documents the expected behavior:
      // Setting state to null or undefined should delete the entity state
      let currentState: unknown = { count: 5 };
      let hasState = true;

      const mockState: TaskEntityState = {
        get hasState() {
          return hasState;
        },
        getState: <T>(defaultValue?: T) => (hasState ? (currentState as unknown as T) : defaultValue),
        setState: (state) => {
          currentState = state;
          hasState = state !== null && state !== undefined;
        },
      };

      expect(mockState.hasState).toBe(true);
      mockState.setState(null);
      expect(mockState.hasState).toBe(false);
    });
  });
});
