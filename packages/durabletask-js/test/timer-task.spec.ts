// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CompletableTask } from "../src/task/completable-task";
import { TimerTask } from "../src/task/timer-task";
import { RuntimeOrchestrationContext } from "../src/worker/runtime-orchestration-context";
import { whenAll, whenAny } from "../src/task";
import { TaskCancelledError } from "../src";

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

      expect(timer.cancel()).toBe(true);

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

    it("marks the timer canceled and complete but not failed, like Python", () => {
      const timer = new TimerTask();
      timer.setCancelHandler(jest.fn());

      expect(timer.cancel()).toBe(true);

      expect(timer.isCanceled).toBe(true);
      expect(timer.isComplete).toBe(true);
      expect(timer.isCompleted).toBe(true);
      expect(timer.isFailed).toBe(false);
      expect(timer.isFaulted).toBe(false);
      expect(() => timer.getResult()).toThrow(TaskCancelledError);
      expect(() => timer.result).toThrow(TaskCancelledError);
      expect(() => timer.getException()).toThrow("Task did not fail");
    });

    it("should be idempotent when called multiple times (handler runs only once)", () => {
      const timer = new TimerTask();
      const cancelHandler = jest.fn();
      timer.setCancelHandler(cancelHandler);

      expect(timer.cancel()).toBe(true);
      expect(timer.cancel()).toBe(false);

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

      expect(timer.cancel()).toBe(false);
      // Canceling a fired timer must not flip isCanceled or run the handler.
      expect(timer.isCanceled).toBe(false);
      expect(timer.isCompleted).toBe(true);
      expect(timer.getResult()).toBeUndefined();
      expect(timer.result).toBeUndefined();
      expect(cancelHandler).not.toHaveBeenCalled();
    });

    it("calls the handler before setting cancellation state", () => {
      const timer = new TimerTask();
      timer.setCancelHandler(() => {
        expect(timer.isCanceled).toBe(false);
        expect(timer.isCompleted).toBe(false);
        throw new Error("handler failed");
      });
      expect(() => timer.cancel()).toThrow("handler failed");
      expect(timer.isCanceled).toBe(false);
      expect(timer.isCompleted).toBe(false);
      timer.setCancelHandler(() => undefined);
      expect(timer.cancel()).toBe(true);
    });

    it("returns false for a previously failed timer without canceling it", () => {
      const timer = new TimerTask();
      timer.fail("failed");
      expect(timer.cancel()).toBe(false);
      expect(timer.isCanceled).toBe(false);
      expect(() => timer.result).toThrow("failed");
    });

    it("makes result an alias for getResult even while the timer is pending", () => {
      const timer = new TimerTask();
      expect(() => timer.getResult()).toThrow("Task is not complete");
      expect(() => timer.result).toThrow("Task is not complete");
    });

    it.each([false, true])(
      "notifies whenAny and preserves canceled winner identity (pre-canceled=%s)",
      (preCanceled) => {
        const timer = new TimerTask();
        const sibling = new CompletableTask<undefined>();
        if (preCanceled) expect(timer.cancel()).toBe(true);
        const race = whenAny([timer, sibling]);
        if (!preCanceled) expect(timer.cancel()).toBe(true);
        expect(race.isComplete).toBe(true);
        expect(race.isFailed).toBe(false);
        expect(race.getResult()).toBe(timer);
        expect(() => race.getResult().getResult()).toThrow(TaskCancelledError);
        expect(sibling.isComplete).toBe(false);
        sibling.complete(undefined);
        expect(race.getResult()).toBe(timer);
        expect(timer.cancel()).toBe(false);
      },
    );

    it.each([false, true])(
      "whenAll counts cancellation and propagates it when the last child completes (pre-canceled=%s)",
      (preCanceled) => {
        const timer = new TimerTask();
        const sibling = new CompletableTask<undefined>();
        if (preCanceled) timer.cancel();
        const all = whenAll([timer, sibling]);
        if (!preCanceled) expect(timer.cancel()).toBe(true);
        expect(all.isComplete).toBe(false);
        expect(all.pendingTasks()).toBe(1);
        expect(all.isFailed).toBe(false);
        expect(() => sibling.complete(undefined)).toThrow("The task was cancelled.");
        expect(all.isComplete).toBe(true);
        expect(all.pendingTasks()).toBe(0);
        expect(timer.cancel()).toBe(false);
      },
    );

    it("propagates cancellation from the final whenAll child, as Python does", () => {
      const timer = new TimerTask();
      const sibling = new CompletableTask<undefined>();
      sibling.complete(undefined);
      const all = whenAll([sibling, timer]);
      expect(() => timer.cancel()).toThrow("The task was cancelled.");
      expect(timer.isCanceled).toBe(true);
      expect(timer.isComplete).toBe(true);
      expect(all.isComplete).toBe(true);
      expect(timer.cancel()).toBe(false);
    });

    it("propagates cancellation when constructing whenAll from already-terminal children", () => {
      const timer = new TimerTask();
      timer.cancel();
      expect(() => whenAll([timer])).toThrow("The task was cancelled.");
    });
  });
});
