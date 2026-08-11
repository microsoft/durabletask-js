// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EventEmitter } from "events";
import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { GrpcClient } from "../src/client/client-grpc";
import { TimeoutError } from "../src/exception/timeout-error";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { NoOpLogger } from "../src/types/logger.type";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";

type MockStream = EventEmitter & {
  cancel: jest.Mock;
  destroy: jest.Mock;
};

type HelloCallback = (error: Error | null, response: Empty) => void;

function createMockStream(): MockStream {
  const stream = new EventEmitter() as MockStream;
  stream.cancel = jest.fn(() => queueMicrotask(() => stream.emit("end")));
  stream.destroy = jest.fn();
  return stream;
}

function createMockStub(
  hello: (...args: any[]) => grpc.ClientUnaryCall,
  stream: MockStream = createMockStream(),
): {
  stub: stubs.TaskHubSidecarServiceClient;
  stream: MockStream;
  getWorkItems: jest.Mock;
  close: jest.Mock;
} {
  const getWorkItems = jest.fn().mockReturnValue(stream);
  const close = jest.fn();
  const stub = {
    hello: jest.fn(hello),
    getWorkItems,
    close,
  } as unknown as stubs.TaskHubSidecarServiceClient;

  return { stub, stream, getWorkItems, close };
}

function useMockStub(stub: stubs.TaskHubSidecarServiceClient): void {
  jest.spyOn(GrpcClient.prototype as any, "_generateClient").mockReturnValue(stub);
}

