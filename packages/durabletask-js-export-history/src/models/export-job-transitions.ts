// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExportJobStatus } from "./export-job-status";

/**
 * Validates state transitions for export jobs.
 */
export function isValidTransition(
  operationName: string,
  from: ExportJobStatus,
  targetState: ExportJobStatus,
): boolean {
  const op = operationName.toLowerCase();

  switch (op) {
    case "create":
      return isValidCreateTransition(from, targetState);
    case "markascompleted":
      return isValidMarkAsCompletedTransition(from, targetState);
    case "markasfailed":
      return isValidMarkAsFailedTransition(from, targetState);
    default:
      return false;
  }
}

function isValidCreateTransition(from: ExportJobStatus, targetState: ExportJobStatus): boolean {
  if (targetState !== ExportJobStatus.Active) return false;
  switch (from) {
    case ExportJobStatus.Pending:
    case ExportJobStatus.Failed:
    case ExportJobStatus.Completed:
      return true;
    default:
      return false;
  }
}

function isValidMarkAsCompletedTransition(
  from: ExportJobStatus,
  targetState: ExportJobStatus,
): boolean {
  if (targetState !== ExportJobStatus.Completed) return false;
  return from === ExportJobStatus.Active;
}

function isValidMarkAsFailedTransition(
  from: ExportJobStatus,
  targetState: ExportJobStatus,
): boolean {
  if (targetState !== ExportJobStatus.Failed) return false;
  return from === ExportJobStatus.Active;
}
