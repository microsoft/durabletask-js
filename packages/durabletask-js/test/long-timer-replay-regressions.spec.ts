// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId, TaskCancelledError, whenAll, whenAny } from "../src";
import { CompletableTask } from "../src/task/completable-task";
import { RetryPolicy } from "../src/task/retry/retry-policy";
import { Task } from "../src/task/task";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { NoOpLogger } from "../src/types/logger.type";
import { RuntimeOrchestrationContext } from "../src/worker/runtime-orchestration-context";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as ph from "../src/utils/pb-helper.util";

const DAY = 86400000;
const START = new Date("2026-01-01T00:00:00Z");
const atDay = (day: number) => new Date(START.getTime() + day * DAY);
const startEvents = (input?: string, version?: string) => [
  ph.newOrchestratorStartedEvent(START),
  ph.newExecutionStartedEvent("audit", "instance", input, undefined, "execution", version),
];

function workerFor(orchestrator: TOrchestrator, maximumTimerIntervalMs?: number | null) {
  const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger(), maximumTimerIntervalMs });
  worker.addNamedOrchestrator("audit", orchestrator);
  return worker;
}

async function replay(worker: TaskHubGrpcWorker, past: pb.HistoryEvent[], events: pb.HistoryEvent[]) {
  const request = new pb.OrchestratorRequest()
    .setInstanceid("instance")
    .setPasteventsList(past)
    .setNeweventsList(events);
  return pb.OrchestratorResponse.deserializeBinary(
    await worker.processOrchestratorRequest(request.serializeBinary()),
  ).getActionsList();
}

function expectTimer(actions: pb.OrchestratorAction[], id: number, deadline: Date) {
  expect(actions).toHaveLength(1);
  expect(actions[0].getId()).toBe(id);
  expect(actions[0].getCreatetimer()?.getFireat()?.toDate()).toEqual(deadline);
}

function expectCompleted(actions: pb.OrchestratorAction[], value: unknown) {
  expect(actions).toHaveLength(1);
  const completed = actions[0].getCompleteorchestration()!;
  expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
  expect(completed.getResult()?.getValue()).toBe(JSON.stringify(value));
}

