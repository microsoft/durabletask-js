// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from "@azure/functions";
import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
} from "@microsoft/durabletask-js";
import { OrchestrationRuntimeStatus, toDurableOrchestrationStatus, wrapOrchestrator } from "../../src";
import type { OrchestrationContext, OrchestrationHandler } from "../../src";
import { createActivityContext, runOrchestrator } from "../../src/testing";

describe("durable-functions/testing", () => {
  describe("createActivityContext", () => {
    it("builds the invocation context an activity handler receives", async () => {
      const sayHello = (name: string, context: InvocationContext) => `${context.functionName}: Hello, ${name}!`;

      expect(await sayHello("World", createActivityContext("sayHello"))).toBe("sayHello: Hello, World!");
      expect(createActivityContext().functionName).toBe("activity");
    });
  });

  describe("runOrchestrator", () => {
    it("runs a classic orchestrator against inline activities", async () => {
      const orchestrator: OrchestrationHandler = function* (
        context: OrchestrationContext,
      ): Generator<unknown, unknown, unknown> {
        const name = context.df.getInput<string>();
        return yield context.df.callActivity("sayHello", name);
      };

      const result = await runOrchestrator<string>(orchestrator, {
        input: "World",
        instanceId: "one-shot",
        activities: {
          sayHello: (name: unknown) => `Hello, ${String(name)}!`,
        },
      });

      expect(result).toEqual({
        instanceId: "one-shot",
        runtimeStatus: OrchestrationRuntimeStatus.Completed,
        output: "Hello, World!",
        customStatus: undefined,
        failure: undefined,
      });
    });

    it("names each activity's invocation context after the registered activity", async () => {
      const orchestrator: OrchestrationHandler = function* (
        context: OrchestrationContext,
      ): Generator<unknown, unknown, unknown> {
        return yield context.df.callActivity("whoAmI");
      };

      const result = await runOrchestrator<string>(orchestrator, {
        activities: {
          whoAmI: (_input: unknown, context: InvocationContext) => context.functionName,
        },
      });

      expect(result.output).toBe("whoAmI");
    });

    it("reports failures as a terminal status with custom status and failure details", async () => {
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

      expect(result.runtimeStatus).toBe(OrchestrationRuntimeStatus.Failed);
      expect(result.customStatus).toEqual({ phase: "starting" });
      expect(result.failure).toMatchObject({
        errorType: expect.any(String),
        message: expect.stringContaining("activity failed"),
      });
    });

    it("does not return before a delayed activity settles", async () => {
      let activityStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        activityStarted = resolve;
      });
      const mutations: string[] = [];
      const orchestrator: OrchestrationHandler = function* (
        context: OrchestrationContext,
      ): Generator<unknown, void, unknown> {
        yield context.df.callActivity("slow");
      };

      let executionSettled = false;
      const execution = runOrchestrator(orchestrator, {
        activities: {
          slow: async () => {
            activityStarted();
            await new Promise((resolve) => setTimeout(resolve, 100));
            mutations.push("activity");
          },
        },
      }).finally(() => {
        executionSettled = true;
      });

      await started;
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(executionSettled).toBe(false);

      await expect(execution).resolves.toMatchObject({ runtimeStatus: OrchestrationRuntimeStatus.Completed });
      expect(mutations).toEqual(["activity"]);

      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(mutations).toEqual(["activity"]);
    });

    it("does not return before a delayed async orchestrator settles", async () => {
      let settled = false;
      const execution = runOrchestrator(async () => {
        await new Promise((resolve) => setTimeout(resolve, 75));
        settled = true;
        return "done";
      });

      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(settled).toBe(false);

      await expect(execution).resolves.toMatchObject({
        runtimeStatus: OrchestrationRuntimeStatus.Completed,
        output: "done",
      });
      expect(settled).toBe(true);
    });

    it("clears durable timers so a completed run leaves nothing pending", async () => {
      const orchestrator: OrchestrationHandler = function* (
        context: OrchestrationContext,
      ): Generator<unknown, string, unknown> {
        yield context.df.createTimer(new Date(context.df.currentUtcDateTime.getTime() + 10));
        return "timer fired";
      };

      await expect(runOrchestrator<string>(orchestrator)).resolves.toMatchObject({
        runtimeStatus: OrchestrationRuntimeStatus.Completed,
        output: "timer fired",
      });
    });
  });

  // Interactive scenarios intentionally have no dedicated wrapper: the core in-memory stack already
  // exposes them. This pins the pattern the README documents.
  it("drives external events through the core in-memory stack", async () => {
    const backend = new InMemoryOrchestrationBackend();
    const worker = new TestOrchestrationWorker(backend);
    const client = new TestOrchestrationClient(backend);

    worker.addNamedOrchestrator(
      "approval",
      wrapOrchestrator(function* (context: OrchestrationContext): Generator<unknown, { approved: boolean }, boolean> {
        const approved = yield context.df.waitForExternalEvent<boolean>("approved");
        return { approved };
      }),
    );
    await worker.start();

    try {
      const instanceId = await client.scheduleNewOrchestration("approval", undefined, "approval-1");
      await client.waitForOrchestrationStart(instanceId, true, 10);
      await client.raiseOrchestrationEvent(instanceId, "approved", true);
      const state = await client.waitForOrchestrationCompletion(instanceId, true, 10);

      expect(state).toBeDefined();
      expect(toDurableOrchestrationStatus(state!)).toMatchObject({
        runtimeStatus: OrchestrationRuntimeStatus.Completed,
        output: { approved: true },
      });
    } finally {
      await worker.stop();
      backend.reset();
    }
  });
});
