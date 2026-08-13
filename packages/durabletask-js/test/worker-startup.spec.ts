// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EventEmitter } from "events";
import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { GrpcClient } from "../src/client/client-grpc";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { Logger, NoOpLogger } from "../src/types/logger.type";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";

type MockStream = EventEmitter & {
  cancel: jest.Mock;
  destroy: jest.Mock;
};

type HelloCallback = (error: grpc.ServiceError | null, response: Empty) => void;

function createMockStream(): MockStream {
  const stream = new EventEmitter() as MockStream;
  stream.cancel = jest.fn();
  stream.destroy = jest.fn();
  return stream;
}

function createMockStub(
  hello: (...args: any[]) => grpc.ClientUnaryCall,
  stream: MockStream = createMockStream(),
): {
  stub: stubs.TaskHubSidecarServiceClient;
  stream: MockStream;
  hello: jest.Mock;
  getWorkItems: jest.Mock;
  close: jest.Mock;
} {
  const helloMock = jest.fn(hello);
  const getWorkItems = jest.fn().mockReturnValue(stream);
  const close = jest.fn();
  const stub = {
    hello: helloMock,
    getWorkItems,
    close,
  } as unknown as stubs.TaskHubSidecarServiceClient;
  return { stub, stream, hello: helloMock, getWorkItems, close };
}

function successfulStub(stream = createMockStream()) {
  return createMockStub((...args: any[]) => {
    getHelloCallback(args)(null, new Empty());
    return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
  }, stream);
}

function getHelloCallback(args: any[]): HelloCallback {
  return args[args.length - 1] as HelloCallback;
}

function useStubs(...stubSequence: stubs.TaskHubSidecarServiceClient[]): jest.SpyInstance {
  const generateClient = jest.spyOn(GrpcClient.prototype as any, "_generateClient");
  for (const stub of stubSequence) {
    generateClient.mockReturnValueOnce(stub);
  }
  return generateClient;
}

function createLogger(): Logger & { error: jest.Mock } {
  return {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe("TaskHubGrpcWorker connection lifecycle", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("starts promptly while hello is unavailable and cancels hello on stop", async () => {
    const cancel = jest.fn();
    const pending = createMockStub(() => ({ cancel }) as unknown as grpc.ClientUnaryCall);
    useStubs(pending.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await expect(worker.start()).resolves.toBeUndefined();
    await flushPromises();

    expect(pending.hello).toHaveBeenCalledTimes(1);
    expect(pending.getWorkItems).not.toHaveBeenCalled();

    await worker.stop();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect((worker as any)._lifecycle).toBeNull();
    expect((worker as any)._isRunning).toBe(false);
  });

  it("times out each hung hello attempt and retries inside the owned loop", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const calls: jest.Mock[] = [];
    const logger = createLogger();
    const pending = createMockStub(() => {
      const cancel = jest.fn();
      calls.push(cancel);
      return { cancel } as unknown as grpc.ClientUnaryCall;
    });
    useStubs(pending.stub, pending.stub);
    const worker = new TaskHubGrpcWorker({ logger });

    await worker.start();
    await flushPromises();

    const callOptions = pending.hello.mock.calls[0][2] as grpc.CallOptions;
    expect(callOptions.deadline).toEqual(new Date("2026-01-01T00:00:30Z"));

    await jest.advanceTimersByTimeAsync(30000);
    expect(calls[0]).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();

    // Advance past any jittered first retry delay without assuming its exact value.
    await jest.advanceTimersByTimeAsync(2000);
    expect(pending.hello).toHaveBeenCalledTimes(2);

    await worker.stop();
    expect(calls[1]).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("logs initial client construction failures and retries until connected", async () => {
    jest.useFakeTimers();
    const connected = successfulStub();
    const logger = createLogger();
    const generateClient = jest
      .spyOn(GrpcClient.prototype as any, "_generateClient")
      .mockImplementationOnce(() => {
        throw new Error("first construction failure");
      })
      .mockImplementationOnce(() => {
        throw new Error("second construction failure");
      })
      .mockReturnValueOnce(connected.stub);
    const worker = new TaskHubGrpcWorker({ logger });

    await expect(worker.start()).resolves.toBeUndefined();
    await jest.advanceTimersByTimeAsync(4000);

    expect(generateClient).toHaveBeenCalledTimes(3);
    expect(connected.getWorkItems).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(2);

    await worker.stop();
  });

  it("aborts a pending reconnect delay and drains the loop on stop", async () => {
    jest.useFakeTimers();
    const unavailable = createMockStub((...args: any[]) => {
      getHelloCallback(args)(new Error("sidecar unavailable") as grpc.ServiceError, new Empty());
      return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
    });
    useStubs(unavailable.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    await flushPromises();
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    const loopPromise = (worker as any)._lifecycle.runPromise as Promise<void>;

    await worker.stop();

    await expect(loopPromise).resolves.toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
    expect((worker as any)._lifecycle).toBeNull();
  });

  it("rejects start during stop, allows restart, and ignores a late hello callback", async () => {
    let firstHello: HelloCallback | undefined;
    const first = createMockStub((...args: any[]) => {
      firstHello = getHelloCallback(args);
      return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
    });
    const restarted = successfulStub();
    useStubs(first.stub, restarted.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    await flushPromises();
    const stopPromise = worker.stop();

    await expect(worker.start()).rejects.toThrow("The worker is already running.");
    await stopPromise;

    await worker.start();
    await flushPromises();
    firstHello!(null, new Empty());
    await flushPromises();

    expect(first.getWorkItems).not.toHaveBeenCalled();
    expect(restarted.getWorkItems).toHaveBeenCalledTimes(1);
    expect((worker as any)._lifecycle.responseStream).toBe(restarted.stream);

    await worker.stop();
  });

  it("recovers from runtime disconnect and replacement client construction failure", async () => {
    jest.useFakeTimers();
    const first = successfulStub();
    const recovered = successfulStub();
    const logger = createLogger();
    const generateClient = jest
      .spyOn(GrpcClient.prototype as any, "_generateClient")
      .mockReturnValueOnce(first.stub)
      .mockImplementationOnce(() => {
        throw new Error("replacement construction failure");
      })
      .mockReturnValueOnce(recovered.stub);
    const worker = new TaskHubGrpcWorker({ logger });

    await worker.start();
    await flushPromises();
    first.stream.emit("error", new Error("14 UNAVAILABLE"));
    await jest.advanceTimersByTimeAsync(4000);

    expect(generateClient).toHaveBeenCalledTimes(3);
    expect(first.close).toHaveBeenCalledTimes(1);
    expect(recovered.getWorkItems).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();

    await worker.stop();
  });

  it("gives direct internal runs lifecycle ownership and fences stopped streams", async () => {
    const direct = successfulStub();
    const restarted = successfulStub();
    useStubs(restarted.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const directClient = { stub: direct.stub } as unknown as GrpcClient;

    await worker.internalRunWorker(directClient);
    await flushPromises();

    expect((worker as any)._lifecycle.stub).toBe(direct.stub);
    await expect(worker.start()).rejects.toThrow("The worker is already running.");

    await worker.stop();
    await worker.start();
    await flushPromises();
    direct.stream.emit("error", new Error("stale stream error"));
    await flushPromises();

    expect((worker as any)._lifecycle.stub).toBe(restarted.stub);
    expect((worker as any)._lifecycle.responseStream).toBe(restarted.stream);

    await worker.stop();
  });
});
