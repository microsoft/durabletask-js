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

  it("starts promptly, gives each hello a 30-second deadline, and retries errors", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const deadlineError = Object.assign(new Error("deadline exceeded"), {
      code: grpc.status.DEADLINE_EXCEEDED,
    }) as grpc.ServiceError;
    const first = createStub((...args: any[]) => {
      getHelloCallback(args)(deadlineError, new Empty());
      return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
    });
    const connected = successfulStub();
    useStubs(first.stub, connected.stub);
    const worker = new TaskHubGrpcWorker({ logger: createLogger() });

    await expect(worker.start()).resolves.toBeUndefined();
    await flushPromises();

    expect((first.stub.hello as jest.Mock).mock.calls[0][2].deadline).toEqual(new Date("2026-01-01T00:00:30Z"));
    expect(connected.stub.getWorkItems).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(2000);
    expect(connected.stub.getWorkItems).toHaveBeenCalledTimes(1);

    await worker.stop();
  });

  it("retries synchronous client construction failures", async () => {
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

    await worker.start();
    await jest.advanceTimersByTimeAsync(2000);

    expect(generateClient).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("client construction failed"));
    expect(connected.stub.getWorkItems).toHaveBeenCalledTimes(1);

    await worker.stop();
  });

  it("cancels hello, drains the loop, and fences its late callback before restart", async () => {
    let staleHello: HelloCallback | undefined;
    const cancel = jest.fn();
    const first = createStub((...args: any[]) => {
      staleHello = getHelloCallback(args);
      return { cancel } as unknown as grpc.ClientUnaryCall;
    });
    const restarted = successfulStub();
    useStubs(first.stub, restarted.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    await flushPromises();
    const runPromise = (worker as any)._runPromise as Promise<void>;
    const stopPromise = worker.stop();

    await expect(worker.start()).rejects.toThrow("The worker is already running.");
    await stopPromise;
    await expect(runPromise).resolves.toBeUndefined();
    expect(cancel).toHaveBeenCalledTimes(1);

    await worker.start();
    await flushPromises();
    staleHello!(null, new Empty());
    await flushPromises();

    expect(first.stub.getWorkItems).not.toHaveBeenCalled();
    expect(restarted.stub.getWorkItems).toHaveBeenCalledTimes(1);
    expect((worker as any)._responseStream).toBe(restarted.stream);

    await worker.stop();
  });

  it("cancels reconnect backoff and permits restart after stop", async () => {
    jest.useFakeTimers();
    const unavailable = createStub((...args: any[]) => {
      getHelloCallback(args)(new Error("unavailable") as grpc.ServiceError, new Empty());
      return { cancel: jest.fn() } as unknown as grpc.ClientUnaryCall;
    });
    const restarted = successfulStub();
    useStubs(unavailable.stub, restarted.stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    await flushPromises();
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    await worker.stop();
    expect(jest.getTimerCount()).toBe(0);

    await worker.start();
    await flushPromises();
    expect(restarted.stub.getWorkItems).toHaveBeenCalledTimes(1);

    await worker.stop();
  });

  it("keeps direct internal runs owned by stop", async () => {
    const direct = successfulStub();
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    let finishWorkItem!: () => void;
    const pendingWorkItem = new Promise<void>((resolve) => {
      finishWorkItem = resolve;
    });

    await worker.internalRunWorker({ stub: direct.stub } as unknown as GrpcClient);
    await flushPromises();
    (worker as any)._pendingWorkItems.add(pendingWorkItem);
    const stopPromise = worker.stop();
    await flushPromises();

    await expect(worker.start()).rejects.toThrow("The worker is already running.");
    expect(direct.stub.close).not.toHaveBeenCalled();
    finishWorkItem();
    await stopPromise;

    expect(direct.stream.cancel).toHaveBeenCalledTimes(1);
    expect(direct.stub.close).toHaveBeenCalledTimes(1);
  });
});
