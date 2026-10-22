// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter, getEventListeners } from "events";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { TaskHubGrpcClient } from "../src/client/client";
import { OrchestrationState } from "../src/orchestration/orchestration-state";
import { TimeoutError } from "../src/exception/timeout-error";
import { NoOpLogger } from "../src/types/logger.type";
import { PayloadStore } from "../src/payloads/payload-store";
import * as pb from "../src/proto/orchestrator_service_pb";

type Wait = (
  instanceId: string,
  fetchPayloads?: boolean,
  timeout?: number,
  signal?: AbortSignal,
) => Promise<OrchestrationState | undefined>;
type Callback = (error: grpc.ServiceError | null, response: pb.GetInstanceResponse) => void;

function grpcError(code: grpc.status): grpc.ServiceError {
  return Object.assign(new Error("remote failure"), { code, details: "remote failure", metadata: new grpc.Metadata() });
}

function completedResponse(): pb.GetInstanceResponse {
  const response = new pb.GetInstanceResponse();
  response.setExists(true);
  const state = new pb.OrchestrationState();
  state.setName("test");
  state.setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
  state.setOutput(new StringValue().setValue('"done"'));
  response.setOrchestrationstate(state);
  return response;
}

class UnaryWaitPayloadStore extends PayloadStore {
  upload = jest.fn(async (_value: string, _signal?: AbortSignal) => "payload:input");
  download = jest.fn(async (_token: string, _signal?: AbortSignal) => '"done"');
  isKnownPayloadToken(value: string): boolean {
    return value.startsWith("payload:");
  }
}

