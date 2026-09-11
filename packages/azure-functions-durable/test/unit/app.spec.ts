// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GenericFunctionOptions, InvocationContext, app as azFuncApp } from "@azure/functions";
import { OrchestrationContext } from "@microsoft/durabletask-js";
import * as app from "../../src/app";
import { DurableFunctionsWorker } from "../../src/worker";
import * as pb from "../../../durabletask-js/src/proto/orchestrator_service_pb";
import * as ph from "../../../durabletask-js/src/utils/pb-helper.util";

describe("app registration", () => {
  it("exposes startup configuration for the shared worker's durable timer policy", () => {
    expect(app).toHaveProperty("setup", expect.any(Function));
  });

  it.each([undefined, null, 86400000])(
    "uses policy %s for the normal app registration path",
    async (maximumTimerIntervalMs) => {
      await jest.isolateModulesAsync(async () => {
        const isolatedApp = await import("../../src/app");
        const { app: isolatedAzureApp } = await import("@azure/functions");
        const register = jest.spyOn(isolatedAzureApp, "generic").mockImplementation(() => undefined);
        const start = new Date("2026-01-01T00:00:00Z");
        const day = 86400000;
        try {
          if (maximumTimerIntervalMs !== undefined) isolatedApp.setup({ maximumTimerIntervalMs });
          isolatedApp.orchestration("configured-timer", async function* (ctx: OrchestrationContext) {
            yield ctx.createTimer((30 * day) / 1000);
          });
          const request = new pb.OrchestratorRequest();
          request.setInstanceid("instance");
          request.setNeweventsList([
            ph.newOrchestratorStartedEvent(start),
            ph.newExecutionStartedEvent("configured-timer", "instance"),
          ]);
          const handler = register.mock.calls[0][1].handler;
          const encodedResponse = await handler(
            Buffer.from(request.serializeBinary()).toString("base64"),
            {} as InvocationContext,
          );
          const actions = pb.OrchestratorResponse.deserializeBinary(
            Buffer.from(encodedResponse as string, "base64"),
          ).getActionsList();
          expect(actions).toHaveLength(1);
          const expectedInterval =
            maximumTimerIntervalMs === undefined ? 3 * day : maximumTimerIntervalMs === null ? 30 * day : day;
          expect(actions[0].getCreatetimer()?.getFireat()?.toDate()).toEqual(
            new Date(start.getTime() + expectedInterval),
          );
          expect(() => isolatedApp.setup({ maximumTimerIntervalMs: null })).toThrow("must precede");
        } finally {
          register.mockRestore();
        }
      });
    },
  );

  it("rejects invalid setup before initializing the shared worker", async () => {
    await jest.isolateModulesAsync(async () => {
      const isolatedApp = await import("../../src/app");
      expect(() => isolatedApp.setup({ maximumTimerIntervalMs: 0 })).toThrow("maximumTimerIntervalMs");
      expect(() => isolatedApp.setup({ maximumTimerIntervalMs: null })).not.toThrow();
    });
  });

  let genericSpy: jest.SpyInstance;

  beforeEach(() => {
    genericSpy = jest.spyOn(azFuncApp, "generic").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function lastRegistration(): { name: string; options: GenericFunctionOptions } {
    const call = genericSpy.mock.calls[genericSpy.mock.calls.length - 1];
    return { name: call[0] as string, options: call[1] as GenericFunctionOptions };
  }

  it("registers an orchestration whose trigger opts in to gRPC and whose handler forwards base64", async () => {
    const handleSpy = jest
      .spyOn(DurableFunctionsWorker.prototype, "handleOrchestratorRequest")
      .mockResolvedValue("encoded-orchestrator-response");

    app.orchestration("orchestration-test", () => undefined);

    const { name, options } = lastRegistration();
    expect(name).toBe("orchestration-test");
    expect(options.trigger.type).toBe("orchestrationTrigger");
    expect(options.trigger.durableRequiresGrpc).toBe(true);

    const result = await options.handler("base64-orchestrator-request", {} as InvocationContext);

    expect(result).toBe("encoded-orchestrator-response");
    expect(handleSpy).toHaveBeenCalledWith("base64-orchestrator-request");
  });

  it("registers an entity whose trigger opts in to gRPC and whose handler forwards base64", async () => {
    const handleSpy = jest
      .spyOn(DurableFunctionsWorker.prototype, "handleEntityBatchRequest")
      .mockResolvedValue("encoded-entity-response");

    app.entity("entity-test", () => ({}) as never);

    const { name, options } = lastRegistration();
    expect(name).toBe("entity-test");
    expect(options.trigger.type).toBe("entityTrigger");
    expect(options.trigger.durableRequiresGrpc).toBe(true);

    const result = await options.handler("base64-entity-request", {} as InvocationContext);

    expect(result).toBe("encoded-entity-response");
    expect(handleSpy).toHaveBeenCalledWith("base64-entity-request");
  });

  it("registers an activity as a plain pass-through handler that still opts in to gRPC", async () => {
    const userHandler = jest.fn().mockResolvedValue("activity-result");

    app.activity("activity-test", userHandler);

    const { name, options } = lastRegistration();
    expect(name).toBe("activity-test");
    expect(options.trigger.type).toBe("activityTrigger");
    expect(options.trigger.durableRequiresGrpc).toBe(true);
    expect(options.handler).toBe(userHandler);
  });

  it("throws when a durable trigger delivers no base64 request body", async () => {
    jest
      .spyOn(DurableFunctionsWorker.prototype, "handleOrchestratorRequest")
      .mockResolvedValue("unused");

    app.orchestration("orchestration-missing-body", {
      handler: () => undefined,
    });

    const { options } = lastRegistration();

    await expect(options.handler(undefined, {} as InvocationContext)).rejects.toThrow(TypeError);
  });
});
