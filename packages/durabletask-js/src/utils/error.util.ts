// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Safely extracts a human-readable message from an unknown error value.
 *
 * This utility eliminates the repeated `error instanceof Error ? error.message : String(error)`
 * pattern used throughout the codebase for safe error-to-string conversion.
 *
 * @param error - The error value to extract a message from (may be an Error, string, or any other type).
 * @returns The error message string.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    try {
      const json = JSON.stringify(error);
      if (json) {
        return json;
      }
    } catch {
      // Ignore JSON serialization errors and fall through to the generic fallback below.
    }
  }

  return String(error);
}