describe("payload-enabled unary completion pipeline", () => {
  let client: TaskHubGrpcClient;
  let store: UnaryWaitPayloadStore;
  let callback: Callback;
  const cancel = jest.fn();
  const call: grpc.ClientUnaryCall = Object.assign(new EventEmitter(), {
    cancel,
    getPeer: () => "test",
    getAuthContext: () => null,
  });

  const rpc = jest.fn<grpc.ClientUnaryCall, [pb.GetInstanceRequest, grpc.Metadata, Callback]>();
  const metadataGenerator = jest.fn<Promise<grpc.Metadata>, []>();

  beforeEach(() => {
    jest.useFakeTimers();
    cancel.mockReset();
    store = new UnaryWaitPayloadStore();
    metadataGenerator.mockReset().mockImplementation(async () => {
      const metadata = new grpc.Metadata();
      metadata.set("attempt", String(metadataGenerator.mock.calls.length));
      return metadata;
    });
    rpc.mockReset().mockImplementation((_req, _metadata, cb) => {
      callback = cb;
      return call;
    });
    client = new TaskHubGrpcClient({
      payloads: { store, thresholdBytes: 1 },
      metadataGenerator,
      logger: new NoOpLogger(),
    });
    Object.defineProperty(client["_stub"], "waitForInstanceCompletion", { value: rpc });
  });

  afterEach(() => {
    client["_stub"].close();
    jest.useRealTimers();
  });

  it("does not retry a frozen metadata deadline after a real RPC retry", async () => {
    const failure = Object.freeze(grpcError(grpc.status.DEADLINE_EXCEEDED));
    metadataGenerator.mockResolvedValueOnce(new grpc.Metadata()).mockRejectedValue(failure);
    const pending = client.waitForOrchestrationCompletion("instance", true, 5);
    const assertion = expect(pending).rejects.toBe(failure);
    await jest.advanceTimersByTimeAsync(0);
    callback(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
    await jest.advanceTimersByTimeAsync(100);
    await assertion;
    await jest.advanceTimersByTimeAsync(1000);

    expect(metadataGenerator).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(store.upload).not.toHaveBeenCalled();
    expect(store.download).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("reuses the request across RPC retries, regenerates metadata, and hydrates only the successful response", async () => {
    const pending = client.waitForOrchestrationCompletion("instance", true, 5);
    await jest.advanceTimersByTimeAsync(0);
    const response = completedResponse();
    response.getOrchestrationstate()!.setOutput(new StringValue().setValue("payload:output"));
    callback(grpcError(grpc.status.DEADLINE_EXCEEDED), response);
    await jest.advanceTimersByTimeAsync(100);
    callback(grpcError(grpc.status.DEADLINE_EXCEEDED), response);
    await jest.advanceTimersByTimeAsync(200);
    callback(null, response);
    await expect(pending).resolves.toMatchObject({ serializedOutput: '"done"' });

    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc.mock.calls.every(([request]) => request === rpc.mock.calls[0][0])).toBe(true);
    expect(rpc.mock.calls.map(([, metadata]) => metadata.get("attempt"))).toEqual([["1"], ["2"], ["3"]]);
    expect(store.upload).not.toHaveBeenCalled();
    expect(store.download).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(["metadata", "rpc", "backoff", "hydration"] as const)(
    "stop cancels %s without starting later metadata or RPC attempts",
    async (stage) => {
      let resolveMetadata: ((metadata: grpc.Metadata) => void) | undefined;
      if (stage === "metadata") {
        metadataGenerator.mockImplementation(() => new Promise((resolve) => (resolveMetadata = resolve)));
      }
      if (stage === "hydration") {
        store.download.mockImplementation(
          (_token, signal) =>
            new Promise<string>((_resolve, reject) => {
              signal!.addEventListener("abort", () => reject(signal!.reason), { once: true });
            }),
        );
      }
      const pending = client.waitForOrchestrationCompletion("instance", true, 5);
      const rejected = pending.catch((error: unknown) => error);
      await jest.advanceTimersByTimeAsync(0);
      if (stage === "backoff") {
        callback(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
      } else if (stage === "hydration") {
        const response = completedResponse();
        response.getOrchestrationstate()!.setOutput(new StringValue().setValue("payload:output"));
        callback(null, response);
      }
      await jest.advanceTimersByTimeAsync(0);
      const stopping = client.stop();
      resolveMetadata?.(new grpc.Metadata());
      await jest.advanceTimersByTimeAsync(10000);
      await stopping;

      expect(await rejected).toBe(client["_payloadCancellation"].signal.reason);
      expect(metadataGenerator).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledTimes(stage === "metadata" ? 0 : 1);
      expect(cancel).toHaveBeenCalledTimes(stage === "rpc" ? 1 : 0);
      expect(store.download).toHaveBeenCalledTimes(stage === "hydration" ? 1 : 0);
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it.each(["abort", "timeout"] as const)("does not restart after %s in payload-enabled backoff", async (cause) => {
    const controller = new AbortController();
    const reason = Object.freeze(grpcError(grpc.status.DEADLINE_EXCEEDED));
    const pending = client.waitForOrchestrationCompletion("instance", true, 0.05, controller.signal);
    const rejected = pending.catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(0);
    callback(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
    await jest.advanceTimersByTimeAsync(0);
    if (cause === "abort") controller.abort(reason);
    await jest.advanceTimersByTimeAsync(10000);

    if (cause === "abort") expect(await rejected).toBe(reason);
    else expect(await rejected).toBeInstanceOf(TimeoutError);
    expect(metadataGenerator).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe.each([
  ["waitForOrchestrationStart", "waitForInstanceStart", false, "start"],
  ["waitForOrchestrationCompletion", "waitForInstanceCompletion", true, "complete"],
] as const)("%s", (method, rpcMethod, defaultPayloads, verb) => {
  let client: TaskHubGrpcClient;
  let wait: Wait;
  let callback: Callback;
  const cancel = jest.fn();
  const call: grpc.ClientUnaryCall = Object.assign(new EventEmitter(), {
    cancel,
    getPeer: () => "test",
    getAuthContext: () => null,
  });
  const rpc = jest.fn<grpc.ClientUnaryCall, [pb.GetInstanceRequest, grpc.Metadata, Callback]>();
  const metadataGenerator = jest.fn<Promise<grpc.Metadata>, []>();

  beforeEach(() => {
    jest.useFakeTimers();
    cancel.mockReset();
    metadataGenerator.mockReset().mockResolvedValue(new grpc.Metadata());
    rpc.mockReset().mockImplementation((_req, _metadata, cb) => {
      callback = cb;
      return call;
    });
    client = new TaskHubGrpcClient({ metadataGenerator, logger: new NoOpLogger() });
    Object.defineProperty(client["_stub"], rpcMethod, { value: rpc });
    wait = client[method].bind(client);
  });

  afterEach(() => {
    client["_stub"].close();
    jest.useRealTimers();
  });

  it("cancels the underlying RPC when the total timeout expires", async () => {
    const result = wait("instance", undefined, 1);
    const assertion = expect(result).rejects.toThrow(
      `Timed out waiting for orchestration 'instance' to ${verb} after 1s`,
    );
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("preserves the default 60-second timeout and payload setting", async () => {
    const result = wait("instance");
    const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
    await jest.advanceTimersByTimeAsync(59999);
    expect(rpc.mock.calls[0][0].getGetinputsandoutputs()).toBe(defaultPayloads);
    expect(cancel).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await assertion;
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not start metadata generation or an RPC for a pre-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort(new Error("already cancelled"));
    const result = wait("instance", undefined, 1, controller.signal);
    const assertion = expect(result).rejects.toBe(controller.signal.reason);
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(metadataGenerator).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("rejects with the abort reason and cancels an in-flight RPC", async () => {
    const controller = new AbortController();
    const result = wait("instance", undefined, 1, controller.signal);
    await jest.advanceTimersByTimeAsync(0);
    controller.abort();
    const assertion = expect(result).rejects.toBe(controller.signal.reason);
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("cancels exactly once when aborted before the RPC returns its handle", async () => {
    const controller = new AbortController();
    const reason = new Error("synchronous interceptor abort");
    rpc.mockImplementation((_req, _metadata, cb) => {
      callback = cb;
      controller.abort(reason);
      return call;
    });
    cancel.mockImplementation(() => callback(grpcError(grpc.status.CANCELLED), new pb.GetInstanceResponse()));

    const result = wait("instance", undefined, 1, controller.signal);
    await expect(result).rejects.toBe(reason);
    await jest.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledTimes(1);
    callback(null, completedResponse());
    callback(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
    await expect(result).rejects.toBe(reason);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(["abort", "timeout"] as const)(
    "settles during pending metadata on %s without starting a late RPC",
    async (cause) => {
      let resolveMetadata!: (metadata: grpc.Metadata) => void;
      metadataGenerator.mockImplementation(() => new Promise((resolve) => (resolveMetadata = resolve)));
      const controller = new AbortController();
      const result = wait("instance", undefined, 1, controller.signal);
      let settled = false;
      void result.then(
        () => (settled = true),
        () => (settled = true),
      );
      const assertion =
        cause === "abort"
          ? expect(result).rejects.toThrow("cancel metadata")
          : expect(result).rejects.toBeInstanceOf(TimeoutError);
      if (cause === "abort") {
        controller.abort(new Error("cancel metadata"));
        await jest.advanceTimersByTimeAsync(0);
      } else {
        await jest.advanceTimersByTimeAsync(1000);
      }
      expect(settled).toBe(true);
      await assertion;
      resolveMetadata(new grpc.Metadata());
      await jest.advanceTimersByTimeAsync(1000);
      expect(rpc).not.toHaveBeenCalled();
      expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it("keeps a successful response and releases the timer and signal listener", async () => {
    const controller = new AbortController();
    const metadata = new grpc.Metadata();
    metadata.set("taskhub", "wait-tests");
    metadataGenerator.mockResolvedValue(metadata);
    const result = wait("instance", !defaultPayloads, 1, controller.signal);
    await jest.advanceTimersByTimeAsync(999);
    callback(null, completedResponse());
    const state = await result;
    expect(state?.instanceId).toBe("instance");
    expect(state?.serializedOutput).toBe('"done"');
    expect(rpc.mock.calls[0][0].getGetinputsandoutputs()).toBe(!defaultPayloads);
    expect(rpc.mock.calls[0][1]).toBe(metadata);
    controller.abort();
    await jest.advanceTimersByTimeAsync(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("observes a late metadata rejection after cancellation without changing the reason", async () => {
    let rejectMetadata!: (reason: Error) => void;
    metadataGenerator.mockImplementation(() => new Promise((_, reject) => (rejectMetadata = reject)));
    const controller = new AbortController();
    const reason = { message: "caller cancellation" };
    const result = wait("instance", undefined, 1, controller.signal);
    controller.abort(reason);
    await expect(result).rejects.toBe(reason);

    rejectMetadata(new Error("late credential failure"));
    await jest.advanceTimersByTimeAsync(1000);
    await expect(result).rejects.toBe(reason);
    expect(rpc).not.toHaveBeenCalled();
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("ignores a response arriving after the timeout", async () => {
    const result = wait("instance", undefined, 1);
    const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
    callback(null, completedResponse());
    await expect(result).rejects.toBeInstanceOf(TimeoutError);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("returns undefined for a not-found response", async () => {
    const result = wait("missing");
    await jest.advanceTimersByTimeAsync(0);
    callback(null, new pb.GetInstanceResponse());
    await expect(result).resolves.toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("allows an immediate response with a zero timeout", async () => {
    rpc.mockImplementation((_req, _metadata, cb) => {
      cb(null, completedResponse());
      return call;
    });
    await expect(wait("instance", undefined, 0)).resolves.toMatchObject({ instanceId: "instance" });
    expect(cancel).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([grpc.status.NOT_FOUND, grpc.status.CANCELLED, grpc.status.PERMISSION_DENIED, grpc.status.UNAVAILABLE])(
    "does not retry or wrap gRPC status %s",
    async (code) => {
      const error = grpcError(code);
      const result = wait("instance");
      const assertion = expect(result).rejects.toBe(error);
      await jest.advanceTimersByTimeAsync(0);
      callback(error, new pb.GetInstanceResponse());
      await assertion;
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it("preserves metadata errors and releases the signal listener", async () => {
    const error = new Error("credential failure");
    metadataGenerator.mockRejectedValue(error);
    const controller = new AbortController();
    await expect(wait("instance", undefined, 1, controller.signal)).rejects.toBe(error);
    expect(rpc).not.toHaveBeenCalled();
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([-1, NaN, Infinity, -Infinity])("rejects invalid timeout %s before starting a call", async (timeout) => {
    await expect(wait("instance", undefined, timeout)).rejects.toBeInstanceOf(RangeError);
    expect(rpc).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  if (method === "waitForOrchestrationStart") {
    it("does not retry a remote deadline when waiting for start", async () => {
      const error = grpcError(grpc.status.DEADLINE_EXCEEDED);
      const result = wait("instance");
      const assertion = expect(result).rejects.toBe(error);
      await jest.advanceTimersByTimeAsync(0);
      callback(error, new pb.GetInstanceResponse());
      await assertion;
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });
  } else {
    it("preserves exponential deadline backoff from 100ms up to the 1s cap", async () => {
      rpc.mockImplementation((_req, _metadata, cb) => {
        cb(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
        return call;
      });
      const result = wait("instance", undefined, 3);
      const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
      await jest.advanceTimersByTimeAsync(0);
      let attempts = 1;
      for (const delay of [100, 200, 400, 800, 1000]) {
        await jest.advanceTimersByTimeAsync(delay - 1);
        expect(rpc).toHaveBeenCalledTimes(attempts);
        await jest.advanceTimersByTimeAsync(1);
        expect(rpc).toHaveBeenCalledTimes(++attempts);
      }
      await jest.advanceTimersByTimeAsync(500);
      await assertion;
      expect(jest.getTimerCount()).toBe(0);
    });

    it("keeps the total timeout while a retry waits for metadata", async () => {
      let resolveMetadata!: (metadata: grpc.Metadata) => void;
      metadataGenerator
        .mockResolvedValueOnce(new grpc.Metadata())
        .mockImplementation(() => new Promise((resolve) => (resolveMetadata = resolve)));
      const result = wait("instance", undefined, 1);
      const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
      await jest.advanceTimersByTimeAsync(500);
      callback(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
      await jest.advanceTimersByTimeAsync(500);
      await assertion;
      expect(metadataGenerator).toHaveBeenCalledTimes(2);
      resolveMetadata(new grpc.Metadata());
      await jest.advanceTimersByTimeAsync(0);
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("does not treat metadata failures with a deadline code as server deadlines", async () => {
      const error = grpcError(grpc.status.DEADLINE_EXCEEDED);
      metadataGenerator.mockRejectedValue(error);
      await expect(wait("instance")).rejects.toBe(error);
      expect(metadataGenerator).toHaveBeenCalledTimes(1);
      expect(rpc).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it("recovers from remote deadlines and regenerates metadata for each attempt", async () => {
      const result = wait("instance", false, 5);
      const assertion = expect(result).resolves.toMatchObject({ instanceId: "instance", serializedOutput: '"done"' });
      await jest.advanceTimersByTimeAsync(0);
      callback(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
      await jest.advanceTimersByTimeAsync(1000);
      expect(rpc).toHaveBeenCalledTimes(2);
      callback(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
      await jest.advanceTimersByTimeAsync(1000);
      expect(rpc).toHaveBeenCalledTimes(3);
      callback(null, completedResponse());
      await assertion;
      expect(metadataGenerator).toHaveBeenCalledTimes(3);
      expect(
        rpc.mock.calls.every(
          ([request]) => request.getInstanceid() === "instance" && !request.getGetinputsandoutputs(),
        ),
      ).toBe(true);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("does not reset the original timeout when recovering from a deadline", async () => {
      const result = wait("instance", undefined, 2);
      const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
      await jest.advanceTimersByTimeAsync(500);
      callback(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
      await jest.advanceTimersByTimeAsync(1000);
      expect(rpc).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(500);
      await assertion;
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("backs off repeated immediate deadlines and stops at the total timeout", async () => {
      rpc.mockImplementation((_req, _metadata, cb) => {
        cb(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
        return call;
      });
      const result = wait("instance", undefined, 2);
      const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
      await jest.advanceTimersByTimeAsync(2000);
      await assertion;
      expect(rpc.mock.calls.length).toBeGreaterThan(1);
      expect(rpc.mock.calls.length).toBeLessThanOrEqual(20);
      expect(jest.getTimerCount()).toBe(0);
      await jest.advanceTimersByTimeAsync(10000);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("does not retry when aborted between attempts, even with a deadline-shaped reason", async () => {
      const controller = new AbortController();
      const result = wait("instance", undefined, 5, controller.signal);
      const reason = grpcError(grpc.status.DEADLINE_EXCEEDED);
      const assertion = expect(result).rejects.toBe(reason);
      await jest.advanceTimersByTimeAsync(0);
      callback(grpcError(grpc.status.DEADLINE_EXCEEDED), new pb.GetInstanceResponse());
      await jest.advanceTimersByTimeAsync(0);
      controller.abort(reason);
      await jest.advanceTimersByTimeAsync(5000);
      await assertion;
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
    });
  }
});
