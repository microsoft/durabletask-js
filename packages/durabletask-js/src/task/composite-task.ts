// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Task } from "./task";

/**
 * A task that is composed of other tasks
 */
export class CompositeTask<T> extends Task<T> {
  _tasks: Task<any>[] = [];
  _completedTasks: number;
  protected readonly _pendingChildren = new Map<Task<any>, number>();

  constructor(tasks: Task<any>[]) {
    super();

    this._tasks = tasks;
    this._completedTasks = 0;

    for (const task of tasks) {
      this._pendingChildren.set(task, (this._pendingChildren.get(task) ?? 0) + 1);
    }

    for (const task of this._pendingChildren.keys()) {
      if (task.isComplete) {
        this.onChildCompleted(task);
      } else {
        task._parents.add(this);
      }
    }
  }

  protected override notifyParents(): void {
    for (const task of this._pendingChildren.keys()) {
      task._parents.delete(this);
    }
    this._pendingChildren.clear();
    super.notifyParents();
  }

  // @todo: should be abstract method
  onChildCompleted(_: Task<any>): void {}
}
