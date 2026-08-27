// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { GrpcClient } from "../src/client/client-grpc";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { Logger, NoOpLogger } from "../src/types/logger.type";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";

type HelloCallback = (error: grpc.ServiceError | null, response: Empty) => void;

function useStub(hello: jest.Mock): jest.SpyInstance {
  const stub = {
    hello,
    getWorkItems: jest.fn(),
    close: jest.fn(),
  } as unknown as stubs.TaskHubSidecarServiceClient;
  return jest.spyOn(GrpcClient.prototype as any, "_generateClient").mockReturnValue(stub);
}

function getCallback(args: any[]): HelloCallback {
  return args[args.length - 1] as HelloCallback;
}

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

async function stopWorker(worker: TaskHubGrpcWorker): Promise<void> {
  const stop = worker.stop();
  await jest.advanceTimersByTimeAsync(1000);
  await stop;
}

describe("TaskHubGrpcWorker startup", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("sets a 30-second deadline on every hello and retries an initial failure", async () => {
    const deadlines: number[] = [];
    const hello = jest.fn((...args: any[]) => {
      deadlines.push((args[2] as grpc.CallOptions).deadline!.valueOf() - Date.now());
      getCallback(args)(new Error("unavailable") as grpc.ServiceError, new Empty());
      return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
    });
    const logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } satisfies Logger;
    useStub(hello);
    const worker = new TaskHubGrpcWorker({ logger });

    await expect(worker.start()).resolves.toBeUndefined();
    await flushPromises();
    await jest.advanceTimersByTimeAsync(2000);

    expect(hello).toHaveBeenCalledTimes(2);
    expect(deadlines).toEqual([30000, 30000]);
    expect(logger.error).toHaveBeenCalled();

    await stopWorker(worker);
  });

  it("logs and retries when hello throws synchronously", async () => {
    const hello = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("synchronous hello failure");
      })
      .mockImplementation(() => ({ cancel: jest.fn() }) as unknown as grpc.ClientUnaryCall);
    const logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } satisfies Logger;
    useStub(hello);
    const worker = new TaskHubGrpcWorker({ logger });

    await worker.start();
    await flushPromises();
    await jest.advanceTimersByTimeAsync(2000);

    expect(logger.error).toHaveBeenCalled();
    expect(hello).toHaveBeenCalledTimes(2);

    await stopWorker(worker);
  });

  it("cancels a pending hello when stopped", async () => {
    const cancel = jest.fn();
    const hello = jest.fn(() => ({ cancel }) as unknown as grpc.ClientUnaryCall);
    useStub(hello);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    await flushPromises();
    await stopWorker(worker);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect((worker as any)._isRunning).toBe(false);
  });

  it("cancels reconnect backoff and prevents a stopped run from reconnecting", async () => {
    const hello = jest.fn((...args: any[]) => {
      getCallback(args)(new Error("unavailable") as grpc.ServiceError, new Empty());
      return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
    });
    const generateClient = useStub(hello);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    await flushPromises();
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    await stopWorker(worker);
    await jest.advanceTimersByTimeAsync(60000);

    expect(generateClient).toHaveBeenCalledTimes(1);
    expect(hello).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
