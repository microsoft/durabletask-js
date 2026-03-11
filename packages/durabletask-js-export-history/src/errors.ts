// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Error thrown when an invalid export job state transition is attempted.
 */
export class ExportJobInvalidTransitionError extends Error {
  readonly jobId: string;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly operationName: string;

  constructor(jobId: string, fromStatus: string, toStatus: string, operationName: string) {
    super(
      `Invalid state transition for export job '${jobId}': ` +
        `cannot transition from '${fromStatus}' to '${toStatus}' via operation '${operationName}'.`,
    );
    this.name = "ExportJobInvalidTransitionError";
    this.jobId = jobId;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    this.operationName = operationName;
  }
}

/**
 * Error thrown when an export job is not found.
 */
export class ExportJobNotFoundError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super(`Export job '${jobId}' was not found.`);
    this.name = "ExportJobNotFoundError";
    this.jobId = jobId;
  }
}

/**
 * Error thrown when export job creation options fail validation.
 */
export class ExportJobClientValidationError extends Error {
  readonly parameterName: string;

  constructor(message: string, parameterName: string) {
    super(message);
    this.name = "ExportJobClientValidationError";
    this.parameterName = parameterName;
  }
}
