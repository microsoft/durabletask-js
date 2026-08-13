// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EventEmitter } from "events";
import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { GrpcClient } from "../src/client/client-grpc";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { Logger, NoOpLogger } from "../src/types/logger.type";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";

type MockStream = EventEmitter & { cancel: jest.Mock; destroy: jest.Mock };
type HelloCallback = (error: grpc.ServiceError | null, response: Empty) => void;

function createStream(): MockStream {
  const stream = new EventEmitter() as MockStream;
  stream.cancel = jest.fn();
  stream.destroy = jest.fn();
  return stream;
}

function createStub(hello: (...args: any[]) => grpc.ClientUnaryCall, stream = createStream()) {
  const stub = {
    hello: jest.fn(hello),
    getWorkItems: jest.fn().mockReturnValue(stream),
    close: jest.fn(),
  } as unknown as stubs.TaskHubSidecarServiceClient;
  return { stub, stream };
}

function successfulStub() {
  return createStub((...args: any[]) => {
    getHelloCallback(args)(null, new Empty());
    return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
  });
}

function getHelloCallback(args: any[]): HelloCallback {
  return args[args.length - 1] as HelloCallback;
}

function useStubs(...stubsToUse: stubs.TaskHubSidecarServiceClient[]): jest.SpyInstance {
  const generateClient = jest.spyOn(GrpcClient.prototype as any, "_generateClient");
  for (const stub of stubsToUse) {
    generateClient.mockReturnValueOnce(stub);
  }
  return generateClient;
}

function createLogger(): Logger & { error: jest.Mock } {
  return { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
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

  it("starts promptly and retries hello deadline errors with a deadline on every call", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const callbacks: HelloCallback[] = [];
    const helloTimes: number[] = [];
    const logger = createLogger();
    const pending = createMockStub((...args: any[]) => {
      helloTimes.push(Date.now());
      callbacks.push(getHelloCallback(args));
      return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
    });
    useStubs(pending.stub, pending.stub);
    const worker = new TaskHubGrpcWorker({ logger });

    await expect(worker.start()).resolves.toBeUndefined();
    await flushPromises();

    callbacks[0](new Error("4 DEADLINE_EXCEEDED") as grpc.ServiceError, new Empty());
    await flushPromises();
    expect(logger.error).toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(2000);
    expect(pending.hello).toHaveBeenCalledTimes(2);
    for (const [index, call] of pending.hello.mock.calls.entries()) {
      expect((call[2] as grpc.CallOptions).deadline).toEqual(new Date(helloTimes[index] + 30000));
    }

    await worker.stop();
  });

  it("cancels a pending hello and drains the connection loop on stop", async () => {
    const cancel = jest.fn();
    const pending = createMockStub(() => ({ cancel }) as unknown as grpc.ClientUnaryCall);
    useStubs(pending.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    await flushPromises();
    const loopPromise = (worker as any)._runPromise as Promise<void>;

    await worker.stop();

    expect(cancel).toHaveBeenCalledTimes(1);
    await expect(loopPromise).resolves.toBeUndefined();
    expect((worker as any)._runPromise).toBeNull();
    expect((worker as any)._isRunning).toBe(false);
  });

  it("aborts a pending reconnect delay on stop", async () => {
    jest.useFakeTimers();
    const unavailable = createMockStub((...args: any[]) => {
      getHelloCallback(args)(new Error("sidecar unavailable") as grpc.ServiceError, new Empty());
      return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
    });
    useStubs(unavailable.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    await flushPromises();
    expect(jest.getTimerCount()).toBe(1);

    await worker.stop();

    expect(jest.getTimerCount()).toBe(0);
  });

  it("rejects start while stopping and restarts after stop drains", async () => {
    const first = successfulStub();
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

    expect(first.stream.cancel).toHaveBeenCalledTimes(1);
    expect(restarted.getWorkItems).toHaveBeenCalledTimes(1);
    expect((worker as any)._responseStream).toBe(restarted.stream);

    await worker.stop();
  });

  it("logs client construction failures and retries until connected", async () => {
    jest.useFakeTimers();
    const connected = successfulStub();
    const generateClient = jest
      .spyOn(GrpcClient.prototype as any, "_generateClient")
      .mockImplementationOnce(() => {
        throw new Error("client construction failed");
      })
      .mockReturnValueOnce(connected.stub);
    const logger = createLogger();
    const worker = new TaskHubGrpcWorker({ logger });

    await expect(worker.start()).resolves.toBeUndefined();
    await jest.advanceTimersByTimeAsync(4000);

    expect(generateClient).toHaveBeenCalledTimes(3);
    expect(connected.getWorkItems).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(2);

    await worker.stop();
  });
});
