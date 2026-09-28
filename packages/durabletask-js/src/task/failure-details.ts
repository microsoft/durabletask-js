// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Interface representing task failure details.
 * Used by task errors and retry handlers to inspect failure information,
 * including the optional chain of underlying failures.
 */
export interface TaskFailureDetails {
  /** The type/class name of the error */
  readonly errorType: string;
  /** The error message */
  readonly message: string;
  /** The stack trace, if available */
  readonly stackTrace?: string;
  /** Details of the underlying failure, if supplied by the task or backend. */
  readonly innerFailure?: TaskFailureDetails;
  /**
   * Structured values received from the backend, not collected from JavaScript Error fields.
   * Empty wire maps are undefined. Values are protobuf Value data (strings, numbers, booleans,
   * null, arrays, or objects); narrow unknown values before using them.
   */
  readonly properties?: Readonly<Record<string, unknown>>;
}

export class FailureDetails implements TaskFailureDetails {
  private _message: string;
  private _errorType: string;
  private _stackTrace: string | undefined;
  private _innerFailure: TaskFailureDetails | undefined;
  private _properties: Readonly<Record<string, unknown>> | undefined;

  constructor(
    message: string,
    errorType: string,
    stackTrace?: string,
    innerFailure?: TaskFailureDetails,
    properties?: Readonly<Record<string, unknown>>,
  ) {
    this._message = message;
    this._errorType = errorType;
    this._stackTrace = stackTrace;
    this._innerFailure = innerFailure;
    this._properties = properties;
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

  get innerFailure(): TaskFailureDetails | undefined {
    return this._innerFailure;
  }

  get properties(): Readonly<Record<string, unknown>> | undefined {
    return this._properties;
  }
}