describe("long timer replay boundaries", () => {
  it.each([-1, 0, 1])("honors the three-day boundary %s ms without an extra final segment", async (offset) => {
    const deadline = new Date(atDay(3).getTime() + offset);
    const worker = workerFor(async function* (ctx) {
      yield ctx.createTimer(deadline);
      return "elapsed";
    });
    const history = startEvents();
    const first = new Date(Math.min(deadline.getTime(), atDay(3).getTime()));
    expectTimer(await replay(worker, [], history), 1, first);
    history.push(ph.newTimerCreatedEvent(1, first));
    const fired = [ph.newTimerFiredEvent(1, first)];
    const actions = await replay(worker, history, fired);
    if (offset <= 0) {
      expectCompleted(actions, "elapsed");
    } else {
      expectTimer(actions, 2, deadline);
      history.push(...fired, ph.newTimerCreatedEvent(2, deadline));
      expectCompleted(await replay(worker, history, [ph.newTimerFiredEvent(2, deadline)]), "elapsed");
    }
  });

  it.each([
    [8_640_000_000_000_000 - 4 * DAY, 8_640_000_000_000_000, undefined],
    [-8_640_000_000_000_000, -8_640_000_000_000_000 + 4 * DAY, undefined],
    [START.getTime(), atDay(30).getTime(), Number.MAX_VALUE],
    [8_640_000_000_000_000 - 1, 8_640_000_000_000_000, Number.MAX_VALUE],
  ])("keeps finite deadlines valid at Date limits (%s, %s, %s)", async (start, end, interval) => {
    const ctx = new RuntimeOrchestrationContext("date-limits", interval);
    ctx._currentUtcDatetime = new Date(start!);
    const timer = ctx.createTimer(new Date(end!));
    let previous = start!;
    for (let segment = 0; segment < 3; segment++) {
      const actions = ctx.getActions();
      expect(actions).toHaveLength(1);
      const action = actions[0];
      const fireAt = action.getCreatetimer()!.getFireat()!.toDate();
      expect(fireAt.getTime()).toBeGreaterThan(previous);
      expect(fireAt.getTime()).toBeLessThanOrEqual(end!);
      delete ctx._pendingActions[action.getId()];
      delete ctx._pendingTasks[action.getId()];
      if (!ctx.scheduleNextTimerSegment(timer, fireAt)) {
        expect(fireAt.getTime()).toBe(end);
        return;
      }
      previous = fireAt.getTime();
    }
    throw new Error("Timer did not reach its finite deadline");
  });

  it("surfaces relative deadline overflow instead of emitting invalid or looping segments", () => {
    const ctx = new RuntimeOrchestrationContext("overflow");
    ctx._currentUtcDatetime = new Date(8_640_000_000_000_000);
    expect(() => ctx.createTimer(0.001)).toThrow("invalid Date");
    expect(ctx.getActions()).toEqual([]);
    expect(ctx._pendingTasks).toEqual({});
  });

  it.each([0, -1, -0.5, null])("preserves a past deadline when segmentation is disabled with %s", (interval) => {
    const ctx = new RuntimeOrchestrationContext("past-native", interval);
    ctx._currentUtcDatetime = START;
    const deadline = new Date(START.getTime() - 1);
    ctx.createTimer(deadline);
    expectTimer(ctx.getActions(), 1, deadline);
  });

  it("treats equivalent UTC-offset dates as identical replay deadlines", async () => {
    const workers = ["2026-01-05T00:00:00Z", "2026-01-05T05:30:00+05:30"].map((date) =>
      workerFor(async function* (ctx) {
        yield ctx.createTimer(new Date(date));
      }),
    );
    const history = [...startEvents(), ph.newTimerCreatedEvent(1, atDay(3))];
    for (const worker of workers) {
      expectTimer(await replay(worker, history, [ph.newTimerFiredEvent(1, atDay(3))]), 2, atDay(4));
    }
  });
});

