// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export class FailureDetails {
  private _message: string;
  private _errorType: string;
  private _stackTrace: string | undefined;

  constructor(message: string, errorType: string, stackTrace?: string) {
    this._message = message;
    this._errorType = errorType;
    this._stackTrace = stackTrace;
  }

  get message(): string {
    return this._message;
  }

  get errorType(): string {
    return this._errorType;
  }

  get stackTrace(): string | undefined {
    return this._stackTrace;
  }
}
