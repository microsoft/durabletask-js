// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityContext } from "../src/task/context/activity-context";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { NoOpLogger } from "../src/types/logger.type";
import {
  ActivityMiddleware,
  MiddlewareFeatures,
  OrchestrationMiddleware,
  createMiddlewareFeature,
} from "../src/worker/middleware";
import { ActivityExecutor } from "../src/worker/activity-executor";
import { OrchestrationExecutor, OrchestrationExecutionResult } from "../src/worker/orchestration-executor";
import { Registry } from "../src/worker/registry";
import * as pb from "../src/proto/orchestrator_service_pb";
import {
  getStringValue,
  newExecutionStartedEvent,
  newOrchestratorStartedEvent,
  newTaskCompletedEvent,
  newTaskScheduledEvent,
} from "../src/utils/pb-helper.util";

const testLogger = new NoOpLogger();
const instanceId = "middleware-instance";

describe("MiddlewareFeatures", () => {
  it("stores host objects by typed symbol without serialization", () => {
    const invocationFeature = createMiddlewareFeature<{ invocationId: string }>("invocation");
    const features = new MiddlewareFeatures();
    const hostObject = { invocationId: "host-123" };

    features.set(invocationFeature, hostObject);

    expect(features.get(invocationFeature)).toBe(hostObject);
    expect(JSON.stringify(features)).toBe("{}");
    expect(features.delete(invocationFeature)).toBe(true);
    expect(features.get(invocationFeature)).toBeUndefined();
  });
});

