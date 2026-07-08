// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityFactory, EntityInstanceId, TaskEntityOperation } from "@microsoft/durabletask-js";
import {
  ClassicEntityContext,
  DurableEntityContext,
  wrapEntity,
} from "../../src/entity-context";

/** Builds a fake core TaskEntityOperation backed by an in-memory state cell. */
function createFakeOperation(options: {
  name: string;
  input?: unknown;
  initialState?: unknown;
}): { operation: TaskEntityOperation; getStoredState: () => unknown } {
  let stored: unknown = options.initialState;
  let hasState = options.initialState !== undefined;

  const operation = {
    name: options.name,
    context: {
      id: new EntityInstanceId("Counter", "user-1"),
      signalEntity: jest.fn(),
      scheduleNewOrchestration: jest.fn(),
    },
    state: {
      get hasState() {
        return hasState;
      },
      getState<T>(defaultValue?: T): T | undefined {
        return (hasState ? (stored as T) : defaultValue) as T | undefined;
      },
      setState(state: unknown): void {
        stored = state;
        hasState = state !== undefined && state !== null;
      },
    },
    hasInput: options.input !== undefined,
    getInput<T>(): T | undefined {
      return options.input as T | undefined;
    },
  };

  return { operation: operation as unknown as TaskEntityOperation, getStoredState: () => stored };
}

describe("DurableEntityContext", () => {
  it("exposes identity, operation name, input, and state accessors", () => {
    const { operation, getStoredState } = createFakeOperation({
      name: "add",
      input: 5,
      initialState: 10,
    });
    const df = new DurableEntityContext(operation);

    expect(df.operationName).toBe("add");
    expect(df.entityName).toBe("counter");
    expect(df.entityKey).toBe("user-1");
    expect(df.instanceId).toBe("@counter@user-1");
    expect(df.getInput<number>()).toBe(5);
    expect(df.getState<number>()).toBe(10);

    df.setState(15);
    expect(getStoredState()).toBe(15);
  });

  it("reports isNewlyConstructed based on whether prior state existed", () => {
    const fresh = new DurableEntityContext(createFakeOperation({ name: "add" }).operation);
    expect(fresh.isNewlyConstructed).toBe(true);

    const existing = new DurableEntityContext(
      createFakeOperation({ name: "add", initialState: 1 }).operation,
    );
    expect(existing.isNewlyConstructed).toBe(false);
  });

  it("exposes the entity id object and signals other entities through the core context", () => {
    const { operation } = createFakeOperation({ name: "op", initialState: 1 });
    const df = new DurableEntityContext(operation);

    expect(df.entityId).toBe(operation.context.id);
    expect(df.entityId.toString()).toBe("@counter@user-1");

    const target = new EntityInstanceId("Other", "k-9");
    df.signalEntity(target, "poke", 42);
    expect(operation.context.signalEntity).toHaveBeenCalledWith(target, "poke", 42);
  });

  it("returns the initializer default when there is no state", () => {
    const { operation } = createFakeOperation({ name: "get" });
    const df = new DurableEntityContext(operation);

    expect(df.getState<number>(() => 0)).toBe(0);
  });

  it("destructOnExit clears the state", () => {
    const { operation, getStoredState } = createFakeOperation({ name: "delete", initialState: 42 });
    const df = new DurableEntityContext(operation);

    df.destructOnExit();
    expect(getStoredState()).toBeUndefined();
  });

  it("resolveResult prefers an explicitly set result over the fallback", () => {
    const { operation } = createFakeOperation({ name: "op" });
    const df = new DurableEntityContext(operation);

    expect(df.resolveResult("fallback")).toBe("fallback");
    df.return("explicit");
    expect(df.resolveResult("fallback")).toBe("explicit");
  });
});

describe("wrapEntity", () => {
  it("returns a zero-argument core factory unchanged", () => {
    const factory: EntityFactory = () => ({ run: jest.fn() });
    expect(wrapEntity(factory)).toBe(factory);
  });

  it("wraps a classic entity function and dispatches operations through context.df", async () => {
    const classic = (context: ClassicEntityContext) => {
      const current = context.df.getState<number>(() => 0) ?? 0;
      const next = current + (context.df.getInput<number>() ?? 0);
      context.df.setState(next);
      return next;
    };

    const factory = wrapEntity(classic);
    expect(factory).not.toBe(classic);

    const { operation, getStoredState } = createFakeOperation({
      name: "add",
      input: 7,
      initialState: 3,
    });
    const result = await factory().run(operation);

    expect(result).toBe(10);
    expect(getStoredState()).toBe(10);
  });

  it("uses an explicitly set result over the function return value", async () => {
    const classic = (context: ClassicEntityContext) => {
      context.df.return("explicit-result");
      return "ignored-return";
    };

    const factory = wrapEntity(classic);
    const { operation } = createFakeOperation({ name: "op" });

    await expect(factory().run(operation)).resolves.toBe("explicit-result");
  });
});
