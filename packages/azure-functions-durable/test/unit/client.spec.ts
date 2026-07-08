// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HttpRequest } from "@azure/functions";
import { PurgeInstanceCriteria, TaskHubGrpcClient } from "@microsoft/durabletask-js";
import { DurableFunctionsClient, getGrpcHostAddress } from "../../src/client";
import { createAzureFunctionsMetadataGenerator } from "../../src/metadata";
import { OrchestrationRuntimeStatus } from "../../src/orchestration-status";

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
      expect(typeof client.raiseEvent).toBe("function");
      expect(typeof client.terminate).toBe("function");
      expect(typeof client.suspend).toBe("function");
      expect(typeof client.resume).toBe("function");
      expect(typeof client.rewind).toBe("function");
      expect(typeof client.restart).toBe("function");
      expect(typeof client.purgeInstanceHistoryBy).toBe("function");
      expect(Object.getOwnPropertyNames(DurableFunctionsClient.prototype).sort()).toEqual([
        "collectStatuses",
        "constructor",
        "createCheckStatusResponse",
        "createHttpManagementPayload",
        "getStatus",
        "getStatusAll",
        "getStatusBy",
        "purgeInstanceHistory",
        "purgeInstanceHistoryBy",
        "raiseEvent",
        "readEntityState",
        "restart",
        "resume",
        "rewind",
        "startNew",
        "suspend",
        "terminate",
        "waitForCompletionOrCreateCheckStatusResponse",
      ]);
    } finally {
      await client.stop();
    }
  });

  it("forwards classic Durable Functions v3 lifecycle aliases to the core methods", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);

    try {
      const raise = jest.spyOn(client, "raiseOrchestrationEvent").mockResolvedValue(undefined);
      await client.raiseEvent("id-1", "evt", { a: 1 });
      expect(raise).toHaveBeenCalledWith("id-1", "evt", { a: 1 });

      const terminate = jest.spyOn(client, "terminateOrchestration").mockResolvedValue(undefined);
      await client.terminate("id-1", "cancelled");
      expect(terminate).toHaveBeenCalledWith("id-1", "cancelled");

      const suspend = jest.spyOn(client, "suspendOrchestration").mockResolvedValue(undefined);
      await client.suspend("id-1", "ignored-reason");
      expect(suspend).toHaveBeenCalledWith("id-1");

      const resume = jest.spyOn(client, "resumeOrchestration").mockResolvedValue(undefined);
      await client.resume("id-1", "ignored-reason");
      expect(resume).toHaveBeenCalledWith("id-1");

      const rewind = jest.spyOn(client, "rewindInstance").mockResolvedValue(undefined);
      await client.rewind("id-1", "retrying");
      expect(rewind).toHaveBeenCalledWith("id-1", "retrying");

      const restart = jest.spyOn(client, "restartOrchestration").mockResolvedValue("id-2");
      await expect(client.restart("id-1", true)).resolves.toBe("id-2");
      expect(restart).toHaveBeenCalledWith("id-1", true);

      const purge = jest.spyOn(client, "purgeOrchestration").mockResolvedValue(undefined);
      const purgeResult = await client.purgeInstanceHistoryBy(
        new Date("2020-01-01T00:00:00.000Z"),
        new Date("2020-02-01T00:00:00.000Z"),
        [OrchestrationRuntimeStatus.Completed],
      );
      expect(purgeResult.instancesDeleted).toBe(0);
      expect(purge).toHaveBeenCalledTimes(1);
      const criteria = purge.mock.calls[0][0] as PurgeInstanceCriteria;
      expect(criteria.getCreatedTimeFrom()).toEqual(new Date("2020-01-01T00:00:00.000Z"));
      expect(criteria.getCreatedTimeTo()).toEqual(new Date("2020-02-01T00:00:00.000Z"));
      expect(criteria.getRuntimeStatusList()).toHaveLength(1);
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

  it("creates HTTP management payload URLs from baseUrl for the classic v3 single-argument call", async () => {
    const client = new DurableFunctionsClient({
      ...CLIENT_CONFIG,
      baseUrl: "https://public.example/runtime/webhooks/durabletask/",
    });

    try {
      const payload = client.createHttpManagementPayload("instance 1");

      expect(payload.id).toBe("instance 1");
      expect(payload.statusQueryGetUri).toBe(
        "https://public.example/runtime/webhooks/durabletask/instances/instance%201?code=secret&taskHub=functions-taskhub",
      );
      expect(payload.terminatePostUri).toBe(
        "https://public.example/runtime/webhooks/durabletask/instances/instance%201/terminate?reason={text}&code=secret&taskHub=functions-taskhub",
      );
    } finally {
      await client.stop();
    }
  });

  it("throws when createHttpManagementPayload is called without an instance id", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    const request = new HttpRequest({
      method: "POST",
      url: "https://public.example/api/start",
    });

    try {
      expect(() =>
        (client.createHttpManagementPayload as unknown as (request: HttpRequest) => unknown)(
          request,
        ),
      ).toThrow(TypeError);
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
    const metadata = await createAzureFunctionsMetadataGenerator("functions-taskhub")();

    expect(metadata.get("taskhub")).toEqual(["functions-taskhub"]);
    expect(metadata.get("x-user-agent")[0]).toMatch(/^durable-functions\//);
    expect(metadata.get("requiredQueryStringParameters")).toEqual([]);
  });
});
