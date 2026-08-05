// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from "@azure/functions";
import { TaskEntity } from "@microsoft/durabletask-js";
import {
  EntityOperationError,
  createOrchestrationHarness,
  runActivity,
  runEntity,
  runOrchestrator,
  test,
} from "../../src/testing";
import type { EntityHandler, OrchestrationContext, OrchestrationHandler } from "../../src";

describe("durable-functions/testing", () => {
  it("runs an activity with a Functions invocation context", async () => {
    const result = await runActivity(
      (input: string, context: InvocationContext) => `${context.functionName}:${input}`,
      "World",
      { functionName: "sayHello" },
    );

    expect(result).toBe("sayHello:World");
  });

  it("runs a classic orchestrator with inline Functions-style activities", async () => {
    const orchestrator: OrchestrationHandler = function* (
      context: OrchestrationContext,
    ): Generator<unknown, unknown, unknown> {
      const name = context.df.getInput<string>();
      return yield context.df.callActivity("sayHello", name);
    };

    const result = await runOrchestrator<string>(orchestrator, {
      input: "World",
      activities: {
        sayHello: (input: unknown) => `Hello, ${String(input)}!`,
      },
      instanceId: "one-shot",
    });

    expect(result).toMatchObject({
      instanceId: "one-shot",
      status: "Completed",
      output: "Hello, World!",
    });
  });

  it("returns deserialized custom status and failure details", async () => {
    const orchestrator: OrchestrationHandler = function* (
      context: OrchestrationContext,
    ): Generator<unknown, void, unknown> {
      context.df.setCustomStatus({ phase: "starting" });
      yield context.df.callActivity("fail");
    };

    const result = await runOrchestrator(orchestrator, {
      activities: {
        fail: () => {
          throw new TypeError("activity failed");
        },
      },
    });

    expect(result.status).toBe("Failed");
    expect(result.customStatus).toEqual({ phase: "starting" });
    expect(result.failure).toMatchObject({
      errorType: expect.any(String),
      message: expect.stringContaining("activity failed"),
    });
  });

  it("stops one-shot resources when waiting times out", async () => {
    const orchestrator: OrchestrationHandler = function* (
      context: OrchestrationContext,
    ): Generator<unknown, void, unknown> {
      yield context.df.waitForExternalEvent("never");
    };

    await expect(runOrchestrator(orchestrator, { timeoutMs: 10 })).rejects.toThrow("Timeout waiting for orchestration");

    await expect(runOrchestrator(async () => "still runs", { timeoutMs: 1000 })).resolves.toMatchObject({
      status: "Completed",
      output: "still runs",
    });
  });

  it("drives external events through an orchestration harness", async () => {
    const harness = createOrchestrationHarness();
    harness.registerOrchestrator("approval", function* (context: OrchestrationContext): Generator<
      unknown,
      { approved: boolean },
      boolean
    > {
      const approved = yield context.df.waitForExternalEvent<boolean>("approved");
      return { approved };
    });

    try {
      const run = await harness.start<{ approved: boolean }>("approval", {
        instanceId: "approval-1",
      });
      await run.waitForStart();

      expect(run.status).toBe("Running");

      await run.raiseEvent("approved", true);
      const result = await run.waitForCompletion();

      expect(result.output).toEqual({ approved: true });
      expect(run.output).toEqual({ approved: true });
    } finally {
      await harness.dispose();
    }
  });

  it("supports real-time durable timers", async () => {
    const harness = createOrchestrationHarness({ timeoutMs: 1000 });
    harness.registerOrchestrator("timer", function* (context: OrchestrationContext): Generator<
      unknown,
      string,
      unknown
    > {
      yield context.df.createTimer(new Date(context.df.currentUtcDateTime.getTime() + 10));
      return "timer fired";
    });

    try {
      const run = await harness.start<string>("timer");
      await expect(run.waitForCompletion()).resolves.toMatchObject({
        status: "Completed",
        output: "timer fired",
      });
    } finally {
      await harness.dispose();
    }
  });

  it("terminates, suspends, and resumes orchestration runs", async () => {
    const harness = createOrchestrationHarness();
    harness.registerOrchestrator("interactive", function* (context: OrchestrationContext): Generator<
      unknown,
      string,
      unknown
    > {
      yield context.df.waitForExternalEvent("finish");
      return "completed";
    });

    try {
      const suspended = await harness.start("interactive", { instanceId: "suspended" });
      await suspended.waitForStart();
      await suspended.suspend();
      expect(suspended.status).toBe("Suspended");
      await suspended.resume();
      expect(suspended.status).toBe("Running");

      const terminated = await harness.start("interactive", { instanceId: "terminated" });
      await terminated.waitForStart();
      await terminated.terminate({ reason: "test" });
      const result = await terminated.waitForCompletion();

      expect(result).toMatchObject({
        status: "Terminated",
        output: { reason: "test" },
      });
    } finally {
      await harness.dispose();
    }
  });

  it("runs a classic entity batch and deserializes state and operation results", async () => {
    const entity: EntityHandler<number> = (context) => {
      const current = context.df.getState(() => 0) ?? 0;
      switch (context.df.operationName) {
        case "add":
          context.df.setState(current + (context.df.getInput<number>() ?? 0));
          break;
        case "get":
          context.df.return(current);
          break;
      }
    };

    const result = await runEntity<number>(entity, {
      initialState: 2,
      entityName: "Counter",
      entityKey: "Key",
      operations: [{ name: "add", input: 3 }, { name: "get" }],
    });

    expect(result).toEqual({
      state: 5,
      results: [undefined, 5],
    });
  });

  it("runs a core-native entity factory without exposing the core executor", async () => {
    class Counter extends TaskEntity<number> {
      protected initializeState(): number {
        return 0;
      }

      add(value: number): number {
        this.state += value;
        return this.state;
      }
    }

    const result = await runEntity<number>(() => new Counter(), {
      operations: [{ name: "add", input: 4 }],
    });

    expect(result).toEqual({ state: 4, results: [4] });
  });

  it("surfaces entity operation failures without committing their state", async () => {
    const entity: EntityHandler<number> = (context) => {
      context.df.setState(99);
      throw new RangeError("invalid operation");
    };

    await expect(
      runEntity(entity, {
        initialState: 1,
        operations: [{ name: "break" }],
      }),
    ).rejects.toMatchObject({
      name: "EntityOperationError",
      operationName: "break",
      operationIndex: 0,
      errorType: "RangeError",
      message: expect.stringContaining("invalid operation"),
    } satisfies Partial<EntityOperationError>);
  });

  it("exposes the helpers through the test namespace", () => {
    expect(test).toEqual({
      createOrchestrationHarness,
      runActivity,
      runEntity,
      runOrchestrator,
    });
  });
});