describe("legacy native long timer histories", () => {
  it("preserves overlapping timer/activity/entity IDs through wakeups and nested composites", async () => {
    const orchestrator: TOrchestrator = async function* (ctx): ReturnType<TOrchestrator> {
      const first = ctx.createTimer(atDay(10));
      const activity = ctx.callActivity("work");
      const second = ctx.createTimer(atDay(12));
      const entity = ctx.entities.callEntity(new EntityInstanceId("counter", "key"), "get");
      yield whenAll([whenAll([first, activity]), whenAll([second, entity])]);
      return yield ctx.callActivity("after", [activity.getResult(), entity.getResult()]);
    };
    const native = workerFor(orchestrator, null);
    const segmented = workerFor(orchestrator);
    const history = startEvents();
    const initial = await replay(native, [], history);
    expect(initial.map((action) => action.getId())).toEqual([1, 2, 3, 4]);
    const entityCall = initial[3].getSendentitymessage()!.getEntityoperationcalled()!;
    history.push(
      ph.newTimerCreatedEvent(1, atDay(10)),
      ph.newTaskScheduledEvent(2, "work"),
      ph.newTimerCreatedEvent(3, atDay(12)),
      new pb.HistoryEvent().setEventid(4).setEntityoperationcalled(entityCall),
    );
    for (const events of [
      [ph.newOrchestratorStartedEvent(atDay(2)), ph.newEventRaisedEvent("unrelated", '"wake"')],
      [ph.newOrchestratorStartedEvent(atDay(5)), ph.newTaskCompletedEvent(2, '"activity"')],
      [ph.newOrchestratorStartedEvent(atDay(10)), ph.newTimerFiredEvent(1, atDay(10))],
      [
        new pb.HistoryEvent().setEntityoperationcompleted(
          new pb.EntityOperationCompletedEvent()
            .setRequestid(entityCall.getRequestid())
            .setOutput(ph.getStringValue('"entity"')),
        ),
      ],
    ]) {
      expect(await replay(native, history, events)).toEqual([]);
      expect(await replay(segmented, history, events)).toEqual([]);
      history.push(...events);
    }
    const finalTimer = [ph.newOrchestratorStartedEvent(atDay(12)), ph.newTimerFiredEvent(3, atDay(12))];
    const nativeActions = await replay(native, history, finalTimer);
    const actions = await replay(segmented, history, finalTimer);
    expect(actions.map((a) => a.toObject())).toEqual(nativeActions.map((a) => a.toObject()));
    expect(actions).toHaveLength(1);
    expect(actions[0].getId()).toBe(5);
    expect(actions[0].getScheduletask()?.getInput()?.getValue()).toBe('["activity","entity"]');
    history.push(...finalTimer, ph.newTaskScheduledEvent(5, "after", '["activity","entity"]'));
    expectCompleted(await replay(segmented, history, [ph.newTaskCompletedEvent(5, '"done"')]), "done");
  });

  it.each([false, true])(
    "cancels one old native timer without changing sibling/follow-up IDs (late-first=%s)",
    async (lateFirst) => {
      const worker = workerFor(async function* (ctx): ReturnType<TOrchestrator> {
        const canceled = ctx.createTimer(atDay(10));
        const work = ctx.callActivity("work");
        const sibling = ctx.createTimer(atDay(12));
        expect(yield whenAny([canceled, work])).toBe(work);
        canceled.cancel();
        yield sibling;
        return yield ctx.callActivity("after");
      });
      const history = [
        ...startEvents(),
        ph.newTimerCreatedEvent(1, atDay(10)),
        ph.newTaskScheduledEvent(2, "work"),
        ph.newTimerCreatedEvent(3, atDay(12)),
      ];
      const completed = [ph.newOrchestratorStartedEvent(atDay(2)), ph.newTaskCompletedEvent(2, '"ok"')];
      expect(await replay(worker, history, completed)).toEqual([]);
      history.push(...completed);
      const late = ph.newTimerFiredEvent(1, atDay(10));
      const sibling = ph.newTimerFiredEvent(3, atDay(12));
      const events = lateFirst ? [late, sibling] : [sibling, late];
      const actions = await replay(worker, history, events);
      expect(actions).toHaveLength(1);
      expect(actions[0].getId()).toBe(4);
      expect(actions[0].getScheduletask()?.getName()).toBe("after");
      history.push(...events, ph.newTaskScheduledEvent(4, "after"));
      expectCompleted(await replay(worker, history, [ph.newTaskCompletedEvent(4, '"done"')]), "done");
    },
  );
});

