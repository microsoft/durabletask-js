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

  onChildCompleted(task: Task<any>): void {
    if (this._isComplete) {
      // Already completed (fail-fast or all children done). Ignore subsequent child completions.
      return;
    }

    this._completedTasks++;

    if (task.isFailed && !this._exception) {
      this._exception = task.getException();
      this._isComplete = true;
      this._parent?.onChildCompleted(this);
      return;
    }

    if (this._completedTasks == this._tasks.length) {
      this._result = this._tasks.map((task) => task.getResult());
      this._isComplete = true;
      this._parent?.onChildCompleted(this);
    }
  }

  get completedTasks(): number {
    return this._completedTasks;
  }
}
