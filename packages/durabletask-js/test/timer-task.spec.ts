// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../src/proto/orchestrator_service_pb";
import { CompletableTask } from "../src/task/completable-task";
import { TimerTask, TimerBookkeeping } from "../src/task/timer-task";

/**
 * Minimal fake bookkeeping that mirrors the fields TimerTask.cancel() touches on
 * the real RuntimeOrchestrationContext.
 */
function makeBookkeeping(): TimerBookkeeping {
  return {
    _pendingActions: {} as Record<number, pb.OrchestratorAction>,
    _pendingTasks: {} as Record<number, CompletableTask<any>>,
  };
}

describe("TimerTask", () => {
  const TIMER_ID = 1;

  it("should start incomplete, not failed, and not canceled", () => {
    const bookkeeping = makeBookkeeping();
    const timer = new TimerTask(bookkeeping, TIMER_ID);

    expect(timer.isComplete).toBe(false);
    expect(timer.isCompleted).toBe(false);
    expect(timer.isFailed).toBe(false);
    expect(timer.isCanceled).toBe(false);
  });

  it("should be a Task/CompletableTask instance (identity preserving, no wrapper)", () => {
    const bookkeeping = makeBookkeeping();
    const timer = new TimerTask(bookkeeping, TIMER_ID);

    // TimerTask must extend CompletableTask so whenAny/whenAll return the real
    // instance and `winner === timerTask` identity holds for callers.
    expect(timer).toBeInstanceOf(CompletableTask);
  });

  describe("cancel()", () => {
    it("should flip isCanceled and drop the pending action and pending task", () => {
      const bookkeeping = makeBookkeeping();
      const action = new pb.OrchestratorAction();
      action.setId(TIMER_ID);
      const timer = new TimerTask(bookkeeping, TIMER_ID);
      bookkeeping._pendingActions[TIMER_ID] = action;
      bookkeeping._pendingTasks[TIMER_ID] = timer;

      timer.cancel();

      expect(timer.isCanceled).toBe(true);
      expect(bookkeeping._pendingActions[TIMER_ID]).toBeUndefined();
      expect(bookkeeping._pendingTasks[TIMER_ID]).toBeUndefined();
    });

    it("should not mark the timer complete (isCompleted stays false, isFaulted false)", () => {
      const bookkeeping = makeBookkeeping();
      const timer = new TimerTask(bookkeeping, TIMER_ID);
      bookkeeping._pendingTasks[TIMER_ID] = timer;

      timer.cancel();

      expect(timer.isCanceled).toBe(true);
      expect(timer.isCompleted).toBe(false);
      expect(timer.isFaulted).toBe(false);
    });

    it("should be idempotent when called multiple times", () => {
      const bookkeeping = makeBookkeeping();
      const timer = new TimerTask(bookkeeping, TIMER_ID);
      bookkeeping._pendingTasks[TIMER_ID] = timer;

      timer.cancel();
      expect(() => timer.cancel()).not.toThrow();
      expect(timer.isCanceled).toBe(true);
    });

    it("should not remove an unrelated pending action/task with a different id", () => {
      const bookkeeping = makeBookkeeping();
      const otherAction = new pb.OrchestratorAction();
      otherAction.setId(2);
      const otherTask = new CompletableTask<number>();
      bookkeeping._pendingActions[2] = otherAction;
      bookkeeping._pendingTasks[2] = otherTask;

      const timer = new TimerTask(bookkeeping, TIMER_ID);
      bookkeeping._pendingTasks[TIMER_ID] = timer;

      timer.cancel();

      // The sibling entries at id 2 must remain untouched.
      expect(bookkeeping._pendingActions[2]).toBe(otherAction);
      expect(bookkeeping._pendingTasks[2]).toBe(otherTask);
    });

    it("should be a no-op after the timer has already fired (completed)", () => {
      const bookkeeping = makeBookkeeping();
      const timer = new TimerTask(bookkeeping, TIMER_ID);

      // Simulate the timer firing (handleTimerFired calls complete(undefined)).
      timer.complete(undefined);

      expect(() => timer.cancel()).not.toThrow();
      // Canceling a fired timer must not flip isCanceled.
      expect(timer.isCanceled).toBe(false);
      expect(timer.isCompleted).toBe(true);
    });
  });
});
