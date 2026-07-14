// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as durabletask from "@microsoft/durabletask-js";
import { EntityInstanceId, OrchestrationContext, RetryPolicy, Task, TOrchestrator } from "@microsoft/durabletask-js";
import {
  ClassicOrchestrationContext,
  DurableOrchestrationContext,
  wrapOrchestrator,
} from "../../src/orchestration-context";
import { RetryOptions } from "../../src/retry-options";

/** Builds a fake core OrchestrationContext whose methods return sentinel values via jest mocks. */
function createFakeCoreContext() {
  const entities = {
    callEntity: jest.fn().mockReturnValue("callEntity-task"),
    signalEntity: jest.fn(),
  };
  const replaySafeLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  const ctx = {
    instanceId: "instance-1",
    isReplaying: true,
    currentUtcDateTime: new Date("2026-01-02T03:04:05.000Z"),
    version: "1.2.3",
    callActivity: jest.fn().mockReturnValue("callActivity-task"),
    callSubOrchestrator: jest.fn().mockReturnValue("callSub-task"),
    createTimer: jest.fn().mockReturnValue("timer-task"),
    waitForExternalEvent: jest.fn().mockReturnValue("event-task"),
    continueAsNew: jest.fn(),
    setCustomStatus: jest.fn(),
    sendEvent: jest.fn(),
    newGuid: jest.fn().mockReturnValue("guid-1"),
    createReplaySafeLogger: jest.fn(() => replaySafeLogger),
    entities,
  };
  return { ctx: ctx as unknown as OrchestrationContext, raw: ctx, entities, replaySafeLogger };
}

