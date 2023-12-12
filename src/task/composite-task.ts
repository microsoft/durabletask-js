import { Task } from "./task";

/**
 * A task that is composed of other tasks
 */
export class CompositeTask<T> extends Task<T> {
  _tasks: Task<any>[] = [];
  _completedTasks: number;
  _failedTasks: number;

  constructor(tasks: Task<any>[]) {
    super();

    this._tasks = tasks;
    this._completedTasks = 0;
    this._failedTasks = 0;

    for (const task of tasks) {
      task._parent = this;

      if (task._isComplete) {
        this.onChildCompleted(task);
      }
    }
  }

  // @todo: should be abstract method
  onChildCompleted(task: Task<any>): void {}
}
