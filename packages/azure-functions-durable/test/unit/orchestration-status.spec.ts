// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationState, OrchestrationStatus } from "@microsoft/durabletask-js";
import { OrchestrationRuntimeStatus, toDurableOrchestrationStatus } from "../../src/orchestration-status";

function stateWithOutput(
  serializedOutput?: string,
  runtimeStatus: OrchestrationStatus = OrchestrationStatus.FAILED,
): OrchestrationState {
  return new OrchestrationState(
    "inst-1",
    "MyOrchestrator",
    runtimeStatus,
    new Date("2026-01-01T00:00:00.000Z"),
    new Date("2026-01-01T00:00:05.000Z"),
    undefined,
    serializedOutput,
    undefined,
  );
}

describe("toDurableOrchestrationStatus (parseJson tolerance)", () => {
  it("returns a non-JSON FAILED output as the raw string instead of throwing (ListAll regression)", () => {
    // A FAILED instance's serializedOutput is a plain error string, not JSON. Parsing it with
    // JSON.parse throws a SyntaxError, which previously broke enumerating all instances
    // (getStatusAll -> HTTP 400) as soon as any FAILED instance was present.
    const status = toDurableOrchestrationStatus(stateWithOutput("TaskFailedError: Activity task #1 failed"));

    expect(status.runtimeStatus).toBe(OrchestrationRuntimeStatus.Failed);
    expect(status.output).toBe("TaskFailedError: Activity task #1 failed");
  });

  it("still parses valid JSON output", () => {
    const status = toDurableOrchestrationStatus(stateWithOutput('{"ok":true}', OrchestrationStatus.COMPLETED));
    expect(status.output).toEqual({ ok: true });
  });

  it("treats undefined and empty-string outputs as undefined", () => {
    expect(toDurableOrchestrationStatus(stateWithOutput(undefined)).output).toBeUndefined();
    expect(toDurableOrchestrationStatus(stateWithOutput("")).output).toBeUndefined();
  });
});