describe("DurableOrchestrationContext", () => {
  it("exposes identity/replay properties and getInput from the core context", () => {
    const { ctx } = createFakeCoreContext();
    const df = new DurableOrchestrationContext(ctx, { city: "Tokyo" });

    expect(df.instanceId).toBe("instance-1");
    expect(df.isReplaying).toBe(true);
    expect(df.currentUtcDateTime).toEqual(new Date("2026-01-02T03:04:05.000Z"));
    expect(df.version).toBe("1.2.3");
    expect(df.getInput<{ city: string }>()).toEqual({ city: "Tokyo" });
  });

  it("exposes parentInstanceId from the core context (undefined at top level)", () => {
    const { ctx } = createFakeCoreContext();
    expect(new DurableOrchestrationContext(ctx, undefined).parentInstanceId).toBeUndefined();

    const childCtx = {
      parent: { name: "p", instanceId: "parent-1", taskScheduledId: 1 },
    } as unknown as OrchestrationContext;
    expect(new DurableOrchestrationContext(childCtx, undefined).parentInstanceId).toBe("parent-1");
  });

  it("tracks the custom status locally and forwards it to the core context", () => {
    const { ctx, raw } = createFakeCoreContext();
    const df = new DurableOrchestrationContext(ctx, undefined);

    expect(df.customStatus).toBeUndefined();
    df.setCustomStatus({ stage: "processing" });
    expect(df.customStatus).toEqual({ stage: "processing" });
    expect(raw.setCustomStatus).toHaveBeenCalledWith({ stage: "processing" });
  });

  it("forwards callActivity and callActivityWithRetry to the core context", () => {
    const { ctx, raw } = createFakeCoreContext();
    const df = new DurableOrchestrationContext(ctx, undefined);

    expect(df.callActivity("sayHello", "Tokyo")).toBe("callActivity-task");
    expect(raw.callActivity).toHaveBeenCalledWith("sayHello", "Tokyo");

    const retry = new RetryOptions(1000, 3);
    df.callActivityWithRetry("flaky", retry, "input");
    const retryCall = raw.callActivity.mock.calls[1];
    expect(retryCall[0]).toBe("flaky");
    expect(retryCall[1]).toBe("input");
    expect(retryCall[2].retry).toBeInstanceOf(RetryPolicy);
    expect(retryCall[2].retry.maxNumberOfAttempts).toBe(3);
    expect(retryCall[2].retry.firstRetryIntervalInMilliseconds).toBe(1000);
  });

  it("forwards sub-orchestration calls with instanceId and retry options", () => {
    const { ctx, raw } = createFakeCoreContext();
    const df = new DurableOrchestrationContext(ctx, undefined);

    df.callSubOrchestrator("child", "in", "child-id");
    expect(raw.callSubOrchestrator).toHaveBeenCalledWith("child", "in", { instanceId: "child-id" });

    df.callSubOrchestrator("child2", "in2");
    expect(raw.callSubOrchestrator).toHaveBeenLastCalledWith("child2", "in2", undefined);

    const retry = new RetryOptions(1000, 2);
    df.callSubOrchestratorWithRetry("child3", retry, "in3", "id3");
    const subCalls = raw.callSubOrchestrator.mock.calls;
    const lastSub = subCalls[subCalls.length - 1];
    expect(lastSub[0]).toBe("child3");
    expect(lastSub[1]).toBe("in3");
    expect(lastSub[2].instanceId).toBe("id3");
    expect(lastSub[2].retry).toBeInstanceOf(RetryPolicy);
    expect(lastSub[2].retry.maxNumberOfAttempts).toBe(2);
  });

  it("forwards timers, events, status, and entity operations", () => {
    const { ctx, raw, entities } = createFakeCoreContext();
    const df = new DurableOrchestrationContext(ctx, undefined);
    const entityId = new EntityInstanceId("Counter", "k1");

    df.createTimer(123);
    expect(raw.createTimer).toHaveBeenCalledWith(123);

    df.waitForExternalEvent("Approval");
    expect(raw.waitForExternalEvent).toHaveBeenCalledWith("Approval");

    df.continueAsNew("next");
    expect(raw.continueAsNew).toHaveBeenCalledWith("next", true);

    df.setCustomStatus({ stage: "x" });
    expect(raw.setCustomStatus).toHaveBeenCalledWith({ stage: "x" });

    expect(df.newGuid("ignored-instance-id")).toBe("guid-1");
    expect(raw.newGuid).toHaveBeenCalledTimes(1);

    df.callEntity(entityId, "add", 5);
    expect(entities.callEntity).toHaveBeenCalledWith(entityId, "add", 5);

    df.signalEntity(entityId, "reset");
    expect(entities.signalEntity).toHaveBeenCalledWith(entityId, "reset", undefined);
  });

  it("throws for callHttp, which has no durabletask equivalent", () => {
    const { ctx } = createFakeCoreContext();
    const df = new DurableOrchestrationContext(ctx, undefined);

    expect(() => df.callHttp({ method: "GET", uri: "https://example.test" })).toThrow(/callHttp/);
  });

  it("exposes Task.all / Task.any that forward to the core combinators", () => {
    const { ctx } = createFakeCoreContext();
    const df = new DurableOrchestrationContext(ctx, undefined);
    const tasks = ["t1", "t2"] as unknown as Task<unknown>[];

    const whenAllSpy = jest.spyOn(durabletask, "whenAll").mockReturnValue("all-result" as never);
    const whenAnySpy = jest.spyOn(durabletask, "whenAny").mockReturnValue("any-result" as never);
    try {
      expect(df.Task.all(tasks)).toBe("all-result");
      expect(whenAllSpy).toHaveBeenCalledWith(tasks);
      expect(df.Task.any(tasks)).toBe("any-result");
      expect(whenAnySpy).toHaveBeenCalledWith(tasks);
    } finally {
      whenAllSpy.mockRestore();
      whenAnySpy.mockRestore();
    }
  });
});

