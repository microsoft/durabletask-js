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
  it("keys the default ID on the per-execution executionId (not the parent instance ID) so IDs are unique across continue-as-new generations", () => {
    const ctx = new RuntimeOrchestrationContext("parent-instance");
    ctx._executionId = "execA";

    ctx.callSubOrchestrator("Child");

    // `${executionId}:${suffix}` — deliberately NOT prefixed with the parent instance ID (see the
    // derivation comment: executionId is globally unique, and prepending the parent ID would blow the
    // DTS 100-char instance-ID limit when sub-orchestrations nest).
    expect(pendingSubOrchestrationInstanceIds(ctx)).toEqual(["execA:0001"]);
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
    expect(ids).toContain("execA:0001");
    expect(ids).toContain("execA:0002");
  });

  it("does not touch an explicitly provided instance ID", () => {
    const ctx = new RuntimeOrchestrationContext("parent-instance");
    ctx._executionId = "execA";

    ctx.callSubOrchestrator("Child", undefined, { instanceId: "my-explicit-id" });

    expect(pendingSubOrchestrationInstanceIds(ctx)).toEqual(["my-explicit-id"]);
  });

  it("keeps default-derived IDs within the DTS 100-char instance-ID limit at every nesting depth", () => {
    // The Durable Task Scheduler caps instance IDs at 100 characters (enforced server-side). The
    // derived ID is `${executionId}:${suffix}`, keyed on the SCHEDULING (parent) orchestration's
    // per-generation executionId — it must be the scheduler's, since the ID is derived
    // deterministically before the child exists — and NOT prefixed with the parent instance ID.
    // Each nesting level therefore contributes only its own fixed-length executionId, so the ID
    // stays constant-length no matter how deeply sub-orchestrations nest. (The pre-fix
    // `${parentId}:${executionId}:${suffix}` shape concatenated every ancestor and blew past 100
    // chars at ~2 levels deep.) Simulate a realistic top-level 36-char auto-GUID and a fresh 32-hex
    // executionId per level, deriving each level's child from the previous level's derived ID.
    const executionIds = ["0", "1", "2", "3"].map((c) => c.repeat(32)); // 32-hex-length, distinct per level
    let parentInstanceId = "4cb1b016-ec71-4608-bdeb-328306cc0215"; // 36 chars, like an auto-generated GUID
    const derived: string[] = [];

    for (const executionId of executionIds) {
      const ctx = new RuntimeOrchestrationContext(parentInstanceId);
      ctx._executionId = executionId;
      ctx.callSubOrchestrator("Child");
      const childId = pendingSubOrchestrationInstanceIds(ctx)[0];
      derived.push(childId);
      parentInstanceId = childId; // nest: this child becomes the next level's parent
    }

    for (const childId of derived) {
      expect(childId).toMatch(/^[0-9a-f]{32}:[0-9a-f]{4}$/);
      expect(childId.length).toBeLessThanOrEqual(100);
    }
    // Constant length at every depth: each level is executionId(32) + ":" + suffix(4) = 37 chars,
    // independent of how long the parent instance ID grew.
    expect(new Set(derived.map((childId) => childId.length)).size).toBe(1);
    expect(derived[0].length).toBe(37);
    expect(derived[0]).toEqual("00000000000000000000000000000000:0001");
  });
});
