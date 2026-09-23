// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class ActivityContext {
  private _orchestrationId: string;
  private _taskId: number;
  private readonly _name: string;
  private readonly _version: string;

  /**
   * @param orchestrationId - The ID of the orchestration that scheduled this activity.
   * @param taskId - The scheduled task ID.
   * @param name - The logical activity request name. Defaults to empty for legacy two-argument callers.
   * @param version - The requested activity version. Defaults to empty when not supplied.
   */
  constructor(orchestrationId: string, taskId: number, name: string = "", version: string = "") {
    this._orchestrationId = orchestrationId;
    this._taskId = taskId;
    this._name = name;
    this._version = version ?? "";
  }

  /**
   * Gets the logical activity name from the request, not the implementation function name.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Gets the requested activity version, or an empty string when none was supplied.
   * Preserves the request's casing and version even when an unversioned registration handles it.
   */
  get version(): string {
    return this._version;
  }

  get orchestrationId(): string {
    return this._orchestrationId;
  }

  get taskId(): number {
    return this._taskId;
  }
}
