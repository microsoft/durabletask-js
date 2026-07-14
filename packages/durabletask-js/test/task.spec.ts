// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Task } from "../src/task/task";
import { CompletableTask } from "../src/task/completable-task";
import { TaskFailedError } from "../src/task/exception/task-failed-error";
import { TaskFailureDetails } from "../src/proto/orchestrator_service_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { WhenAllTask } from "../src/task/when-all-task";

/**
 * Helper to create a TaskFailureDetails protobuf message.
 */
function makeFailureDetails(
  errorMessage = "test error",
  errorType = "TestError",
  stackTrace?: string,
): TaskFailureDetails {
  const details = new TaskFailureDetails();
  details.setErrormessage(errorMessage);
  details.setErrortype(errorType);
  if (stackTrace !== undefined) {
    const sv = new StringValue();
    sv.setValue(stackTrace);
    details.setStacktrace(sv);
  }
  return details;
}

function getTaskFailedError(task: Task<unknown>): TaskFailedError {
  const exception = task.getException();
  expect(exception).toBeInstanceOf(TaskFailedError);
  return exception as TaskFailedError;
}

describe("Task (base class)", () => {
  // Task is not abstract, so we can instantiate it directly for testing
  // its base-class behavior.

  it("should start as incomplete and not failed", () => {
    const task = new Task<number>();
    expect(task.isComplete).toBe(false);
    expect(task.isFailed).toBe(false);
  });

  describe("getResult()", () => {
    it("should throw when task is not complete", () => {
      const task = new Task<string>();
      expect(() => task.getResult()).toThrow("Task is not complete");
    });

    it("should re-throw the stored exception when task has failed", () => {
      const task = new Task<string>();
      const details = makeFailureDetails("activity failed", "ActivityError");
      task._exception = new TaskFailedError("activity failed", details);
      task._isComplete = true;

      expect(() => task.getResult()).toThrow(TaskFailedError);
      expect(() => task.getResult()).toThrow("activity failed");
    });

    it("should return the result when task completed successfully", () => {
      const task = new Task<number>();
      task._result = 42;
      task._isComplete = true;

      expect(task.getResult()).toBe(42);
    });

    it("should return undefined as a valid result", () => {
      const task = new Task<undefined>();
      task._result = undefined;
      task._isComplete = true;

      expect(task.getResult()).toBeUndefined();
    });
  });

  describe("getException()", () => {
    it("should throw when task did not fail", () => {
      const task = new Task<string>();
      expect(() => task.getException()).toThrow("Task did not fail");
    });

    it("should throw 'Task did not fail' even when task completed successfully", () => {
      const task = new Task<string>();
      task._result = "ok";
      task._isComplete = true;

      expect(() => task.getException()).toThrow("Task did not fail");
    });

    it("should return the exception when task has failed", () => {
      const task = new Task<string>();
      const details = makeFailureDetails("boom", "RuntimeError");
      const error = new TaskFailedError("boom", details);
      task._exception = error;
      task._isComplete = true;

      expect(task.getException()).toBe(error);
    });
  });

  describe("isFailed", () => {
    it("should be false when no exception is set", () => {
      const task = new Task<string>();
      expect(task.isFailed).toBe(false);
    });

    it("should be true when an exception is set", () => {
      const task = new Task<string>();
      task._exception = new TaskFailedError("err", makeFailureDetails());
      expect(task.isFailed).toBe(true);
    });
  });

  // v3 Durable Functions-aligned aliases (see issue #292).
  describe("result (v3 alias)", () => {
    it("should return undefined (not throw) when the task is not complete", () => {
      const task = new Task<number>();
      expect(() => task.result).not.toThrow();
      expect(task.result).toBeUndefined();
    });

    it("should return the value when the task completed successfully", () => {
      const task = new Task<number>();
      task._result = 42;
      task._isComplete = true;

      expect(task.result).toBe(42);
    });

    it("should return undefined (not throw) when the task has failed", () => {
      const task = new Task<number>();
      task._exception = new TaskFailedError("boom", makeFailureDetails());
      task._isComplete = true;

      expect(() => task.result).not.toThrow();
      expect(task.result).toBeUndefined();
    });

    it("result returns undefined for a failed task even if _result was set", () => {
      const t = new CompletableTask<string>();
      t._result = "stale";
      t.fail("boom");
      expect(t.result).toBeUndefined();
      expect(t.isFaulted).toBe(true);
    });
  });

  describe("isCompleted / isFaulted (v3 aliases)", () => {
    it("isCompleted should mirror isComplete across states", () => {
      const task = new Task<number>();
      expect(task.isCompleted).toBe(false);

      task._isComplete = true;
      expect(task.isCompleted).toBe(true);
      expect(task.isCompleted).toBe(task.isComplete);
    });

    it("isFaulted should mirror isFailed across states", () => {
      const task = new Task<number>();
      expect(task.isFaulted).toBe(false);

      task._exception = new TaskFailedError("err", makeFailureDetails());
      expect(task.isFaulted).toBe(true);
      expect(task.isFaulted).toBe(task.isFailed);
    });

    it("isFaulted should be false for a successfully completed task", () => {
      const task = new Task<number>();
      task._result = 1;
      task._isComplete = true;

      expect(task.isCompleted).toBe(true);
      expect(task.isFaulted).toBe(false);
    });
  });
});

