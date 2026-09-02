// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "events";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { NoOpLogger } from "../src/types/logger.type";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";

type MockStream = EventEmitter & {
  cancel: jest.Mock;
  destroy: jest.Mock;
};

type StreamResult = {
  outcome: "shutdown" | "silentDisconnect" | "gracefulDrain";
  firstMessageObserved: boolean;
};

function createMockStream(): MockStream {
  const stream = new EventEmitter() as MockStream;
  stream.cancel = jest.fn();
  stream.destroy = jest.fn();
  return stream;
}

function consumeStream(
  worker: TaskHubGrpcWorker,
  stream: MockStream,
  signal?: AbortSignal,
  onFirstMessage = jest.fn(),
): Promise<StreamResult> {
  return (worker as any)._consumeWorkItemStream(
    stream as unknown as grpc.ClientReadableStream<pb.WorkItem>,
    {} as stubs.TaskHubSidecarServiceClient,
    signal,
    onFirstMessage,
  );
}

describe("Worker Stream Recovery", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects an invalid silent disconnect timeout (%s)",
    (silentDisconnectTimeoutMs) => {
      expect(
        () =>
          new TaskHubGrpcWorker({
            logger: new NoOpLogger(),
            silentDisconnectTimeoutMs,
          }),
      ).toThrow("silentDisconnectTimeoutMs must be a finite number");
    },
  );

  it.each([0, -1])("disables the watchdog for a non-positive timeout (%s)", async (silentDisconnectTimeoutMs) => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      silentDisconnectTimeoutMs,
    });
    const stream = createMockStream();
    const controller = new AbortController();
    const resultPromise = consumeStream(worker, stream, controller.signal);

    await jest.advanceTimersByTimeAsync(2_147_483_647);

    expect(jest.getTimerCount()).toBe(0);
    expect(stream.cancel).not.toHaveBeenCalled();

    controller.abort();
    await expect(resultPromise).resolves.toEqual({
      outcome: "shutdown",
      firstMessageObserved: false,
    });
  });

  it("clamps an oversized timeout to the largest safe Node.js timer delay", () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      silentDisconnectTimeoutMs: Number.MAX_SAFE_INTEGER,
    });

    expect((worker as any)._silentDisconnectTimeoutMs).toBe(2_147_483_646);
  });

  it("cancels a permanently silent stream", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      silentDisconnectTimeoutMs: 100,
    });
    const stream = createMockStream();
    const resultPromise = consumeStream(worker, stream);

    await jest.advanceTimersByTimeAsync(99);
    expect(stream.cancel).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);

    await expect(resultPromise).resolves.toEqual({
      outcome: "silentDisconnect",
      firstMessageObserved: false,
    });
    expect(stream.cancel).toHaveBeenCalledTimes(1);
    expect(stream.destroy).toHaveBeenCalledTimes(1);
  });

  it("uses a 120-second silence window by default", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const stream = createMockStream();
    const resultPromise = consumeStream(worker, stream);

    await jest.advanceTimersByTimeAsync(119999);
    expect(stream.cancel).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);

    await expect(resultPromise).resolves.toMatchObject({ outcome: "silentDisconnect" });
    expect(stream.cancel).toHaveBeenCalledTimes(1);
  });

  it("resets the deadline for every message and reports the first health ping", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      silentDisconnectTimeoutMs: 100,
    });
    const stream = createMockStream();
    const onFirstMessage = jest.fn();
    const resultPromise = consumeStream(worker, stream, undefined, onFirstMessage);

    await jest.advanceTimersByTimeAsync(60);
    stream.emit("data", new pb.WorkItem());
    await jest.advanceTimersByTimeAsync(60);
    expect(stream.cancel).not.toHaveBeenCalled();

    const healthPing = new pb.WorkItem();
    healthPing.setHealthping(new pb.HealthPing());
    stream.emit("data", healthPing);
    await jest.advanceTimersByTimeAsync(99);
    expect(stream.cancel).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);

    await expect(resultPromise).resolves.toEqual({
      outcome: "silentDisconnect",
      firstMessageObserved: true,
    });
    expect(onFirstMessage).toHaveBeenCalledTimes(1);
  });

  it("cleans up the watchdog when the stream errors", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      silentDisconnectTimeoutMs: 100,
    });
    const stream = createMockStream();
    const resultPromise = consumeStream(worker, stream);
    const error = Object.assign(new Error("unavailable"), {
      code: grpc.status.UNAVAILABLE,
      details: "unavailable",
      metadata: new grpc.Metadata(),
    });

    stream.emit("error", error);

    await expect(resultPromise).rejects.toBe(error);
    expect(jest.getTimerCount()).toBe(0);
    expect(stream.destroy).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(100);
    expect(stream.cancel).not.toHaveBeenCalled();
  });

  it("classifies end as a graceful drain and cleans up the watchdog", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      silentDisconnectTimeoutMs: 100,
    });
    const stream = createMockStream();
    const resultPromise = consumeStream(worker, stream);

    stream.emit("end");

    await expect(resultPromise).resolves.toEqual({
      outcome: "gracefulDrain",
      firstMessageObserved: false,
    });
    expect(jest.getTimerCount()).toBe(0);
    expect(stream.destroy).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(100);
    expect(stream.cancel).not.toHaveBeenCalled();
  });

  it("classifies worker cancellation as shutdown without leaving a watchdog", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      silentDisconnectTimeoutMs: 100,
    });
    const stream = createMockStream();
    const controller = new AbortController();
    const resultPromise = consumeStream(worker, stream, controller.signal);

    controller.abort();

    await expect(resultPromise).resolves.toEqual({
      outcome: "shutdown",
      firstMessageObserved: false,
    });
    expect(jest.getTimerCount()).toBe(0);
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(stream.destroy).not.toHaveBeenCalled();
  });

  it("guards against stale errors after terminal cleanup", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const stream = createMockStream();
    const resultPromise = consumeStream(worker, stream);

    stream.emit("end");
    await resultPromise;

    expect(() => stream.emit("error", new Error("stale error"))).not.toThrow();
    expect(stream.listenerCount("error")).toBe(1);
  });
});
