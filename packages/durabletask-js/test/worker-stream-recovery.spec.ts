// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EventEmitter } from "events";
import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { GrpcClient } from "../src/client/client-grpc";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { NoOpLogger } from "../src/types/logger.type";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";

type MockStream = EventEmitter & {
  cancel: jest.Mock;
  destroy: jest.Mock;
};

function createMockStream(): MockStream {
  const stream = new EventEmitter() as MockStream;
  stream.cancel = jest.fn();
  stream.destroy = jest.fn();
  return stream;
}

function createMockClient(stream: MockStream = createMockStream()): {
  client: GrpcClient;
  stream: MockStream;
  stub: stubs.TaskHubSidecarServiceClient;
  getWorkItems: jest.Mock;
  close: jest.Mock;
} {
  const getWorkItems = jest.fn().mockReturnValue(stream);
  const close = jest.fn();
  const stub = {
    hello: (
      _request: Empty,
      _metadata: grpc.Metadata,
      _options: grpc.CallOptions,
      callback: (error: grpc.ServiceError | null, response: Empty) => void,
    ) => {
      callback(null, new Empty());
      return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
    },
    getWorkItems,
    close,
  } as unknown as stubs.TaskHubSidecarServiceClient;

  return {
    client: { stub } as unknown as GrpcClient,
    stream,
    stub,
    getWorkItems,
    close,
  };
}

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe("Worker stream recovery", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each(["error", "end"] as const)("replaces a stream after %s", async (event) => {
    const initial = createMockClient();
    const replacement = createMockClient();
    jest.spyOn(GrpcClient.prototype as any, "_generateClient").mockReturnValue(replacement.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.internalRunWorker(initial.client);
    await flushPromises();
    initial.stream.emit(event, ...(event === "error" ? [new Error("14 UNAVAILABLE")] : []));
    expect(() => initial.stream.emit("error", new Error("duplicate error"))).not.toThrow();
    await flushPromises();

    expect(initial.stream.destroy).toHaveBeenCalledTimes(1);
    expect(initial.close).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2000);
    await flushPromises();

    expect(replacement.getWorkItems).toHaveBeenCalledTimes(1);
    expect((worker as any)._responseStream).toBe(replacement.stream);

    await worker.stop();
  });

  it("does not reconnect or react to stale stream errors after stop", async () => {
    const initial = createMockClient();
    const generateClient = jest.spyOn(GrpcClient.prototype as any, "_generateClient");
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.internalRunWorker(initial.client);
    await flushPromises();
    await worker.stop();

    expect(initial.stream.cancel).toHaveBeenCalledTimes(1);
    expect(initial.stream.destroy).toHaveBeenCalledTimes(1);
    expect(initial.close).toHaveBeenCalledTimes(1);
    expect(generateClient).not.toHaveBeenCalled();
    expect(() => initial.stream.emit("error", new Error("stale error"))).not.toThrow();

    await jest.advanceTimersByTimeAsync(30000);
    expect(generateClient).not.toHaveBeenCalled();
  });
});
