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

  it("should fail fast when any child fails", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const task = new WhenAllTask([child1, child2]);

    child1.fail("child failed");

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

  it("should fail immediately when a pre-completed child is failed", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();

    child1.fail("pre-failed");

    const task = new WhenAllTask([child1, child2]);

    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(true);
    expect(task.getException()).toBeDefined();
  });

  it("should not double-complete when child completes after fail-fast", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const task = new WhenAllTask([child1, child2]);

    child1.fail("first failure");

    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(true);

    // Completing child2 after fail-fast should not change the result
    child2.complete(2);
    expect(task.isFailed).toBe(true);
    expect(task.getException()).toBeDefined();
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
});
