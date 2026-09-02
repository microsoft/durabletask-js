// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "events";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { GrpcClient } from "../src/client/client-grpc";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { Logger, NoOpLogger, StructuredLogger } from "../src/types/logger.type";
import {
  EVENT_CHANNEL_RECREATED,
  EVENT_CHANNEL_RECREATING,
  EVENT_STREAM_ENDED,
  EVENT_STREAM_TIMEOUT,
} from "../src/worker/logs";
import { TaskHubGrpcWorker, TaskHubGrpcWorkerOptions } from "../src/worker/task-hub-grpc-worker";

type HelloCallback = (error: grpc.ServiceError | null, response: Empty) => void;
type MockStream = EventEmitter & { cancel: jest.Mock; destroy: jest.Mock };
type MockStub = stubs.TaskHubSidecarServiceClient & {
  hello: jest.Mock;
  getWorkItems: jest.Mock;
  close: jest.Mock;
};

function grpcError(code: grpc.status, message = "gRPC failure"): grpc.ServiceError {
  return Object.assign(new Error(message), {
    code,
    details: message,
    metadata: new grpc.Metadata(),
  });
}

function createHealthPing(): pb.WorkItem {
  const workItem = new pb.WorkItem();
  workItem.setHealthping(new pb.HealthPing());
  return workItem;
}

function createMockStream(closeSynchronously = false): MockStream {
  const stream = new EventEmitter() as MockStream;
  stream.cancel = jest.fn(() => {
    if (closeSynchronously) {
      stream.emit("close");
    } else {
      setTimeout(() => stream.emit("close"), 0);
    }
  });
  stream.destroy = jest.fn();
  return stream;
}

function createUnaryCall(cancel = jest.fn()): grpc.ClientUnaryCall {
  return Object.assign(new EventEmitter(), {
    cancel,
    getPeer: () => "mock-peer",
    getAuthContext: () => null,
  });
}

function createStub(
  streams: MockStream[],
  helloStatuses: Array<grpc.status | null> = [],
  closeSynchronously = false,
): MockStub {
  let helloCall = 0;
  const stub = {
    hello: jest.fn((...args: any[]) => {
      const status = helloStatuses[helloCall++];
      const error = status === undefined || status === null ? null : grpcError(status);
      (args.at(-1) as HelloCallback)(error, new Empty());
      return createUnaryCall();
    }),
    getWorkItems: jest.fn(() => {
      const stream = createMockStream(closeSynchronously);
      streams.push(stream);
      return stream;
    }),
    close: jest.fn(),
  };
  return stub as unknown as MockStub;
}

function useStub(stub: MockStub): jest.SpyInstance {
  return jest.spyOn(GrpcClient.prototype as any, "_generateClient").mockReturnValue(stub);
}

function useNewStubPerClient(streams: MockStream[], stubsCreated: MockStub[]): jest.SpyInstance {
  return jest.spyOn(GrpcClient.prototype as any, "_generateClient").mockImplementation(() => {
    const stub = createStub(streams);
    stubsCreated.push(stub);
    return stub;
  });
}

function createCapturingLogger(): { logger: StructuredLogger; eventIds: number[] } {
  const eventIds: number[] = [];
  const logger = {
    logEvent: (_level, event) => eventIds.push(event.eventId),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } satisfies StructuredLogger;
  return { logger, eventIds };
}

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

async function failStream(stream: MockStream, code = grpc.status.UNAVAILABLE): Promise<void> {
  stream.emit("error", grpcError(code));
  await jest.advanceTimersByTimeAsync(0);
  await flushPromises();
}

async function stopWorker(worker: TaskHubGrpcWorker): Promise<void> {
  const stop = worker.stop();
  await jest.advanceTimersByTimeAsync(1000);
  await stop;
}

async function startWorker(
  stub: MockStub,
  options: TaskHubGrpcWorkerOptions = {},
  installStub = true,
): Promise<TaskHubGrpcWorker> {
  if (installStub) {
    useStub(stub);
  }
  const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger(), ...options });
  await worker.start();
  await flushPromises();
  return worker;
}

