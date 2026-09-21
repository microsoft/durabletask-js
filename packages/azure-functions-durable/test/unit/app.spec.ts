// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GenericFunctionOptions, InvocationContext, app as azFuncApp } from "@azure/functions";
import { OrchestrationContext } from "@microsoft/durabletask-js";
import * as app from "../../src/app";
import { DurableFunctionsWorker } from "../../src/worker";
import * as pb from "../../../durabletask-js/src/proto/orchestrator_service_pb";
import * as ph from "../../../durabletask-js/src/utils/pb-helper.util";

describe("app registration", () => {
  it("requires no timer setup API", () => {
    expect(app).not.toHaveProperty("setup");
  });

  it("automatically splits long timers in the normal app registration path", async () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const day = 86400000;
    app.orchestration("long-timer", async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer((30 * day) / 1000);
    });
    const request = new pb.OrchestratorRequest();
    request.setInstanceid("instance");
    request.setNeweventsList([
      ph.newOrchestratorStartedEvent(start),
      ph.newExecutionStartedEvent("long-timer", "instance"),
    ]);
    const { options } = lastRegistration();
    const encodedResponse = await options.handler(
      Buffer.from(request.serializeBinary()).toString("base64"),
      {} as InvocationContext,
    );
    const actions = pb.OrchestratorResponse.deserializeBinary(
      Buffer.from(encodedResponse as string, "base64"),
    ).getActionsList();
    expect(actions).toHaveLength(1);
    expect(actions[0].getCreatetimer()?.getFireat()?.toDate()).toEqual(new Date(start.getTime() + 3 * day));
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
