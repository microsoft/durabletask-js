// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Jest globalSetup for the Azure Functions Durable e2e suite.
 *
 * Runs the async prerequisite preflight once (func on PATH + Azurite reachable +
 * test-app built/installed) and records the result to a temp file. Each spec
 * reads that file synchronously to decide `describe` vs `describe.skip`, so the
 * whole suite is a clean no-op when the local toolchain is not set up — and, in
 * particular, on `main` where `packages/azure-functions-durable` (PR #282) does
 * not yet exist and the test-app therefore cannot be installed.
 */

import * as fs from "fs";
import { checkPrerequisites, preflightFilePath, TEST_APP_DIR } from "./harness";

export default async function globalSetup(): Promise<void> {
  const result = await checkPrerequisites(TEST_APP_DIR);
  fs.writeFileSync(preflightFilePath(), JSON.stringify(result), "utf-8");
  if (!result.ok) {
    console.warn(`[functions-e2e] Skipping suite: ${result.reason}`);
  }
}
