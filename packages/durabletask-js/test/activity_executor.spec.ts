// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityContext } from "../src/task/context/activity-context";
import { TActivity } from "../src/types/activity.type";
import { NoOpLogger } from "../src/types/logger.type";
import { ActivityExecutor } from "../src/worker/activity-executor";
import { ActivityNotRegisteredError } from "../src/worker/exception/activity-not-registered-error";
import { Registry } from "../src/worker/registry";

// Use NoOpLogger to suppress log output during tests
const testLogger = new NoOpLogger();

// const TEST_LOGGER = shared.get_logger();
const TEST_INSTANCE_ID = "abc123";
const TEST_TASK_ID = 42;

describe("Activity Executor", () => {
  it("should validates activity function input population", async () => {
    const testActivity = (ctx: ActivityContext, testInput: any) => {
      // return all activity inputs back as the output
      return [testInput, ctx.orchestrationId, ctx.taskId];
    };

    const activityInput = "Hello, 世界!";
    const [executor, name] = getActivityExecutor(testActivity);
    const result = await executor.execute(TEST_INSTANCE_ID, name, TEST_TASK_ID, JSON.stringify(activityInput));
    expect(result).not.toBeNull();

    const [resultInput, resultOrchestrationId, resultTaskId] = JSON.parse(result ?? "[]");

    expect(activityInput).toEqual(resultInput);
    expect(TEST_INSTANCE_ID).toEqual(resultOrchestrationId);
    expect(TEST_TASK_ID).toEqual(resultTaskId);
  });

  it("It should raise a worker.ActivityNotRegisteredError exception when attempting to execute an unregistered activity", async () => {
    const testActivity = (_: ActivityContext) => {
      return;
    };

    const [executor, _] = getActivityExecutor(testActivity);

    let caughtException: Error | null = null;

    try {
      await executor.execute(TEST_INSTANCE_ID, "Bogus", TEST_TASK_ID, undefined);
    } catch (ex: any) {
      caughtException = ex;
    }

    expect(caughtException?.constructor?.name).toEqual(ActivityNotRegisteredError.name);
    expect(caughtException).not.toBeNull();
    expect(caughtException?.message).toMatch(/Bogus/);
  });

  it("should throw and log activityFailed when input is malformed JSON", async () => {
    const testActivity = (_: ActivityContext, input: any) => {
      return input;
    };

    const loggerSpy = createSpyLogger();
    const [executor, name] = getActivityExecutor(testActivity, loggerSpy);

    const malformedJson = "{not valid json";

    await expect(executor.execute(TEST_INSTANCE_ID, name, TEST_TASK_ID, malformedJson))
      .rejects.toThrow(SyntaxError);

    // Verify the activityFailed log (EventId 605) was emitted
    expect(loggerSpy.error).toHaveBeenCalled();
    const errorCall = loggerSpy.error.mock.calls[0][0];
    expect(errorCall).toContain(name);
    expect(errorCall).toContain(TEST_INSTANCE_ID);
    expect(errorCall).toContain("failed");
  });

  it("should handle undefined input without error", async () => {
    const testActivity = (_: ActivityContext, input: any) => {
      return input;
    };

    const [executor, name] = getActivityExecutor(testActivity);
    const result = await executor.execute(TEST_INSTANCE_ID, name, TEST_TASK_ID, undefined);
    expect(result).toBeUndefined();
  });

  it("should handle empty string input without error", async () => {
    const testActivity = (_: ActivityContext, input: any) => {
      return input;
    };

    const [executor, name] = getActivityExecutor(testActivity);
    const result = await executor.execute(TEST_INSTANCE_ID, name, TEST_TASK_ID, "");
    expect(result).toBeUndefined();
  });
});

// Activity = Callable[[ActivityContext, TInput], TOutput]
function getActivityExecutor(fn: TActivity<any, any>, logger?: any): [ActivityExecutor, string] {
  const registry = new Registry();
  const name = registry.addActivity(fn);
  const executor = new ActivityExecutor(registry, logger ?? testLogger);
  return [executor, name];
}

function createSpyLogger() {
  return {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}
