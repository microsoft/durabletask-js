// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { HttpRequest } from "@azure/functions";
import {
  OrchestrationState,
  OrchestrationStatus,
  PurgeInstanceCriteria,
  TaskHubGrpcClient,
} from "@microsoft/durabletask-js";
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
        "getClientResponseLinks",
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
      const purgeResult = await client.purgeInstanceHistoryBy({
        createdTimeFrom: new Date("2020-01-01T00:00:00.000Z"),
        createdTimeTo: new Date("2020-02-01T00:00:00.000Z"),
        runtimeStatus: [OrchestrationRuntimeStatus.Completed],
      });
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

  it("rewind() delegates to core rewindInstance() and no longer throws", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);

    try {
      const rewindInstance = jest.spyOn(client, "rewindInstance").mockResolvedValue(undefined);

      // Regression: previously threw "rewind is not yet supported by durabletask."
      await expect(client.rewind("inst-1", "because")).resolves.toBeUndefined();
      expect(rewindInstance).toHaveBeenCalledWith("inst-1", "because");

      // The optional reason defaults to an empty string when omitted.
      await client.rewind("inst-2");
      expect(rewindInstance).toHaveBeenCalledWith("inst-2", "");
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
        (client.createHttpManagementPayload as unknown as (request: HttpRequest) => unknown)(request),
      ).toThrow(TypeError);
    } finally {
      await client.stop();
    }
  });

  it("exposes getClientResponseLinks as a deprecated alias of createHttpManagementPayload", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    const request = new HttpRequest({
      method: "POST",
      url: "https://public.example/api/start",
    });

    try {
      expect(client.getClientResponseLinks(request, "abc")).toEqual(client.createHttpManagementPayload(request, "abc"));
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

  it("creates a 202 check status response from baseUrl when request is undefined (classic v3)", async () => {
    // Regression: v3's createCheckStatusResponse(request, instanceId) accepted an undefined request
    // and fell back to the client binding's baseUrl. Passing undefined must not throw on request.url.
    const client = new DurableFunctionsClient({
      ...CLIENT_CONFIG,
      baseUrl: "https://public.example/runtime/webhooks/durabletask/",
    });

    try {
      const response = client.createCheckStatusResponse(undefined, "abc");

      expect(response.status).toBe(202);
      expect(response.headers.get("Location")).toBe(
        "https://public.example/runtime/webhooks/durabletask/instances/abc?code=secret&taskHub=functions-taskhub",
      );
      const body = JSON.parse(await response.text());
      expect(body.statusQueryGetUri).toBe(
        "https://public.example/runtime/webhooks/durabletask/instances/abc?code=secret&taskHub=functions-taskhub",
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

  describe("getStatus / startNew (v3 parity)", () => {
    const makeState = () =>
      new OrchestrationState(
        "inst-1",
        "MyOrch",
        OrchestrationStatus.COMPLETED,
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-01T00:00:05.000Z"),
        JSON.stringify("the-input"),
        JSON.stringify("the-output"),
        undefined,
        undefined,
      );

    it("getStatus returns a non-optional DurableOrchestrationStatus and gates only input via showInput", async () => {
      const client = new DurableFunctionsClient(CLIENT_CONFIG);
      try {
        const getState = jest.spyOn(client, "getOrchestrationState").mockResolvedValue(makeState());

        const status = await client.getStatus("inst-1");
        // Payloads are always fetched; showInput only gates the top-level input (v3 keeps output).
        expect(getState).toHaveBeenCalledWith("inst-1", true);
        expect(status.instanceId).toBe("inst-1");
        expect(status.name).toBe("MyOrch");
        expect(status.runtimeStatus).toBe(OrchestrationRuntimeStatus.Completed);
        expect(status.input).toBe("the-input");
        expect(status.output).toBe("the-output");
        expect(status.history).toBeUndefined();

        // showInput: false suppresses only input; output/custom status still come back.
        const suppressed = await client.getStatus("inst-1", { showInput: false });
        expect(getState).toHaveBeenLastCalledWith("inst-1", true);
        expect(suppressed.input).toBeUndefined();
        expect(suppressed.output).toBe("the-output");
      } finally {
        await client.stop();
      }
    });

    it("getStatus throws when the instance does not exist (v3 not-found behavior)", async () => {
      // v3's DurableClient.getStatus returns a non-optional status and throws on the extension's HTTP
      // 404; replicate that instead of returning undefined.
      const client = new DurableFunctionsClient(CLIENT_CONFIG);
      try {
        jest.spyOn(client, "getOrchestrationState").mockResolvedValue(undefined);
        await expect(client.getStatus("missing")).rejects.toThrow(
          /could not find any data associated with the instanceId provided: missing/,
        );
      } finally {
        await client.stop();
      }
    });

    it("getStatus populates history and honors showHistoryOutput", async () => {
      const client = new DurableFunctionsClient(CLIENT_CONFIG);
      try {
        jest.spyOn(client, "getOrchestrationState").mockResolvedValue(makeState());
        const events = [
          { eventId: 1, type: "TaskCompleted", input: "in", result: "out" },
          { eventId: 2, type: "TimerFired" },
        ];
        const getHistory = jest.spyOn(client, "getOrchestrationHistory").mockResolvedValue(events as never);

        // showHistoryOutput: true keeps the input/result payloads on each entry.
        const withOutput = await client.getStatus("inst-1", { showHistory: true, showHistoryOutput: true });
        expect(getHistory).toHaveBeenCalledWith("inst-1");
        expect(withOutput.history).toEqual(events);

        // showHistory without showHistoryOutput strips input/result from each entry.
        const stripped = await client.getStatus("inst-1", { showHistory: true });
        expect(stripped.history).toEqual([
          { eventId: 1, type: "TaskCompleted" },
          { eventId: 2, type: "TimerFired" },
        ]);

        // Without showHistory the core history call is skipped and history stays undefined.
        getHistory.mockClear();
        const status2 = await client.getStatus("inst-1");
        expect(getHistory).not.toHaveBeenCalled();
        expect(status2.history).toBeUndefined();
      } finally {
        await client.stop();
      }
    });

    it("startNew forwards the version option to the core scheduler", async () => {
      const client = new DurableFunctionsClient(CLIENT_CONFIG);
      try {
        const schedule = jest.spyOn(client, "scheduleNewOrchestration").mockResolvedValue("inst-9");

        await client.startNew("MyOrch", { input: { a: 1 }, instanceId: "inst-9", version: "2.0.0" });
        expect(schedule).toHaveBeenCalledWith("MyOrch", { a: 1 }, { instanceId: "inst-9", version: "2.0.0" });

        // version alone (no instanceId) is still forwarded.
        schedule.mockClear();
        await client.startNew("MyOrch", { version: "3.0.0" });
        expect(schedule).toHaveBeenCalledWith("MyOrch", undefined, { instanceId: undefined, version: "3.0.0" });

        // No instanceId/version → no options object (unchanged pre-existing behavior).
        schedule.mockClear();
        await client.startNew("MyOrch", { input: "x" });
        expect(schedule).toHaveBeenCalledWith("MyOrch", "x", undefined);
      } finally {
        await client.stop();
      }
    });
  });
});
