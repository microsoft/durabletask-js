// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CompositeTask } from "./composite-task";
import { Task } from "./task";

/**
 * A task that completes when all of its child tasks complete
 */
export class WhenAllTask<T> extends CompositeTask<T[]> {
  constructor(tasks: Task<T>[]) {
    super(tasks);

    // Note: Do NOT re-initialize _completedTasks or _failedTasks here.
    // CompositeTask's constructor already initializes them to 0 and then
    // processes pre-completed children via onChildCompleted(), which
    // increments the counter. Re-initializing would wipe out that count
    // and cause the task to hang when some children are already complete.

    // An empty task list should complete immediately with an empty result
    if (tasks.length === 0) {
      this._result = [] as T[];
      this._isComplete = true;
    }
  }

  pendingTasks(): number {
    return this._tasks.length - this._completedTasks;
  }

  onChildCompleted(_task: Task<any>): void {
    if (this._isComplete) {
      // Already completed (all children done). Ignore subsequent child completions.
      return;
    }

    this._completedTasks++;

    // Wait-all semantics (matching .NET Task.WhenAll and Java CompletableFuture.allOf):
    // a failing child does NOT complete the WhenAll early. We keep waiting until *every*
    // child has reached a terminal state. Only once all children are done do we complete —
    // as failed (aggregating the child failures) if any child failed, otherwise with the
    // array of child results. Completing only when all siblings are terminal is what prevents
    // later failing siblings' TaskFailed events from being dropped against an already-terminal
    // instance (the root cause of the rewind deadlock in issue #301).
    //
    // Note: we intentionally do NOT set `_exception` until the task is complete. Doing so
    // early would make `isFailed` (which is `_exception != undefined`) report true while the
    // task is still pending, and the orchestration context's `resume()` — which checks
    // `isFailed` before `isComplete` — would throw the failure into the generator before the
    // other siblings finish, re-introducing fail-fast at the executor level.
    if (this._completedTasks == this._tasks.length) {
      this._isComplete = true;

      // Collect ALL failed children in task-array order. Using the task array (rather than
      // arrival/completion order) makes the aggregated exception order deterministic across
      // replay.
      const failures = this._tasks.filter((child) => child.isFailed).map((child) => child.getException());

      if (failures.length > 0) {
        // Aggregate ALL child failures — matching .NET AggregateException and Java
        // CompositeTaskFailedException — even when only one child failed. `.errors` carries
        // every child exception (each a TaskFailedError with `.details`). We inline every child
        // message into the AggregateError message because newFailureDetails() only serializes
        // `e.message` (not `.errors`), so an UNCAUGHT whenAll failure would otherwise lose the
        // per-child detail.
        const inlined = failures.map((f) => (f instanceof Error ? f.message : String(f))).join("; ");
        this._exception = new AggregateError(
          failures,
          `${failures.length} of ${this._tasks.length} tasks in the whenAll failed: ${inlined}`,
        );
      } else {
        this._result = this._tasks.map((child) => child.getResult());
      }

      this._parent?.onChildCompleted(this);
    }
  }

  get completedTasks(): number {
    return this._completedTasks;
  }
}