describe("Activity middleware", () => {
  it("runs in registration order and exposes populated context, features, and result", async () => {
    const calls: string[] = [];
    const featureKey = createMiddlewareFeature<{ value: string }>("host");
    const features = new MiddlewareFeatures().set(featureKey, { value: "feature-value" });
    let capturedContext: Parameters<ActivityMiddleware>[0] | undefined;
    const first: ActivityMiddleware = async (context, next) => {
      capturedContext = context;
      calls.push("first-before");
      expect(context.result).toBeUndefined();
      await next(context);
      expect(context.result).toEqual({ output: 42 });
      calls.push("first-after");
    };
    const second: ActivityMiddleware = async (context, next) => {
      calls.push("second-before");
      expect(context.features.get(featureKey)?.value).toBe("feature-value");
      await next(context);
      calls.push("second-after");
    };
    const registry = new Registry();
    const name = "activity";
    registry.addNamedActivity(name, (_context: ActivityContext, input: unknown) => {
      calls.push("body");
      return { output: input };
    });
    const executor = new ActivityExecutor(registry, testLogger, [first, second]);
    const rawInput = "42";

    const result = await executor.execute(instanceId, name, 7, rawInput, {
      version: "v2",
      tags: { tenant: "contoso" },
      features,
    });

    expect(result).toBe('{"output":42}');
    expect(calls).toEqual(["first-before", "second-before", "body", "second-after", "first-after"]);
    expect(capturedContext).toMatchObject({
      name,
      instanceId,
      taskId: 7,
      version: "v2",
      tags: { tenant: "contoso" },
      input: 42,
      rawInput,
    });
    expect(capturedContext?.activityContext.orchestrationId).toBe(instanceId);
    expect(Object.isFrozen(capturedContext?.tags)).toBe(true);
  });

  it("allows explicit short-circuiting, including an undefined result", async () => {
    const registry = new Registry();
    const body = jest.fn(() => "body");
    const name = "activity";
    registry.addNamedActivity(name, body);
    const middleware: ActivityMiddleware = async (context) => {
      context.setResult(undefined);
    };
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    await expect(executor.execute(instanceId, name, 1, undefined)).resolves.toBeUndefined();
    expect(body).not.toHaveBeenCalled();
  });

  it("allows middleware to inspect and replace the result after next", async () => {
    const registry = new Registry();
    const name = "activity";
    registry.addNamedActivity(name, () => "unredacted");
    const middleware: ActivityMiddleware = async (context, next) => {
      await next(context);
      expect(context.result).toBe("unredacted");
      context.setResult("redacted");
    };
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    await expect(executor.execute(instanceId, name, 1)).resolves.toBe('"redacted"');
  });

  it("rejects successful middleware that neither calls next nor sets a result", async () => {
    const registry = new Registry();
    const name = "activity";
    registry.addNamedActivity(name, () => "body");
    const middleware: ActivityMiddleware = async () => {};
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    await expect(executor.execute(instanceId, name, 1)).rejects.toThrow(
      "Activity middleware must call next exactly once or call setResult",
    );
  });

  it("rejects duplicate next calls without invoking the body twice", async () => {
    const registry = new Registry();
    const body = jest.fn(() => "body");
    const name = "activity";
    registry.addNamedActivity(name, body);
    const middleware: ActivityMiddleware = async (context, next) => {
      await next(context);
      await next(context);
    };
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    await expect(executor.execute(instanceId, name, 1)).rejects.toThrow(
      "Activity middleware must call next at most once",
    );
    expect(body).toHaveBeenCalledTimes(1);
  });

  it("preserves activity and duplicate-next failures together", async () => {
    const bodyFailure = new Error("activity body failed");
    const registry = new Registry();
    const body = jest.fn(() => {
      throw bodyFailure;
    });
    const name = "activity";
    registry.addNamedActivity(name, body);
    const middleware: ActivityMiddleware = async (context, next) => {
      try {
        await next(context);
      } catch {
        // Invoke next again to ensure the contract failure does not mask the body failure.
      }
      await next(context);
    };
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    const error = await executor.execute(instanceId, name, 1).catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(AggregateError);
    if (!(error instanceof AggregateError)) {
      throw new Error("Expected an AggregateError.");
    }
    expect(error.message).toContain(bodyFailure.message);
    expect(error.message).toContain("Activity middleware must call next at most once");
    expect(error.errors).toEqual(expect.arrayContaining([bodyFailure]));
    expect(body).toHaveBeenCalledTimes(1);
  });

  it("preserves an activity AggregateError when it is the only failure", async () => {
    const expected = new AggregateError([new Error("child failure")], "activity aggregate failed");
    const registry = new Registry();
    const name = "activity";
    registry.addNamedActivity(name, () => {
      throw expected;
    });
    const executor = new ActivityExecutor(registry, testLogger);

    await expect(executor.execute(instanceId, name, 1)).rejects.toBe(expected);
  });

  it("preserves nested activity and duplicate-next failures when outer middleware catches", async () => {
    const bodyFailure = new Error("nested activity body failed");
    const registry = new Registry();
    const body = jest.fn(() => {
      throw bodyFailure;
    });
    const name = "activity";
    registry.addNamedActivity(name, body);
    const outer: ActivityMiddleware = async (context, next) => {
      try {
        await next(context);
      } catch {
        // Downstream failures remain recorded even when caught at this boundary.
      }
    };
    const inner: ActivityMiddleware = async (context, next) => {
      try {
        await next(context);
      } catch {
        // Trigger a contract failure without losing the activity failure.
      }
      await next(context);
    };
    const executor = new ActivityExecutor(registry, testLogger, [outer, inner]);

    const error = await executor.execute(instanceId, name, 1).catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as Error).message).toContain(bodyFailure.message);
    expect((error as Error).message).toContain("Activity middleware must call next at most once");
    expect(body).toHaveBeenCalledTimes(1);
  });

  it("rejects an ignored duplicate next call without creating an unhandled rejection", async () => {
    const registry = new Registry();
    const name = "activity";
    registry.addNamedActivity(name, () => "body");
    const middleware: ActivityMiddleware = async (context, next) => {
      await next(context);
      void next(context);
    };
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    await expect(executor.execute(instanceId, name, 1)).rejects.toThrow(
      "Activity middleware must call next at most once",
    );
  });

  it("observes rejection throughout an ignored duplicate next chain", async () => {
    const registry = new Registry();
    const name = "activity";
    registry.addNamedActivity(name, () => "body");
    const middleware: ActivityMiddleware = async (context, next) => {
      await next(context);
      void next(context)
        .then(() => {})
        .finally(() => {});
    };
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    await expect(executor.execute(instanceId, name, 1)).rejects.toThrow(
      "Activity middleware must call next at most once",
    );
  });

  it("rejects calling next after setResult", async () => {
    const registry = new Registry();
    const body = jest.fn(() => "body");
    const name = "activity";
    registry.addNamedActivity(name, body);
    const middleware: ActivityMiddleware = async (context, next) => {
      context.setResult("short-circuit");
      await next(context);
    };
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    await expect(executor.execute(instanceId, name, 1)).rejects.toThrow(
      "Activity middleware cannot call next after setResult",
    );
    expect(body).not.toHaveBeenCalled();
  });

  it("does not allow outer middleware to swallow a nested contract violation", async () => {
    const registry = new Registry();
    const name = "activity";
    registry.addNamedActivity(name, () => "body");
    const outer: ActivityMiddleware = async (context, next) => {
      try {
        await next(context);
      } catch {
        // Contract violations remain fatal even when user middleware catches them.
      }
    };
    const invalidInner: ActivityMiddleware = async () => {};
    const executor = new ActivityExecutor(registry, testLogger, [outer, invalidInner]);

    await expect(executor.execute(instanceId, name, 1)).rejects.toThrow(
      "Activity middleware must call next exactly once or call setResult",
    );
  });

  it("does not allow outer middleware to swallow a nested activity failure", async () => {
    const expected = new Error("inner activity middleware failed");
    let caught: unknown;
    let observedFailure: Error | undefined;
    const registry = new Registry();
    const body = jest.fn(() => "body");
    const name = "activity";
    registry.addNamedActivity(name, body);
    const outer: ActivityMiddleware = async (context, next) => {
      try {
        await next(context);
      } catch (error) {
        caught = error;
        observedFailure = context.failure;
      }
    };
    const failingInner: ActivityMiddleware = async () => {
      throw expected;
    };
    const executor = new ActivityExecutor(registry, testLogger, [outer, failingInner]);

    await expect(executor.execute(instanceId, name, 1)).rejects.toBe(expected);
    expect(caught).toBe(expected);
    expect(observedFailure).toBe(expected);
    expect(body).not.toHaveBeenCalled();
  });

  it("allows outer activity middleware to recover from a nested failure with setResult", async () => {
    const expected = new Error("inner activity middleware failed");
    let caught: unknown;
    let observedFailure: Error | undefined;
    const registry = new Registry();
    const body = jest.fn(() => "body");
    const name = "activity";
    registry.addNamedActivity(name, body);
    const outer: ActivityMiddleware = async (context, next) => {
      try {
        await next(context);
      } catch (error) {
        caught = error;
        observedFailure = context.failure;
        context.setResult("recovered");
      }
    };
    const failingInner: ActivityMiddleware = async () => {
      throw expected;
    };
    const executor = new ActivityExecutor(registry, testLogger, [outer, failingInner]);

    await expect(executor.execute(instanceId, name, 1)).resolves.toBe('"recovered"');
    expect(caught).toBe(expected);
    expect(observedFailure).toBe(expected);
    expect(body).not.toHaveBeenCalled();
  });

  it("rejects middleware that returns before next completes", async () => {
    const registry = new Registry();
    const name = "activity";
    registry.addNamedActivity(name, async () => "body");
    const middleware: ActivityMiddleware = async (context, next) => {
      void next(context);
    };
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    await expect(executor.execute(instanceId, name, 1)).rejects.toThrow(
      "Activity middleware must not return before next(context) completes",
    );
  });

  it("exposes activity failure after next and propagates it", async () => {
    const expected = new Error("activity failed");
    const registry = new Registry();
    const name = "activity";
    registry.addNamedActivity(name, () => {
      throw expected;
    });
    const middleware: ActivityMiddleware = async (context, next) => {
      try {
        await next(context);
      } catch (error) {
        expect(error).toBe(expected);
        expect(context.failure).toBe(expected);
        throw error;
      }
    };
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    await expect(executor.execute(instanceId, name, 1)).rejects.toBe(expected);
  });

  it("propagates activity middleware failures", async () => {
    const expected = new Error("middleware failed");
    const registry = new Registry();
    const name = "activity";
    registry.addNamedActivity(name, () => "body");
    const middleware: ActivityMiddleware = async () => {
      throw expected;
    };
    const executor = new ActivityExecutor(registry, testLogger, [middleware]);

    await expect(executor.execute(instanceId, name, 1)).rejects.toBe(expected);
  });
});

