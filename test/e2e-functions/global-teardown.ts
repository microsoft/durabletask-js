// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Jest globalTeardown for the Azure Functions Durable e2e suite.
 *
 * Stops the single shared `func start` host started by globalSetup (if any) and
 * removes the preflight file. Runs in the same process as globalSetup, so it
 * retrieves the host handle from `globalThis`.
 */

import * as fs from "fs";
import { FunctionApp, preflightFilePath } from "./harness";
import { GLOBAL_APP_KEY } from "./global-setup";

export default async function globalTeardown(): Promise<void> {
  const app = (globalThis as Record<string, unknown>)[GLOBAL_APP_KEY] as FunctionApp | undefined;
  if (app) {
    await app.stop();
    delete (globalThis as Record<string, unknown>)[GLOBAL_APP_KEY];
  }
  try {
    fs.unlinkSync(preflightFilePath());
  } catch {
    // Nothing to clean up.
  }
}
