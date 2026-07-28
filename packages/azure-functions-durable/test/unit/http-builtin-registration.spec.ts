// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BUILTIN_HTTP_ACTIVITY_NAME, BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME } from "../../src/http/builtin";

// The built-in durable-HTTP functions are auto-registered as a side effect of importing `../../src/app`.
// `jest.doMock` (not hoisted) lets us install a fresh `app.generic` spy BEFORE the module is required
// inside `jest.isolateModules`, so the import-time registration calls are captured deterministically.
describe("built-in durable HTTP auto-registration", () => {
  it("registers both built-in functions when the app module is imported", () => {
    const mockGeneric = jest.fn();

    jest.isolateModules(() => {
      jest.doMock("@azure/functions", () => {
        const actual = jest.requireActual("@azure/functions");
        return { ...actual, app: { ...actual.app, generic: mockGeneric } };
      });
      require("../../src/app");
    });

    const registeredNames = mockGeneric.mock.calls.map((call) => call[0] as string);
    expect(registeredNames).toContain(BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME);
    expect(registeredNames).toContain(BUILTIN_HTTP_ACTIVITY_NAME);

    const pollRegistration = mockGeneric.mock.calls.find(
      (call) => call[0] === BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME,
    );
    const activityRegistration = mockGeneric.mock.calls.find((call) => call[0] === BUILTIN_HTTP_ACTIVITY_NAME);

    // The poll orchestrator is wired as a durable orchestration trigger; the HTTP worker as an activity.
    expect((pollRegistration?.[1] as { trigger: { type: string } }).trigger.type).toBe("orchestrationTrigger");
    expect((activityRegistration?.[1] as { trigger: { type: string } }).trigger.type).toBe("activityTrigger");
  });

  it("registers the built-in orchestrator on the shared worker so it can be dispatched by name", () => {
    let registeredOrchestratorNames: string[] = [];

    jest.isolateModules(() => {
      const { getSharedWorker } = require("../../src/app") as typeof import("../../src/app");
      // `_registry` is a TypeScript-private field (accessible at runtime) exposing the registered names.
      const worker = getSharedWorker() as unknown as { _registry: { getOrchestratorNames(): string[] } };
      registeredOrchestratorNames = worker._registry.getOrchestratorNames();
    });

    expect(registeredOrchestratorNames).toContain(BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME);
  });
});
