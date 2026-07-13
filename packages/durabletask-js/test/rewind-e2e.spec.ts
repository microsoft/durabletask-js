// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  OrchestrationStatus,
  ActivityContext,
  OrchestrationContext,
  TOrchestrator,
} from "../src";

describe("Rewind (in-memory e2e)", () => {
  let backend: InMemoryOrchestrationBackend;
  let client: TestOrchestrationClient;
  let worker: TestOrchestrationWorker;

  beforeEach(() => {
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

  it("rewindFailedActivity: a failed activity re-runs and the orchestration completes", async () => {
    let activityCallCount = 0;
    let shouldFail = true;

    const failingActivity = (_: ActivityContext, input: string): string => {
      activityCallCount += 1;
      if (shouldFail) {
        throw new Error("Simulated failure");
      }
      return `Hello, ${input}!`;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      return yield ctx.callActivity(failingActivity, input);
    };

    worker.addOrchestrator(orchestrator);
    worker.addActivity(failingActivity);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator, "World");
    let state = await client.waitForOrchestrationCompletion(id, true, 10);

    // The orchestration should have failed.
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);

    // Fix the activity so it now succeeds, then rewind.
    shouldFail = false;
    await client.rewindOrchestration(id, "retry after fix");

    state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("Hello, World!"));
    expect(state?.failureDetails).toBeUndefined();
    // Activity was called twice (once failed, once succeeded after rewind).
    expect(activityCallCount).toEqual(2);
  });

  it("rewindPreservesSuccessfulResults: only the failed activity re-runs; successful result is replayed", async () => {
    const callTracker = { first: 0, second: 0 };
    let shouldFailSecond = true;

    const firstActivity = (_: ActivityContext, input: string): string => {
      callTracker.first += 1;
      return `first:${input}`;
    };

    const secondActivity = (_: ActivityContext, input: string): string => {
      callTracker.second += 1;
      if (shouldFailSecond) {
        throw new Error("Temporary failure");
      }
      return `second:${input}`;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      const r1 = yield ctx.callActivity(firstActivity, input);
      const r2 = yield ctx.callActivity(secondActivity, input);
      return [r1, r2];
    };

    worker.addOrchestrator(orchestrator);
    worker.addActivity(firstActivity);
    worker.addActivity(secondActivity);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator, "test");
    let state = await client.waitForOrchestrationCompletion(id, true, 10);

    // The orchestration should have failed (secondActivity fails).
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);

    // Fix secondActivity so it now succeeds, then rewind.
    shouldFailSecond = false;
    await client.rewindOrchestration(id, "retry");
    state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(["first:test", "second:test"]));
    expect(state?.failureDetails).toBeUndefined();
    // firstActivity should NOT be re-executed — its result is replayed from history.
    expect(callTracker.first).toEqual(1);
    // secondActivity was called at least twice (once failed, once succeeded).
    expect(callTracker.second).toBeGreaterThanOrEqual(2);
  });

  it("rewindNotFound: rewinding a non-existent instance rejects", async () => {
    await worker.start();
    await expect(client.rewindOrchestration("nonexistent-id")).rejects.toThrow();
  });

  it("rewindNonFailedInstance: rewinding a completed (non-failed) instance rejects", async () => {
    const orchestrator: TOrchestrator = async (_: OrchestrationContext) => "done";

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);

    await expect(client.rewindOrchestration(id)).rejects.toThrow();
  });

  it("rewindWithSubOrchestration: recursively rewinds a failed sub-orchestration", async () => {
    let subCallCount = 0;

    const childActivity = (_: ActivityContext, input: string): string => {
      subCallCount += 1;
      if (subCallCount === 1) {
        throw new Error("Child failure");
      }
      return `child:${input}`;
    };

    const childOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      return yield ctx.callActivity(childActivity, input);
    };

    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      const result = yield ctx.callSubOrchestrator(childOrchestrator, input);
      return `parent:${result}`;
    };

    worker.addOrchestrator(parentOrchestrator);
    worker.addOrchestrator(childOrchestrator);
    worker.addActivity(childActivity);
    await worker.start();

    const id = await client.scheduleNewOrchestration(parentOrchestrator, "data");
    let state = await client.waitForOrchestrationCompletion(id, true, 10);

    // Parent should fail because child failed.
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);

    // Rewind — childActivity will succeed on retry.
    await client.rewindOrchestration(id, "sub-orch fix");
    state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("parent:child:data"));
    expect(subCallCount).toEqual(2);
  });

  it("rewindWithoutReason: rewind works when no reason is provided", async () => {
    let callCount = 0;

    const flakyActivity = (_: ActivityContext): string => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error("Boom");
      }
      return "ok";
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      return yield ctx.callActivity(flakyActivity);
    };

    worker.addOrchestrator(orchestrator);
    worker.addActivity(flakyActivity);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    let state = await client.waitForOrchestrationCompletion(id, true, 10);
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);

    // Rewind without a reason.
    await client.rewindOrchestration(id);
    state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("ok"));
  });

  it("rewindPurgedSubOrchestration: a purged sub-orchestration is re-run when the parent is rewound", async () => {
    let childCallCount = 0;

    const childActivity = (_: ActivityContext, input: string): string => {
      childCallCount += 1;
      if (childCallCount === 1) {
        throw new Error("Child failure");
      }
      return `child:${input}`;
    };

    const childOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      return yield ctx.callActivity(childActivity, input);
    };

    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      const result = yield ctx.callSubOrchestrator(childOrchestrator, input, {
        instanceId: "sub-orch-to-purge",
      });
      return `parent:${result}`;
    };

    worker.addOrchestrator(parentOrchestrator);
    worker.addOrchestrator(childOrchestrator);
    worker.addActivity(childActivity);
    await worker.start();

    const id = await client.scheduleNewOrchestration(parentOrchestrator, "data");
    let state = await client.waitForOrchestrationCompletion(id, true, 10);

    // Parent should fail because child failed.
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);

    // Purge the sub-orchestration so it must be completely re-run.
    await client.purgeOrchestration("sub-orch-to-purge");

    // Rewind the parent — child will be re-scheduled and succeed.
    await client.rewindOrchestration(id, "purge and retry");
    state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("parent:child:data"));
    expect(childCallCount).toEqual(2);
  });

  it("rewindTwice: the same orchestration can be rewound twice after failing twice", async () => {
    let callCount = 0;

    const flakyActivity = (_: ActivityContext, input: string): string => {
      callCount += 1;
      // Fail on the 1st and 2nd calls; succeed on the 3rd.
      if (callCount <= 2) {
        throw new Error(`Failure #${callCount}`);
      }
      return `Hello, ${input}!`;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      return yield ctx.callActivity(flakyActivity, input);
    };

    worker.addOrchestrator(orchestrator);
    worker.addActivity(flakyActivity);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator, "World");
    let state = await client.waitForOrchestrationCompletion(id, true, 10);

    // First failure.
    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);

    // First rewind — activity fails again (callCount === 2).
    await client.rewindOrchestration(id, "first rewind");
    state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);

    // Second rewind — activity succeeds (callCount === 3).
    await client.rewindOrchestration(id, "second rewind");
    state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("Hello, World!"));
    expect(callCount).toEqual(3);
  });
});
