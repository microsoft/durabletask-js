// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for Durable Task Scheduler (DTS) emulator.
 *
 * NOTE: These tests assume the DTS emulator is running. Example command:
 *       docker run -i -p 8080:8080 -d mcr.microsoft.com/dts/dts-emulator:latest
 *
 * Environment variables:
 *   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
 *   - TASKHUB: The task hub name (default: default)
 */

import { TaskHubGrpcClient } from "../../src/client/client";
import { OrchestrationStatus } from "../../src/proto/orchestrator_service_pb";
import { getName, whenAll } from "../../src/task";
import { ActivityContext } from "../../src/task/context/activity-context";
import { OrchestrationContext } from "../../src/task/context/orchestration-context";
import { Task } from "../../src/task/task";
import { TOrchestrator } from "../../src/types/orchestrator.type";
import { TaskHubGrpcWorker } from "../../src/worker/task-hub-grpc-worker";

// Read environment variables
const endpoint = process.env.ENDPOINT || "localhost:8080";
const _taskHub = process.env.TASKHUB || "default";

describe("Durable Task Scheduler (DTS) E2E Tests", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;

  beforeEach(async () => {
    // Start a worker, which will connect to the DTS emulator in a background thread
    taskHubWorker = new TaskHubGrpcWorker(endpoint);
    taskHubClient = new TaskHubGrpcClient(endpoint);
  });

  afterEach(async () => {
    await taskHubWorker.stop();
    await taskHubClient.stop();
  });

  it("should be able to run an empty orchestration", async () => {
    let invoked = false;

    const emptyOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      invoked = true;
    };

    taskHubWorker.addOrchestrator(emptyOrchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(emptyOrchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(invoked).toBe(true);
    expect(state).toBeDefined();
    expect(state?.name).toEqual(getName(emptyOrchestrator));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
  });

  it("should be able to run an activity sequence", async () => {
    const plusOne = async (_: ActivityContext, input: number) => {
      return input + 1;
    };

    const sequence: TOrchestrator = async function* (ctx: OrchestrationContext, startVal: number): any {
      const numbers = [startVal];
      let current = startVal;

      for (let i = 0; i < 10; i++) {
        current = yield ctx.callActivity(plusOne, current);
        numbers.push(current);
      }

      return numbers;
    };

    taskHubWorker.addOrchestrator(sequence);
    taskHubWorker.addActivity(plusOne);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(sequence, 1);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.name).toEqual(getName(sequence));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedInput).toEqual(JSON.stringify(1));
    expect(state?.serializedOutput).toEqual(JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
  }, 31000);

  it("should be able to run fan-out/fan-in", async () => {
    let activityCounter = 0;

    const increment = (_: ActivityContext) => {
      activityCounter++;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, count: number): any {
      // Fan out to multiple activities
      const tasks: Task<any>[] = [];

      for (let i = 0; i < count; i++) {
        tasks.push(ctx.callActivity(increment));
      }

      // Wait for all the activities to complete
      yield whenAll(tasks);
    };

    taskHubWorker.addActivity(increment);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 10);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(activityCounter).toEqual(10);
  }, 31000);

  it("should be able to use the sub-orchestration", async () => {
    let activityCounter = 0;

    const increment = (_: ActivityContext) => {
      activityCounter++;
    };

    const orchestratorChild: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.callActivity(increment);
    };

    const orchestratorParent: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      // Call sub-orchestration
      yield ctx.callSubOrchestrator(orchestratorChild);
    };

    taskHubWorker.addActivity(increment);
    taskHubWorker.addOrchestrator(orchestratorChild);
    taskHubWorker.addOrchestrator(orchestratorParent);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestratorParent, 10);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(activityCounter).toEqual(1);
  }, 31000);

  it("should allow waiting for multiple external events", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const a = yield ctx.waitForExternalEvent("A");
      const b = yield ctx.waitForExternalEvent("B");
      const c = yield ctx.waitForExternalEvent("C");
      return [a, b, c];
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    // Send events to the client immediately
    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    taskHubClient.raiseOrchestrationEvent(id, "A", "a");
    taskHubClient.raiseOrchestrationEvent(id, "B", "b");
    taskHubClient.raiseOrchestrationEvent(id, "C", "c");
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(["a", "b", "c"]));
  });

  it("should be able to run a single timer", async () => {
    const delay = 3;
    const singleTimer: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.createTimer(delay);
    };

    taskHubWorker.addOrchestrator(singleTimer);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(singleTimer);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    let expectedCompletionSecond = state?.createdAt?.getTime() ?? 0;
    if (state && state.createdAt !== undefined) {
      expectedCompletionSecond += delay * 1000;
    }
    expect(expectedCompletionSecond).toBeDefined();
    const actualCompletionSecond = state?.lastUpdatedAt?.getTime() ?? 0;
    expect(actualCompletionSecond).toBeDefined();

    expect(state).toBeDefined();
    expect(state?.name).toEqual(getName(singleTimer));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.createdAt).toBeDefined();
    expect(state?.lastUpdatedAt).toBeDefined();
    expect(expectedCompletionSecond).toBeLessThanOrEqual(actualCompletionSecond);
  }, 31000);

  it("should be able to terminate an orchestration", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const res = yield ctx.waitForExternalEvent("my_event");
      return res;
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    let state = await taskHubClient.waitForOrchestrationStart(id, undefined, 30);
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING);

    await taskHubClient.terminateOrchestration(id, "some reason for termination");
    state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("some reason for termination"));
  }, 31000);

  it("should allow to continue as new", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, input: number) => {
      if (input < 10) {
        ctx.continueAsNew(input + 1, true);
      } else {
        return input;
      }
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 1);

    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(10));
  }, 31000);

  it("should be able to run a single orchestration without activity", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, startVal: number) => {
      return startVal + 1;
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 15);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.name).toEqual(getName(orchestrator));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedInput).toEqual(JSON.stringify(15));
    expect(state?.serializedOutput).toEqual(JSON.stringify(16));
  }, 31000);
});