describe("wrapOrchestrator", () => {
  it("returns a two-parameter core-native orchestrator unchanged", () => {
    // A core-native orchestrator declares (ctx, input); a non-generator that returns a value is a
    // valid TOrchestrator and keeps the arity at 2 so it passes through unwrapped.
    const native: TOrchestrator = (_ctx, _input) => "native";
    expect(wrapOrchestrator(native)).toBe(native);
  });

  it("returns a single-parameter core-native async-generator orchestrator unchanged and drives its body", async () => {
    // Regression (arity-vs-kind): a native orchestrator written as `async function*(ctx)` ignores
    // `input`, so it has arity 1 — but it is NOT classic. Detection must be by generator kind, not
    // arity: it has to pass through unchanged so the engine drives it directly. Wrapping it would
    // inject a classic `{ df, log }` context (no `ctx.callActivity`) and, because async generators
    // expose `Symbol.asyncIterator` (not `Symbol.iterator`), the old wrapper would have returned the
    // un-iterated generator as the result — the body would never run and nothing would throw.
    const native = async function* (ctx: OrchestrationContext): AsyncGenerator<Task<unknown>, string, unknown> {
      const result = (yield ctx.callActivity("a", "INPUT")) as string;
      return `native-done:${result}`;
    };

    const wrapped = wrapOrchestrator(native as unknown as TOrchestrator);
    // Passthrough: the native async generator is returned unchanged (identity), not wrapped.
    expect(wrapped).toBe(native as unknown as TOrchestrator);

    const { ctx, raw } = createFakeCoreContext();
    const gen = wrapped(ctx, "INPUT") as AsyncGenerator<unknown, unknown, unknown>;

    const firstYield = await gen.next();
    // Proves the body actually executed: it invoked the CORE ctx.callActivity and yielded its task.
    expect(raw.callActivity).toHaveBeenCalledWith("a", "INPUT");
    expect(firstYield.value).toBe("callActivity-task");
    expect(firstYield.done).toBe(false);

    const final = await gen.next("ACTIVITY_RESULT");
    expect(final.done).toBe(true);
    expect(final.value).toBe("native-done:ACTIVITY_RESULT");
  });

  it("wraps a single-parameter classic orchestrator and drives it through context.df", async () => {
    const classic = function* (context: ClassicOrchestrationContext): Generator<Task<unknown>, string, unknown> {
      const input = context.df.getInput<string>();
      const first = (yield context.df.callActivity("a", input)) as string;
      return `done:${first}`;
    };

    const wrapped = wrapOrchestrator(classic);
    // The wrapper is core-native shape (ctx, input).
    expect(wrapped).not.toBe(classic);

    const { ctx, raw } = createFakeCoreContext();
    // The engine gates on Symbol.asyncIterator: the wrapper MUST return an async generator or the
    // core executor never drives it (it would complete immediately with the raw return value).
    const gen = wrapped(ctx, "INPUT") as AsyncGenerator<unknown, unknown, unknown>;
    expect(typeof (gen as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator]).toBe("function");

    const firstYield = await gen.next();
    expect(raw.callActivity).toHaveBeenCalledWith("a", "INPUT");
    expect(firstYield.value).toBe("callActivity-task");
    expect(firstYield.done).toBe(false);

    const final = await gen.next("ACTIVITY_RESULT");
    expect(final.done).toBe(true);
    expect(final.value).toBe("done:ACTIVITY_RESULT");
  });

  it("exposes a replay-safe logger as context.log/error on the classic context", async () => {
    // A classic orchestrator may be a plain (non-generator) function that returns a value; the
    // wrapper still invokes it with the full classic context, so log wiring is exercised here.
    const classic = (context: ClassicOrchestrationContext): string => {
      context.log("hi");
      context.error("boom");
      return "logged";
    };

    const { ctx, replaySafeLogger } = createFakeCoreContext();
    const wrapped = wrapOrchestrator(classic);
    const gen = wrapped(ctx, undefined) as AsyncGenerator<unknown, unknown, unknown>;

    const done = await gen.next();
    expect(done.done).toBe(true);
    expect(done.value).toBe("logged");
    // The wrapper builds the classic context's log methods from the CORE replay-safe logger.
    expect((ctx as unknown as { createReplaySafeLogger: jest.Mock }).createReplaySafeLogger).toHaveBeenCalledTimes(1);
    expect(replaySafeLogger.info).toHaveBeenCalledWith("hi");
    expect(replaySafeLogger.error).toHaveBeenCalledWith("boom");
  });
});
