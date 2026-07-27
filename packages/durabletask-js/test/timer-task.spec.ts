// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CompletableTask } from "../src/task/completable-task";
import { TimerTask } from "../src/task/timer-task";
import { RuntimeOrchestrationContext } from "../src/worker/runtime-orchestration-context";

// A far-future fire time so timers created in these tests never fire on their own.
const FUTURE_FIRE_AT = new Date(Date.now() + 24 * 60 * 60 * 1000);

describe("TimerTask", () => {
  it("should start incomplete, not failed, and not canceled", () => {
    const timer = new TimerTask();

    expect(timer.isComplete).toBe(false);
    expect(timer.isCompleted).toBe(false);
    expect(timer.isFailed).toBe(false);
    expect(timer.isCanceled).toBe(false);
  });

  it("should be a Task/CompletableTask instance (identity preserving, no wrapper)", () => {
    const timer = new TimerTask();

    // TimerTask must extend CompletableTask so whenAny/whenAll return the real
    // instance and `winner === timerTask` identity holds for callers.
    expect(timer).toBeInstanceOf(CompletableTask);
  });

  it("should return the same TimerTask instance that the context stores in _pendingTasks", () => {
    // Identity: createTimer must hand back the exact instance it tracks so that
    // `winner === timerTask` holds after whenAny.
    const ctx = new RuntimeOrchestrationContext("test-instance");
    const timer = ctx.createTimer(FUTURE_FIRE_AT);
    const timerId = ctx._sequenceNumber;

    expect(ctx._pendingTasks[timerId]).toBe(timer);
  });

  describe("cancel()", () => {
    it("should flip isCanceled and run the injected cancel handler once", () => {
      const timer = new TimerTask();
      const cancelHandler = jest.fn();
      timer.setCancelHandler(cancelHandler);

      timer.cancel();

      expect(timer.isCanceled).toBe(true);
      expect(cancelHandler).toHaveBeenCalledTimes(1);
    });

    it("should drop the pending CreateTimer action and pending task via the context handler", () => {
      // Drive a real context so the injected closure exercises the actual deletion.
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const timer = ctx.createTimer(FUTURE_FIRE_AT);
      const timerId = ctx._sequenceNumber;

      expect(ctx._pendingActions[timerId]).toBeDefined();
      expect(ctx._pendingTasks[timerId]).toBe(timer);

      timer.cancel();

      expect(timer.isCanceled).toBe(true);
      expect(ctx._pendingActions[timerId]).toBeUndefined();
      expect(ctx._pendingTasks[timerId]).toBeUndefined();
    });

    it("should not mark the timer complete (isCompleted stays false, isFaulted false)", () => {
      const timer = new TimerTask();
      timer.setCancelHandler(jest.fn());

      timer.cancel();

      expect(timer.isCanceled).toBe(true);
      expect(timer.isCompleted).toBe(false);
      expect(timer.isFaulted).toBe(false);
    });

    it("should be idempotent when called multiple times (handler runs only once)", () => {
      const timer = new TimerTask();
      const cancelHandler = jest.fn();
      timer.setCancelHandler(cancelHandler);

      timer.cancel();
      expect(() => timer.cancel()).not.toThrow();

      expect(timer.isCanceled).toBe(true);
      expect(cancelHandler).toHaveBeenCalledTimes(1);
    });

    it("should not remove an unrelated pending action/task with a different id", () => {
      // Two sibling timers on one real context; canceling one must not touch the other.
      const ctx = new RuntimeOrchestrationContext("test-instance");
      const firstTimer = ctx.createTimer(FUTURE_FIRE_AT);
      const firstId = ctx._sequenceNumber;
      const secondTimer = ctx.createTimer(FUTURE_FIRE_AT);
      const secondId = ctx._sequenceNumber;

      firstTimer.cancel();

      // The sibling entries at the other id must remain untouched.
      expect(ctx._pendingActions[secondId]).toBeDefined();
      expect(ctx._pendingTasks[secondId]).toBe(secondTimer);
      // The canceled timer's entries are gone.
      expect(ctx._pendingActions[firstId]).toBeUndefined();
      expect(ctx._pendingTasks[firstId]).toBeUndefined();
    });

    it("should be a no-op after the timer has already fired (completed)", () => {
      const timer = new TimerTask();
      const cancelHandler = jest.fn();
      timer.setCancelHandler(cancelHandler);

      // Simulate the timer firing (handleTimerFired calls complete(undefined)).
      timer.complete(undefined);

      expect(() => timer.cancel()).not.toThrow();
      // Canceling a fired timer must not flip isCanceled or run the handler.
      expect(timer.isCanceled).toBe(false);
      expect(timer.isCompleted).toBe(true);
      expect(cancelHandler).not.toHaveBeenCalled();
    });
  });
});
