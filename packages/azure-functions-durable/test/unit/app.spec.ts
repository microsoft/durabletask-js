// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GenericFunctionOptions, InvocationContext, app as azFuncApp } from "@azure/functions";
import * as app from "../../src/app";
import { DurableFunctionsWorker } from "../../src/worker";

describe("app registration", () => {
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
