// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from "@azure/functions";
import { TaskHubGrpcClient } from "@microsoft/durabletask-js";
import { DurableFunctionsClient } from "../../src/client";
import { getClient } from "../../src/get-client";
import * as input from "../../src/input";

const CLIENT_CONFIG = {
  taskHubName: "functions-taskhub",
  rpcBaseUrl: "http://127.0.0.1:4711/rpc",
  requiredQueryStringParameters: "code=secret&taskHub=functions-taskhub",
};

describe("getClient", () => {
  it("builds a DurableFunctionsClient from the durableClient binding value", async () => {
    const clientInput = input.durableClient();
    const context = new InvocationContext({ options: { extraInputs: [clientInput] } });
    context.extraInputs.set(clientInput, JSON.stringify(CLIENT_CONFIG));

    const client = getClient(context);

    try {
      expect(client).toBeInstanceOf(DurableFunctionsClient);
      expect(client).toBeInstanceOf(TaskHubGrpcClient);
      expect(client.taskHubName).toBe("functions-taskhub");
    } finally {
      await client.stop();
    }
  });

  it("accepts an already-parsed binding object", async () => {
    const clientInput = input.durableClient();
    const context = new InvocationContext({ options: { extraInputs: [clientInput] } });
    // Distinct taskHubName so this test's cache key does not collide with the string-shape test above
    // (both would otherwise JSON-serialize to the same key and reuse that test's stopped client).
    context.extraInputs.set(clientInput, { ...CLIENT_CONFIG, taskHubName: "functions-taskhub-object" });

    const client = getClient(context);

    try {
      expect(client).toBeInstanceOf(DurableFunctionsClient);
      expect(client.taskHubName).toBe("functions-taskhub-object");
    } finally {
      await client.stop();
    }
  });

  it("reuses one cached client per binding config and builds a new one for a different config", async () => {
    const clientInput = input.durableClient();
    const context = new InvocationContext({ options: { extraInputs: [clientInput] } });
    context.extraInputs.set(clientInput, JSON.stringify({ ...CLIENT_CONFIG, taskHubName: "functions-taskhub-cache" }));

    const first = getClient(context);
    const second = getClient(context);
    // Same binding config -> same cached client (its underlying gRPC channel is reused across invocations).
    expect(second).toBe(first);

    const otherInput = input.durableClient();
    const otherContext = new InvocationContext({ options: { extraInputs: [otherInput] } });
    otherContext.extraInputs.set(
      otherInput,
      JSON.stringify({ ...CLIENT_CONFIG, taskHubName: "functions-taskhub-cache-other" }),
    );
    const other = getClient(otherContext);
    // Different binding config -> distinct client.
    expect(other).not.toBe(first);

    try {
      expect(first).toBeInstanceOf(DurableFunctionsClient);
    } finally {
      await first.stop();
      await other.stop();
    }
  });

  it("throws when no durable client input binding is registered", () => {
    const context = new InvocationContext({ options: { extraInputs: [] } });

    expect(() => getClient(context)).toThrow(/durable client input binding/i);
  });

  it("throws when the binding value is not a valid client input", () => {
    const clientInput = input.durableClient();
    const context = new InvocationContext({ options: { extraInputs: [clientInput] } });
    context.extraInputs.set(clientInput, 42);

    expect(() => getClient(context)).toThrow(/not a valid durable client input/i);
  });
});
