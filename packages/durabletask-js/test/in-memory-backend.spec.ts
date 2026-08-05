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
import * as pb from "../src/proto/orchestrator_service_pb";

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

  it("should handle sub-orchestrations with timer delays", async () => {
    const childWithTimer: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      // Sub-orchestration uses a short timer before returning a result
      yield ctx.createTimer(0.1);
      return "child-done";
    };

    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const result = yield ctx.callSubOrchestrator(childWithTimer);
      return `parent-received-${result}`;
    };

    worker.addOrchestrator(childWithTimer);
    worker.addOrchestrator(parentOrchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(parentOrchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("parent-received-child-done"));
  });

  it("should handle sub-orchestration failure", async () => {
    const failingChild: TOrchestrator = async (_ctx: OrchestrationContext) => {
      throw new Error("child failed");
    };

    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      try {
        yield ctx.callSubOrchestrator(failingChild);
        return "should not reach";
      } catch (error: any) {
        return `caught: ${error.message}`;
      }
    };

    worker.addOrchestrator(failingChild);
    worker.addOrchestrator(parentOrchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(parentOrchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toContain("caught:");
  });

  it("should set parent instance info on sub-orchestrations", async () => {
    let capturedParent: import("../src").ParentOrchestrationInstance | undefined;

    const childOrchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      capturedParent = ctx.parent;
      return "child-done";
    };

    const parentOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const result = yield ctx.callSubOrchestrator(childOrchestrator);
      return result;
    };

    worker.addOrchestrator(childOrchestrator);
    worker.addOrchestrator(parentOrchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(parentOrchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);

    // Verify parent instance info was populated on the sub-orchestration context
    expect(capturedParent).toBeDefined();
    expect(capturedParent?.name).toEqual(getName(parentOrchestrator));
    expect(capturedParent?.instanceId).toEqual(id);
    expect(typeof capturedParent?.taskScheduledId).toEqual("number");
  });

  it("should not set parent instance info on top-level orchestrations", async () => {
    let capturedParent: import("../src").ParentOrchestrationInstance | undefined;

    const topLevelOrchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      capturedParent = ctx.parent;
      return "done";
    };

    worker.addOrchestrator(topLevelOrchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(topLevelOrchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);

    // Top-level orchestrations should have no parent
    expect(capturedParent).toBeUndefined();
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

  it("should use the requested version after continue-as-new", async () => {
    const observedVersions: string[] = [];
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, input: number) => {
      if (!ctx.isReplaying) {
        observedVersions.push(ctx.version);
      }

      if (input === 0) {
        ctx.continueAsNew(1, false, "2.0.0");
        return;
      }

      return ctx.version;
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator, 0);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("2.0.0"));
    expect(observedVersions).toEqual(["", "2.0.0"]);
  });

  it("should not collide default sub-orchestration instance IDs across continue-as-new generations", async () => {
    // Regression for the callHttp-on-continueAsNew collision: a default (auto-derived) child
    // instance ID must be unique per generation. Before the fix the derived ID was
    // `${parentId}:${seqHex}`, and since neither input varies across a continueAsNew generation
    // the second generation re-derived the first generation's child ID verbatim and the backend
    // rejected it with "Orchestration instance '...:0001' already exists".
    const childInstanceIds: string[] = [];

    const child: TOrchestrator = async (ctx: OrchestrationContext, input: string) => {
      if (!ctx.isReplaying) {
        childInstanceIds.push(ctx.instanceId);
      }
      return `child-${input}`;
    };

    const parent: TOrchestrator = async function* (ctx: OrchestrationContext, gen: number): any {
      const r = yield ctx.callSubOrchestrator(child, `gen${gen}`);
      if (gen < 1) {
        ctx.continueAsNew(gen + 1, true);
        return;
      }
      return r;
    };

    worker.addOrchestrator(child);
    worker.addOrchestrator(parent);
    await worker.start();

    const id = await client.scheduleNewOrchestration(parent, 0);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("child-gen1"));

    // Both generations scheduled a default-ID sub-orchestration; the IDs must differ.
    expect(childInstanceIds.length).toBe(2);
    expect(childInstanceIds[0]).not.toEqual(childInstanceIds[1]);
  });

  it("gives distinct deterministic default IDs to sequential sub-orchestrations within one execution", async () => {
    // Control for the fix above: within a SINGLE execution (no continueAsNew) two sequential
    // default-ID sub-orchestrations must still get stable, distinct IDs (their sequence numbers
    // differ). A fix that made every child ID identical would pass the regression test's
    // "different across generations" check only by accident and would break this one.
    const childInstanceIds: string[] = [];

    const child: TOrchestrator = async (ctx: OrchestrationContext) => {
      if (!ctx.isReplaying) {
        childInstanceIds.push(ctx.instanceId);
      }
      return "ok";
    };

    const parent: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.callSubOrchestrator(child);
      yield ctx.callSubOrchestrator(child);
      return "done";
    };

    worker.addOrchestrator(child);
    worker.addOrchestrator(parent);
    await worker.start();

    const id = await client.scheduleNewOrchestration(parent);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(childInstanceIds.length).toBe(2);
    expect(new Set(childInstanceIds).size).toBe(2);
  });

  it("should deliver carryover events after ExecutionStarted during continue-as-new", async () => {
    // This test verifies that carryover events (saved external events) are
    // delivered AFTER OrchestratorStarted and ExecutionStarted when
    // continuing-as-new with saveEvents=true. This matches the real sidecar
    // behavior. If carryover events were delivered before ExecutionStarted,
    // the orchestrator generator would not be initialized yet.
    //
    // Scenario: An external event is raised on the orchestration. The first
    // iteration does NOT consume it. It continues-as-new with saveEvents=true.
    // The second iteration should receive the carried-over event.

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: { iteration: number }): any {
      if (input.iteration === 1) {
        // Wait for a separate event so the test can deterministically enqueue
        // the carryover event before continue-as-new runs.
        yield ctx.waitForExternalEvent("continue");
        // Do NOT consume the "carry-me" event — it should be carried over
        ctx.continueAsNew({ iteration: 2 }, true); // saveEvents = true
      } else {
        // Second iteration: the carried-over event should be available
        const val = yield ctx.waitForExternalEvent("carry-me");
        return val;
      }
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator, { iteration: 1 });

    // Wait for the orchestration to start and block on the "continue" event.
    await client.waitForOrchestrationStart(id, false, 5);

    // Raise an external event that the first iteration won't consume
    await client.raiseOrchestrationEvent(id, "carry-me", "carried-over-payload");
    await client.raiseOrchestrationEvent(id, "continue");

    // The orchestration should continue-as-new and then complete in iteration 2
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("carried-over-payload"));

    const history = backend.getInstance(id)?.history ?? [];
    const iterationStart = history.findIndex(
      (event) => event.getEventtypeCase() === pb.HistoryEvent.EventtypeCase.ORCHESTRATORSTARTED,
    );
    expect(iterationStart).toBeGreaterThanOrEqual(0);
    expect(history[iterationStart]?.getEventtypeCase()).toBe(pb.HistoryEvent.EventtypeCase.ORCHESTRATORSTARTED);
    expect(history[iterationStart + 1]?.getEventtypeCase()).toBe(pb.HistoryEvent.EventtypeCase.EXECUTIONSTARTED);
    expect(history[iterationStart + 2]?.getEventtypeCase()).toBe(pb.HistoryEvent.EventtypeCase.EVENTRAISED);
    expect(history[iterationStart + 2]?.getEventraised()?.getName()).toBe("carry-me");
  });

  it("should clear customStatus after continue-as-new", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, input: number) => {
      if (input === 1) {
        // First iteration: set a custom status then continue-as-new
        ctx.setCustomStatus("iteration-1-status");
        ctx.continueAsNew(2, false);
      } else {
        // Second iteration: do NOT set custom status — it should be cleared
        return "done";
      }
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator, 1);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("done"));
    // customStatus must be cleared after continue-as-new when the new iteration
    // does not set one — it should not carry over from the previous iteration
    expect(state?.serializedCustomStatus).toBeUndefined();
  });

  it("should preserve sendEvent actions when continuing-as-new", async () => {
    // Receiver orchestration that waits for an event
    const receiver: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const value = yield ctx.waitForExternalEvent("ping");
      return value;
    };

    // Sender orchestration that sends an event then continues-as-new
    const sender: TOrchestrator = async (ctx: OrchestrationContext, input: { receiverId: string; iteration: number }) => {
      if (input.iteration === 1) {
        // On first iteration, send event to receiver then continue-as-new
        ctx.sendEvent(input.receiverId, "ping", "hello from sender");
        ctx.continueAsNew({ receiverId: input.receiverId, iteration: 2 }, false);
      } else {
        return "sender done";
      }
    };

    worker.addOrchestrator(receiver);
    worker.addOrchestrator(sender);
    await worker.start();

    // Start receiver first, then sender
    const receiverId = await client.scheduleNewOrchestration(receiver);
    await client.waitForOrchestrationStart(receiverId, false, 5);

    const senderId = await client.scheduleNewOrchestration(sender, { receiverId, iteration: 1 });

    // Wait for both to complete
    const senderState = await client.waitForOrchestrationCompletion(senderId, true, 10);
    const receiverState = await client.waitForOrchestrationCompletion(receiverId, true, 10);

    // Sender should complete after continuing-as-new
    expect(senderState).toBeDefined();
    expect(senderState?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(senderState?.serializedOutput).toEqual(JSON.stringify("sender done"));

    // Receiver should have received the event sent before continue-as-new
    expect(receiverState).toBeDefined();
    expect(receiverState?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(receiverState?.serializedOutput).toEqual(JSON.stringify("hello from sender"));
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

  it("should clear stale queued work when purging completed orchestrations", async () => {
    const orchestrator: TOrchestrator = async (_: OrchestrationContext, input: number) => {
      return input * 2;
    };
    const instanceId = "purge-queue-cleanup-test-id";

    worker.addOrchestrator(orchestrator);
    await worker.start();

    await client.scheduleNewOrchestration(orchestrator, 1, instanceId);
    const initialState = await client.waitForOrchestrationCompletion(instanceId, true, 10);
    expect(initialState?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);

    await worker.stop();
    await client.raiseOrchestrationEvent(instanceId, "late-event", "ignored");
    expect((backend as any).orchestrationQueue).toContain(instanceId);
    expect((backend as any).orchestrationQueueSet.has(instanceId)).toBe(true);

    const result = await client.purgeOrchestration(instanceId);
    expect(result.deletedInstanceCount).toEqual(1);
    expect((backend as any).orchestrationQueue).not.toContain(instanceId);
    expect((backend as any).orchestrationQueueSet.has(instanceId)).toBe(false);

    await client.scheduleNewOrchestration(orchestrator, 21, instanceId);
    await worker.start();

    const recreatedState = await client.waitForOrchestrationCompletion(instanceId, true, 10);
    expect(recreatedState?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(recreatedState?.serializedOutput).toEqual(JSON.stringify(42));
  });

  it("should cancel pending timers when purging a terminated orchestration", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      // Create a timer far in the future — it will still be pending when we terminate
      yield ctx.createTimer(3600);
      return "done";
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    // Wait for the orchestration to start so the timer action is processed by the backend
    await client.waitForOrchestrationStart(id, false, 5);

    // Terminate while the long timer is still pending
    await client.terminateOrchestration(id, "terminated");
    const state = await client.waitForOrchestrationCompletion(id, true, 10);
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.TERMINATED);

    // Timer should still be pending before purge
    const pendingTimersBefore = (backend as any).pendingTimers.size;
    expect(pendingTimersBefore).toBeGreaterThan(0);

    // Purge the terminated orchestration
    const result = await client.purgeOrchestration(id);
    expect(result.deletedInstanceCount).toEqual(1);

    // After purge, pending timers for this instance should be cancelled
    expect((backend as any).pendingTimers.size).toBe(0);
    expect((backend as any).instanceTimers.size).toBe(0);
  });

  it("should cancel pending timers for only the purged orchestration", async () => {
    const timerOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.createTimer(3600);
      return "done";
    };

    const waitOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.createTimer(7200);
      return "done";
    };

    worker.addOrchestrator(timerOrchestrator);
    worker.addOrchestrator(waitOrchestrator);
    await worker.start();

    // Start two orchestrations that both create long timers
    const id1 = await client.scheduleNewOrchestration(timerOrchestrator);
    const id2 = await client.scheduleNewOrchestration(waitOrchestrator);

    await client.waitForOrchestrationStart(id1, false, 5);
    await client.waitForOrchestrationStart(id2, false, 5);

    // Terminate and purge only the first orchestration
    await client.terminateOrchestration(id1, "terminated");
    await client.waitForOrchestrationCompletion(id1, false, 10);

    const result = await client.purgeOrchestration(id1);
    expect(result.deletedInstanceCount).toEqual(1);

    // The second orchestration's timer should still be pending
    expect((backend as any).pendingTimers.size).toBe(1);
    expect((backend as any).instanceTimers.has(id2)).toBe(true);
    expect((backend as any).instanceTimers.has(id1)).toBe(false);
  });

  it("should silently ignore completeOrchestration for purged instances", () => {
    // Verifies that completeOrchestration returns silently when the instance
    // has been deleted (e.g., via purge or reset), consistent with how
    // completeActivity handles missing instances.

    // Should not throw — instance simply doesn't exist
    expect(() => {
      backend.completeOrchestration("nonexistent-instance", 1, []);
    }).not.toThrow();
  });

  it("should allow reusing instance IDs after reset", async () => {
    const orchestrator: TOrchestrator = async (_: OrchestrationContext, input: number) => {
      return input * 2;
    };

    // Create an orchestration without starting the worker, so it stays in the queue
    const instanceId = "reuse-test-id";
    backend.createInstance(instanceId, getName(orchestrator), JSON.stringify(10));

    // Reset while the orchestration is still queued (not yet processed)
    backend.reset();

    // Now create a new orchestration with the same instance ID and process it
    worker.addOrchestrator(orchestrator);
    await worker.start();

    await client.scheduleNewOrchestration(orchestrator, 21, instanceId);
    const state = await client.waitForOrchestrationCompletion(instanceId, true, 10);
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(42));
  });

  it("waitForState with zero timeout should wait indefinitely until state matches", async () => {
    const orchestrator: TOrchestrator = async (_: OrchestrationContext) => "done";

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);

    // Use waitForState with timeoutMs=0 (no timeout).
    // The orchestration completes quickly, so this should resolve.
    const instance = await backend.waitForState(
      id,
      (inst) => backend.toClientStatus(inst.status) === OrchestrationStatus.COMPLETED,
      0,
    );

    expect(instance).toBeDefined();
  });

  it("waitForState with zero timeout should be rejected on reset", async () => {
    // Create an instance that won't complete (no worker started)
    backend.createInstance("stuck-instance", "test", JSON.stringify("input"));

    // Start waiting with no timeout
    const waitPromise = backend.waitForState(
      "stuck-instance",
      () => false, // Never matches
      0,
    );

    // Reset should reject the waiter
    backend.reset();

    await expect(waitPromise).rejects.toThrow("Backend was reset");
  });

  describe("suspend and resume status", () => {
    it("should update status to SUSPENDED when suspend is called", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        yield ctx.waitForExternalEvent("proceed");
        return "done";
      };

      worker.addOrchestrator(orchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(orchestrator);
      await client.waitForOrchestrationStart(id, false, 10);

      await client.suspendOrchestration(id);

      const state = await client.getOrchestrationState(id);
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.SUSPENDED);
    });

    it("should update status to RUNNING when resume is called after suspend", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        yield ctx.waitForExternalEvent("proceed");
        return "done";
      };

      worker.addOrchestrator(orchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(orchestrator);
      await client.waitForOrchestrationStart(id, false, 10);

      await client.suspendOrchestration(id);
      let state = await client.getOrchestrationState(id);
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.SUSPENDED);

      await client.resumeOrchestration(id);
      state = await client.getOrchestrationState(id);
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.RUNNING);
    });

    it("should complete successfully after suspend and resume", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const val: number = yield ctx.waitForExternalEvent("proceed");
        return val * 2;
      };

      worker.addOrchestrator(orchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(orchestrator);
      await client.waitForOrchestrationStart(id, false, 10);

      // Suspend the orchestration
      await client.suspendOrchestration(id);
      let state = await client.getOrchestrationState(id);
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.SUSPENDED);

      // Send an event while suspended (will be buffered)
      await client.raiseOrchestrationEvent(id, "proceed", 21);

      // Resume the orchestration
      await client.resumeOrchestration(id);

      // Wait for completion — the buffered event should be processed
      state = await client.waitForOrchestrationCompletion(id, true, 10);
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify(42));
    });

    it("should be idempotent when suspend is called twice", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        yield ctx.waitForExternalEvent("proceed");
        return "done";
      };

      worker.addOrchestrator(orchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(orchestrator);
      await client.waitForOrchestrationStart(id, false, 10);

      // Call suspend twice — should not throw
      await client.suspendOrchestration(id);
      await client.suspendOrchestration(id);

      const state = await client.getOrchestrationState(id);
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.SUSPENDED);
    });

    it("should notify state waiters on resume", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        yield ctx.waitForExternalEvent("proceed");
        return "done";
      };

      worker.addOrchestrator(orchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(orchestrator);
      await client.waitForOrchestrationStart(id, false, 10);

      await client.suspendOrchestration(id);

      // Set up a waiter for RUNNING status, then resume
      const runningPromise = backend.waitForState(
        id,
        (inst) => backend.toClientStatus(inst.status) === OrchestrationStatus.RUNNING,
        5000,
      );

      await client.resumeOrchestration(id);

      const runningInstance = await runningPromise;
      expect(runningInstance).toBeDefined();
      expect(backend.toClientStatus(runningInstance!.status)).toEqual(OrchestrationStatus.RUNNING);
    });

    it("should be a no-op when suspending a completed instance", async () => {
      // eslint-disable-next-line require-yield
      const orchestrator: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
        return "done";
      };

      worker.addOrchestrator(orchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(orchestrator);
      const state = await client.waitForOrchestrationCompletion(id, true, 10);
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);

      // Suspend on a completed instance should be a no-op
      await client.suspendOrchestration(id);
      const afterSuspend = await client.getOrchestrationState(id);
      expect(afterSuspend?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    });

    it("should be a no-op when resuming a non-suspended instance", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        yield ctx.waitForExternalEvent("proceed");
        return "done";
      };

      worker.addOrchestrator(orchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(orchestrator);
      await client.waitForOrchestrationStart(id, false, 10);

      // Resume on a RUNNING (non-suspended) instance should be a no-op
      await client.resumeOrchestration(id);
      const state = await client.getOrchestrationState(id);
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.RUNNING);
    });

    it("should notify state waiters on suspend", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        yield ctx.waitForExternalEvent("proceed");
        return "done";
      };

      worker.addOrchestrator(orchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(orchestrator);
      await client.waitForOrchestrationStart(id, false, 10);

      // Set up a waiter for SUSPENDED status, then suspend
      const suspendedPromise = backend.waitForState(
        id,
        (inst) => backend.toClientStatus(inst.status) === OrchestrationStatus.SUSPENDED,
        5000,
      );

      await client.suspendOrchestration(id);

      const suspendedInstance = await suspendedPromise;
      expect(suspendedInstance).toBeDefined();
      expect(backend.toClientStatus(suspendedInstance!.status)).toEqual(OrchestrationStatus.SUSPENDED);
    });
  });

  it("should clean up stale waiters after waitForState timeout", async () => {
    const instanceId = "timeout-cleanup-test";
    backend.createInstance(instanceId, "testOrch");

    // Call waitForState with a predicate that will never match and a short timeout
    await expect(
      backend.waitForState(
        instanceId,
        () => false, // Will never match
        50, // 50ms timeout
      ),
    ).rejects.toThrow("Timeout waiting for orchestration");

    // After the timeout, the stale waiter should be cleaned up.
    // Access internal stateWaiters to verify the waiter was removed.
    const stateWaitersMap = (backend as any).stateWaiters as Map<string, any[]>;

    // The timed-out waiter should have been removed, and since it was the only
    // waiter, the instance entry should be removed from the map entirely.
    expect(stateWaitersMap.has(instanceId)).toBe(false);
  });

  it("should remove only the timed-out waiter when multiple waiters exist", async () => {
    const instanceId = "multi-waiter-timeout-test";
    backend.createInstance(instanceId, "testOrch");

    // Start a waiter with a long timeout (won't time out during the test)
    const longWaitPromise = backend.waitForState(
      instanceId,
      () => false, // Never matches
      60000, // 60 second timeout — won't fire
    );

    // Start a waiter with a very short timeout
    await expect(
      backend.waitForState(
        instanceId,
        () => false, // Never matches
        50, // 50ms timeout
      ),
    ).rejects.toThrow("Timeout waiting for orchestration");

    // After the short timeout, only the long-lived waiter should remain
    const stateWaitersMap = (backend as any).stateWaiters as Map<string, any[]>;
    const waiters = stateWaitersMap.get(instanceId);

    expect(waiters).toBeDefined();
    expect(waiters!.length).toBe(1);

    // Clean up: reset to clear the remaining waiter and its timer
    backend.reset();
    await longWaitPromise.catch(() => {}); // Ignore the reset rejection
  });

  it("should cancel pending timers on continue-as-new", async () => {
    // Timer IDs are per-execution sequence numbers that restart at 1 after
    // continue-as-new. A timer left pending from iteration 1 therefore fires a
    // TimerFired event whose ID collides with iteration 2's first task, completing
    // it long before it is due. Iteration 1's timer is deliberately short and
    // iteration 2's is long, so a leak shows up as an early completion.
    const staleTimerSeconds = 0.05;
    const iteration2TimerSeconds = 1.5;
    let iteration2TimerFired = false;

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
      if (input === 1) {
        // Created but never awaited, then abandoned by continue-as-new.
        ctx.createTimer(staleTimerSeconds);
        ctx.continueAsNew(2, false);
      } else {
        yield ctx.createTimer(iteration2TimerSeconds);
        iteration2TimerFired = true;
        return "done";
      }
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const startedAt = Date.now();
    const id = await client.scheduleNewOrchestration(orchestrator, 1);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);
    const elapsedMs = Date.now() - startedAt;

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("done"));
    expect(iteration2TimerFired).toBe(true);

    // Without the cancellation, the stale 50ms timer completes iteration 2's timer
    // almost immediately. The margin is deliberately wide to stay reliable in CI.
    expect(elapsedMs).toBeGreaterThan(1000);
  });
});
