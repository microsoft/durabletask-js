// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  OrchestrationStatus,
  getName,
  whenAll,
  ActivityContext,
  OrchestrationContext,
  Task,
  TOrchestrator,
} from "../src";

describe("In-Memory Backend", () => {
  let backend: InMemoryOrchestrationBackend;
  let client: TestOrchestrationClient;
  let worker: TestOrchestrationWorker;

  beforeEach(async () => {
    backend = new InMemoryOrchestrationBackend();
    client = new TestOrchestrationClient(backend);
    worker = new TestOrchestrationWorker(backend);
  });

  afterEach(async () => {
    if (worker) {
      try {
        await worker.stop();
      } catch {
        // Ignore if not running
      }
    }
    backend.reset();
  });

  it("should run an empty orchestration", async () => {
    let invoked = false;

    const emptyOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      invoked = true;
    };

    worker.addOrchestrator(emptyOrchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(emptyOrchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(invoked).toBe(true);
    expect(state).toBeDefined();
    expect(state?.name).toEqual(getName(emptyOrchestrator));
    expect(state?.instanceId).toEqual(id);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
  });

  it("should run an activity sequence", async () => {
    const plusOne = async (_: ActivityContext, input: number) => {
      return input + 1;
    };

    const sequence: TOrchestrator = async function* (ctx: OrchestrationContext, startVal: number): any {
      const numbers = [startVal];
      let current = startVal;

      for (let i = 0; i < 5; i++) {
        current = yield ctx.callActivity(plusOne, current);
        numbers.push(current);
      }

      return numbers;
    };

    worker.addOrchestrator(sequence);
    worker.addActivity(plusOne);
    await worker.start();

    const id = await client.scheduleNewOrchestration(sequence, 1);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.name).toEqual(getName(sequence));
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedInput).toEqual(JSON.stringify(1));
    expect(state?.serializedOutput).toEqual(JSON.stringify([1, 2, 3, 4, 5, 6]));
  });

  it("should run fan-out/fan-in", async () => {
    let activityCounter = 0;

    const increment = (_: ActivityContext) => {
      activityCounter++;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, count: number): any {
      const tasks: Task<any>[] = [];

      for (let i = 0; i < count; i++) {
        tasks.push(ctx.callActivity(increment));
      }

      yield whenAll(tasks);
    };

    worker.addActivity(increment);
    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator, 5);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(activityCounter).toEqual(5);
  });

  it("should handle sub-orchestrations", async () => {
    let activityCounter = 0;

    const increment = (_: ActivityContext) => {
      activityCounter++;
    };

    const childOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.callActivity(increment);
    };

    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.callSubOrchestrator(childOrchestrator);
    };

    worker.addActivity(increment);
    worker.addOrchestrator(childOrchestrator);
    worker.addOrchestrator(parentOrchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(parentOrchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(activityCounter).toEqual(1);
  });

  it("should handle external events", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const value = yield ctx.waitForExternalEvent("my_event");
      return value;
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    
    // Wait for orchestration to start
    await client.waitForOrchestrationStart(id, false, 5);
    
    // Raise the event
    await client.raiseOrchestrationEvent(id, "my_event", "hello");
    
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("hello"));
  });

  it("should handle timers", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      // Wait for 100ms
      yield ctx.createTimer(0.1);
      return "done";
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("done"));
  });

  it("should handle termination", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.waitForExternalEvent("never");
      return "never reached";
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await client.waitForOrchestrationStart(id, false, 5);
    
    await client.terminateOrchestration(id, "terminated by test");
    
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.TERMINATED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("terminated by test"));
  });

  it("should handle continue-as-new", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, input: number) => {
      if (input < 5) {
        ctx.continueAsNew(input + 1, true);
      } else {
        return input;
      }
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator, 1);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(5));
  });

  it("should handle orchestration without activities", async () => {
    const orchestrator: TOrchestrator = async (_: OrchestrationContext, input: number) => {
      return input * 2;
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator, 21);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(42));
  });

  it("should handle activity failures", async () => {
    const failingActivity = (_: ActivityContext) => {
      throw new Error("Activity failed intentionally");
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      try {
        yield ctx.callActivity(failingActivity);
        return "should not reach here";
      } catch (error: any) {
        return `caught: ${error.message}`;
      }
    };

    worker.addActivity(failingActivity);
    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toContain("caught:");
  });

  it("should purge completed orchestrations", async () => {
    const orchestrator: TOrchestrator = async () => "done";

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await client.waitForOrchestrationCompletion(id, false, 10);

    const result = await client.purgeOrchestration(id);
    expect(result.deletedInstanceCount).toEqual(1);

    const state = await client.getOrchestrationState(id);
    expect(state).toBeUndefined();
  });
});
