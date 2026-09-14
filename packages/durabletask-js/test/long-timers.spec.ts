// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { NoOpLogger } from "../src/types/logger.type";
import { TimerTask } from "../src/task/timer-task";
import { RetryPolicy } from "../src/task/retry/retry-policy";
import { whenAll, whenAny } from "../src/task";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as ph from "../src/utils/pb-helper.util";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-01-01T00:00:00Z");
const atDay = (days: number) => new Date(START.getTime() + days * DAY);
const startEvents = () => [
  ph.newOrchestratorStartedEvent(START),
  ph.newExecutionStartedEvent("timer-test", "instance"),
];

class ShortTimerWorker extends TaskHubGrpcWorker {
  protected override get useShortTimerSegments(): boolean {
    return true;
  }
}

function workerFor(orchestrator: TOrchestrator) {
  const worker = new ShortTimerWorker({ logger: new NoOpLogger() });
  worker.addNamedOrchestrator("timer-test", orchestrator);
  return worker;
}

async function execute(worker: TaskHubGrpcWorker, past: pb.HistoryEvent[], events: pb.HistoryEvent[]) {
  const request = new pb.OrchestratorRequest();
  request.setInstanceid("instance");
  request.setPasteventsList(past);
  request.setNeweventsList(events);
  return pb.OrchestratorResponse.deserializeBinary(
    await worker.processOrchestratorRequest(request.serializeBinary()),
  ).getActionsList();
}

function expectTimer(actions: pb.OrchestratorAction[], id: number, day: number) {
  expect(actions).toHaveLength(1);
  expect(actions[0].getId()).toBe(id);
  expect(actions[0].getCreatetimer()?.getFireat()?.toDate()).toEqual(atDay(day));
}

function expectCompleted(actions: pb.OrchestratorAction[], output: unknown) {
  expect(actions).toHaveLength(1);
  expect(actions[0].getCompleteorchestration()?.getOrchestrationstatus()).toBe(
    pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
  );
  expect(actions[0].getCompleteorchestration()?.getResult()?.getValue()).toBe(JSON.stringify(output));
}