describe("segmented timer cancellation ordering", () => {
  it.each([false, true])("cancels the current segment in either event order (timer-first=%s)", async (timerFirst) => {
    const worker = workerFor(async function* (ctx): ReturnType<TOrchestrator> {
      const timer = ctx.createTimer(atDay(10));
      const work = ctx.callActivity("work");
      expect(yield whenAny([timer, work])).toBe(work);
      expect(timer.cancel()).toBe(true);
      expect(() => timer.getResult()).toThrow(TaskCancelledError);
      return yield ctx.callActivity("after");
    });
    const history = [
      ...startEvents(),
      ph.newTimerCreatedEvent(1, atDay(3)),
      ph.newTaskScheduledEvent(2, "work"),
      ph.newOrchestratorStartedEvent(atDay(3)),
      ph.newTimerFiredEvent(1, atDay(3)),
      ph.newTimerCreatedEvent(3, atDay(6)),
    ];
    const fired = ph.newTimerFiredEvent(3, atDay(6));
    const done = ph.newTaskCompletedEvent(2, '"ok"');
    const events = timerFirst ? [fired, done] : [done, fired];
    const actions = await replay(worker, history, events);
    const nextId = timerFirst ? 5 : 4;
    expect(actions).toHaveLength(1);
    expect(actions[0].getId()).toBe(nextId);
    expect(actions[0].hasScheduletask()).toBe(true);
    history.push(...events, ph.newTaskScheduledEvent(nextId, "after"));
    expectCompleted(await replay(worker, history, [ph.newTaskCompletedEvent(nextId, '"done"')]), "done");
  });

  it.each([false, true])("preserves final timer-vs-activity winner order (timer-first=%s)", async (timerFirst) => {
    const worker = workerFor(async function* (ctx): ReturnType<TOrchestrator> {
      const timer = ctx.createTimer(atDay(4));
      const work = ctx.callActivity("work");
      const winner = yield whenAny([timer, work]);
      const canceled = timer.cancel();
      expect(canceled).toBe(winner !== timer);
      return winner === timer ? "timer" : "work";
    });
    const history = [
      ...startEvents(),
      ph.newTimerCreatedEvent(1, atDay(3)),
      ph.newTaskScheduledEvent(2, "work"),
      ph.newTimerFiredEvent(1, atDay(3)),
      ph.newTimerCreatedEvent(3, atDay(4)),
    ];
    const fired = ph.newTimerFiredEvent(3, atDay(4));
    const done = ph.newTaskCompletedEvent(2, '"ok"');
    expectCompleted(
      await replay(worker, history, timerFirst ? [fired, done] : [done, fired]),
      timerFirst ? "timer" : "work",
    );
  });

  it("propagates cancellation through nested any/all without returning a timer result", async () => {
    const worker = workerFor(async function* (ctx): ReturnType<TOrchestrator> {
      const timer = ctx.createTimer(atDay(10));
      const race = whenAny([timer, ctx.waitForExternalEvent("unused")]);
      const all = whenAll([race, ctx.callActivity("work")]);
      timer.cancel();
      const [winner, work] = yield all;
      expect(winner).toBe(timer);
      expect(() => winner.getResult()).toThrow(TaskCancelledError);
      return work;
    });
    const history = [...startEvents(), ph.newTaskScheduledEvent(2, "work")];
    expectCompleted(await replay(worker, history, [ph.newTaskCompletedEvent(2, '"done"')]), "done");
  });

  it("cancels a shared timer winner without changing either race's task identity", () => {
    const timer = new RuntimeOrchestrationContext("shared-timer").createTimer(atDay(10));
    const work = new CompletableTask<string>();
    const firstRace = whenAny([timer, work]);
    const secondRace = whenAny([firstRace, timer]);
    timer.cancel();
    expect(secondRace.isComplete).toBe(true);
    expect(secondRace.getResult()).toBe(timer);
    expect(() => secondRace.getResult().getResult()).toThrow(TaskCancelledError);
    work.complete("done");
    expect(firstRace.getResult()).toBe(work);
    expect(secondRace.getResult()).toBe(timer);
  });

  it("leaves a caught whenAll completion exception as a boundary, not a reusable parent result", () => {
    const timer = new RuntimeOrchestrationContext("caught-composite").createTimer(atDay(10));
    const all = whenAll([timer]);
    const outer = whenAny([all]);
    expect(() => timer.cancel()).toThrow(TaskCancelledError);
    expect(timer.isCanceled).toBe(true);
    expect(all.isComplete).toBe(true);
    expect(all.isFailed).toBe(false);
    // Python also leaves the outer parent pending after this callback throws.
    // Neither implementation initializes an all-result on this exceptional path.
    expect(() => all.getResult()).toThrow("whenAll completed without a result");
    expect(outer.isComplete).toBe(false);
    expect(timer.cancel()).toBe(false);
    expect(() => timer.getResult()).toThrow(TaskCancelledError);
  });

  it("does not complete successfully after catching cancellation and yielding the broken group", async () => {
    const worker = workerFor(async function* (ctx): ReturnType<TOrchestrator> {
      const timer = ctx.createTimer(atDay(10));
      const all = whenAll([timer]);
      try {
        timer.cancel();
      } catch (error) {
        if (!(error instanceof TaskCancelledError)) throw error;
      }
      const result = yield all;
      return result === undefined ? "FALSE_SUCCESS" : result;
    });
    const actions = await replay(worker, [], startEvents());
    expect(actions).toHaveLength(1);
    const completed = actions[0].getCompleteorchestration()!;
    expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completed.getResult()).toBeUndefined();
    expect(completed.getFailuredetails()?.getErrormessage()).toContain("whenAll completed without a result");
  });

  it.each([false, true])(
    "preserves a failed sibling's whenAll failure alongside cancellation (failure-first=%s)",
    (failureFirst) => {
      const timer = new RuntimeOrchestrationContext("cancel-failure").createTimer(atDay(10));
      const sibling = new CompletableTask<undefined>();
      const group = whenAll([timer, sibling]);
      if (failureFirst) sibling.fail("activity failed");
      expect(timer.cancel()).toBe(true);
      if (!failureFirst) sibling.fail("activity failed");
      expect(group.isComplete).toBe(true);
      expect(() => group.getResult()).toThrow(AggregateError);
      expect(group.getException().message).toContain("activity failed");
      expect(timer.isFailed).toBe(false);
    },
  );
});

