import { CompositeTask } from "./composite-task";
import { Task } from "./task";

/**
 * A task that completes when any of its child tasks complete
 */
export class WhenAnyTask extends CompositeTask<Task<any>> {
  constructor(tasks: Task<any>[]) {
    super(tasks);
  }

  onChildCompleted(task: Task<any>): void {
    if (!this.isComplete) {
      this._isComplete = true;
      this._result = task;
    }
  }
}
