import * as pb from "../proto/orchestrator_service_pb";
import { TaskFailedError } from "./exception/task-failed-error";
import { Task } from "./task";

export class CompletableTask<T> extends Task<T> {
  constructor() {
    super();
  }

  complete(result: T): void {
    if (this._isComplete) {
      throw new Error("Task is already completed");
    }

    this._result = result;
    this._isComplete = true;

    if (this._parent) {
      this._parent.onChildCompleted(this);
    }
  }

  fail(message: string, details?: pb.TaskFailureDetails): void {
    if (this._isComplete) {
      throw new Error("Task is already completed");
    }

    details = details ?? new pb.TaskFailureDetails();

    this._exception = new TaskFailedError(message, details);
    this._isComplete = true;

    if (this._parent) {
      this._parent.onChildCompleted(this);
    }
  }
}