describe("segmented timer lifecycle", () => {
  it("buffers intermediate firing during suspension and schedules from the recorded deadline on resume", async () => {
    const worker = workerFor(async function* (ctx) {
      yield ctx.createTimer(atDay(10));
      return "done";
    });
    const history = [...startEvents(), ph.newTimerCreatedEvent(1, atDay(3))];
    const suspended = [
      new pb.HistoryEvent().setExecutionsuspended(new pb.ExecutionSuspendedEvent()),
      ph.newOrchestratorStartedEvent(atDay(8)),
      ph.newTimerFiredEvent(1, atDay(3)),
    ];
    expect(await replay(worker, history, suspended)).toEqual([]);
    history.push(...suspended);
    const resumed = [new pb.HistoryEvent().setExecutionresumed(new pb.ExecutionResumedEvent())];
    expectTimer(await replay(worker, history, resumed), 2, atDay(6));
    history.push(...resumed, ph.newTimerCreatedEvent(2, atDay(6)));
    expectTimer(await replay(worker, history, [ph.newTimerFiredEvent(2, atDay(6))]), 3, atDay(9));
  });

  it("cancels an intermediate segment before continueAsNew and resets IDs/version in the next generation", async () => {
    const worker = workerFor(async function* (ctx, input) {
      if (!input) {
        const timer = ctx.createTimer(atDay(10));
        yield whenAny([timer, ctx.waitForExternalEvent("restart")]);
        timer.cancel();
        ctx.continueAsNew("next", true, "v2");
      } else {
        expect(ctx.version).toBe("v2");
        yield ctx.createTimer((5 * DAY) / 1000);
      }
    });
    const history = [
      ...startEvents(undefined, "v1"),
      ph.newTimerCreatedEvent(1, atDay(3)),
      ph.newTimerFiredEvent(1, atDay(3)),
      ph.newTimerCreatedEvent(2, atDay(6)),
    ];
    const result = await replay(worker, history, [
      ph.newEventRaisedEvent("carry", '"saved"'),
      ph.newEventRaisedEvent("restart"),
    ]);
    expect(result).toHaveLength(1);
    const completed = result[0].getCompleteorchestration()!;
    expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW);
    expect(completed.getNewversion()?.getValue()).toBe("v2");
    expect(completed.getCarryovereventsList().map((event) => event.getEventraised()?.getName())).toEqual(["carry"]);
    const next = [
      ph.newOrchestratorStartedEvent(atDay(4)),
      ph.newExecutionStartedEvent("audit", "instance", '"next"', undefined, "next-execution", "v2"),
      ...completed.getCarryovereventsList(),
    ];
    expectTimer(await replay(worker, [], next), 1, atDay(7));
  });
});

