// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EntityInstanceId, OrchestrationState, OrchestrationStatus } from "@microsoft/durabletask-js";
import { HttpRequest } from "@azure/functions";
import { DurableFunctionsClient } from "../../src/client";
import { DurableOrchestrationStatus, OrchestrationRuntimeStatus } from "../../src/orchestration-status";
import { EntityStateResponse } from "../../src/entity-state-response";
import { PurgeHistoryResult } from "../../src/purge-history-result";

const CLIENT_CONFIG = {
  taskHubName: "functions-taskhub",
  rpcBaseUrl: "http://127.0.0.1:4711/rpc",
  requiredQueryStringParameters: "code=secret",
};

function stateOf(instanceId: string, status = OrchestrationStatus.RUNNING): OrchestrationState {
  return new OrchestrationState(
    instanceId,
    "orch",
    status,
    new Date("2026-01-01T00:00:00.000Z"),
    new Date("2026-01-01T00:00:00.000Z"),
  );
}

async function* asyncGen<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

describe("DurableFunctionsClient query methods", () => {
  it("getStatus maps the core state to a DurableOrchestrationStatus", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    try {
      const state = new OrchestrationState(
        "abc",
        "helloOrchestrator",
        OrchestrationStatus.RUNNING,
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-01T00:00:00.000Z"),
        JSON.stringify({ n: 1 }),
      );
      const spy = jest.spyOn(client, "getOrchestrationState").mockResolvedValue(state);

      const status = await client.getStatus("abc");

      expect(spy).toHaveBeenCalledWith("abc", true);
      expect(status).toBeInstanceOf(DurableOrchestrationStatus);
      expect(status?.instanceId).toBe("abc");
      expect(status?.input).toEqual({ n: 1 });
      expect(status?.runtimeStatus).toBe(OrchestrationRuntimeStatus.Running);
    } finally {
      await client.stop();
    }
  });

  it("getStatus throws when the instance does not exist (v3 not-found behavior)", async () => {
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

  it("readEntityState maps present and absent entities", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    const entityId = new EntityInstanceId("Counter", "k1");
    try {
      const getEntity = jest.spyOn(client, "getEntity");

      getEntity.mockResolvedValueOnce({
        id: entityId,
        lastModifiedTime: new Date(),
        backlogQueueSize: 0,
        includesState: true,
        state: 42,
      });
      const present = await client.readEntityState<number>(entityId);
      expect(present).toBeInstanceOf(EntityStateResponse);
      expect(present.entityExists).toBe(true);
      expect(present.entityState).toBe(42);

      getEntity.mockResolvedValueOnce(undefined);
      const absent = await client.readEntityState<number>(entityId);
      expect(absent.entityExists).toBe(false);
      expect(absent.entityState).toBeUndefined();
    } finally {
      await client.stop();
    }
  });

  it("purgeInstanceHistory maps the core purge result", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    try {
      jest.spyOn(client, "purgeOrchestration").mockResolvedValue({ deletedInstanceCount: 1 } as never);

      const result = await client.purgeInstanceHistory("abc");
      expect(result).toBeInstanceOf(PurgeHistoryResult);
      expect(result.instancesDeleted).toBe(1);
    } finally {
      await client.stop();
    }
  });

  it("startNew forwards to scheduleNewOrchestration with input and instanceId", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    try {
      const schedule = jest.spyOn(client, "scheduleNewOrchestration").mockResolvedValue("new-id");

      await client.startNew("hello", { input: { city: "Tokyo" }, instanceId: "id-1" });
      expect(schedule).toHaveBeenCalledWith("hello", { city: "Tokyo" }, { instanceId: "id-1" });

      await client.startNew("hello");
      expect(schedule).toHaveBeenLastCalledWith("hello", undefined, undefined);
    } finally {
      await client.stop();
    }
  });

  it("getStatusAll maps every instance from the paged query", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    try {
      const getAll = jest
        .spyOn(client, "getAllInstances")
        .mockReturnValue(asyncGen([stateOf("a"), stateOf("b")]) as never);

      const all = await client.getStatusAll();
      expect(getAll).toHaveBeenCalledWith({ fetchInputsAndOutputs: true });
      expect(all.map((s) => s.instanceId)).toEqual(["a", "b"]);
      expect(all[0]).toBeInstanceOf(DurableOrchestrationStatus);
    } finally {
      await client.stop();
    }
  });

  it("getStatusBy maps the v3 filter to a core query", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    try {
      const getAll = jest
        .spyOn(client, "getAllInstances")
        .mockReturnValue(asyncGen([stateOf("a", OrchestrationStatus.COMPLETED)]) as never);

      const from = new Date("2026-01-01T00:00:00.000Z");
      const to = new Date("2026-01-02T00:00:00.000Z");
      const result = await client.getStatusBy({
        createdTimeFrom: from,
        createdTimeTo: to,
        runtimeStatus: [OrchestrationRuntimeStatus.Completed],
      });

      expect(getAll).toHaveBeenCalledWith({
        createdFrom: from,
        createdTo: to,
        statuses: [OrchestrationStatus.COMPLETED],
        fetchInputsAndOutputs: true,
      });
      expect(result[0].runtimeStatus).toBe(OrchestrationRuntimeStatus.Completed);
    } finally {
      await client.stop();
    }
  });

  it("waitForCompletionOrCreateCheckStatusResponse returns 200 with output when completed", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    const request = new HttpRequest({ method: "GET", url: "http://localhost:7071/api/x" });
    try {
      const completed = new OrchestrationState(
        "abc",
        "orch",
        OrchestrationStatus.COMPLETED,
        new Date(),
        new Date(),
        undefined,
        JSON.stringify("the-output"),
      );
      jest.spyOn(client, "waitForOrchestrationCompletion").mockResolvedValue(completed);

      const response = await client.waitForCompletionOrCreateCheckStatusResponse(request, "abc");
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(JSON.stringify("the-output"));
    } finally {
      await client.stop();
    }
  });

  it("waitForCompletionOrCreateCheckStatusResponse falls back to 202 on timeout", async () => {
    const client = new DurableFunctionsClient(CLIENT_CONFIG);
    const request = new HttpRequest({ method: "GET", url: "http://localhost:7071/api/x" });
    try {
      jest.spyOn(client, "waitForOrchestrationCompletion").mockRejectedValue(new Error("Timed out"));

      const response = await client.waitForCompletionOrCreateCheckStatusResponse(request, "abc", {
        timeoutInMilliseconds: 1000,
      });
      expect(response.status).toBe(202);
    } finally {
      await client.stop();
    }
  });
});
