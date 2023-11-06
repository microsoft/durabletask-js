import { CompositeTask } from "./composite-task";
import { Task } from "./task";

/**
 * A task that completes when all of its child tasks complete
 */
export class WhenAllTask<T> extends CompositeTask<T[]> {
  constructor(tasks: Task<T>[]) {
    super(tasks);

    this._completedTasks = 0;
    this._failedTasks = 0;
  }

  pendingTasks(): number {
    return this._tasks.length - this._completedTasks;
  }

  onChildCompleted(task: Task<any>): void {
    if (this._isComplete) {
      throw new Error("Task is already completed");
    }

    this._completedTasks++;

    if (task.isFailed && !this._exception) {
      this._exception = task.getException();
      this._isComplete = true;
    }

    if (this._completedTasks == this._tasks.length) {
      this._result = this._tasks.map((task) => task.getResult());
      this._isComplete = true;
    }
  }

  get completedTasks(): number {
    return this._completedTasks;
  }
}
