// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class ActivityContext {
  private _orchestrationId: string;
  private _taskId: number;

  constructor(orchestrationId: string, taskId: number) {
    this._orchestrationId = orchestrationId;
    this._taskId = taskId;
  }

  get orchestrationId(): string {
    return this._orchestrationId;
  }

  get taskId(): number {
    return this._taskId;
  }
}