describe("Orchestration middleware", () => {
  it("runs in registration order and exposes replay metadata, features, and result", async () => {
    const calls: string[] = [];
    const featureKey = createMiddlewareFeature<{ invocationId: string }>("host");
    const features = new MiddlewareFeatures().set(featureKey, { invocationId: "host-123" });
    let capturedContext: Parameters<OrchestrationMiddleware>[0] | undefined;
    const first: OrchestrationMiddleware = async (context, next) => {
      capturedContext = context;
      calls.push("first-before");
      expect(context.result).toBeUndefined();
      await next(context);
      expect(context.result).toBe("done");
      calls.push("first-after");
    };
    const second: OrchestrationMiddleware = async (context, next) => {
      calls.push("second-before");
      expect(context.features.get(featureKey)?.invocationId).toBe("host-123");
      await next(context);
      calls.push("second-after");
    };
    const orchestrator: TOrchestrator = async (_context: OrchestrationContext, input: unknown) => {
      calls.push("body");
      return input;
    };
    const registry = new Registry();
    registry.addNamedOrchestrator("orchestrator", orchestrator);
    const executionStarted = newExecutionStartedEvent(
      "orchestrator",
      instanceId,
      '"done"',
      { name: "parent", instanceId: "parent-instance", taskScheduledId: 3 },
      "execution-id",
    );
    const started = executionStarted.getExecutionstarted()!;
    started.setVersion(getStringValue("v3"));
    started.getTagsMap().set("tenant", "contoso");
    const oldEvents = [newOrchestratorStartedEvent(), executionStarted];
    const executor = new OrchestrationExecutor(registry, testLogger, [first, second]);

    const result = await executor.execute(
      instanceId,
      oldEvents,
      [newOrchestratorStartedEvent()],
      "execution-id",
      features,
    );

    expectCompleteResult(result, '"done"');
    expect(calls).toEqual(["first-before", "second-before", "body", "second-after", "first-after"]);
    expect(capturedContext).toMatchObject({
      name: "orchestrator",
      instanceId,
      version: "v3",
      parent: { name: "parent", instanceId: "parent-instance", taskScheduledId: 3 },
      tags: { tenant: "contoso" },
      input: "done",
      rawInput: '"done"',
      isReplaying: true,
    });
    expect(capturedContext?.orchestrationContext.instanceId).toBe(instanceId);
    expect(Object.isFrozen(capturedContext?.tags)).toBe(true);
  });

  it("rejects successful middleware that does not call next", async () => {
    const middleware: OrchestrationMiddleware = async () => {};

    const result = await executeOrchestration([middleware]);

    expectFailure(result, "Orchestration middleware must call next exactly once");
  });

  it("rejects duplicate next calls without invoking the body twice", async () => {
    const body = jest.fn(async () => "done");
    const middleware: OrchestrationMiddleware = async (context, next) => {
      await next(context);
      await next(context);
    };

    const result = await executeOrchestration([middleware], body);

    expectFailure(result, "Orchestration middleware must call next exactly once");
    expect(body).toHaveBeenCalledTimes(1);
  });

  it("preserves orchestration and duplicate-next failures together", async () => {
    const bodyFailure = new Error("orchestration body failed");
    const body = jest.fn(async () => {
      throw bodyFailure;
    });
    const middleware: OrchestrationMiddleware = async (context, next) => {
      await next(context);
      await next(context);
    };

    const result = await executeOrchestration([middleware], body);

    expectFailure(result, bodyFailure.message);
    expectFailure(result, "Orchestration middleware must call next exactly once");
    expect(body).toHaveBeenCalledTimes(1);
  });

  it("preserves nested orchestration and duplicate-next failures when outer middleware catches", async () => {
    const bodyFailure = new Error("nested orchestration body failed");
    const body = jest.fn(async () => {
      throw bodyFailure;
    });
    const outer: OrchestrationMiddleware = async (context, next) => {
      try {
        await next(context);
      } catch {
        // Downstream failures remain fatal even when caught at this boundary.
      }
    };
    const inner: OrchestrationMiddleware = async (context, next) => {
      await next(context);
      await next(context);
    };

    const result = await executeOrchestration([outer, inner], body);

    expectFailure(result, bodyFailure.message);
    expectFailure(result, "Orchestration middleware must call next exactly once");
    expect(body).toHaveBeenCalledTimes(1);
  });

  it("rejects an ignored duplicate orchestration next call", async () => {
    const middleware: OrchestrationMiddleware = async (context, next) => {
      await next(context);
      void next(context);
    };

    const result = await executeOrchestration([middleware]);

    expectFailure(result, "Orchestration middleware must call next exactly once");
  });

  it("observes rejection from an ignored duplicate next finally-chain", async () => {
    const middleware: OrchestrationMiddleware = async (context, next) => {
      await next(context);
      void next(context).finally(() => {});
    };

    const result = await executeOrchestration([middleware]);

    expectFailure(result, "Orchestration middleware must call next exactly once");
  });

  it("exposes orchestration failure after next", async () => {
    const expected = new Error("orchestration failed");
    const middleware: OrchestrationMiddleware = async (context, next) => {
      await next(context);
      expect(context.failure).toBe(expected);
    };

    const result = await executeOrchestration([middleware], async () => {
      throw expected;
    });

    expectFailure(result, expected.message);
  });

  it("routes orchestration middleware failures through durable failure actions", async () => {
    const expected = new Error("middleware failed");
    const middleware: OrchestrationMiddleware = async () => {
      throw expected;
    };

    const result = await executeOrchestration([middleware]);

    expectFailure(result, expected.message);
  });

  it("keeps post-next middleware suspended until the orchestration completes", async () => {
    const calls: string[] = [];
    const activity = (_context: ActivityContext) => "activity-result";
    const orchestrator: TOrchestrator = async function* (context: OrchestrationContext): any {
      calls.push("body");
      return yield context.callActivity(activity);
    };
    const middleware: OrchestrationMiddleware = async (context, next) => {
      calls.push("before");
      await next(context);
      calls.push(`after:${context.result}`);
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);

    const firstResult = await new OrchestrationExecutor(registry, testLogger, [middleware]).execute(
      instanceId,
      [],
      [newOrchestratorStartedEvent(), newExecutionStartedEvent(name, instanceId)],
    );

    expect(firstResult.actions).toHaveLength(1);
    expect(calls).toEqual(["before", "body"]);

    const secondResult = await new OrchestrationExecutor(registry, testLogger, [middleware]).execute(
      instanceId,
      [
        newOrchestratorStartedEvent(),
        newExecutionStartedEvent(name, instanceId),
        newTaskScheduledEvent(1, activity.name),
      ],
      [newTaskCompletedEvent(1, '"activity-result"')],
    );

    expectCompleteResult(secondResult, '"activity-result"');
    expect(calls).toEqual(["before", "body", "before", "body", "after:activity-result"]);
  });

  it("replays durable actions created before next in deterministic sequence", async () => {
    const middlewareActivity = (_context: ActivityContext) => "middleware";
    const bodyActivity = (_context: ActivityContext) => "body";
    const orchestrator: TOrchestrator = async function* (context: OrchestrationContext): any {
      return yield context.callActivity(bodyActivity);
    };
    const middleware: OrchestrationMiddleware = async (context, next) => {
      context.orchestrationContext.callActivity(middlewareActivity);
      await next(context);
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);

    const firstResult = await new OrchestrationExecutor(registry, testLogger, [middleware]).execute(
      instanceId,
      [],
      [newOrchestratorStartedEvent(), newExecutionStartedEvent(name, instanceId)],
    );

    expect(firstResult.actions.map((action) => action.getScheduletask()?.getName())).toEqual([
      middlewareActivity.name,
      bodyActivity.name,
    ]);

    const secondResult = await new OrchestrationExecutor(registry, testLogger, [middleware]).execute(
      instanceId,
      [
        newOrchestratorStartedEvent(),
        newExecutionStartedEvent(name, instanceId),
        newTaskScheduledEvent(1, middlewareActivity.name),
        newTaskScheduledEvent(2, bodyActivity.name),
        newTaskCompletedEvent(1, '"middleware"'),
      ],
      [newTaskCompletedEvent(2, '"body"')],
    );

    expectCompleteResult(secondResult, '"body"');
  });

  it("replays pre-next deterministic values against the original orchestration clock", async () => {
    const firstTimestamp = new Date("2026-01-01T00:00:00.000Z");
    const secondTimestamp = new Date("2026-01-02T00:00:00.000Z");
    const generatedGuids: string[] = [];
    const middlewareActivity = (_context: ActivityContext) => "middleware";
    const bodyActivity = (_context: ActivityContext) => "body";
    const orchestrator: TOrchestrator = async function* (context: OrchestrationContext): any {
      return yield context.callActivity(bodyActivity);
    };
    const middleware: OrchestrationMiddleware = async (context, next) => {
      const guid = context.orchestrationContext.newGuid();
      generatedGuids.push(guid);
      context.orchestrationContext.callActivity(middlewareActivity, guid);
      await next(context);
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);

    const firstResult = await new OrchestrationExecutor(registry, testLogger, [middleware]).execute(
      instanceId,
      [],
      [newOrchestratorStartedEvent(firstTimestamp), newExecutionStartedEvent(name, instanceId)],
    );

    expect(firstResult.actions[0].getScheduletask()?.getInput()?.getValue()).toBe(JSON.stringify(generatedGuids[0]));

    const secondResult = await new OrchestrationExecutor(registry, testLogger, [middleware]).execute(
      instanceId,
      [
        newOrchestratorStartedEvent(firstTimestamp),
        newExecutionStartedEvent(name, instanceId),
        newTaskScheduledEvent(1, middlewareActivity.name),
        newTaskScheduledEvent(2, bodyActivity.name),
        newTaskCompletedEvent(1, '"middleware"'),
      ],
      [newOrchestratorStartedEvent(secondTimestamp), newTaskCompletedEvent(2, '"body"')],
    );

    expectCompleteResult(secondResult, '"body"');
    expect(generatedGuids).toHaveLength(2);
    expect(generatedGuids[1]).toBe(generatedGuids[0]);
  });

  it("does not allow outer middleware to swallow a nested next-call violation", async () => {
    const outer: OrchestrationMiddleware = async (context, next) => {
      try {
        await next(context);
      } catch {
        // Contract violations remain fatal even when user middleware catches them.
      }
    };
    const invalidInner: OrchestrationMiddleware = async () => {};

    const result = await executeOrchestration([outer, invalidInner]);

    expectFailure(result, "Orchestration middleware must call next exactly once");
  });

  it("does not allow outer middleware to swallow a nested orchestration failure", async () => {
    const expected = new Error("inner orchestration middleware failed");
    let caught: unknown;
    let observedFailure: Error | undefined;
    const body = jest.fn(async () => "done");
    const outer: OrchestrationMiddleware = async (context, next) => {
      try {
        await next(context);
      } catch (error) {
        caught = error;
        observedFailure = context.failure;
      }
    };
    const failingInner: OrchestrationMiddleware = async () => {
      throw expected;
    };

    const result = await executeOrchestration([outer, failingInner], body);

    expectFailure(result, expected.message);
    expect(caught).toBe(expected);
    expect(observedFailure).toBe(expected);
    expect(body).not.toHaveBeenCalled();
  });

  it("rejects orchestration middleware that returns before next completes", async () => {
    const middleware: OrchestrationMiddleware = async (context, next) => {
      void next(context);
    };

    const result = await executeOrchestration([middleware]);

    expectFailure(result, "Orchestration middleware must not return before next(context) completes");
  });

  it("quiesces a started but unawaited orchestration next call before failing", async () => {
    const activity = (_context: ActivityContext) => "body";
    const orchestrator: TOrchestrator = async function* (context: OrchestrationContext): any {
      return yield context.callActivity(activity);
    };
    const middleware: OrchestrationMiddleware = async (context, next) => {
      void next(context).then(() => {});
    };

    const result = await executeOrchestration([middleware], orchestrator);

    expectFailure(result, "Orchestration middleware must not return before next(context) completes");
  });
});

async function executeOrchestration(
  middleware: OrchestrationMiddleware[],
  orchestrator: TOrchestrator = async () => "done",
): Promise<OrchestrationExecutionResult> {
  const registry = new Registry();
  registry.addNamedOrchestrator("orchestrator", orchestrator);
  const executor = new OrchestrationExecutor(registry, testLogger, middleware);
  return executor.execute(
    instanceId,
    [],
    [newOrchestratorStartedEvent(), newExecutionStartedEvent("orchestrator", instanceId)],
  );
}

function expectCompleteResult(result: OrchestrationExecutionResult, expected: string): void {
  const complete = result.actions.find((action) => action.hasCompleteorchestration())?.getCompleteorchestration();
  expect(complete?.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
  expect(complete?.getResult()?.getValue()).toBe(expected);
}

function expectFailure(result: OrchestrationExecutionResult, expectedMessage: string): void {
  const complete = result.actions.find((action) => action.hasCompleteorchestration())?.getCompleteorchestration();
  expect(complete?.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
  expect(complete?.getFailuredetails()?.getErrormessage()).toContain(expectedMessage);
}
