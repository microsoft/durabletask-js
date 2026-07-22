// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  CosmosDBv4FunctionOptions,
  GenericFunctionOptions,
  HttpFunctionOptions,
  HttpRequest,
  InvocationContext,
  TimerFunctionOptions,
  app as azFuncApp,
} from "@azure/functions";
import * as client from "../../src/app-client";
import * as getClientModule from "../../src/get-client";
import * as dfInput from "../../src/input";

describe("app.client registration", () => {
  afterEach(() => jest.restoreAllMocks());

  it("registers an http durable-client function that injects the client", async () => {
    const httpSpy = jest.spyOn(azFuncApp, "http").mockImplementation(() => undefined);
    const fakeClient = { taskHubName: "th" } as never;
    const getClientSpy = jest.spyOn(getClientModule, "getClient").mockReturnValue(fakeClient);
    const userHandler = jest.fn().mockResolvedValue({ status: 202 });

    client.http("startHello", { handler: userHandler });

    const [name, options] = httpSpy.mock.calls[0] as [string, HttpFunctionOptions];
    expect(name).toBe("startHello");
    expect(options.extraInputs?.some((i) => i.type === "durableClient")).toBe(true);

    const ctx = {} as InvocationContext;
    const trigger = { url: "http://localhost" } as unknown as HttpRequest;
    const result = await options.handler(trigger, ctx);
    expect(getClientSpy).toHaveBeenCalledWith(ctx);
    expect(userHandler).toHaveBeenCalledWith(trigger, fakeClient, ctx);
    expect(result).toEqual({ status: 202 });
  });

  it("does not duplicate the durableClient input when one is already present", () => {
    const timerSpy = jest.spyOn(azFuncApp, "timer").mockImplementation(() => undefined);
    jest.spyOn(getClientModule, "getClient").mockReturnValue({} as never);

    client.timer("t", {
      schedule: "0 */5 * * * *",
      extraInputs: [dfInput.durableClient()],
      handler: jest.fn(),
    });

    const [, options] = timerSpy.mock.calls[0] as [string, TimerFunctionOptions];
    const durableInputs = (options.extraInputs ?? []).filter((i) => i.type === "durableClient");
    expect(durableInputs).toHaveLength(1);
  });

  it("registers a generic durable-client function that injects the client", async () => {
    const genericSpy = jest.spyOn(azFuncApp, "generic").mockImplementation(() => undefined);
    const fakeClient = { taskHubName: "th" } as never;
    jest.spyOn(getClientModule, "getClient").mockReturnValue(fakeClient);
    const userHandler = jest.fn().mockResolvedValue("ok");

    client.generic("g", {
      trigger: { type: "customTrigger", name: "req" },
      handler: userHandler,
    });

    const [name, options] = genericSpy.mock.calls[0] as [string, GenericFunctionOptions];
    expect(name).toBe("g");
    expect(options.extraInputs?.some((i) => i.type === "durableClient")).toBe(true);

    const ctx = {} as InvocationContext;
    const result = await options.handler("payload", ctx);
    expect(userHandler).toHaveBeenCalledWith("payload", fakeClient, ctx);
    expect(result).toBe("ok");
  });

  it("registers a cosmosDB durable-client function (v3/v4 union compiles)", () => {
    const cosmosSpy = jest.spyOn(azFuncApp, "cosmosDB").mockImplementation(() => undefined);
    jest.spyOn(getClientModule, "getClient").mockReturnValue({} as never);

    client.cosmosDB("c", {
      connection: "COSMOS",
      databaseName: "db",
      containerName: "items",
      handler: jest.fn(),
    });

    const [name, options] = cosmosSpy.mock.calls[0] as [string, CosmosDBv4FunctionOptions];
    expect(name).toBe("c");
    expect(options.extraInputs?.some((i) => i.type === "durableClient")).toBe(true);
  });
});
