// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RuntimeOrchestrationContext } from "../src/worker/runtime-orchestration-context";
import * as pb from "../src/proto/orchestrator_service_pb";

/** Returns the instance IDs of every CreateSubOrchestration action pending on the context. */
function pendingSubOrchestrationInstanceIds(ctx: RuntimeOrchestrationContext): string[] {
  return Object.values(ctx._pendingActions)
    .filter((action: pb.OrchestratorAction) => action.hasCreatesuborchestration())
    .map((action: pb.OrchestratorAction) => action.getCreatesuborchestration()!.getInstanceid());
}

describe("default sub-orchestration instance ID derivation", () => {
  it("includes the per-execution executionId so IDs are unique across continue-as-new generations", () => {
    const ctx = new RuntimeOrchestrationContext("parent-instance");
    ctx._executionId = "execA";

    ctx.callSubOrchestrator("Child");

    expect(pendingSubOrchestrationInstanceIds(ctx)).toEqual(["parent-instance:execA:0001"]);
  });

  it("falls back to the legacy `${parentId}:${suffix}` format when executionId is empty", () => {
    // A backend that does not populate executionId leaves callers exactly as they are today (the
    // legacy format, which can collide across continue-as-new) rather than throwing and newly
    // breaking working orchestrations.
    const ctx = new RuntimeOrchestrationContext("parent-instance");
    ctx._executionId = "";

    ctx.callSubOrchestrator("Child");

    expect(pendingSubOrchestrationInstanceIds(ctx)).toEqual(["parent-instance:0001"]);
  });

  it("gives sequential sub-orchestrations within one execution distinct deterministic IDs", () => {
    const ctx = new RuntimeOrchestrationContext("parent-instance");
    ctx._executionId = "execA";

    ctx.callSubOrchestrator("Child");
    ctx.callSubOrchestrator("Child");

    const ids = pendingSubOrchestrationInstanceIds(ctx);
    expect(new Set(ids).size).toBe(2);
    expect(ids).toContain("parent-instance:execA:0001");
    expect(ids).toContain("parent-instance:execA:0002");
  });

  it("does not touch an explicitly provided instance ID", () => {
    const ctx = new RuntimeOrchestrationContext("parent-instance");
    ctx._executionId = "execA";

    ctx.callSubOrchestrator("Child", undefined, { instanceId: "my-explicit-id" });

    expect(pendingSubOrchestrationInstanceIds(ctx)).toEqual(["my-explicit-id"]);
  });
});
