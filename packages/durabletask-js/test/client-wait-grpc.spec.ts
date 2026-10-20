// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { TaskHubGrpcClient } from "../src/client/client";
import { PayloadStore } from "../src/payloads/payload-store";
import { TimeoutError } from "../src/exception/timeout-error";
import { NoOpLogger } from "../src/types/logger.type";
import * as pb from "../src/proto/orchestrator_service_pb";
import { TaskHubSidecarServiceService } from "../src/proto/orchestrator_service_grpc_pb";

type WaitCall = grpc.ServerUnaryCall<pb.GetInstanceRequest, pb.GetInstanceResponse>;

class WaitPayloadStore extends PayloadStore {
  upload = jest.fn(async (_value: string, _signal?: AbortSignal) => "payload:output");
  download = jest.fn(async (_token: string, _signal?: AbortSignal) => '"hydrated"');
  isKnownPayloadToken(value: string): boolean {
    return value.startsWith("payload:");
  }
}

function completedResponse(): pb.GetInstanceResponse {
  const state = new pb.OrchestrationState();
  state.setName("grpc-wait");
  state.setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
  state.setOutput(new StringValue().setValue('"recovered"'));
  const response = new pb.GetInstanceResponse();
  response.setExists(true);
  response.setOrchestrationstate(state);
  return response;
}