describe("CompletableTask", () => {
  describe("complete()", () => {
    it("should mark the task as complete with the given result", () => {
      const task = new CompletableTask<number>();
      task.complete(42);

      expect(task.isComplete).toBe(true);
      expect(task.isFailed).toBe(false);
      expect(task.getResult()).toBe(42);
    });

    it("should accept null as a valid result", () => {
      const task = new CompletableTask<null>();
      task.complete(null);

      expect(task.isComplete).toBe(true);
      expect(task.getResult()).toBeNull();
    });

    it("should accept undefined as a valid result", () => {
      const task = new CompletableTask<undefined>();
      task.complete(undefined);

      expect(task.isComplete).toBe(true);
      expect(task.getResult()).toBeUndefined();
    });

    it("should throw on double completion", () => {
      const task = new CompletableTask<string>();
      task.complete("first");

      expect(() => task.complete("second")).toThrow("Task is already completed");
    });

    it("should throw when completing a task that already failed", () => {
      const task = new CompletableTask<string>();
      task.fail("something broke");

      expect(() => task.complete("result")).toThrow("Task is already completed");
    });

    it("should notify parent via onChildCompleted when parent is set", () => {
      const child = new CompletableTask<number>();
      // Use WhenAllTask because it completes when its child reports completion.
      const parent = new WhenAllTask<number>([child]);

      expect(parent.isComplete).toBe(false);

      child.complete(10);

      // Parent should now be complete because its only child completed
      expect(parent.isComplete).toBe(true);
      expect(parent.getResult()).toEqual([10]);
    });

    it("should complete without error when no parent is set", () => {
      const task = new CompletableTask<string>();
      // No parent set — complete() should not throw
      task.complete("standalone");

      expect(task.isComplete).toBe(true);
      expect(task.getResult()).toBe("standalone");
    });
  });

  describe("fail()", () => {
    it("should mark the task as failed with the given message", () => {
      const task = new CompletableTask<string>();
      task.fail("something went wrong");

      expect(task.isComplete).toBe(true);
      expect(task.isFailed).toBe(true);
    });

    it("should set a TaskFailedError as the exception", () => {
      const task = new CompletableTask<string>();
      task.fail("operation failed");

      const exception = task.getException();
      expect(exception).toBeInstanceOf(TaskFailedError);
      expect(exception.message).toBe("operation failed");
    });

    it("should use provided TaskFailureDetails", () => {
      const task = new CompletableTask<string>();
      const details = makeFailureDetails("detailed error", "CustomError", "at line 42");
      task.fail("detailed error", details);

      const exception = getTaskFailedError(task);
      expect(exception.details.message).toBe("detailed error");
      expect(exception.details.errorType).toBe("CustomError");
      expect(exception.details.stackTrace).toBe("at line 42");
    });

    it("should create default TaskFailureDetails when none provided", () => {
      const task = new CompletableTask<string>();
      task.fail("no details");

      const exception = getTaskFailedError(task);
      // Default TaskFailureDetails has empty strings for message and errorType
      expect(exception.details.message).toBe("");
      expect(exception.details.errorType).toBe("");
      expect(exception.details.stackTrace).toBeUndefined();
    });

    it("should throw on double failure", () => {
      const task = new CompletableTask<string>();
      task.fail("first failure");

      expect(() => task.fail("second failure")).toThrow("Task is already completed");
    });

    it("should throw when failing a task that already completed", () => {
      const task = new CompletableTask<string>();
      task.complete("success");

      expect(() => task.fail("too late")).toThrow("Task is already completed");
    });

    it("should cause getResult() to throw the stored exception", () => {
      const task = new CompletableTask<string>();
      task.fail("activity crashed");

      expect(() => task.getResult()).toThrow(TaskFailedError);
      expect(() => task.getResult()).toThrow("activity crashed");
    });

    it("should notify parent via onChildCompleted when parent is set", () => {
      const child = new CompletableTask<number>();
      const parent = new WhenAllTask<number>([child]);

      expect(parent.isComplete).toBe(false);

      child.fail("child failed");

      // WhenAll with a single child: once that child fails, all children are terminal,
      // so the WhenAll completes (as failed) and notifies its parent.
      expect(parent.isComplete).toBe(true);
      expect(parent.isFailed).toBe(true);
    });

    it("should fail without error when no parent is set", () => {
      const task = new CompletableTask<string>();
      // No parent set — fail() should not throw
      task.fail("standalone failure");

      expect(task.isComplete).toBe(true);
      expect(task.isFailed).toBe(true);
    });
  });
});
