// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * The name of the SDK used in the user agent string.
 */
const SDK_NAME = "durabletask-js";

/**
 * The version of the SDK, loaded from package.json at runtime.
 */
let packageVersion: string = "unknown";

/**
 * Gets the package version from package.json.
 * Caches the result for subsequent calls.
 */
function getPackageVersion(): string {
  if (packageVersion === "unknown") {
    try {
      const pkg = require("../package.json");
      packageVersion = pkg.version ?? "unknown";
    } catch {
      // Keep as "unknown"
    }
  }
  return packageVersion;
}

/**
 * Generates the user agent string for the Durable Task SDK.
 * Format: durabletask-js/{version} ({callerType})
 *
 * @param callerType The type of caller (e.g., "DurableTaskClient" or "DurableTaskWorker").
 * @returns The user agent string.
 */
export function getUserAgent(callerType: string): string {
  return `${SDK_NAME}/${getPackageVersion()} (${callerType})`;
}
