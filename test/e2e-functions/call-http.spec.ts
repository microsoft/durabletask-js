// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * End-to-end coverage for the restored v3 `context.df.callHttp` API.
 *
 * Drives the `CallHttpOrchestration` app function (see test-app) through the real
 * Functions host: a durable callHttp against the app's own endpoints exercises the
 * synchronous 200 path, the 202 -> Location poll loop, the enablePolling=false
 * opt-out, and the cross-origin credential policy (Authorization forwarded on a
 * same-origin poll, stripped on a cross-origin one). Kept hermetic (loopback only)
 * so no external network is required.
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup.
 */

import {
  invokeHttpTrigger,
  parseStatusQueryGetUri,
  readPreflight,
  waitForOrchestrationState,
} from "./harness";

const preflight = readPreflight();
const describeMaybe = preflight.ok ? describe : describe.skip;
const baseUrl = preflight.baseUrl ?? "";

if (!preflight.ok) {
  console.warn(`[functions-e2e] call-http.spec skipped: ${preflight.reason}`);
}

describeMaybe("Functions host E2E — callHttp (AzureStorage)", () => {
  it("callHttp returns a synchronous 200 response", async () => {
    const response = await invokeHttpTrigger(baseUrl, "CallHttp_HttpStart", "?mode=sync");
    expect(response.status).toBe(202); // HttpStatusCode.Accepted (check-status payload)

    const statusQueryGetUri = parseStatusQueryGetUri(response);
    const details = await waitForOrchestrationState(statusQueryGetUri, "Completed", 60);

    const output = details.output as { statusCode: number; content: string };
    expect(output.statusCode).toBe(200);
    expect(JSON.parse(output.content).echoed).toBe("hello");
  }, 120_000);

  it("callHttp follows the 202 -> Location poll loop to the final 200", async () => {
    const response = await invokeHttpTrigger(baseUrl, "CallHttp_HttpStart", "?mode=polling");
    expect(response.status).toBe(202);

    const statusQueryGetUri = parseStatusQueryGetUri(response);
    const details = await waitForOrchestrationState(statusQueryGetUri, "Completed", 60);

    const output = details.output as { statusCode: number; content: string };
    expect(output.statusCode).toBe(200);
    expect(JSON.parse(output.content).echoed).toBe("async-done");
  }, 120_000);

  it("callHttp with enablePolling:false returns the 202 without polling", async () => {
    const response = await invokeHttpTrigger(baseUrl, "CallHttp_HttpStart", "?mode=nopoll");
    expect(response.status).toBe(202);

    const statusQueryGetUri = parseStatusQueryGetUri(response);
    const details = await waitForOrchestrationState(statusQueryGetUri, "Completed", 60);

    // enablePolling=false returns the first 202 as-is; a 202 carries no body, so
    // only the status code is asserted (do not JSON.parse the empty content).
    const output = details.output as { statusCode: number; content: string };
    expect(output.statusCode).toBe(202);
  }, 120_000);

  it("callHttp forwards the Authorization header on a same-origin 202 poll", async () => {
    // Baseline for the cross-origin case: first hop and poll Location share the `localhost`
    // origin, so the caller's Authorization header must reach the poll target. This rules out a
    // false positive where the host simply drops Authorization on the wire.
    const response = await invokeHttpTrigger(baseUrl, "CallHttp_HttpStart", "?mode=xorigin-same");
    expect(response.status).toBe(202);

    const statusQueryGetUri = parseStatusQueryGetUri(response);
    const details = await waitForOrchestrationState(statusQueryGetUri, "Completed", 60);

    const output = details.output as { statusCode: number; content: string };
    expect(output.statusCode).toBe(200);
    const body = JSON.parse(output.content);
    expect(body.echoed).toBe("xorigin-done");
    expect(body.authorization).toBe("Bearer e2e-secret");
  }, 120_000);

  it("callHttp strips the Authorization header on a cross-origin 202 poll", async () => {
    // First hop via the 127.0.0.1 origin, poll Location on the localhost origin -> cross-origin,
    // so the Authorization header carried on the first hop must NOT reach the poll target.
    const response = await invokeHttpTrigger(baseUrl, "CallHttp_HttpStart", "?mode=xorigin");
    expect(response.status).toBe(202);

    const statusQueryGetUri = parseStatusQueryGetUri(response);
    const details = await waitForOrchestrationState(statusQueryGetUri, "Completed", 60);

    const output = details.output as { statusCode: number; content: string };
    expect(output.statusCode).toBe(200);
    const body = JSON.parse(output.content);
    expect(body.echoed).toBe("xorigin-done");
    expect(body.authorization).toBeNull();
  }, 120_000);
});
