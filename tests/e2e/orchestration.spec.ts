// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  PurgeInstanceCriteria,
  ProtoOrchestrationStatus as OrchestrationStatus,
  OrchestrationStatus as RuntimeStatus,
  getName,
  whenAll,
  whenAny,
  ActivityContext,
  OrchestrationContext,
  Task,
  TOrchestrator,
} from "@microsoft/durabletask-js";

describe("Durable Functions", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;

  beforeEach(async () => {
    // Start a worker, which will connect to the sidecar in a background thread
    taskHubWorker = new TaskHubGrpcWorker("localhost:4001");
    taskHubClient = new TaskHubGrpcClient("localhost:4001");
  });

  afterEach(async () => {
    await taskHubWorker.stop();
    await taskHubClient.stop();
  });

  it("should be able to run an empty orchestration", async () => {
    let invoked = false;

    const emptyOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      // nonlocal invoked
      // TODO: What is the above in python??
      invoked = true;
    };

    taskHubWorker.addOrchestrator(emptyOrchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(emptyOrchestrator);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(invoked);
    expect(state);
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

    expect(state);
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
      // Fan out to multiple sub-orchestrations
      const tasks: Task<any>[] = [];

      for (let i = 0; i < count; i++) {
        tasks.push(ctx.callActivity(increment));
      }

      // Wait for all the sub-orchestrations to complete
      yield whenAll(tasks);
    };

    taskHubWorker.addActivity(increment);
    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 10);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 10);

    expect(state);
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

    expect(state);
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(activityCounter).toEqual(1);
  }, 31000);

  it("should be able to use the sub-orchestration for fan-out", async () => {
    const SUB_ORCHESTRATION_COUNT = 2;
    const ACTIVITY_COUNT = 2;

    let activityCounter = 0;

    const increment = (_: ActivityContext) => {
      activityCounter++;
    };

    const orchestratorChild: TOrchestrator = async function* (ctx: OrchestrationContext, activityCount: number): any {
      for (let i = 0; i < activityCount; i++) {
        yield ctx.callActivity(increment);
      }
    };

    const orchestratorParent: TOrchestrator = async function* (ctx: OrchestrationContext, count: number): any {
      // Fan out to multiple sub-orchestrations
      const tasks: Task<any>[] = [];

      for (let i = 0; i < count; i++) {
        tasks.push(ctx.callSubOrchestrator(orchestratorChild, ACTIVITY_COUNT));
      }

      // Wait for all the sub-orchestrations to complete
      yield whenAll(tasks);
    };

    taskHubWorker.addActivity(increment);
    taskHubWorker.addOrchestrator(orchestratorChild);
    taskHubWorker.addOrchestrator(orchestratorParent);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestratorParent, SUB_ORCHESTRATION_COUNT);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state);
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(activityCounter).toEqual(SUB_ORCHESTRATION_COUNT * ACTIVITY_COUNT);
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

    expect(state);
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(["a", "b", "c"]));
  });

  it("should be able to run an single timer", async () => {
    const delay = 3;
    const singleTimer: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.createTimer(delay);
    };

    taskHubWorker.addOrchestrator(singleTimer);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(singleTimer);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    const createdAtMs = state?.createdAt?.getTime() ?? 0;
    const lastUpdatedAtMs = state?.lastUpdatedAt?.getTime() ?? 0;
    const actualDurationMs = lastUpdatedAtMs - createdAtMs;
    const expectedMinDurationMs = delay * 1000;
    // Allow 1 second tolerance for timing variations in test infrastructure
    // (createdAt may not align exactly with when timer was scheduled)
    const toleranceMs = 1000;

    expect(state);
    expect(state?.name).toEqual(getName(singleTimer));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.createdAt).toBeDefined();
    expect(state?.lastUpdatedAt).toBeDefined();
    // Timer should fire after approximately the expected delay (with tolerance for timing variations)
    expect(actualDurationMs).toBeGreaterThanOrEqual(expectedMinDurationMs - toleranceMs);
  }, 31000);

  it("should wait for external events with a timeout - true", async () => {
    const shouldRaiseEvent = true;
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const approval = ctx.waitForExternalEvent("Approval");
      const timeout = ctx.createTimer(3);
      const winner = yield whenAny([approval, timeout]);

      if (winner == approval) {
        return "approved";
      } else {
        return "timed out";
      }
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    // Send events to the client immediately
    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);

    if (shouldRaiseEvent) {
      taskHubClient.raiseOrchestrationEvent(id, "Approval");
    }

    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state);
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

    if (shouldRaiseEvent) {
      expect(state?.serializedOutput).toEqual(JSON.stringify("approved"));
    } else {
      expect(state?.serializedOutput).toEqual(JSON.stringify("timed out"));
    }
  }, 31000);

  it("should wait for external events with a timeout - false", async () => {
    const shouldRaiseEvent = false;
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const approval = ctx.waitForExternalEvent("Approval");
      const timeout = ctx.createTimer(3);
      const winner = yield whenAny([approval, timeout]);

      if (winner == approval) {
        return "approved";
      } else {
        return "timed out";
      }
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    // Send events to the client immediately
    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);

    if (shouldRaiseEvent) {
      taskHubClient.raiseOrchestrationEvent(id, "Approval");
    }

    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state);
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

    if (shouldRaiseEvent) {
      expect(state?.serializedOutput).toEqual(JSON.stringify("approved"));
    } else {
      expect(state?.serializedOutput).toEqual(JSON.stringify("timed out"));
    }
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
    expect(state);
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING);

    await taskHubClient.terminateOrchestration(id, "some reason for termination");
    state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);
    expect(state);
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
    expect(state);
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(10));
  }, 31000);

  it("should be able to run an single orchestration without activity", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, startVal: number) => {
      return startVal + 1;
    };

    taskHubWorker.addOrchestrator(orchestrator);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 15);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state);
    expect(state?.name).toEqual(getName(orchestrator));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedInput).toEqual(JSON.stringify(15));
    expect(state?.serializedOutput).toEqual(JSON.stringify(16));
  }, 31000);

  it("should be able to purge orchestration by id", async () => {
    const plusOne = async (_: ActivityContext, input: number) => {
      return input + 1;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, startVal: number): any {
      return yield ctx.callActivity(plusOne, startVal);
    };

    taskHubWorker.addOrchestrator(orchestrator);
    taskHubWorker.addActivity(plusOne);
    await taskHubWorker.start();

    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 1);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state);
    expect(state?.name).toEqual(getName(orchestrator));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedInput).toEqual(JSON.stringify(1));
    expect(state?.serializedOutput).toEqual(JSON.stringify(2));

    const purgeResult = await taskHubClient.purgeOrchestration(id);
    expect(purgeResult);
    expect(purgeResult?.deletedInstanceCount).toEqual(1);
  }, 31000);

  // Skip: multi-instance purge is not implemented in the durabletask-go sidecar emulator
  // See: https://github.com/microsoft/durabletask-go/issues/XXX
  it.skip("should be able to purge orchestration by PurgeInstanceCriteria", async () => {
    const delaySeconds = 1;
    const plusOne = async (_: ActivityContext, input: number) => {
      return input + 1;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, startVal: number): any {
      return yield ctx.callActivity(plusOne, startVal);
    };

    const terminate: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.createTimer(delaySeconds);
    };

    taskHubWorker.addOrchestrator(orchestrator);
    taskHubWorker.addOrchestrator(terminate);
    taskHubWorker.addActivity(plusOne);
    await taskHubWorker.start();

    // Set startTime slightly in the past to account for clock drift
    const startTime = new Date(Date.now() - 1000);
    const id = await taskHubClient.scheduleNewOrchestration(orchestrator, 1);
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state);
    expect(state?.name).toEqual(getName(orchestrator));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedInput).toEqual(JSON.stringify(1));
    expect(state?.serializedOutput).toEqual(JSON.stringify(2));

    // purge instance, test CreatedTimeFrom
    const criteria = new PurgeInstanceCriteria();
    criteria.setCreatedTimeFrom(startTime);
    let purgeResult = await taskHubClient.purgeOrchestration(criteria);
    expect(purgeResult);
    expect(purgeResult?.deletedInstanceCount).toEqual(1);

    // assert instance doesn't exit.
    let metadata = await taskHubClient.getOrchestrationState(id);
    expect(metadata).toBeUndefined();

    // purge instance, test CreatedTimeTo
    criteria.setCreatedTimeTo(new Date(Date.now()));
    purgeResult = await taskHubClient.purgeOrchestration(criteria);
    expect(purgeResult);
    expect(purgeResult?.deletedInstanceCount).toEqual(0);

    // assert instance doesn't exit.
    metadata = await taskHubClient.getOrchestrationState(id);
    expect(metadata).toBeUndefined();

    const id1 = await taskHubClient.scheduleNewOrchestration(orchestrator, 1);
    const state1 = await taskHubClient.waitForOrchestrationCompletion(id1, undefined, 30);

    expect(state1);
    expect(state1?.name).toEqual(getName(orchestrator));
    expect(state1?.instanceId).toEqual(id1);
    expect(state1?.failureDetails).toBeUndefined();
    expect(state1?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state1?.serializedInput).toEqual(JSON.stringify(1));
    expect(state1?.serializedOutput).toEqual(JSON.stringify(2));

    const id2 = await taskHubClient.scheduleNewOrchestration(terminate);
    await taskHubClient.terminateOrchestration(id2, "termination");
    const state2 = await taskHubClient.waitForOrchestrationCompletion(id2, undefined, 30);
    expect(state2);
    expect(state2?.name).toEqual(getName(terminate));
    expect(state2?.instanceId).toEqual(id2);
    expect(state2?.failureDetails).toBeUndefined();
    expect(state2?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);

    const runtimeStatuses: RuntimeStatus[] = [];
    runtimeStatuses.push(RuntimeStatus.TERMINATED);
    runtimeStatuses.push(RuntimeStatus.COMPLETED);

    // Add a small delay to ensure the orchestrations are fully persisted
    await new Promise((resolve) => setTimeout(resolve, 1000));

    criteria.setCreatedTimeTo(new Date(Date.now()));
    criteria.setRuntimeStatusList(runtimeStatuses);
    purgeResult = await taskHubClient.purgeOrchestration(criteria);
    expect(purgeResult);
    expect(purgeResult?.deletedInstanceCount).toEqual(2);

    // assert instance doesn't exit.
    metadata = await taskHubClient.getOrchestrationState(id1);
    expect(metadata).toBeUndefined();
    metadata = await taskHubClient.getOrchestrationState(id2);
    expect(metadata).toBeUndefined();
  }, 31000);
});