function getHelloCallback(args: any[]): HelloCallback {
  return args[args.length - 1] as HelloCallback;
}

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe("TaskHubGrpcWorker startup", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("resolves after hello succeeds and an idle work-item stream is configured", async () => {
    let completeHello: HelloCallback | undefined;
    const { stub, getWorkItems } = createMockStub((...args: any[]) => {
      completeHello = getHelloCallback(args);
      return { cancel: jest.fn() } as any;
    });
    useMockStub(stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    let started = false;
    const startPromise = worker.start().then(() => {
      started = true;
    });
    await flushAsync();

    expect(started).toBe(false);
    expect(getWorkItems).not.toHaveBeenCalled();

    completeHello!(null, new Empty());
    await startPromise;

    expect(getWorkItems).toHaveBeenCalledTimes(1);
    expect(started).toBe(true);
    expect((worker as any)._responseStream).not.toBeNull();
  });

  it("times out and cancels an unresponsive hello handshake", async () => {
    const cancel = jest.fn();
    const { stub, close } = createMockStub(() => ({ cancel }) as any);
    useMockStub(stub);
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      startupTimeoutMs: 10,
    });

    const startPromise = worker.start();
    await expect(startPromise).rejects.toThrow(TimeoutError);
    await expect(startPromise).rejects.toThrow("Timed out starting worker after 10ms");

    expect(cancel).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    expect((worker as any)._isRunning).toBe(false);
    expect((worker as any)._stub).toBeNull();
    expect((worker as any)._responseStream).toBeNull();
  });

  it("applies the startup timeout while generating metadata", async () => {
    const { stub, getWorkItems, close } = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    useMockStub(stub);
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      startupTimeoutMs: 10,
      metadataGenerator: () => new Promise<grpc.Metadata>(() => {}),
    });

    await expect(worker.start()).rejects.toThrow("while generating sidecar metadata");

    expect(getWorkItems).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    expect((worker as any)._isRunning).toBe(false);
  });

  it("rejects startup timeouts above the maximum Node.js timer delay", () => {
    expect(
      () =>
        new TaskHubGrpcWorker({
          logger: new NoOpLogger(),
          startupTimeoutMs: 2147483648,
        }),
    ).toThrow(RangeError);
  });

  it("cleans up a failed handshake and permits a later start", async () => {
    const stream = createMockStream();
    const close = jest.fn();
    let attempt = 0;
    const hello = jest.fn((...args: any[]) => {
      const callback = getHelloCallback(args);
      attempt++;
      if (attempt === 1) {
        callback(new Error("handshake failed"), new Empty());
      } else {
        callback(null, new Empty());
      }
      return { cancel: jest.fn() } as any;
    });
    const getWorkItems = jest.fn().mockReturnValue(stream);
    useMockStub({ hello, getWorkItems, close } as unknown as stubs.TaskHubSidecarServiceClient);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await expect(worker.start()).rejects.toThrow("handshake failed");

    expect(close).toHaveBeenCalledTimes(1);
    expect((worker as any)._isRunning).toBe(false);
    expect((worker as any)._stub).toBeNull();

    await expect(worker.start()).resolves.toBeUndefined();
    expect(getWorkItems).toHaveBeenCalledTimes(1);
    expect((worker as any)._isRunning).toBe(true);
  });

  it("keeps restart blocked when stop claims a failing startup lifecycle", async () => {
    jest.useFakeTimers();
    const first = createMockStub((...args: any[]) => {
      getHelloCallback(args)(new Error("handshake failed"), new Empty());
      return { cancel: jest.fn() } as any;
    });
    const second = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    jest
      .spyOn(GrpcClient.prototype as any, "_generateClient")
      .mockReturnValueOnce(first.stub)
      .mockReturnValueOnce(second.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const awaitConnectionTasks = (worker as any)._awaitConnectionTasks.bind(worker);
    let releaseStartupCleanup!: () => void;
    const startupCleanupReleased = new Promise<void>((resolve) => {
      releaseStartupCleanup = resolve;
    });
    let startupCleanupEntered!: () => void;
    const startupCleanupStarted = new Promise<void>((resolve) => {
      startupCleanupEntered = resolve;
    });
    jest.spyOn(worker as any, "_awaitConnectionTasks").mockImplementation(async (lifecycle: any) => {
      if (!lifecycle.stopping) {
        startupCleanupEntered();
        await startupCleanupReleased;
      }
      await awaitConnectionTasks(lifecycle);
    });

    const firstStart = worker.start();
    await startupCleanupStarted;
    const stopPromise = worker.stop();
    await flushPromises();
    releaseStartupCleanup();
    await expect(firstStart).rejects.toThrow("handshake failed");

    await expect(worker.start()).rejects.toThrow("The worker is already running.");

    await jest.advanceTimersByTimeAsync(1000);
    await stopPromise;
    await expect(worker.start()).resolves.toBeUndefined();
    expect(second.getWorkItems).toHaveBeenCalledTimes(1);
  });

  it("remains retryable after synchronous gRPC client construction fails", async () => {
    const { stub, getWorkItems } = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    jest
      .spyOn(GrpcClient.prototype as any, "_generateClient")
      .mockImplementationOnce(() => {
        throw new Error("client construction failed");
      })
      .mockReturnValue(stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await expect(worker.start()).rejects.toThrow("client construction failed");
    expect((worker as any)._isRunning).toBe(false);

    await expect(worker.start()).resolves.toBeUndefined();
    expect(getWorkItems).toHaveBeenCalledTimes(1);
  });

  it("cancels an in-flight hello when stopped during startup", async () => {
    jest.useFakeTimers();
    let completeHello: HelloCallback | undefined;
    const cancel = jest.fn(() => {
      queueMicrotask(() => completeHello!(new Error("1 CANCELLED"), new Empty()));
    });
    const { stub, getWorkItems } = createMockStub((...args: any[]) => {
      completeHello = getHelloCallback(args);
      return { cancel } as any;
    });
    useMockStub(stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    const startPromise = worker.start();
    const startRejection = expect(startPromise).rejects.toThrow(
      "Worker startup was stopped before the connection was established.",
    );
    await flushPromises();
    expect(completeHello).toBeDefined();
    const stopPromise = worker.stop();
    await jest.runAllTimersAsync();

    await startRejection;
    await stopPromise;
    expect(cancel).toHaveBeenCalled();
    expect(getWorkItems).not.toHaveBeenCalled();
    expect((worker as any)._isRunning).toBe(false);
  });

  it("ignores a late hello callback from a stopped startup attempt", async () => {
    jest.useFakeTimers();
    let firstHello: HelloCallback | undefined;
    let secondHello: HelloCallback | undefined;
    const firstStream = createMockStream();
    const secondStream = createMockStream();
    const first = createMockStub((...args: any[]) => {
      firstHello = getHelloCallback(args);
      return { cancel: jest.fn() } as any;
    }, firstStream);
    const second = createMockStub((...args: any[]) => {
      secondHello = getHelloCallback(args);
      return { cancel: jest.fn() } as any;
    }, secondStream);
    jest
      .spyOn(GrpcClient.prototype as any, "_generateClient")
      .mockReturnValueOnce(first.stub)
      .mockReturnValueOnce(second.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger(), startupTimeoutMs: 5000 });

    const firstStart = worker.start();
    const firstStartRejection = expect(firstStart).rejects.toThrow();
    await flushPromises();
    expect(firstHello).toBeDefined();
    const stopPromise = worker.stop();
    await jest.advanceTimersByTimeAsync(1000);
    await stopPromise;

    jest.useRealTimers();
    const secondStart = worker.start();
    await flushAsync();
    firstHello!(null, new Empty());
    await flushAsync();

    expect(first.getWorkItems).not.toHaveBeenCalled();
    expect(second.getWorkItems).not.toHaveBeenCalled();

    secondHello!(null, new Empty());
    await secondStart;
    await firstStartRejection;

    expect(second.getWorkItems).toHaveBeenCalledTimes(1);
    expect((worker as any)._responseStream).toBe(secondStream);
  });

  it("cancels a stopped lifecycle's reconnect backoff before restarting", async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(1);
    const first = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    const second = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    const generateClient = jest
      .spyOn(GrpcClient.prototype as any, "_generateClient")
      .mockReturnValueOnce(first.stub)
      .mockReturnValueOnce(second.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    first.stream.emit("error", new Error("14 UNAVAILABLE"));
    await flushPromises();

    const stopPromise = worker.stop();
    await jest.advanceTimersByTimeAsync(1000);
    await stopPromise;

    await worker.start();
    expect((worker as any)._backoff.currentDelayMs).toBe(1000);

    await jest.advanceTimersByTimeAsync(101);

    expect((worker as any)._backoff.currentDelayMs).toBe(1000);
    expect(second.getWorkItems).toHaveBeenCalledTimes(1);
    expect(generateClient).toHaveBeenCalledTimes(2);
  });

  it("adopts a direct internal run so it cannot race a later start", async () => {
    jest.useFakeTimers();
    const direct = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    const restarted = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    const generateClient = jest.spyOn(GrpcClient.prototype as any, "_generateClient").mockReturnValue(restarted.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const directClient = { stub: direct.stub } as unknown as GrpcClient;

    await worker.internalRunWorker(directClient);

    expect((worker as any)._isRunning).toBe(true);
    expect((worker as any)._lifecycle).not.toBeNull();
    expect((worker as any)._stub).toBe(direct.stub);
    await expect(worker.start()).rejects.toThrow("The worker is already running.");
    expect(generateClient).not.toHaveBeenCalled();

    const stopPromise = worker.stop();
    await jest.runAllTimersAsync();
    await stopPromise;

    expect(direct.stream.cancel).toHaveBeenCalled();
    expect(direct.close).toHaveBeenCalled();
    expect((worker as any)._isRunning).toBe(false);
    expect((worker as any)._lifecycle).toBeNull();

    await worker.start();
    direct.stream.emit("error", new Error("stale direct-run stream error"));
    await flushPromises();

    expect(generateClient).toHaveBeenCalledTimes(1);
    expect((worker as any)._stub).toBe(restarted.stub);
    expect((worker as any)._responseStream).toBe(restarted.stream);
  });

  it("continues reconnecting when a replacement client cannot be constructed", async () => {
    jest.useFakeTimers();
    const first = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    const recovered = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    const generateClient = jest
      .spyOn(GrpcClient.prototype as any, "_generateClient")
      .mockReturnValueOnce(first.stub)
      .mockImplementationOnce(() => {
        throw new Error("client construction failed");
      })
      .mockReturnValueOnce(recovered.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    first.stream.emit("error", new Error("14 UNAVAILABLE"));

    await jest.runOnlyPendingTimersAsync();
    const trackedWhileRetryPending = (worker as any)._lifecycle.connectionTasks.size;

    await jest.runOnlyPendingTimersAsync();
    const recoveredStream = (worker as any)._responseStream;
    const recoveredStub = (worker as any)._stub;

    const stopPromise = worker.stop();
    await jest.runAllTimersAsync();
    await stopPromise;

    expect(trackedWhileRetryPending).toBe(1);
    expect(generateClient).toHaveBeenCalledTimes(3);
    expect(recovered.getWorkItems).toHaveBeenCalledTimes(1);
    expect(recoveredStream).toBe(recovered.stream);
    expect(recoveredStub).toBe(recovered.stub);
    expect(first.close).toHaveBeenCalledTimes(1);
    expect(recovered.stream.cancel).toHaveBeenCalledTimes(1);
    expect(recovered.close).toHaveBeenCalledTimes(1);
    expect((worker as any)._isRunning).toBe(false);
    expect((worker as any)._lifecycle).toBeNull();
  });

  it("keeps stream recovery active after startup", async () => {
    const { stub, stream } = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    useMockStub(stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const retry = jest.fn().mockResolvedValue(undefined);
    (worker as any)._createNewClientAndRetry = retry;

    await worker.start();
    stream.emit("error", new Error("14 UNAVAILABLE"));
    await flushAsync();

    expect(retry).toHaveBeenCalledTimes(1);
    expect(stream.destroy).toHaveBeenCalled();
  });

  it("stops and cleans up a stream established by start", async () => {
    const { stub, stream, close } = createMockStub((...args: any[]) => {
      getHelloCallback(args)(null, new Empty());
      return { cancel: jest.fn() } as any;
    });
    useMockStub(stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    jest.useFakeTimers();
    const stopPromise = worker.stop();
    await jest.runAllTimersAsync();
    await stopPromise;

    expect(stream.cancel).toHaveBeenCalled();
    expect(stream.destroy).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    expect((worker as any)._isRunning).toBe(false);
  });
});
