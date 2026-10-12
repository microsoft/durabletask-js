// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { whenAll, whenAny } from "../src/task";
import { CompletableTask } from "../src/task/completable-task";
import { TimerTask } from "../src/task/timer-task";
import { TaskCancelledError } from "../src/task/exception/task-cancelled-error";
import { RetryableTask } from "../src/task/retryable-task";
import { RetryHandlerTask } from "../src/task/retry-handler-task";
import { RetryPolicy } from "../src/task/retry/retry-policy";
import { RuntimeOrchestrationContext } from "../src/worker/runtime-orchestration-context";
import { OrchestratorAction } from "../src/proto/orchestrator_service_pb";

describe("Composite task dependencies", () => {
  it.each([
    { order: [0, 1, 2] },
    { order: [0, 2, 1] },
    { order: [1, 0, 2] },
    { order: [1, 2, 0] },
    { order: [2, 0, 1] },
    { order: [2, 1, 0] },
  ])("notifies both shared groups in completion order $order", ({ order }) => {
    const tasks = ["A", "B", "C"].map(() => new CompletableTask<string>());
    const first = whenAll([tasks[0], tasks[1]]);
    const second = whenAll([tasks[0], tasks[2]]);
    const root = whenAll([first, second]);

    for (const index of order) tasks[index].complete(["A", "B", "C"][index]);

    expect(first.isComplete).toBe(true);
    expect(second.isComplete).toBe(true);
    expect(root.getResult()).toEqual([
      ["A", "B"],
      ["A", "C"],
    ]);
  });

  it.each([false, true])(
    "preserves duplicate positions with a mixed pending group (precompleted=%s)",
    (precompleted) => {
      const a = new CompletableTask<string>();
      const b = new CompletableTask<string>();
      if (precompleted) a.complete("A");
      const group = whenAll([a, a, b, a]);

      expect(group.completedTasks).toBe(precompleted ? 3 : 0);
      b.complete("B");
      if (!precompleted) a.complete("A");

      expect(group.completedTasks).toBe(4);
      expect(group.pendingTasks()).toBe(0);
      expect(group.getResult()).toEqual(["A", "A", "B", "A"]);
    },
  );

  it("preserves duplicates when every child is already complete", () => {
    const task = new CompletableTask<string>();
    task.complete("V");
    expect(whenAll([task, task]).getResult()).toEqual(["V", "V"]);
  });

  it("shares a pending composite between nested groups", () => {
    const a = new CompletableTask<string>();
    const b = new CompletableTask<string>();
    const shared = whenAll([a, b]);
    const left = whenAll([shared, shared]);
    const right = whenAll([shared]);
    const root = whenAll([left, right]);

    b.complete("B");
    a.complete("A");

    expect(root.getResult()).toEqual([
      [
        ["A", "B"],
        ["A", "B"],
      ],
      [["A", "B"]],
    ]);
  });

  it.each(["fail", "failWithError"] as const)(
    "notifies every dependent on %s without failing whenAll early",
    (method) => {
      const shared = new CompletableTask<string>();
      const sibling = new CompletableTask<string>();
      const first = whenAll([shared, sibling, shared]);
      const second = whenAll([shared]);
      const race = whenAny([shared]);
      if (method === "fail") shared.fail("shared failure");
      else shared.failWithError(new Error("shared failure"));
      const sharedError = shared.getException();

      expect(first.isComplete).toBe(false);
      expect(first.isFailed).toBe(false);
      expect(first.pendingTasks()).toBe(1);
      expect(second.getException()).toMatchObject({ errors: [sharedError] });
      expect(race.getResult()).toBe(shared);

      const siblingError = new Error("sibling failure");
      sibling.failWithError(siblingError);
      expect(first.getException()).toMatchObject({ errors: [sharedError, siblingError, sharedError] });
    },
  );

  it("shares whenAny's winner with multiple composite parents", () => {
    const a = new CompletableTask<string>();
    const b = new CompletableTask<string>();
    const race = whenAny([a, b, a]);
    const first = whenAll([race]);
    const second = whenAll([race, race]);
    const root = whenAll([first, second]);

    a.complete("A");
    expect(root.getResult()).toEqual([[a], [a, a]]);
    b.complete("B");
    expect(race.getResult()).toBe(a);
  });

  it("lets whenAll and whenAny independently observe the same child", () => {
    const a = new CompletableTask<string>();
    const b = new CompletableTask<string>();
    const all = whenAll([a, b]);
    const race = whenAny([a, b]);

    a.complete("A");
    expect(race.getResult()).toBe(a);
    expect(all.isComplete).toBe(false);
    b.complete("B");
    expect(all.getResult()).toEqual(["A", "B"]);
  });

  it.each([false, true])("detaches whenAny from its losing children (precompleted=%s)", (precompleted) => {
    const loser = new CompletableTask<string>();
    const winner = new CompletableTask<string>();
    if (precompleted) winner.complete("winner");
    const race = whenAny([loser, winner]);
    if (!precompleted) winner.complete("winner");
    const completed = jest.spyOn(race, "onChildCompleted");

    loser.complete("loser");

    expect(completed).not.toHaveBeenCalled();
    expect(race.getResult()).toBe(winner);
  });

  it.each([false, true])("still notifies another observer when a canceled result throws (allFirst=%s)", (allFirst) => {
    const timer = new TimerTask();
    const all = allFirst ? whenAll([timer]) : undefined;
    const race = whenAny([timer]);
    const throwingGroup = all ?? whenAll([timer]);
    const parent = whenAll([throwingGroup]);

    expect(() => timer.cancel()).toThrow(TaskCancelledError);

    expect(race.getResult()).toBe(timer);
    expect(throwingGroup.isComplete).toBe(true);
    expect(() => throwingGroup.getResult()).toThrow("whenAll completed without a result");
    expect(parent.isComplete).toBe(false);
    expect(timer.cancel()).toBe(false);
  });

  it("propagates all callback errors after notifying every observer", () => {
    const timer = new TimerTask();
    const first = whenAll([timer]);
    const second = whenAll([timer]);
    const race = whenAny([timer]);
    let failure: unknown;
    try {
      timer.cancel();
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect(failure).toMatchObject({ errors: [expect.any(TaskCancelledError), expect.any(TaskCancelledError)] });
    expect(first.isComplete).toBe(true);
    expect(second.isComplete).toBe(true);
    expect(race.getResult()).toBe(timer);
  });

  it.each(["policy", "handler"] as const)("notifies shared %s retry dependents on success and exhaustion", (kind) => {
    const makeTask = () =>
      kind === "policy"
        ? new RetryableTask<string>(
            new RetryPolicy({ maxNumberOfAttempts: 2, firstRetryIntervalInMilliseconds: 1 }),
            new OrchestratorAction(),
            new Date(0),
            "activity",
          )
        : new RetryHandlerTask<string>(
            async () => false,
            new RuntimeOrchestrationContext("retry"),
            new OrchestratorAction(),
            new Date(0),
            "activity",
          );
    const success = makeTask();
    const first = whenAll([success]);
    const second = whenAll([success, success]);
    success.recordFailure("retrying");
    success.complete("V");
    expect(first.getResult()).toEqual(["V"]);
    expect(second.getResult()).toEqual(["V", "V"]);
    expect(success.lastFailure).toBeUndefined();

    const exhausted = makeTask();
    const failedFirst = whenAll([exhausted]);
    const failedSecond = whenAll([exhausted, exhausted]);
    exhausted.fail("exhausted");
    const error = exhausted.getException();
    expect(failedFirst.getException()).toMatchObject({ errors: [error] });
    expect(failedSecond.getException()).toMatchObject({ errors: [error, error] });
  });
});
