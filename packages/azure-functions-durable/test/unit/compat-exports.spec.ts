// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import type { ActivityHandler, OrchestrationContext, OrchestrationHandler } from "../../src";

describe("v3 compatibility type aliases", () => {
  it("exposes ActivityHandler / OrchestrationHandler / OrchestrationContext", () => {
    const activity: ActivityHandler = (input: unknown) => input;
    const orchestrator: OrchestrationHandler = function* (context: OrchestrationContext) {
      yield context.df.callActivity("noop");
      return context.df.getInput();
    };
    expect(typeof activity).toBe("function");
    expect(typeof orchestrator).toBe("function");
  });
});