describe("Client waits over real gRPC", () => {
  const server = new grpc.Server();
  let client: TaskHubGrpcClient;
  let hostAddress: string;
  let handler: grpc.handleUnaryCall<pb.GetInstanceRequest, pb.GetInstanceResponse>;
  let calls: WaitCall[];
  let metadataCalls: number;
  let abortOnStart: (() => void) | undefined;
  let cancellations: number;

  beforeAll(async () => {
    const dispatch: grpc.handleUnaryCall<pb.GetInstanceRequest, pb.GetInstanceResponse> = (call, callback) => {
      calls.push(call);
      handler(call, callback);
    };
    server.addService(TaskHubSidecarServiceService, {
      waitForInstanceStart: dispatch,
      waitForInstanceCompletion: dispatch,
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
        if (error) reject(error);
        else resolve(boundPort);
      });
    });
    hostAddress = `127.0.0.1:${port}`;
    client = new TaskHubGrpcClient({
      hostAddress,
      options: {
        interceptors: [
          (options: grpc.InterceptorOptions, nextCall: grpc.NextCall) =>
            new grpc.InterceptingCall(nextCall(options), {
              start: (metadata, listener, next) => {
                abortOnStart?.();
                next(metadata, listener);
              },
              cancel: (next) => {
                cancellations++;
                next();
              },
            }),
        ],
      },
      logger: new NoOpLogger(),
      metadataGenerator: async () => {
        const metadata = new grpc.Metadata();
        metadata.set("taskhub", "client-wait-grpc");
        metadata.set("attempt", String(++metadataCalls));
        return metadata;
      },
    });
  });

  beforeEach(() => {
    calls = [];
    metadataCalls = 0;
    abortOnStart = undefined;
    cancellations = 0;
  });

  afterAll(async () => {
    await client.stop();
    server.forceShutdown();
  });

  describe.each(["waitForOrchestrationStart", "waitForOrchestrationCompletion"] as const)("%s", (method) => {
    it("cancels a real RPC aborted synchronously inside interceptor.start", async () => {
      const controller = new AbortController();
      const reason = new Error("synchronous interceptor abort");
      abortOnStart = () => controller.abort(reason);
      handler = () => {};
      await expect(client[method]("grpc-instance", true, 1, controller.signal)).rejects.toBe(reason);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(cancellations).toBe(1);
      // Cancellation may prevent dispatch entirely or cancel an already-dispatched call.
      expect(calls.every((call) => call.cancelled)).toBe(true);

      abortOnStart = undefined;
      handler = (_call, callback) => callback(null, completedResponse());
      await expect(client[method]("grpc-instance", true, 5)).resolves.toMatchObject({
        serializedOutput: '"recovered"',
      });
      expect(cancellations).toBe(1);
    });

    it.each(["abort", "timeout"] as const)(
      "cancels the server-observed RPC on %s and permits a subsequent wait",
      async (cause) => {
        let received!: () => void;
        let cancelled!: () => void;
        const receivedPromise = new Promise<void>((resolve) => (received = resolve));
        const cancelledPromise = new Promise<void>((resolve) => (cancelled = resolve));
        handler = (call) => {
          call.once("cancelled", cancelled);
          received();
        };
        const controller = new AbortController();
        const result = client[method]("grpc-instance", true, 0.5, controller.signal);
        const assertion =
          cause === "abort"
            ? expect(result).rejects.toThrow("cancel grpc wait")
            : expect(result).rejects.toBeInstanceOf(TimeoutError);
        await receivedPromise;
        if (cause === "abort") controller.abort(new Error("cancel grpc wait"));
        await assertion;
        await cancelledPromise;
        expect(calls).toHaveLength(1);
        expect(calls[0].cancelled).toBe(true);

        handler = (_call, callback) => callback(null, completedResponse());
        await expect(client[method]("grpc-instance", true, 5)).resolves.toMatchObject({
          instanceId: "grpc-instance",
          serializedOutput: '"recovered"',
        });
      },
    );
  });

  it("retries two server deadlines with fresh metadata and unchanged request payload options", async () => {
    handler = (_call, callback) => {
      if (calls.length < 3) callback({ code: grpc.status.DEADLINE_EXCEEDED, details: "injected gateway deadline" });
      else callback(null, completedResponse());
    };
    await expect(client.waitForOrchestrationCompletion("grpc-instance", false, 5)).resolves.toMatchObject({
      serializedOutput: '"recovered"',
    });
    expect(calls).toHaveLength(3);
    expect(calls.map((call) => call.metadata.get("attempt"))).toEqual([["1"], ["2"], ["3"]]);
    for (const call of calls) {
      expect(call.request.getInstanceid()).toBe("grpc-instance");
      expect(call.request.getGetinputsandoutputs()).toBe(false);
      expect(call.metadata.get("taskhub")).toEqual(["client-wait-grpc"]);
    }
  });

  it("bounds repeated server deadlines by the original timeout without a hot retry loop", async () => {
    handler = (_call, callback) => callback({ code: grpc.status.DEADLINE_EXCEEDED });
    const started = Date.now();
    await expect(client.waitForOrchestrationCompletion("grpc-instance", true, 0.5)).rejects.toBeInstanceOf(
      TimeoutError,
    );
    expect(Date.now() - started).toBeLessThan(2000);
    expect(calls.length).toBeGreaterThan(1);
    expect(calls.length).toBeLessThanOrEqual(5);
  });

  it("does not retry server deadlines for start waits", async () => {
    handler = (_call, callback) => callback({ code: grpc.status.DEADLINE_EXCEEDED });
    await expect(client.waitForOrchestrationStart("grpc-instance", false, 5)).rejects.toMatchObject({
      code: grpc.status.DEADLINE_EXCEEDED,
    });
    expect(calls).toHaveLength(1);
  });

  it("stops recovery on a permanent server error", async () => {
    handler = (_call, callback) =>
      callback({ code: calls.length === 1 ? grpc.status.DEADLINE_EXCEEDED : grpc.status.PERMISSION_DENIED });
    await expect(client.waitForOrchestrationCompletion("grpc-instance", true, 5)).rejects.toMatchObject({
      code: grpc.status.PERMISSION_DENIED,
    });
    expect(calls).toHaveLength(2);
  });

  describe("externalized completion waits", () => {
    let payloadClient: TaskHubGrpcClient;
    let store: WaitPayloadStore;
    let stopped: boolean;

    beforeEach(() => {
      store = new WaitPayloadStore();
      stopped = false;
      payloadClient = new TaskHubGrpcClient({
        hostAddress,
        payloads: { store },
        metadataGenerator: client["_metadataGenerator"],
        logger: new NoOpLogger(),
      });
      handler = (_call, callback) => {
        const response = completedResponse();
        response.getOrchestrationstate()!.setOutput(new StringValue().setValue("payload:output"));
        callback(null, response);
      };
    });

    afterEach(async () => {
      if (!stopped) await payloadClient.stop();
    });

    it.each(["grpc deadline", "HTTP 503"] as const)(
      "propagates the original storage %s after one successful wait RPC and download",
      async (kind) => {
        const failure =
          kind === "grpc deadline"
            ? Object.assign(new Error("storage deadline"), {
                code: grpc.status.DEADLINE_EXCEEDED,
                details: "storage deadline",
                metadata: new grpc.Metadata(),
              })
            : Object.assign(new Error("storage unavailable"), { statusCode: 503 });
        store.download.mockRejectedValue(failure);
        await expect(payloadClient.waitForOrchestrationCompletion("grpc-instance", true, 0.45)).rejects.toBe(failure);
        expect(calls).toHaveLength(1);
        expect(store.download).toHaveBeenCalledTimes(1);
        expect(metadataCalls).toBe(1);
      },
    );

    it("retries genuine wait RPC deadlines before hydrating the successful response once", async () => {
      const success = handler;
      handler = (call, callback) => {
        if (calls.length < 3) callback({ code: grpc.status.DEADLINE_EXCEEDED, details: "remote deadline" });
        else success(call, callback);
      };
      await expect(payloadClient.waitForOrchestrationCompletion("grpc-instance", true, 5)).resolves.toMatchObject({
        serializedOutput: '"hydrated"',
      });
      expect(calls).toHaveLength(3);
      expect(calls.map((call) => call.metadata.get("attempt"))).toEqual([["1"], ["2"], ["3"]]);
      expect(store.download).toHaveBeenCalledTimes(1);
    });

    it("does not retry a metadata deadline or start the wait RPC", async () => {
      const failure = Object.assign(new Error("metadata deadline"), { code: grpc.status.DEADLINE_EXCEEDED });
      payloadClient["_metadataGenerator"] = async () => {
        throw failure;
      };
      await expect(payloadClient.waitForOrchestrationCompletion("grpc-instance", true, 1)).rejects.toBe(failure);
      expect(calls).toHaveLength(0);
      expect(store.download).not.toHaveBeenCalled();
    });

    it.each(["abort", "timeout", "stop"] as const)(
      "preserves %s cancellation while the successful wait response is hydrating",
      async (cause) => {
        let started!: () => void;
        const downloading = new Promise<void>((resolve) => (started = resolve));
        store.download.mockImplementation(
          (_token, signal) =>
            new Promise((_resolve, reject) => {
              signal!.addEventListener("abort", () => reject(signal!.reason), { once: true });
              started();
            }),
        );
        const controller = new AbortController();
        const reason = new Error("cancel hydration");
        const pending = payloadClient.waitForOrchestrationCompletion("grpc-instance", true, 0.5, controller.signal);
        const rejected = pending.catch((error: unknown) => error);
        await downloading;
        if (cause === "abort") controller.abort(reason);
        if (cause === "stop") {
          stopped = true;
          await payloadClient.stop();
        }
        const error = await rejected;
        if (cause === "timeout") expect(error).toBeInstanceOf(TimeoutError);
        else expect(error).toBe(cause === "abort" ? reason : payloadClient["_payloadCancellation"].signal.reason);
        expect(calls).toHaveLength(1);
        expect(store.download).toHaveBeenCalledTimes(1);
        expect(store.download.mock.calls[0][1]?.aborted).toBe(true);
      },
    );
  });
});
