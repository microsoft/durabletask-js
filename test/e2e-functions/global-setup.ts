// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Jest globalSetup for the Azure Functions Durable e2e suite.
 *
 * Runs the async prerequisite preflight once (func on PATH + Azurite reachable +
 * test-app built/installed). When the prerequisites are met it starts a single
 * shared `func start` host (mirroring the C# `FunctionAppFixture`, which shares
 * one host across the whole test collection) and records the host `baseUrl` to a
 * temp file. Each spec reads that file synchronously to decide `describe` vs
 * `describe.skip` and to obtain the shared host URL, so the whole suite is a
 * clean no-op when the local toolchain is not set up (no `func`, or Azurite not
 * running, or the test-app has not been installed/built).
 *
 * The started host is stashed on `globalThis` so global-teardown can stop it.
 */

import * as fs from "fs";
import { checkPrerequisites, FunctionApp, preflightFilePath, PrerequisiteCheck, TEST_APP_DIR } from "./harness";

export const GLOBAL_APP_KEY = "__DURABLETASK_FUNCTIONS_E2E_APP__";

export default async function globalSetup(): Promise<void> {
  const preflight: PrerequisiteCheck = await checkPrerequisites(TEST_APP_DIR);

  if (!preflight.ok) {
    fs.writeFileSync(preflightFilePath(), JSON.stringify(preflight), "utf-8");
    console.warn(`[functions-e2e] Skipping suite: ${preflight.reason}`);
    return;
  }

  // Prerequisites are present: start the single shared host for the whole run.
  const app = new FunctionApp(TEST_APP_DIR);
  try {
    await app.start();
  } catch (err) {
    await app.stop();
    const reason = `Failed to start the shared func host: ${err instanceof Error ? err.message : String(err)}`;
    fs.writeFileSync(preflightFilePath(), JSON.stringify({ ok: false, reason }), "utf-8");
    console.warn(`[functions-e2e] Skipping suite: ${reason}`);
    return;
  }

  (globalThis as Record<string, unknown>)[GLOBAL_APP_KEY] = app;
  fs.writeFileSync(preflightFilePath(), JSON.stringify({ ok: true, baseUrl: app.baseUrl }), "utf-8");
  console.log(`[functions-e2e] Shared func host ready at ${app.baseUrl}`);
}
