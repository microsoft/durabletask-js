// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "events";
import { NoOpLogger, OrchestrationAlreadyExistsError, PayloadStore, TaskHubGrpcClient } from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import * as lp from "../src/proto/large_payload_purge_pb";
import { LargePayloadPurgeService, ILargePayloadPurgeServer } from "../src/proto/large_payload_purge_grpc_pb";
import { BlobPurgeConstants } from "../src/payloads/purge";

describe("large payload auto-purge lifecycle transport", () => {
  let server: grpc.Server;
  let client: TaskHubGrpcClient;
  let calls: string[];
  let start: pb.CreateInstanceRequest | undefined;
  let event: pb.RaiseEventRequest | undefined;
  let startId: string;
  let stateName: string;
  let status: pb.OrchestrationStatus;
  let collision: boolean;
  let hostAddress: string;
  let rpcError: grpc.status | undefined;

  beforeEach(async () => {
    calls = [];
    start = undefined;
    event = undefined;
    startId = BlobPurgeConstants.instanceId;
    stateName = BlobPurgeConstants.orchestrator;
    status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
    collision = false;
    rpcError = undefined;
    server = new grpc.Server();
    const sidecar = {
      startInstance: (call, callback) => {
        calls.push("start");
        expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
        start = call.request;
        if (collision) callback({ code: grpc.status.ALREADY_EXISTS, message: "exists" });
        else callback(null, new pb.CreateInstanceResponse().setInstanceid(startId));
      },
      waitForInstanceStart: (call, callback) => {
        calls.push("wait");
        expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
        callback(
          null,
          new pb.GetInstanceResponse()
            .setExists(true)
            .setOrchestrationstate(
              new pb.OrchestrationState()
                .setInstanceid(BlobPurgeConstants.instanceId)
                .setName(stateName)
                .setOrchestrationstatus(status),
            ),
        );
      },
      raiseEvent: (call, callback) => {
        calls.push("event");
        event = call.request;
        expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
        callback(null, new pb.RaiseEventResponse());
      },
    } satisfies Pick<stubs.ITaskHubSidecarServiceServer, "startInstance" | "waitForInstanceStart" | "raiseEvent">;
    server.addService(stubs.TaskHubSidecarServiceService, sidecar);
    const purge = {
      setLargePayloadAutoPurge: (call, callback) => {
        calls.push(`setting:${call.request.getEnabled()}`);
        expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
        callback(null, new lp.SetLargePayloadAutoPurgeResponse());
      },
      getLargePayloadTombstones: (call, callback) => {
        calls.push("fetch");
        expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
        expect(Number(call.getDeadline()) - Date.now()).toBeLessThanOrEqual(61000);
        if (rpcError !== undefined) callback({ code: rpcError, message: "backend" });
        else
          callback(
            null,
            new lp.GetLargePayloadTombstonesResponse().setTombstonesList([
              new lp.LargePayloadTombstone()
                .setTombstoneToken("opaque:\u00e9:do-not-parse")
                .setPayloadToken("blob:v2:https://a.invalid/c/b"),
            ]),
          );
      },
      reportLargePayloadPurgeResults: (call, callback) => {
        calls.push("report");
        expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
        expect(Number(call.getDeadline()) - Date.now()).toBeLessThanOrEqual(61000);
        expect(call.request.getResultsList()[0].getTombstoneToken()).toBe("opaque:\u00e9:do-not-parse");
        callback(null, new lp.ReportLargePayloadPurgeResultsResponse());
      },
    } satisfies ILargePayloadPurgeServer;
    server.addService(LargePayloadPurgeService, purge);
    const port = await new Promise<number>((resolve, reject) =>
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, port) =>
        error ? reject(error) : resolve(port),
      ),
    );
    hostAddress = `127.0.0.1:${port}`;
    client = new TaskHubGrpcClient({
      hostAddress,
      defaultVersion: "business",
      metadataGenerator: async () => {
        const metadata = new grpc.Metadata();
        metadata.set("taskhub", "payload-test");
        return metadata;
      },
    });
  });
  afterEach(async () => {
    await client.stop();
    server.forceShutdown();
  });

  it("writes setting first, schedules unversioned singleton, verifies start and sends configuration", async () => {
    await client.setLargePayloadAutoPurge(true, 500);
    expect(calls).toEqual(["setting:true", "start", "wait", "event"]);
    expect(start!.getInstanceid()).toBe(BlobPurgeConstants.instanceId);
    expect(start!.getName()).toBe(BlobPurgeConstants.orchestrator);
    expect(start!.getVersion()?.getValue() ?? "").toBe("");
    expect(JSON.parse(start!.getInput()!.getValue())).toEqual({ PurgeBatchSize: 500, PurgedCount: 0 });
    expect(start!.getOrchestrationidreusepolicy()!.getReplaceablestatusList()).toEqual([
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED,
    ]);
    expect(event!.getName()).toBe("SetBatchSize");
    expect(event!.getInput()!.getValue()).toBe("500");
  });

  it("disables without validating batch, starting, waiting, or signaling", async () => {
    await client.setLargePayloadAutoPurge(false, NaN);
    expect(calls).toEqual(["setting:false"]);
  });

  it.each([0, 1001, NaN, 1.5])("rejects invalid enabling batch %s before mutating the backend", async (batch) => {
    await expect(client.setLargePayloadAutoPurge(true, batch)).rejects.toThrow(RangeError);
    expect(calls).toEqual([]);
  });

  it("rejects an unexpected backend start ID without waiting or signaling", async () => {
    startId = "different";
    await expect(client.setLargePayloadAutoPurge(true)).rejects.toThrow("unexpected");
    expect(calls).toEqual(["setting:true", "start"]);
  });

  it("accepts a deduplicated start only after verifying identity and Running status", async () => {
    collision = true;
    await client.setLargePayloadAutoPurge(true);
    expect(calls).toEqual(["setting:true", "start", "wait", "event"]);
  });

  it.each(["wrong-name", "suspended"])("does not configure a %s reserved-ID collision", async (kind) => {
    collision = true;
    if (kind === "wrong-name") stateName = "business";
    else status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED;
    await expect(client.setLargePayloadAutoPurge(true)).rejects.toThrow();
    expect(calls).toEqual(["setting:true", "start", "wait"]);
  });
});

