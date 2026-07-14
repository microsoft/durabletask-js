// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import type {
  ActivityHandler,
  DurableClient,
  EntityContext,
  EntityHandler,
  OrchestrationContext,
  OrchestrationHandler,
} from "../../src";
import { TaskFailedError } from "../../src";

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

  it("exposes generic EntityContext<TState> / EntityHandler<TState> and DurableClient", () => {
    // Compile-guard: the generic aliases must accept a type argument (the legacy v3 surface uses
    // e.g. EntityHandler<string>), even though our underlying types are non-generic.
    type _E1 = EntityContext<{ x: number }>;
    type _E2 = EntityHandler<string>;
    const handler: EntityHandler<string> = (context: EntityContext<string>) => {
      context.df.return(0);
    };
    // DurableClient is the type returned by getClient(); assert it's usable as a type annotation.
    const client: DurableClient | undefined = undefined;
    expect(typeof handler).toBe("function");
    expect(client).toBeUndefined();
  });

  it("re-exports the core TaskFailedError as a top-level export for instanceof guards", () => {
    // v3 exposed TaskFailedError so callers could `catch (e) { if (e instanceof TaskFailedError) }`.
    // The core engine throws its own TaskFailedError; this package must re-export the same class.
    expect(typeof TaskFailedError).toBe("function");
    expect(TaskFailedError.prototype).toBeInstanceOf(Error);
  });
});
