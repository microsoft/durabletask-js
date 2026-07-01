// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HttpRequest } from "@azure/functions";
import { TaskHubGrpcClient } from "@microsoft/durabletask-js";
import { DurableFunctionsClient, getGrpcHostAddress } from "../../src/client";
import { createAzureFunctionsMetadataGenerator } from "../../src/metadata";

const CLIENT_CONFIG = {
  taskHubName: "functions-taskhub",
  rpcBaseUrl: "http://127.0.0.1:4711/rpc",
  requiredQueryStringParameters: "code=secret&taskHub=functions-taskhub",
  httpBaseUrl: "https://ignored.example/runtime/webhooks/durabletask",
};

describe("DurableFunctionsClient", () => {
  it("derives the gRPC host address from rpcBaseUrl", () => {
    expect(getGrpcHostAddress("http://127.0.0.1:4711/rpc")).toBe("127.0.0.1:4711");
    expect(getGrpcHostAddress("https://localhost:9443")).toBe("localhost:9443");
  });

  it("extends TaskHubGrpcClient and does not redeclare management methods", async () => {
    const client = new DurableFunctionsClient(JSON.stringify(CLIENT_CONFIG));

    try {
      expect(client).toBeInstanceOf(TaskHubGrpcClient);
      expect(typeof client.scheduleNewOrchestration).toBe("function");
      expect(typeof client.getOrchestrationState).toBe("function");
      expect(typeof client.raiseOrchestrationEvent).toBe("function");
      expect(typeof client.terminateOrchestration).toBe("function");
      expect(typeof client.suspendOrchestration).toBe("function");
      expect(typeof client.resumeOrchestration).toBe("function");
      expect(typeof client.purgeOrchestration).toBe("function");
      expect(typeof client.signalEntity).toBe("function");
      expect(typeof client.getEntity).toBe("function");
      expect(Object.getOwnPropertyNames(DurableFunctionsClient.prototype).sort()).toEqual([
        "constructor",
        "createCheckStatusResponse",
        "createHttpManagementPayload",
      ]);
    } finally {
      await client.stop();
    }
  });

  it("creates HTTP management payload URLs from the incoming request", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    const request = new HttpRequest({
      method: "POST",
      url: "https://public.example/api/start?ignored=true",
    });

    try {
      const payload = client.createHttpManagementPayload(request, "instance 1");

      expect(payload).toEqual({
        id: "instance 1",
        purgeHistoryDeleteUri:
          "https://public.example/runtime/webhooks/durabletask/instances/instance%201?code=secret&taskHub=functions-taskhub",
        restartPostUri:
          "https://public.example/runtime/webhooks/durabletask/instances/instance%201/restart?code=secret&taskHub=functions-taskhub",
        rewindPostUri:
          "https://public.example/runtime/webhooks/durabletask/instances/instance%201/rewind?reason={text}&code=secret&taskHub=functions-taskhub",
        sendEventPostUri:
          "https://public.example/runtime/webhooks/durabletask/instances/instance%201/raiseEvent/{eventName}?code=secret&taskHub=functions-taskhub",
        statusQueryGetUri:
          "https://public.example/runtime/webhooks/durabletask/instances/instance%201?code=secret&taskHub=functions-taskhub",
        terminatePostUri:
          "https://public.example/runtime/webhooks/durabletask/instances/instance%201/terminate?reason={text}&code=secret&taskHub=functions-taskhub",
        resumePostUri:
          "https://public.example/runtime/webhooks/durabletask/instances/instance%201/resume?reason={text}&code=secret&taskHub=functions-taskhub",
        suspendPostUri:
          "https://public.example/runtime/webhooks/durabletask/instances/instance%201/suspend?reason={text}&code=secret&taskHub=functions-taskhub",
      });
    } finally {
      await client.stop();
    }
  });

  it("creates 202 check status responses with Location and JSON body", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    const request = new HttpRequest({
      method: "POST",
      url: "http://localhost:7071/api/orchestrators/hello",
    });

    try {
      const response = client.createCheckStatusResponse(request, "abc");

      expect(response.status).toBe(202);
      expect(response.headers.get("content-type")).toBe("application/json");
      expect(response.headers.get("Location")).toBe(
        "http://localhost:7071/runtime/webhooks/durabletask/instances/abc?code=secret&taskHub=functions-taskhub",
      );
      const body = JSON.parse(await response.text());
      expect(body.statusQueryGetUri).toBe(
        "http://localhost:7071/runtime/webhooks/durabletask/instances/abc?code=secret&taskHub=functions-taskhub",
      );
    } finally {
      await client.stop();
    }
  });

  it("mirrors the Azure Functions gRPC metadata interceptor", async () => {
    const metadata = await createAzureFunctionsMetadataGenerator(
      "functions-taskhub",
      "code=secret",
    )();

    expect(metadata.get("taskhub")).toEqual(["functions-taskhub"]);
    expect(metadata.get("x-user-agent")[0]).toMatch(/^durable-functions\//);
    expect(metadata.get("requiredQueryStringParameters")).toEqual([]);
  });
});
