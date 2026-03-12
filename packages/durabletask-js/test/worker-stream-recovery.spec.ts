// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Tests that the TaskHubGrpcWorker correctly recovers when the gRPC work-item
 * stream emits an "error" event without a subsequent "end" event.
 *
 * This validates the fix for a bug where the stream "error" handler only logged
 * the error but did not clean up the stream or retry the connection — causing
 * the worker to silently stop processing work items after transport-level
 * failures (e.g., UNAVAILABLE, network disconnections).
 */

import { EventEmitter } from "events";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { NoOpLogger } from "../src/types/logger.type";
import { GrpcClient } from "../src/client/client-grpc";

/**
 * Creates a mock GrpcClient whose `hello` call succeeds immediately
 * and whose `getWorkItems` returns a controllable EventEmitter stream.
 */
function createMockClient(): {
  client: GrpcClient;
  mockStream: EventEmitter & { destroy: jest.Mock; cancel: jest.Mock };
} {
  const mockStream = new EventEmitter() as EventEmitter & {
    destroy: jest.Mock;
    cancel: jest.Mock;
  };
  mockStream.destroy = jest.fn();
  mockStream.cancel = jest.fn();

  const stub = {
    hello: (_req: any, _metadata: any, callback: (err: any, res: any) => void) => {
      callback(null, {});
      return {} as any;
    },
    getWorkItems: jest.fn().mockReturnValue(mockStream),
  };

  const client = { stub } as unknown as GrpcClient;
  return { client, mockStream };
}

/** Flush the microtask / next-tick queue so async event handlers complete. */
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("Worker Stream Recovery", () => {
  it("should retry connection after a stream error event", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const { client, mockStream } = createMockClient();

    // Prevent actual reconnection — just record that it was attempted
    const retryMock = jest.fn().mockResolvedValue(undefined);
    (worker as any)._createNewClientAndRetry = retryMock;

    // Start the worker's internal run (sets up stream event handlers)
    await worker.internalRunWorker(client);

    // Simulate a transport-level error with no subsequent "end" event
    mockStream.emit("error", new Error("14 UNAVAILABLE: Connection lost"));
    await flushAsync();

    // The worker must clean up the stream and attempt to reconnect
    expect(mockStream.destroy).toHaveBeenCalled();
    expect(retryMock).toHaveBeenCalledTimes(1);
  });

  it("should not retry when the worker is being stopped", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const { client, mockStream } = createMockClient();

    const retryMock = jest.fn().mockResolvedValue(undefined);
    (worker as any)._createNewClientAndRetry = retryMock;

    await worker.internalRunWorker(client);

    // Signal that the worker is shutting down
    (worker as any)._stopWorker = true;

    mockStream.emit("error", new Error("1 CANCELLED"));
    await flushAsync();

    // During shutdown, errors are silently ignored — no retry
    expect(retryMock).not.toHaveBeenCalled();
    expect(mockStream.destroy).not.toHaveBeenCalled();
  });

  it("should remove all stream listeners during error recovery", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const { client, mockStream } = createMockClient();

    const retryMock = jest.fn().mockResolvedValue(undefined);
    (worker as any)._createNewClientAndRetry = retryMock;

    await worker.internalRunWorker(client);

    // Capture listener counts before error
    const dataListenersBefore = mockStream.listenerCount("data");
    expect(dataListenersBefore).toBeGreaterThan(0);

    mockStream.emit("error", new Error("14 UNAVAILABLE: Connection lost"));
    await flushAsync();

    // After recovery, all original listeners should be removed
    // (only a no-op error guard remains)
    expect(mockStream.listenerCount("data")).toBe(0);
    expect(mockStream.listenerCount("end")).toBe(0);
  });

  it("should not crash if a stale error event fires after recovery cleanup", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const { client, mockStream } = createMockClient();

    const retryMock = jest.fn().mockResolvedValue(undefined);
    (worker as any)._createNewClientAndRetry = retryMock;

    await worker.internalRunWorker(client);

    // First error triggers recovery
    mockStream.emit("error", new Error("14 UNAVAILABLE: Connection lost"));
    await flushAsync();

    // A stale/duplicate error event must not throw (no-op handler remains)
    expect(() => {
      mockStream.emit("error", new Error("Stale error after cleanup"));
    }).not.toThrow();
  });

  it("should recover via the end handler when end fires without error", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const { client, mockStream } = createMockClient();

    const retryMock = jest.fn().mockResolvedValue(undefined);
    (worker as any)._createNewClientAndRetry = retryMock;

    await worker.internalRunWorker(client);

    // Simulate a clean stream end (no error)
    mockStream.emit("end");
    await flushAsync();

    // The "end" handler should also trigger recovery
    expect(mockStream.destroy).toHaveBeenCalled();
    expect(retryMock).toHaveBeenCalledTimes(1);
  });
});