describe("TaskHubGrpcWorker startup", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("uses full jitter for reconnect backoff", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.25);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    expect((worker as any)._backoff.peekNextDelay()).toBe(250);
  });

  it("reuses the same gRPC client before five consecutive poisoned failures", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const streams: MockStream[] = [];
    const stub = createStub(streams);
    const generateClient = useStub(stub);
    const worker = await startWorker(stub, {}, false);

    for (let failure = 0; failure < 4; failure++) {
      await failStream(streams[failure]);
    }

    expect(generateClient).toHaveBeenCalledTimes(1);
    expect(stub.getWorkItems).toHaveBeenCalledTimes(5);
    await stopWorker(worker);
  });

  it("recreates the gRPC client after five consecutive poisoned failures", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { logger, eventIds } = createCapturingLogger();
    const streams: MockStream[] = [];
    const stubsCreated: MockStub[] = [];
    const generateClient = useNewStubPerClient(streams, stubsCreated);
    const worker = new TaskHubGrpcWorker({ logger });

    await worker.start();
    await flushPromises();
    for (let failure = 0; failure < 5; failure++) {
      await failStream(streams[failure]);
    }

    expect(generateClient).toHaveBeenCalledTimes(2);
    expect(stubsCreated[0].getWorkItems).toHaveBeenCalledTimes(5);
    expect(stubsCreated[1].getWorkItems).toHaveBeenCalledTimes(1);
    expect(stubsCreated[0].close).not.toHaveBeenCalled();
    expect(eventIds).toContain(EVENT_CHANNEL_RECREATING);
    expect(eventIds).toContain(EVENT_CHANNEL_RECREATED);

    await jest.advanceTimersByTimeAsync(29999);
    expect(stubsCreated[0].close).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(stubsCreated[0].close).toHaveBeenCalledTimes(1);
    await stopWorker(worker);
  });

  it("isolates every recreated client from grpc-js's global subchannel pool", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const streams: MockStream[] = [];
    const stubsCreated: MockStub[] = [];
    const originalOptions = { "grpc.keepalive_time_ms": 1234 };
    const clientOptions: grpc.ChannelOptions[] = [];
    const constructorSpy = jest.spyOn(GrpcClient.prototype as any, "_generateChannelOptions");
    constructorSpy.mockImplementation((options: unknown) => {
      const channelOptions = options as grpc.ChannelOptions;
      clientOptions.push({ ...channelOptions });
      return {
        "grpc.max_receive_message_length": -1,
        "grpc.max_send_message_length": -1,
        "grpc.primary_user_agent": "durabletask-js",
        ...channelOptions,
      };
    });
    useNewStubPerClient(streams, stubsCreated);
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      options: originalOptions,
      channelRecreateFailureThreshold: 1,
    });

    await worker.start();
    await flushPromises();
    await failStream(streams[0]);
    await failStream(streams[1]);

    expect(clientOptions).toEqual([
      { "grpc.keepalive_time_ms": 1234 },
      {
        "grpc.keepalive_time_ms": 1234,
        "grpc.use_local_subchannel_pool": 1,
      },
      {
        "grpc.keepalive_time_ms": 1234,
        "grpc.use_local_subchannel_pool": 1,
      },
    ]);
    expect(originalOptions).toEqual({ "grpc.keepalive_time_ms": 1234 });

    await stopWorker(worker);
  });

  it("closes deferred gRPC clients during shutdown", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const streams: MockStream[] = [];
    const stubsCreated: MockStub[] = [];
    useNewStubPerClient(streams, stubsCreated);
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      channelRecreateFailureThreshold: 1,
    });

    await worker.start();
    await flushPromises();
    await failStream(streams[0]);
    expect(stubsCreated[0].close).not.toHaveBeenCalled();

    await stopWorker(worker);

    expect(stubsCreated[0].close).toHaveBeenCalledTimes(1);
    expect(stubsCreated[1].close).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("keeps using the existing channel when recreation fails", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const streams: MockStream[] = [];
    const stub = createStub(streams);
    jest
      .spyOn(GrpcClient.prototype as any, "_generateClient")
      .mockReturnValueOnce(stub)
      .mockImplementationOnce(() => {
        throw new Error("channel recreation failed");
      });
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      channelRecreateFailureThreshold: 1,
    });

    await worker.start();
    await flushPromises();
    await failStream(streams[0]);

    expect(stub.getWorkItems).toHaveBeenCalledTimes(2);
    expect(stub.close).not.toHaveBeenCalled();
    await stopWorker(worker);
  });

  it("disables channel recreation for a non-positive threshold", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const streams: MockStream[] = [];
    const stub = createStub(streams);
    const generateClient = useStub(stub);
    const worker = await startWorker(stub, { channelRecreateFailureThreshold: 0 }, false);

    for (let failure = 0; failure < 6; failure++) {
      await failStream(streams[failure]);
    }

    expect(generateClient).toHaveBeenCalledTimes(1);
    expect(stub.getWorkItems).toHaveBeenCalledTimes(7);
    await stopWorker(worker);
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid channel recreation threshold (%s)",
    (channelRecreateFailureThreshold) => {
      expect(
        () =>
          new TaskHubGrpcWorker({
            logger: new NoOpLogger(),
            channelRecreateFailureThreshold,
          }),
      ).toThrow("channelRecreateFailureThreshold must be a safe integer");
    },
  );

  it("resets poisoned channel failures after the first stream message", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const streams: MockStream[] = [];
    const stub = createStub(streams);
    const generateClient = useStub(stub);
    const worker = await startWorker(stub, { channelRecreateFailureThreshold: 2 }, false);

    await failStream(streams[0]);
    streams[1].emit("data", createHealthPing());
    await failStream(streams[1]);

    expect(generateClient).toHaveBeenCalledTimes(1);
    expect(stub.getWorkItems).toHaveBeenCalledTimes(3);
    await stopWorker(worker);
  });

  it("reconnects without recreating the channel after a non-empty graceful drain", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const streams: MockStream[] = [];
    const stub = createStub(streams);
    const generateClient = useStub(stub);
    const worker = await startWorker(stub, { channelRecreateFailureThreshold: 1 }, false);

    streams[0].emit("data", createHealthPing());
    streams[0].emit("end");
    await jest.advanceTimersByTimeAsync(0);
    await flushPromises();

    expect(generateClient).toHaveBeenCalledTimes(1);
    expect(stub.getWorkItems).toHaveBeenCalledTimes(2);
    await stopWorker(worker);
  });

  it("counts an empty graceful drain as a poisoned channel failure", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const streams: MockStream[] = [];
    const stubsCreated: MockStub[] = [];
    const generateClient = useNewStubPerClient(streams, stubsCreated);
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      channelRecreateFailureThreshold: 1,
    });

    await worker.start();
    await flushPromises();
    streams[0].emit("end");
    await jest.advanceTimersByTimeAsync(0);
    await flushPromises();

    expect(generateClient).toHaveBeenCalledTimes(2);
    await stopWorker(worker);
  });

  it("counts a silent disconnect as a poisoned channel failure", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const streams: MockStream[] = [];
    const stubsCreated: MockStub[] = [];
    const generateClient = useNewStubPerClient(streams, stubsCreated);
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      silentDisconnectTimeoutMs: 100,
      channelRecreateFailureThreshold: 1,
    });

    await worker.start();
    await flushPromises();
    await jest.advanceTimersByTimeAsync(100);
    await flushPromises();

    expect(streams[0].cancel).toHaveBeenCalledTimes(1);
    expect(generateClient).toHaveBeenCalledTimes(2);
    await stopWorker(worker);
  });

  it("logs a silent disconnect distinctly from a graceful drain", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const { logger, eventIds } = createCapturingLogger();
    const streams: MockStream[] = [];
    const stub = createStub(streams);
    useStub(stub);
    const worker = new TaskHubGrpcWorker({
      logger,
      silentDisconnectTimeoutMs: 100,
    });

    await worker.start();
    await flushPromises();
    await jest.advanceTimersByTimeAsync(100);
    await flushPromises();

    expect(eventIds).toContain(EVENT_STREAM_TIMEOUT);
    expect(eventIds).not.toContain(EVENT_STREAM_ENDED);
    await stopWorker(worker);
  });

  it.each([grpc.status.CANCELLED, grpc.status.UNAUTHENTICATED, grpc.status.NOT_FOUND])(
    "does not recreate the channel for non-poisoning gRPC status %s",
    async (status) => {
      jest.spyOn(Math, "random").mockReturnValue(0);
      const streams: MockStream[] = [];
      const stub = createStub(streams, [status, null]);
      const generateClient = useStub(stub);
      const worker = new TaskHubGrpcWorker({
        logger: new NoOpLogger(),
        channelRecreateFailureThreshold: 1,
      });

      await worker.start();
      await flushPromises();
      await jest.advanceTimersByTimeAsync(0);
      await flushPromises();

      expect(generateClient).toHaveBeenCalledTimes(1);
      expect(stub.getWorkItems).toHaveBeenCalledTimes(1);
      await stopWorker(worker);
    },
  );

  it("resets prior poisoned failures after an authentication response", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const streams: MockStream[] = [];
    const stub = createStub(streams, [
      grpc.status.UNAVAILABLE,
      grpc.status.UNAUTHENTICATED,
      grpc.status.UNAVAILABLE,
      null,
    ]);
    const generateClient = useStub(stub);
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      channelRecreateFailureThreshold: 2,
    });

    await worker.start();
    await flushPromises();
    for (let retry = 0; retry < 10; retry++) {
      await jest.advanceTimersByTimeAsync(1);
      await flushPromises();
    }

    expect(generateClient).toHaveBeenCalledTimes(1);
    expect(stub.getWorkItems).toHaveBeenCalledTimes(1);
    await stopWorker(worker);
  });

  it("resets reconnect backoff only after the first stream message", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    const streams: MockStream[] = [];
    const stub = createStub(streams, [grpc.status.UNAVAILABLE, null]);
    const worker = await startWorker(stub);

    await jest.advanceTimersByTimeAsync(500);
    await flushPromises();
    expect((worker as any)._backoff.attemptCount).toBe(1);

    streams[0].emit("data", createHealthPing());

    expect((worker as any)._backoff.attemptCount).toBe(0);
    await stopWorker(worker);
  });

  it("sets a 30-second deadline on every hello and retries an initial failure", async () => {
    jest.spyOn(Math, "random").mockReturnValue(1);
    const deadlines: number[] = [];
    const hello = jest.fn((...args: any[]) => {
      deadlines.push((args[2] as grpc.CallOptions).deadline!.valueOf() - Date.now());
      (args.at(-1) as HelloCallback)(new Error("unavailable") as grpc.ServiceError, new Empty());
      return createUnaryCall();
    });
    const stub = {
      hello,
      getWorkItems: jest.fn(),
      close: jest.fn(),
    } as unknown as MockStub;
    const logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } satisfies Logger;
    useStub(stub);
    const worker = new TaskHubGrpcWorker({ logger });

    await worker.start();
    await flushPromises();
    await jest.advanceTimersByTimeAsync(2000);

    expect(hello).toHaveBeenCalledTimes(2);
    expect(deadlines).toEqual([30000, 30000]);
    expect(logger.error).toHaveBeenCalled();
    await stopWorker(worker);
  });

  it("logs and retries when hello throws synchronously", async () => {
    jest.spyOn(Math, "random").mockReturnValue(1);
    const hello = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("synchronous hello failure");
      })
      .mockImplementation(() => createUnaryCall());
    const stub = {
      hello,
      getWorkItems: jest.fn(),
      close: jest.fn(),
    } as unknown as MockStub;
    const logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } satisfies Logger;
    useStub(stub);
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
    const stub = {
      hello: jest.fn(() => createUnaryCall(cancel)),
      getWorkItems: jest.fn(),
      close: jest.fn(),
    } as unknown as MockStub;
    const worker = await startWorker(stub);

    await stopWorker(worker);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect((worker as any)._isRunning).toBe(false);
  });

  it("observes a synchronous stream close during shutdown", async () => {
    const streams: MockStream[] = [];
    const stub = createStub(streams, [], true);
    const worker = await startWorker(stub);

    await stopWorker(worker);

    expect(streams[0].cancel).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("cancels reconnect backoff and prevents a stopped run from reconnecting", async () => {
    const streams: MockStream[] = [];
    const stub = createStub(streams, [grpc.status.UNAVAILABLE]);
    const generateClient = useStub(stub);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });

    await worker.start();
    await flushPromises();
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    await stopWorker(worker);
    await jest.advanceTimersByTimeAsync(60000);

    expect(generateClient).toHaveBeenCalledTimes(1);
    expect(stub.hello).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