class RunnerPayloadStore extends PayloadStore {
  upload = jest.fn(async (_value: string, _signal?: AbortSignal) => "payload:runner");
  async download(): Promise<string> {
    throw new Error("Runner responses contain no payload references");
  }
  isKnownPayloadToken(value: string): boolean {
    return value.startsWith("payload:");
  }
}

function runnerRpcError(code: grpc.status): grpc.ServiceError {
  return Object.assign(new Error("runner RPC failed"), {
    code,
    details: "runner RPC failed",
    metadata: new grpc.Metadata(),
  });
}

function duplicateError(kind: "grpc" | "semantic"): Error {
  return Object.freeze(
    kind === "grpc"
      ? runnerRpcError(grpc.status.ALREADY_EXISTS)
      : new OrchestrationAlreadyExistsError("dependency duplicate"),
  );
}

describe("auto-purge runner RPC error boundary", () => {
  let client: TaskHubGrpcClient;
  let store: RunnerPayloadStore;
  let calls: string[];
  const metadataGenerator = jest.fn<Promise<grpc.Metadata>, []>();
  const call: grpc.ClientUnaryCall = Object.assign(new EventEmitter(), {
    cancel: jest.fn(),
    getPeer: () => "test",
    getAuthContext: () => null,
  });
  const start = jest.fn<
    grpc.ClientUnaryCall,
    [
      pb.CreateInstanceRequest,
      grpc.Metadata,
      (error: grpc.ServiceError | null, response: pb.CreateInstanceResponse) => void,
    ]
  >();

  beforeEach(() => {
    calls = [];
    store = new RunnerPayloadStore();
    metadataGenerator.mockReset().mockResolvedValue(new grpc.Metadata());
    client = new TaskHubGrpcClient({
      payloads: { store, thresholdBytes: 1 },
      metadataGenerator,
      logger: new NoOpLogger(),
    });
    Object.defineProperty(client["_stub"], "makeUnaryRequest", {
      value: (
        path: string,
        _serialize: (request: lp.SetLargePayloadAutoPurgeRequest) => Buffer,
        _deserialize: (buffer: Buffer) => lp.SetLargePayloadAutoPurgeResponse,
        _request: lp.SetLargePayloadAutoPurgeRequest,
        _metadata: grpc.Metadata,
        _options: grpc.CallOptions,
        callback: (error: grpc.ServiceError | null, response: lp.SetLargePayloadAutoPurgeResponse) => void,
      ) => {
        expect(path).toBe(LargePayloadPurgeService.setLargePayloadAutoPurge.path);
        calls.push("setting");
        callback(null, new lp.SetLargePayloadAutoPurgeResponse());
        return call;
      },
    });
    start.mockReset().mockImplementation((_request, _metadata, callback) => {
      calls.push("start");
      callback(null, new pb.CreateInstanceResponse().setInstanceid(BlobPurgeConstants.instanceId));
      return call;
    });
    Object.defineProperty(client["_stub"], "startInstance", { value: start });
    Object.defineProperty(client["_stub"], "waitForInstanceStart", {
      value: (
        _request: pb.GetInstanceRequest,
        _metadata: grpc.Metadata,
        callback: (error: grpc.ServiceError | null, response: pb.GetInstanceResponse) => void,
      ) => {
        calls.push("wait");
        callback(
          null,
          new pb.GetInstanceResponse()
            .setExists(true)
            .setOrchestrationstate(
              new pb.OrchestrationState()
                .setInstanceid(BlobPurgeConstants.instanceId)
                .setName(BlobPurgeConstants.orchestrator)
                .setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING),
            ),
        );
        return call;
      },
    });
    Object.defineProperty(client["_stub"], "raiseEvent", {
      value: (
        _request: pb.RaiseEventRequest,
        _metadata: grpc.Metadata,
        callback: (error: grpc.ServiceError | null, response: pb.RaiseEventResponse) => void,
      ) => {
        calls.push("event");
        callback(null, new pb.RaiseEventResponse());
        return call;
      },
    });
  });

  afterEach(() => {
    client["_stub"].close();
  });

  it.each(["grpc", "semantic"] as const)("preserves a %s upload error after updating the setting", async (kind) => {
    const failure = duplicateError(kind);
    store.upload.mockRejectedValue(failure);

    await expect(client.setLargePayloadAutoPurge(true)).rejects.toBe(failure);
    expect(calls).toEqual(["setting"]);
    expect(store.upload).toHaveBeenCalledTimes(1);
    expect(metadataGenerator).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it.each(["grpc", "semantic"] as const)(
    "preserves a %s runner-start metadata error after the setting",
    async (kind) => {
      const failure = duplicateError(kind);
      metadataGenerator.mockResolvedValueOnce(new grpc.Metadata()).mockRejectedValueOnce(failure);

      await expect(client.setLargePayloadAutoPurge(true)).rejects.toBe(failure);
      expect(calls).toEqual(["setting"]);
      expect(store.upload).toHaveBeenCalledTimes(1);
      expect(metadataGenerator).toHaveBeenCalledTimes(2);
      expect(start).not.toHaveBeenCalled();
    },
  );

  it("deduplicates only an actual runner-start RPC before verifying and configuring once", async () => {
    start.mockImplementation((_request, _metadata, callback) => {
      calls.push("start");
      callback(runnerRpcError(grpc.status.ALREADY_EXISTS), new pb.CreateInstanceResponse());
      return call;
    });

    await client.setLargePayloadAutoPurge(true);
    expect(calls).toEqual(["setting", "start", "wait", "event"]);
    expect(start).toHaveBeenCalledTimes(1);
    expect(metadataGenerator).toHaveBeenCalledTimes(4);
  });

  it("preserves other runner-start RPC errors without verification or configuration", async () => {
    const failure = Object.freeze(runnerRpcError(grpc.status.UNAVAILABLE));
    start.mockImplementation((_request, _metadata, callback) => {
      calls.push("start");
      callback(failure, new pb.CreateInstanceResponse());
      return call;
    });

    await expect(client.setLargePayloadAutoPurge(true)).rejects.toBe(failure);
    expect(calls).toEqual(["setting", "start"]);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it.each(["grpc", "semantic"] as const)(
    "preserves a %s-shaped cancellation instead of configuring a runner",
    async (kind) => {
      const controller = new AbortController();
      const reason = duplicateError(kind);
      start.mockImplementation((_request, _metadata, callback) => {
        calls.push("start");
        controller.abort(reason);
        callback(runnerRpcError(grpc.status.ALREADY_EXISTS), new pb.CreateInstanceResponse());
        return call;
      });

      await expect(client.setLargePayloadAutoPurge(true, 500, controller.signal)).rejects.toBe(reason);
      expect(calls).toEqual(["setting", "start"]);
      expect(metadataGenerator).toHaveBeenCalledTimes(2);
    },
  );
});
