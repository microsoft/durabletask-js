// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WhenAnyTask } from "../src/task/when-any-task";
import { CompletableTask } from "../src/task/completable-task";
import { WhenAllTask } from "../src/task/when-all-task";

describe("WhenAnyTask", () => {
  it("should throw when given an empty task array", () => {
    expect(() => new WhenAnyTask([])).toThrow("whenAny requires at least one task");
  });

  it("should complete when the first child completes", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const task = new WhenAnyTask([child1, child2]);

    expect(task.isComplete).toBe(false);

    child1.complete(42);

    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(false);
  });

  it("should return the completed child task as the result", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const task = new WhenAnyTask([child1, child2]);

    child1.complete(42);

    const result = task.getResult();
    expect(result).toBe(child1);
    expect(result.getResult()).toBe(42);
  });

  it("should complete when a child task fails", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const task = new WhenAnyTask([child1, child2]);

    child1.fail("something went wrong");

    expect(task.isComplete).toBe(true);
    // WhenAnyTask itself is NOT marked as failed — it returns the failed task as the result
    expect(task.isFailed).toBe(false);

    const result = task.getResult();
    expect(result).toBe(child1);
    expect(result.isFailed).toBe(true);
    expect(result.getException().message).toContain("something went wrong");
  });

  it("should ignore subsequent child completions after the first", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const task = new WhenAnyTask([child1, child2]);

    child1.complete(1);
    expect(task.isComplete).toBe(true);
    expect(task.getResult()).toBe(child1);

    // Completing child2 after WhenAnyTask is already complete should not change the result
    child2.complete(2);
    expect(task.getResult()).toBe(child1);
  });

  it("should complete immediately when constructed with a pre-completed child", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();

    child1.complete(10);

    const task = new WhenAnyTask([child1, child2]);

    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(false);
    expect(task.getResult()).toBe(child1);
  });

  it("should complete immediately when constructed with a pre-failed child", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();

    child1.fail("pre-failed");

    const task = new WhenAnyTask([child1, child2]);

    expect(task.isComplete).toBe(true);
    expect(task.isFailed).toBe(false); // WhenAny does not propagate child failures
    expect(task.getResult()).toBe(child1);
    expect(task.getResult().isFailed).toBe(true);
  });

  it("should use the first pre-completed child when multiple children are pre-completed", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const child3 = new CompletableTask<number>();

    child1.complete(1);
    child2.complete(2);

    const task = new WhenAnyTask([child1, child2, child3]);

    expect(task.isComplete).toBe(true);
    // The first pre-completed child in iteration order wins
    expect(task.getResult()).toBe(child1);
  });

  it("should work with a single child task", () => {
    const child = new CompletableTask<string>();
    const task = new WhenAnyTask([child]);

    expect(task.isComplete).toBe(false);

    child.complete("only child");

    expect(task.isComplete).toBe(true);
    expect(task.getResult()).toBe(child);
    expect(task.getResult().getResult()).toBe("only child");
  });

  it("should notify parent when completed", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const whenAnyTask = new WhenAnyTask([child1, child2]);

    // Wrap WhenAnyTask in a WhenAllTask to test parent notification
    const parentTask = new WhenAllTask([whenAnyTask]);

    expect(parentTask.isComplete).toBe(false);

    child1.complete(42);

    // WhenAnyTask completed, which should notify WhenAllTask parent
    expect(whenAnyTask.isComplete).toBe(true);
    expect(parentTask.isComplete).toBe(true);
    expect(parentTask.isFailed).toBe(false);
  });

  it("should not complete when no children have completed", () => {
    const child1 = new CompletableTask<number>();
    const child2 = new CompletableTask<number>();
    const child3 = new CompletableTask<number>();
    const task = new WhenAnyTask([child1, child2, child3]);

    expect(task.isComplete).toBe(false);
    expect(task.isFailed).toBe(false);
  });
});
