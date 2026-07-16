// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Ported from the extension e2e `RewindOrchestratorTests`.
 *
 * Drives `HttpStart_RewindOrchestration` to fail N times, rewinds after each
 * failure, and asserts per-activity invocation counts (failed activity runs
 * 1+numFailures times, others once). Also verifies that Node returns 400 when
 * attempting to rewind non-failed instances.
 *
 * Backend = Storage, so `[Trait("DTS","Skip")]` is INCLUDED (that skip applies to
 * the DTS backend only, awaiting an emulator with the new rewind implementation).
 *
 * Gated: skips cleanly unless the shared host was started by globalSetup.
 */

import { randomUUID } from "crypto";
import {
  getOrchestrationDetails,
  invokeHttpTrigger,
  parseInstanceId,
  parseStatusQueryGetUri,
  readPreflight,
  waitForOrchestrationState,
} from "./harness";

const preflight = readPreflight();
const describeMaybe = preflight.ok ? describe : describe.skip;
const baseUrl = preflight.baseUrl ?? "";

if (!preflight.ok) {
  console.warn(`[functions-e2e] rewind.spec skipped: ${preflight.reason}`);
}

describeMaybe("Functions host E2E — rewind (AzureStorage)", () => {
  // DTS-skipped in C#; included for the Storage backend.
  it.each([1, 2])(
    "RewindFailedOrchestration(numFailures=%i) rewinds to completion",
    async (numFailures) => {
      // callEntities is true for non-MSSQL durability providers (Storage here).
      const callEntities = true;
      const response = await invokeHttpTrigger(
        baseUrl,
        "HttpStart_RewindOrchestration",
        `?input=fail&numFailures=${numFailures}&callEntities=${callEntities}`,
      );
      expect(response.status).toBe(202); // HttpStatusCode.Accepted
      const instanceId = parseInstanceId(response);
      const statusQueryGetUri = parseStatusQueryGetUri(response);

      for (let i = 0; i < numFailures; i++) {
        await waitForOrchestrationState(statusQueryGetUri, "Failed", 30);
        const rewindResponse = await invokeHttpTrigger(baseUrl, "RewindInstance", `?instanceId=${instanceId}`);
        expect(rewindResponse.status).toBe(200); // HttpStatusCode.OK
      }

      await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);
      const details = await getOrchestrationDetails(statusQueryGetUri);
      const output = details.output as Record<string, number>;
      expect(output).toBeTruthy();

      // Each successful activity/entity runs once; the failed activity runs on the
      // first attempt plus once per rewind (numFailures + 1).
      for (const [key, value] of Object.entries(output)) {
        if (key.includes("fail_activity")) {
          expect(value).toBe(1 + numFailures);
        } else {
          expect(value).toBe(1);
        }
      }
    },
    180_000,
  );

  it("only rewinds failed orchestrations (Node returns 400 otherwise)", async () => {
    // Completed orchestration — rewind should fail.
    let response = await invokeHttpTrigger(
      baseUrl,
      "HttpStart_RewindOrchestration",
      "?input=complete&numFailures=0&callEntities=false",
    );
    expect(response.status).toBe(202);
    let instanceId = parseInstanceId(response);
    let statusQueryGetUri = parseStatusQueryGetUri(response);
    await waitForOrchestrationState(statusQueryGetUri, "Completed", 30);
    let rewindResponse = await invokeHttpTrigger(baseUrl, "RewindInstance", `?instanceId=${instanceId}`);
    expect(rewindResponse.status).toBe(400); // Node: BadRequest

    // Running orchestration — rewind should fail.
    response = await invokeHttpTrigger(
      baseUrl,
      "HttpStart_RewindOrchestration",
      "?input=run&numFailures=0&callEntities=false",
    );
    expect(response.status).toBe(202);
    instanceId = parseInstanceId(response);
    statusQueryGetUri = parseStatusQueryGetUri(response);
    await waitForOrchestrationState(statusQueryGetUri, "Running", 30);
    rewindResponse = await invokeHttpTrigger(baseUrl, "RewindInstance", `?instanceId=${instanceId}`);
    expect(rewindResponse.status).toBe(400); // Node: BadRequest

    // Terminated orchestration — rewind should fail.
    const terminateResponse = await invokeHttpTrigger(baseUrl, "TerminateInstance", `?instanceId=${instanceId}`);
    expect(terminateResponse.status).toBe(200);
    await waitForOrchestrationState(statusQueryGetUri, "Terminated", 30);
    rewindResponse = await invokeHttpTrigger(baseUrl, "RewindInstance", `?instanceId=${instanceId}`);
    expect(rewindResponse.status).toBe(400); // Node: BadRequest

    // The C# test also rewinds a Pending (scheduled-start) instance, but scheduled
    // starts are dotnet-isolated-only, so that branch is not ported for Node.

    // Non-existent instance — rewind should fail.
    rewindResponse = await invokeHttpTrigger(baseUrl, "RewindInstance", `?instanceId=${randomUUID()}`);
    expect(rewindResponse.status).toBe(400); // Node: BadRequest
  }, 180_000);
});