describe("long retry history replay", () => {
  it.each(["policy", "handler"])("does not retry early or resurrect old segments with %s retries", async (kind) => {
    const retry =
      kind === "policy"
        ? new RetryPolicy({
            maxNumberOfAttempts: 2,
            firstRetryIntervalInMilliseconds: 4 * DAY,
            maxRetryIntervalInMilliseconds: -1,
          })
        : (ctx: { lastAttemptNumber: number }) => (ctx.lastAttemptNumber < 2 ? 4 * DAY : false);
    const worker = workerFor(async function* (ctx): ReturnType<TOrchestrator> {
      try {
        yield ctx.callActivity("work", undefined, { retry });
      } catch {
        return "exhausted";
      }
      return "unexpected";
    });
    const history = [
      ...startEvents(),
      ph.newTaskScheduledEvent(1, "work"),
      ph.newTaskFailedEvent(1, new Error("first")),
      ph.newTimerCreatedEvent(2, atDay(3)),
    ];
    const delayed = [ph.newOrchestratorStartedEvent(atDay(9)), ph.newTimerFiredEvent(2, atDay(3))];
    expectTimer(await replay(worker, history, delayed), 3, atDay(4));
    history.push(...delayed, ph.newTimerCreatedEvent(3, atDay(4)));
    const lastSegment = [ph.newTimerFiredEvent(3, atDay(4))];
    const retryActions = await replay(worker, history, lastSegment);
    expect(retryActions).toHaveLength(1);
    expect(retryActions[0].getId()).toBe(4);
    expect(retryActions[0].getScheduletask()?.getName()).toBe("work");
    history.push(...lastSegment, ph.newTaskScheduledEvent(4, "work"));
    const failure = [
      ph.newTaskFailedEvent(4, new Error("second")),
      ph.newTimerFiredEvent(2, atDay(3)),
      ph.newTimerFiredEvent(3, atDay(4)),
    ];
    expectCompleted(await replay(worker, history, failure), "exhausted");
  });

  it("does not schedule a long retry that would exceed the remaining retry timeout", async () => {
    const worker = workerFor(async function* (ctx): ReturnType<TOrchestrator> {
      try {
        yield ctx.callSubOrchestrator("child", undefined, {
          instanceId: "child",
          retry: new RetryPolicy({
            maxNumberOfAttempts: 3,
            firstRetryIntervalInMilliseconds: 4 * DAY,
            maxRetryIntervalInMilliseconds: -1,
            retryTimeoutInMilliseconds: 5 * DAY,
          }),
        });
      } catch {
        return "timed out";
      }
    });
    expectCompleted(
      await replay(
        worker,
        [...startEvents(), ph.newSubOrchestrationCreatedEvent(1, "child", "child")],
        [ph.newOrchestratorStartedEvent(atDay(2)), ph.newSubOrchestrationFailedEvent(1, new Error("failure"))],
      ),
      "timed out",
    );
  });
});

describe("successful task resumption", () => {
  it("reads a successful result accessor on each yield, including reuse of a completed task", async () => {
    const reads: string[] = [];
    class ProjectedResultTask extends CompletableTask<string> {
      override getResult(): string {
        reads.push("read");
        return super.getResult().toUpperCase();
      }
    }
    const worker = workerFor(async function* (): ReturnType<TOrchestrator> {
      const task = new ProjectedResultTask();
      task.complete("value");
      return [yield task, yield task];
    });
    expectCompleted(await replay(worker, [], startEvents()), ["VALUE", "VALUE"]);
    expect(reads).toEqual(["read", "read"]);
  });

  it("surfaces a result accessor error rather than silently sending its raw value", async () => {
    class ThrowingResultTask extends Task<string> {
      override getResult(): string {
        throw new Error("result accessor failed");
      }
    }
    const worker = workerFor(async function* () {
      const task = new ThrowingResultTask();
      task._isComplete = true;
      task._result = "must not leak";
      yield task;
      return "must not succeed";
    });
    const result = await replay(worker, [], startEvents());
    expect(result).toHaveLength(1);
    expect(result[0].getCompleteorchestration()?.getFailuredetails()?.getErrormessage()).toBe("result accessor failed");
  });
});
