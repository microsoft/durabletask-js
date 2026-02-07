// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Interface representing task failure details.
 * This is used for retry handlers to inspect failure information.
 */
export interface TaskFailureDetails {
  /** The type/class name of the error */
  readonly errorType: string;
  /** The error message */
  readonly message: string;
  /** The stack trace, if available */
  readonly stackTrace?: string;
}

export class FailureDetails implements TaskFailureDetails {
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
