// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const SDK_NAME = "durable-functions";

let packageVersion = "unknown";

function getPackageVersion(): string {
  if (packageVersion === "unknown") {
    try {
      const pkg = require("../package.json");
      packageVersion = pkg.version ?? "unknown";
    } catch {
      // Keep the fallback when package metadata is unavailable.
    }
  }

  return packageVersion;
}

export function getUserAgent(): string {
  return `${SDK_NAME}/${getPackageVersion()}`;
}
