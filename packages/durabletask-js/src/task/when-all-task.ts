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

    // Wait-all: a failing child does not complete the whenAll early; we wait until every child
    // is terminal. This prevents a later failing sibling's TaskFailed from being dropped against
    // an already-terminal instance (issue #301).
    //
    // Set _exception only at completion so isFailed and isComplete flip together — otherwise
    // resume() (which checks isFailed before isComplete) would throw into the generator before
    // the other siblings finish, re-introducing fail-fast.
    if (this._completedTasks == this._tasks.length) {
      this._isComplete = true;

      const failures = this._tasks.filter((child) => child.isFailed).map((child) => child.getException());

      if (failures.length > 0) {
        // Aggregate all child failures into an AggregateError. The message inlines every child
        // message because newFailureDetails() serializes only e.message (not .errors), so an
        // uncaught whenAll failure would otherwise lose per-child detail.
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