describe("backend-aware durable timers", () => {
  it.each([-1, 0, 1, 3, 10, 30])("schedules the first segment of a %s-day timer", async (days) => {
    const worker = workerFor(async function* (ctx) {
      yield ctx.createTimer((days * DAY) / 1000);
    });
    expectTimer(await execute(worker, [], startEvents()), 1, Math.min(days, 3));
  });

  it.each([10, 30])("replays every segment of a %s-day timer without completing its parents early", async (days) => {
    let timer: TimerTask;
    const worker = workerFor(async function* (ctx): ReturnType<TOrchestrator> {
      timer = ctx.createTimer(atDay(days));
      const winner = yield whenAny([timer, ctx.waitForExternalEvent("approval")]);
      expect(winner).toBe(timer);
      yield whenAll([timer]);
      return "elapsed";
    });
    const history = startEvents();
    let actions = await execute(worker, [], history);
    let id = 1;
    for (let day = Math.min(3, days); ; day = Math.min(day + 3, days)) {
      expectTimer(actions, id, day);
      expect(timer!.isComplete).toBe(false);
      const created = ph.newTimerCreatedEvent(id, atDay(day));
      // Replay of a committed segment must not emit another action.
      expect(await execute(worker, [...history, created], [ph.newOrchestratorStartedEvent(atDay(day))])).toEqual([]);
      history.push(created);
      const events = [ph.newOrchestratorStartedEvent(atDay(day)), ph.newTimerFiredEvent(id, atDay(day))];
      actions = await execute(worker, history, events);
      history.push(...events);
      id++;
      if (day === days) break;
      expect(timer!.isComplete).toBe(false);
    }
    expect(timer!.isComplete).toBe(true);
    timer!.cancel();
    expect(timer!.isCanceled).toBe(false);
    expectCompleted(actions, "elapsed");
  });

  it("uses the recorded timer deadline, not a delayed delivery time, for subsequent segments", async () => {
    const worker = workerFor(async function* (ctx) {
      yield ctx.createTimer(atDay(10));
    });
    expectTimer(
      await execute(
        worker,
        [...startEvents(), ph.newTimerCreatedEvent(1, atDay(3))],
        [ph.newOrchestratorStartedEvent(atDay(8)), ph.newTimerFiredEvent(1, atDay(3))],
      ),
      2,
      6,
    );
  });

  it("replays an old native long timer without inventing intermediate segments", async () => {
    const worker = workerFor(async function* (ctx) {
      yield ctx.createTimer(atDay(10));
      yield ctx.callActivity("after-timer");
      return "done";
    });
    const history = [...startEvents(), ph.newTimerCreatedEvent(1, atDay(10))];
    expect(await execute(worker, history, [ph.newOrchestratorStartedEvent(atDay(2))])).toEqual([]);
    history.push(ph.newOrchestratorStartedEvent(atDay(10)), ph.newTimerFiredEvent(1, atDay(10)));
    const actions = await execute(worker, history, [ph.newOrchestratorStartedEvent(atDay(10))]);
    expect(actions).toHaveLength(1);
    expect(actions[0].getId()).toBe(2);
    expect(actions[0].getScheduletask()?.getName()).toBe("after-timer");
    history.push(ph.newTaskScheduledEvent(2, "after-timer"));
    expectCompleted(await execute(worker, history, [ph.newTaskCompletedEvent(2, '"result"')]), "done");
  });

  it("retains native long timers in the standalone core worker", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    worker.addNamedOrchestrator("timer-test", async function* (ctx) {
      yield ctx.createTimer(atDay(30));
    });
    expectTimer(await execute(worker, [], startEvents()), 1, 30);
  });

  it("removes a canceled first segment before dispatch without affecting a sibling", async () => {
    const worker = workerFor(async function* (ctx) {
      const canceled = ctx.createTimer(atDay(30));
      canceled.cancel();
      canceled.cancel();
      expect(canceled.isCanceled).toBe(true);
      expect(canceled.isCompleted).toBe(false);
      yield ctx.createTimer(atDay(10));
    });
    expectTimer(await execute(worker, [], startEvents()), 2, 3);
  });

  it.each(["activity", "event"])("cancels the current segment when %s wins and ignores late firing", async (kind) => {
    const worker = workerFor(async function* (ctx): ReturnType<TOrchestrator> {
      const timer = ctx.createTimer(atDay(30));
      const work = kind === "activity" ? ctx.callActivity("work") : ctx.waitForExternalEvent("approval");
      const winner = yield whenAny([timer, work]);
      expect(winner).toBe(work);
      timer.cancel();
      timer.cancel();
      expect(timer.isCanceled).toBe(true);
      expect(timer.isCompleted).toBe(false);
      yield ctx.waitForExternalEvent("finish");
      return "approved";
    });
    const history = [...startEvents(), ph.newTimerCreatedEvent(1, atDay(3))];
    if (kind === "activity") history.push(ph.newTaskScheduledEvent(2, "work"));
    const secondId = kind === "activity" ? 3 : 2;
    const firstFired = [ph.newOrchestratorStartedEvent(atDay(3)), ph.newTimerFiredEvent(1, atDay(3))];
    expectTimer(await execute(worker, history, firstFired), secondId, 6);
    history.push(...firstFired);
    const win = kind === "activity" ? ph.newTaskCompletedEvent(2, '"ok"') : ph.newEventRaisedEvent("approval", '"ok"');
    // A win in the same turn removes the newly scheduled segment before dispatch.
    expect(await execute(worker, history, [win])).toEqual([]);
    // A win after dispatch removes the current task; late firing must not create a third segment.
    history.push(ph.newTimerCreatedEvent(secondId, atDay(6)), win);
    const late = [ph.newOrchestratorStartedEvent(atDay(6)), ph.newTimerFiredEvent(secondId, atDay(6))];
    expect(await execute(worker, history, late)).toEqual([]);
    expectCompleted(await execute(worker, [...history, ...late], [ph.newEventRaisedEvent("finish")]), "approved");
  });

  it("keeps concurrent timers independent and whenAll pending until both final deadlines", async () => {
    const worker = workerFor(async function* (ctx) {
      yield whenAll([ctx.createTimer(atDay(4)), ctx.createTimer(atDay(5))]);
      return "both";
    });
    const history = [
      ...startEvents(),
      ph.newTimerCreatedEvent(1, atDay(3)),
      ph.newTimerCreatedEvent(2, atDay(3)),
      ph.newOrchestratorStartedEvent(atDay(3)),
      ph.newTimerFiredEvent(1, atDay(3)),
      ph.newTimerFiredEvent(2, atDay(3)),
    ];
    const actions = await execute(worker, history, [ph.newOrchestratorStartedEvent(atDay(3))]);
    expect(actions).toHaveLength(2);
    expectTimer([actions[0]], 3, 4);
    expectTimer([actions[1]], 4, 5);
    history.push(ph.newTimerCreatedEvent(3, atDay(4)), ph.newTimerCreatedEvent(4, atDay(5)));
    const firstDone = [ph.newOrchestratorStartedEvent(atDay(4)), ph.newTimerFiredEvent(3, atDay(4))];
    expect(await execute(worker, history, firstDone)).toEqual([]);
    expectCompleted(
      await execute(
        worker,
        [...history, ...firstDone],
        [ph.newOrchestratorStartedEvent(atDay(5)), ph.newTimerFiredEvent(4, atDay(5))],
      ),
      "both",
    );
  });

  it.each([
    ["policy", "activity"],
    ["handler", "activity"],
    ["policy", "sub-orchestration"],
    ["handler", "sub-orchestration"],
  ])("segments a long %s %s retry delay without retrying early", async (kind, taskType) => {
    const worker = workerFor(async function* (ctx) {
      const retry =
        kind === "policy"
          ? new RetryPolicy({
              maxNumberOfAttempts: 2,
              firstRetryIntervalInMilliseconds: 10 * DAY,
              maxRetryIntervalInMilliseconds: -1,
            })
          : () => 10 * DAY;
      yield taskType === "activity"
        ? ctx.callActivity("work", undefined, { retry })
        : ctx.callSubOrchestrator("work", undefined, { retry, instanceId: "child" });
      return "retried";
    });
    const history = [
      ...startEvents(),
      taskType === "activity"
        ? ph.newTaskScheduledEvent(1, "work")
        : ph.newSubOrchestrationCreatedEvent(1, "work", "child"),
      taskType === "activity"
        ? ph.newTaskFailedEvent(1, new Error("retry"))
        : ph.newSubOrchestrationFailedEvent(1, new Error("retry")),
    ];
    let actions = await execute(worker, [], history);
    for (const [index, day] of [3, 6, 9, 10].entries()) {
      const id = index + 2;
      expectTimer(actions, id, day);
      history.push(ph.newTimerCreatedEvent(id, atDay(day)));
      const events = [ph.newOrchestratorStartedEvent(atDay(day)), ph.newTimerFiredEvent(id, atDay(day))];
      actions = await execute(worker, history, events);
      history.push(...events);
    }
    expect(actions).toHaveLength(1);
    expect(actions[0].getId()).toBe(6);
    expect((actions[0].getScheduletask() ?? actions[0].getCreatesuborchestration())?.getName()).toBe("work");
    history.push(
      taskType === "activity"
        ? ph.newTaskScheduledEvent(6, "work")
        : ph.newSubOrchestrationCreatedEvent(6, "work", "child"),
    );
    const completed =
      taskType === "activity" ? ph.newTaskCompletedEvent(6, '"ok"') : ph.newSubOrchestrationCompletedEvent(6, '"ok"');
    expectCompleted(await execute(worker, history, [completed]), "retried");
  });

  it("snapshots the caller's Date before scheduling later segments", async () => {
    const worker = workerFor(async function* (ctx) {
      const deadline = atDay(4);
      const timer = ctx.createTimer(deadline);
      deadline.setTime(atDay(30).getTime());
      yield timer;
      return "original deadline";
    });
    expectTimer(
      await execute(
        worker,
        [...startEvents(), ph.newTimerCreatedEvent(1, atDay(3))],
        [ph.newOrchestratorStartedEvent(atDay(3)), ph.newTimerFiredEvent(1, atDay(3))],
      ),
      2,
      4,
    );
  });

  it("rejects a missing recorded fireAt for a segmented timer", async () => {
    const worker = workerFor(async function* (ctx) {
      yield ctx.createTimer(atDay(10));
    });
    const fired = ph.newTimerFiredEvent(1, atDay(3));
    fired.getTimerfired()!.clearFireat();
    const actions = await execute(worker, [...startEvents(), ph.newTimerCreatedEvent(1, atDay(3))], [fired]);
    expect(actions[0].getCompleteorchestration()?.getFailuredetails()?.getErrormessage()).toContain(
      "TimerFired.fireAt",
    );
  });

  it("cannot replay an already-segmented history on a native-timer worker", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    worker.addNamedOrchestrator("timer-test", async function* (ctx) {
      yield ctx.createTimer(atDay(10));
      return "elapsed";
    });
    const actions = await execute(
      worker,
      [
        ...startEvents(),
        ph.newTimerCreatedEvent(1, atDay(3)),
        ph.newOrchestratorStartedEvent(atDay(3)),
        ph.newTimerFiredEvent(1, atDay(3)),
        ph.newTimerCreatedEvent(2, atDay(6)),
      ],
      [ph.newOrchestratorStartedEvent(atDay(6))],
    );
    expect(actions[0].getCompleteorchestration()?.getOrchestrationstatus()).toBe(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
    );
  });

});
