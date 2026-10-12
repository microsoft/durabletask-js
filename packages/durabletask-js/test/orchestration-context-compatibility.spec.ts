// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationContext } from "../src/task/context/orchestration-context";

class ExistingOrchestrationContext extends OrchestrationContext {
  readonly name = "existing-orchestrator";
  readonly instanceId = "existing-instance";
  readonly parent = undefined;
  readonly currentUtcDateTime = new Date("2026-01-01T00:00:00Z");
  readonly isReplaying = false;
  readonly version = "";

  get entities(): OrchestrationContext["entities"] {
    throw new Error("Entity operations are not implemented by this test context.");
  }

  createTimer: OrchestrationContext["createTimer"] = jest.fn();
  callActivity: OrchestrationContext["callActivity"] = jest.fn();
  callSubOrchestrator: OrchestrationContext["callSubOrchestrator"] = jest.fn();
  waitForExternalEvent: OrchestrationContext["waitForExternalEvent"] = jest.fn();
  continueAsNew: OrchestrationContext["continueAsNew"] = jest.fn();
  setCustomStatus: OrchestrationContext["setCustomStatus"] = jest.fn();
  sendEvent: OrchestrationContext["sendEvent"] = jest.fn();
  newGuid: OrchestrationContext["newGuid"] = jest.fn();
}

describe("OrchestrationContext subclass compatibility", () => {
  it("allows a concrete subclass without a sourceInstanceId implementation", () => {
    const context: OrchestrationContext = new ExistingOrchestrationContext();

    expect(context.sourceInstanceId).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(ExistingOrchestrationContext.prototype, "sourceInstanceId")).toBeUndefined();
    expect(Reflect.set(context, "sourceInstanceId", "changed")).toBe(false);
  });
});
