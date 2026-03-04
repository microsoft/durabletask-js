// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WhenAllTask } from "../src/task/when-all-task";
import { CompletableTask } from "../src/task/completable-task";

describe("WhenAllTask", () => {
  it("should complete with empty array when given no tasks", () => {
    const task = new WhenAllTask([]);
    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(false);
    expect(task.getResult()).toEqual([]);
  });

  it("should not complete when no children are complete", () => {
    const child1 = new CompletableTask<string>();
    const child2 = new CompletableTask<string>();
    const task = new WhenAllTask([child1, child2]);
    expect(task.isComplete).toBe(false);
    expect(task.completedTasks).toBe(0);
    expect(task.pendingTasks()).toBe(2);
  });

  it("should complete when all children complete", () => {
    const child1 = new CompletableTask<string>();
    const child2 = new CompletableTask<string>();
    const task = new WhenAllTask([child1, child2]);

    child1.complete("a");
    expect(task.isComplete).toBe(false);
    expect(task.completedTasks).toBe(1);

    child2.complete("b");
    expect(task.isComplete).toBe(true);
    expect(task.getResult()).toEqual(["a", "b"]);
  });

  it("should fail fast on first failed child", () => {
    const child1 = new CompletableTask<string>();
    const child2 = new CompletableTask<string>();
    const task = new WhenAllTask([child1, child2]);

    child1.fail("error");
    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(true);
  });

  it("should handle pre-completed children correctly", () => {
    const child1 = new CompletableTask<string>();
    child1.complete("already-done");
    const child2 = new CompletableTask<string>();

    const task = new WhenAllTask([child1, child2]);

    // child1 was already complete; completedTasks should reflect that
    expect(task.isComplete).toBe(false);
    expect(task.completedTasks).toBe(1);
    expect(task.pendingTasks()).toBe(1);

    // Completing child2 should complete the WhenAllTask
    child2.complete("also-done");
    expect(task.isComplete).toBe(true);
    expect(task.completedTasks).toBe(2);
    expect(task.pendingTasks()).toBe(0);
    expect(task.getResult()).toEqual(["already-done", "also-done"]);
  });

  it("should handle all children pre-completed", () => {
    const child1 = new CompletableTask<string>();
    child1.complete("a");
    const child2 = new CompletableTask<string>();
    child2.complete("b");
    const child3 = new CompletableTask<string>();
    child3.complete("c");

    const task = new WhenAllTask([child1, child2, child3]);

    expect(task.isComplete).toBe(true);
    expect(task.completedTasks).toBe(3);
    expect(task.pendingTasks()).toBe(0);
    expect(task.getResult()).toEqual(["a", "b", "c"]);
  });

  it("should handle a pre-failed child with pending children", () => {
    const child1 = new CompletableTask<string>();
    child1.fail("pre-failed");
    const child2 = new CompletableTask<string>();

    const task = new WhenAllTask([child1, child2]);

    // Fail-fast: task should already be complete due to failed child1
    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(true);
  });

  it("should handle mix of pre-completed and pending children with multiple completions", () => {
    const child1 = new CompletableTask<number>();
    child1.complete(1);
    const child2 = new CompletableTask<number>();
    child2.complete(2);
    const child3 = new CompletableTask<number>();
    // child3 is still pending

    const task = new WhenAllTask([child1, child2, child3]);

    expect(task.isComplete).toBe(false);
    expect(task.completedTasks).toBe(2);
    expect(task.pendingTasks()).toBe(1);

    child3.complete(3);
    expect(task.isComplete).toBe(true);
    expect(task.getResult()).toEqual([1, 2, 3]);
  });
});
