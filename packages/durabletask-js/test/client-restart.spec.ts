// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "events";
import { NoOpLogger, RestartOrchestrationOptions, TaskHubGrpcClient } from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";

describe("restartOrchestration", () => {
  let client: TaskHubGrpcClient;
  let restart: jest.Mock;
  let requests: pb.RestartInstanceRequest[];

  beforeEach(() => {
    client = new TaskHubGrpcClient({ defaultVersion: "client-default", logger: new NoOpLogger() });
    requests = [];
    restart = jest.fn((request, _metadata, callback) => {
      const decoded = pb.RestartInstanceRequest.deserializeBinary(request.serializeBinary());
      requests.push(decoded);
      callback(
        null,
        new pb.RestartInstanceResponse().setInstanceid(
          decoded.getNewinstanceid()?.getValue() ??
            (decoded.getRestartwithnewinstanceid() ? "generated-id" : decoded.getInstanceid()),
        ),
      );
      return Object.assign(new EventEmitter(), { cancel: jest.fn() });
    });
    client["_stub"].restartInstance = restart;
  });

  afterEach(() => {
    client["_stub"].close();
  });

  it.each([undefined, false, true])("preserves the legacy boolean request for %s", async (flag) => {
    await expect(client.restartOrchestration("source", flag)).resolves.toBe(flag ? "generated-id" : "source");
    expect(requests[0].getInstanceid()).toBe("source");
    expect(requests[0].getRestartwithnewinstanceid()).toBe(flag ?? false);
    expect(requests[0].hasNewinstanceid()).toBe(false);
    expect(requests[0].hasVersion()).toBe(false);
  });

  it.each([undefined, "", "2.0"])("preserves target and version presence for %s", async (version) => {
    const options: RestartOrchestrationOptions = { newInstanceId: "Source:@Case/retry", version };
    await expect(client.restartOrchestration("source", options)).resolves.toBe(options.newInstanceId);
    expect(requests[0].getInstanceid()).toBe("source");
    expect(requests[0].getRestartwithnewinstanceid()).toBe(true);
    expect(requests[0].getNewinstanceid()?.getValue()).toBe(options.newInstanceId);
    expect(requests[0].hasVersion()).toBe(version !== undefined);
    expect(requests[0].getVersion()?.getValue()).toBe(version);
    expect(options).toEqual({ newInstanceId: "Source:@Case/retry", version });
  });

  it("uses the immediate source when cloning a clone", async () => {
    await client.restartOrchestration("original", { newInstanceId: "clone" });
    await client.restartOrchestration("clone", { newInstanceId: "next-clone" });
    expect(requests.map((req) => [req.getInstanceid(), req.getNewinstanceid()?.getValue()])).toEqual([
      ["original", "clone"],
      ["clone", "next-clone"],
    ]);
  });

  it.each([{}, { newInstanceId: "" }, { newInstanceId: null }, { newInstanceId: 42 }, null])(
    "rejects invalid target options %j without making an RPC",
    async (options) => {
      await expect(client.restartOrchestration("source", options as any)).rejects.toThrow("newInstanceId");
      expect(restart).not.toHaveBeenCalled();
    },
  );

  it.each([null, 42])("rejects an invalid version %j without making an RPC", async (version) => {
    await expect(
      client.restartOrchestration("source", { newInstanceId: "clone", version: version as any }),
    ).rejects.toThrow("version must be a string");
    expect(restart).not.toHaveBeenCalled();
  });

  it("rejects an empty source ID before making an RPC", async () => {
    await expect(client.restartOrchestration("", { newInstanceId: "clone" })).rejects.toThrow("instanceId");
    expect(restart).not.toHaveBeenCalled();
  });

  it("preserves backend failures for explicit-target requests", async () => {
    const error = Object.assign(new Error("missing"), {
      code: grpc.status.NOT_FOUND,
      metadata: new grpc.Metadata(),
      details: "missing",
    });
    restart.mockImplementation((_request, _metadata, callback) => {
      callback(error);
      return Object.assign(new EventEmitter(), { cancel: jest.fn() });
    });
    await expect(client.restartOrchestration("source", { newInstanceId: "clone" })).rejects.toMatchObject({
      message: "An orchestration with the instanceId 'source' was not found.",
      cause: error,
    });
  });
});
