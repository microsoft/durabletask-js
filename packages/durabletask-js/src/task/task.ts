// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CompositeTask } from "./composite-task";

/**
 * Abstract base class for asynchronous tasks in a durable orchestration.
 */
export class Task<T> {
  _result: T | undefined;
  _exception: Error | undefined;
  _parent: CompositeTask<T> | undefined;
  _isComplete: boolean = false;

  constructor() {
    this._isComplete = false;
    this._exception = undefined;
    this._parent = undefined;
  }

  /**
   * Returns true if the task has completed, false otherwise
   */
  get isComplete(): boolean {
    return this._isComplete;
  }

  /**
   * Returns true if the task has failed, false otherwise
   */
  get isFailed(): boolean {
    return this._exception != undefined;
  }

  /**
   * Alias of {@link isComplete} that matches the v3 Durable Functions `Task` shape.
   * Note that completion is not equivalent to success.
   */
  get isCompleted(): boolean {
    return this._isComplete;
  }

  /**
   * Alias of {@link isFailed} that matches the v3 Durable Functions `Task` shape.
   */
  get isFaulted(): boolean {
    return this.isFailed;
  }

  /**
   * The result of the task if it has completed successfully, otherwise `undefined`.
   *
   * Unlike {@link getResult}, this getter never throws: it returns `undefined`
   * while the task is still pending and for a failed task. This matches the v3
   * Durable Functions `Task.result` shape.
   */
  get result(): T | undefined {
    return this._isComplete ? this._result : undefined;
  }

  /**
   * Get the result of the task
   */
  getResult(): T {
    if (!this._isComplete) {
      throw new Error("Task is not complete");
    }

    if (this._exception) {
      throw this._exception;
    }

    return this._result as T;
  }

  /**
   * Get the exception that caused the task to fail
   */
  getException(): Error {
    if (!this._exception) {
      throw new Error("Task did not fail");
    }

    return this._exception;
  }
}
