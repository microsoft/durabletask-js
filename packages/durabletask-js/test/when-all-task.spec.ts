// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WhenAllTask } from "../src/task/when-all-task";
import { CompletableTask } from "../src/task/completable-task";

describe("WhenAllTask", () => {
  it("should complete immediately when given an empty task array", () => {
    const task = new WhenAllTask<number>([]);

    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(false);
    expect(task.getResult()).toEqual([]);
  });

  it("should complete when all pending children complete", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const task = new WhenAllTask([child1, child2]);

    expect(task.isComplete).toBe(false);

    child1.complete(1);
    expect(task.isComplete).toBe(false);

    child2.complete(2);
    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(false);
    expect(task.getResult()).toEqual([1, 2]);
  });

  it("should wait for all children before surfacing a failure (wait-all, not fail-fast)", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const task = new WhenAllTask([child1, child2]);

    // Wait-all semantics: a single failed child must NOT complete the WhenAll while a
    // sibling is still pending (this used to complete immediately under fail-fast).
    child1.fail("child failed");
    expect(task.isComplete).toBe(false);
    expect(task.isFailed).toBe(false);

    // Once every sibling reaches a terminal state, the WhenAll completes as failed.
    child2.complete(2);
    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(true);
    expect(task.getException()).toBeDefined();
  });

  // Issue #131: WhenAllTask constructor resets _completedTasks counter
  it("should complete correctly when constructed with pre-completed children", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const child3 = new CompletableTask<number>();

    // Complete child1 and child2 before constructing WhenAllTask
    child1.complete(10);
    child2.complete(20);

    const task = new WhenAllTask([child1, child2, child3]);

    // 2 of 3 children already complete — task should not be complete yet
    expect(task.isComplete).toBe(false);
    expect(task.completedTasks).toBe(2);

    // Complete the last child
    child3.complete(30);

    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(false);
    expect(task.getResult()).toEqual([10, 20, 30]);
  });

  it("should complete immediately when all children are pre-completed", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();

    child1.complete(1);
    child2.complete(2);

    const task = new WhenAllTask([child1, child2]);

    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(false);
    expect(task.completedTasks).toBe(2);
    expect(task.getResult()).toEqual([1, 2]);
  });

  it("should not surface a pre-failed child while a sibling is still pending", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();

    child1.fail("pre-failed");

    // child1 is already failed at construction, but child2 is still pending, so under
    // wait-all the WhenAll must keep waiting rather than failing immediately.
    const task = new WhenAllTask([child1, child2]);

    expect(task.isComplete).toBe(false);
    expect(task.isFailed).toBe(false);

    child2.complete(2);
    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(true);
    expect(task.getException()).toBeDefined();
  });

  it("should complete as failed at construction when all pre-completed children include a failure", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();

    child1.complete(1);
    child2.fail("pre-failed");

    // Every child is already terminal at construction (one of them failed), so the
    // WhenAll should complete immediately as failed.
    const task = new WhenAllTask([child1, child2]);

    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(true);
    expect(task.getException()).toBeDefined();
  });

  it("should notify the parent exactly once, only after all children complete", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const task = new WhenAllTask([child1, child2]);

    // Spy parent to detect premature or duplicate notifications.
    const parent = { onChildCompleted: jest.fn() };
    task._parent = parent as any;

    // First child fails: under wait-all the WhenAll must not complete or notify yet.
    child1.fail("first failure");
    expect(task.isComplete).toBe(false);
    expect(parent.onChildCompleted).not.toHaveBeenCalled();

    // Second child completes: the WhenAll now completes (as failed) and notifies once.
    child2.complete(2);
    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(true);
    expect(task.getException()).toBeDefined();
    expect(parent.onChildCompleted).toHaveBeenCalledTimes(1);
  });

  it("should report correct pending tasks count", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const child3 = new CompletableTask<number>();

    child1.complete(1);

    const task = new WhenAllTask([child1, child2, child3]);

    expect(task.pendingTasks()).toBe(2);

    child2.complete(2);
    expect(task.pendingTasks()).toBe(1);

    child3.complete(3);
    expect(task.pendingTasks()).toBe(0);
  });

  // Issue #301: wait-all semantics — a WhenAll must not go terminal on the first child
  // failure. If it did, later failing siblings' completions would be dropped against an
  // already-terminal orchestration, which then deadlocks on rewind.
  it("should complete as failed only after all children finish when the first child fails", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const child3 = new CompletableTask<number>();
    const task = new WhenAllTask([child1, child2, child3]);

    const firstError = new Error("first child failed");
    child1.failWithError(firstError);

    // Was `true` under fail-fast; under wait-all it must keep waiting.
    expect(task.isComplete).toBe(false);
    expect(task.isFailed).toBe(false);

    child2.complete(2);
    expect(task.isComplete).toBe(false);

    child3.complete(3);
    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(true);
    expect(task.getException()).toBe(firstError);
  });

  it("should surface the first failure (not an aggregate) when multiple children fail", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const child3 = new CompletableTask<number>();
    const task = new WhenAllTask([child1, child2, child3]);

    const firstError = new Error("first failure");
    const secondError = new Error("second failure");

    child1.failWithError(firstError);
    expect(task.isComplete).toBe(false);

    child2.failWithError(secondError);
    expect(task.isComplete).toBe(false);

    child3.complete(3);
    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(true);
    // The first failure is surfaced verbatim; failures are not aggregated.
    expect(task.getException()).toBe(firstError);
  });
});
