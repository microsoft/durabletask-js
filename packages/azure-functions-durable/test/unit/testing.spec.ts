// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from "@azure/functions";
import { TaskEntity, TestOrchestrationWorker } from "@microsoft/durabletask-js";
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

  it("bounds cleanup without cancelling already-running activity code", async () => {
    let activityStarted!: () => void;
    let activityFinished!: () => void;
    const started = new Promise<void>((resolve) => {
      activityStarted = resolve;
    });
    const finished = new Promise<void>((resolve) => {
      activityFinished = resolve;
    });
    let sideEffectCompleted = false;
    const orchestrator: OrchestrationHandler = function* (
      context: OrchestrationContext,
    ): Generator<unknown, void, unknown> {
      yield context.df.callActivity("never");
    };

    const execution = runOrchestrator(orchestrator, {
      timeoutMs: 25,
      activities: {
        never: () => {
          activityStarted();
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              sideEffectCompleted = true;
              activityFinished();
              resolve();
            }, 250);
          });
        },
      },
    });
    await started;

    await expect(execution).rejects.toThrow("Timeout waiting for orchestration");
    expect(sideEffectCompleted).toBe(false);

    await finished;
    expect(sideEffectCompleted).toBe(true);
  });

  it("serializes concurrent harness starts through one worker startup", async () => {
    const harness = createOrchestrationHarness();
    harness.registerOrchestrator("ready", async (_context, input) => input);

    try {
      const [first, second] = await Promise.all([
        harness.start("ready", { instanceId: "first", input: 1 }),
        harness.start("ready", { instanceId: "second", input: 2 }),
      ]);

      await expect(first.waitForCompletion()).resolves.toMatchObject({ output: 1 });
      await expect(second.waitForCompletion()).resolves.toMatchObject({ output: 2 });
    } finally {
      await harness.dispose();
    }
  });

  it("stops a worker when disposal races its startup", async () => {
    let releaseStart!: () => void;
    const startGate = new Promise<void>((resolve) => {
      releaseStart = resolve;
    });
    const startSpy = jest.spyOn(TestOrchestrationWorker.prototype, "start").mockImplementation(async () => startGate);
    const stopSpy = jest.spyOn(TestOrchestrationWorker.prototype, "stop").mockResolvedValue();
    const harness = createOrchestrationHarness();
    harness.registerOrchestrator("ready", async () => "done");

    try {
      const starting = harness.start("ready");
      await Promise.resolve();
      const disposing = harness.dispose();
      releaseStart();

      await expect(starting).rejects.toThrow("The orchestration harness has been disposed.");
      await disposing;
      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(stopSpy).toHaveBeenCalledTimes(1);
    } finally {
      startSpy.mockRestore();
      stopSpy.mockRestore();
    }
  });

  it("rejects future scheduled starts that the in-memory backend cannot defer", async () => {
    const harness = createOrchestrationHarness();
    harness.registerOrchestrator("ready", async () => "done");

    try {
      await expect(harness.start("ready", { startAt: new Date(Date.now() + 60_000) })).rejects.toThrow(
        "Future startAt values are not supported",
      );
    } finally {
      await harness.dispose();
    }
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

  it("retains terminal results but rejects other run operations after disposal", async () => {
    const harness = createOrchestrationHarness({ timeoutMs: 20 });
    harness.registerOrchestrator("ready", async () => ({ done: true }));
    const run = await harness.start<{ done: boolean }>("ready");
    const completed = await run.waitForCompletion();

    await harness.dispose();

    await expect(run.waitForCompletion()).resolves.toEqual(completed);
    expect(run.output).toEqual({ done: true });
    await expect(run.waitForStart()).rejects.toThrow("The orchestration harness has been disposed.");
    await expect(run.refresh()).rejects.toThrow("The orchestration harness has been disposed.");
    await expect(run.raiseEvent("ignored")).rejects.toThrow("The orchestration harness has been disposed.");
    await expect(run.terminate()).rejects.toThrow("The orchestration harness has been disposed.");
    await expect(run.suspend()).rejects.toThrow("The orchestration harness has been disposed.");
    await expect(run.resume()).rejects.toThrow("The orchestration harness has been disposed.");
  });

  it("rejects nonterminal run operations immediately after disposal", async () => {
    const harness = createOrchestrationHarness({ timeoutMs: 20 });
    harness.registerOrchestrator("waiting", function* (context: OrchestrationContext): Generator<
      unknown,
      void,
      unknown
    > {
      yield context.df.waitForExternalEvent("never");
    });
    const run = await harness.start("waiting");
    await run.waitForStart();

    await harness.dispose();

    await expect(run.waitForCompletion()).rejects.toThrow("The orchestration harness has been disposed.");
    await expect(run.refresh()).rejects.toThrow("The orchestration harness has been disposed.");
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

  it("treats null initial entity state as absent while preserving null operation input", async () => {
    const entity: EntityHandler<number> = (context) => {
      context.df.return({
        input: context.df.getInput(),
        isNewlyConstructed: context.df.isNewlyConstructed,
        state: context.df.getState(() => 7),
      });
    };

    const result = await runEntity<number | null, { input: null; isNewlyConstructed: boolean; state: number }>(entity, {
      initialState: null,
      operations: [{ name: "inspect", input: null }],
    });

    expect(result).toEqual({
      state: undefined,
      results: [{ input: null, isNewlyConstructed: true, state: 7 }],
    });
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
