// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Tests that the TaskHubGrpcWorker correctly recovers when the gRPC work-item
 * stream fails explicitly or remains open without delivering messages.
 *
 * This covers transport errors that omit a subsequent "end" event and half-open
 * HTTP/2 connections that emit neither messages nor terminal events.
 */

import { EventEmitter } from "events";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { NoOpLogger } from "../src/types/logger.type";
import { GrpcClient } from "../src/client/client-grpc";
import * as pb from "../src/proto/orchestrator_service_pb";

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
    hello: (_req: any, _metadata: any, _options: any, callback: (err: any, res: any) => void) => {
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
  describe("silent stream watchdog", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      "rejects an invalid silent disconnect timeout (%s)",
      (silentDisconnectTimeoutMs) => {
        expect(
          () =>
            new TaskHubGrpcWorker({
              logger: new NoOpLogger(),
              silentDisconnectTimeoutMs,
            }),
        ).toThrow("silentDisconnectTimeoutMs must be a positive finite number");
      },
    );

    it("rejects a silent disconnect timeout above the Node.js timer limit", () => {
      expect(
        () =>
          new TaskHubGrpcWorker({
            logger: new NoOpLogger(),
            silentDisconnectTimeoutMs: 2_147_483_648,
          }),
      ).toThrow("silentDisconnectTimeoutMs must be no greater than 2147483647");
    });

    it("accepts the maximum Node.js timer delay", () => {
      expect(
        () =>
          new TaskHubGrpcWorker({
            logger: new NoOpLogger(),
            silentDisconnectTimeoutMs: 2_147_483_647,
          }),
      ).not.toThrow();
    });

    it("cancels a permanently silent stream and reconnects", async () => {
      const worker = new TaskHubGrpcWorker({
        logger: new NoOpLogger(),
        silentDisconnectTimeoutMs: 100,
      });
      const { client, mockStream } = createMockClient();
      const retryMock = jest.fn().mockResolvedValue(undefined);
      (worker as any)._createNewClientAndRetry = retryMock;

      await worker.internalRunWorker(client);
      await jest.advanceTimersByTimeAsync(99);

      expect(mockStream.cancel).not.toHaveBeenCalled();
      expect(retryMock).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);

      expect(mockStream.cancel).toHaveBeenCalledTimes(1);
      expect(mockStream.destroy).toHaveBeenCalledTimes(1);
      expect(retryMock).toHaveBeenCalledTimes(1);
    });

    it("uses a 120-second silence window by default", async () => {
      const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
      const { client, mockStream } = createMockClient();
      const retryMock = jest.fn().mockResolvedValue(undefined);
      (worker as any)._createNewClientAndRetry = retryMock;

      await worker.internalRunWorker(client);
      await jest.advanceTimersByTimeAsync(119999);

      expect(mockStream.cancel).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);

      expect(mockStream.cancel).toHaveBeenCalledTimes(1);
      expect(retryMock).toHaveBeenCalledTimes(1);
    });

    it("resets the deadline for every message, including health pings", async () => {
      const worker = new TaskHubGrpcWorker({
        logger: new NoOpLogger(),
        silentDisconnectTimeoutMs: 100,
      });
      const { client, mockStream } = createMockClient();
      const retryMock = jest.fn().mockResolvedValue(undefined);
      (worker as any)._createNewClientAndRetry = retryMock;

      await worker.internalRunWorker(client);
      await jest.advanceTimersByTimeAsync(60);
      mockStream.emit("data", new pb.WorkItem());
      await jest.advanceTimersByTimeAsync(60);

      expect(mockStream.cancel).not.toHaveBeenCalled();

      const healthPing = new pb.WorkItem();
      healthPing.setHealthping(new pb.HealthPing());
      mockStream.emit("data", healthPing);
      await jest.advanceTimersByTimeAsync(99);

      expect(mockStream.cancel).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);

      expect(mockStream.cancel).toHaveBeenCalledTimes(1);
      expect(retryMock).toHaveBeenCalledTimes(1);
    });

    it.each(["error", "end"] as const)("cleans up the watchdog after a stream %s", async (event) => {
      const worker = new TaskHubGrpcWorker({
        logger: new NoOpLogger(),
        silentDisconnectTimeoutMs: 100,
      });
      const { client, mockStream } = createMockClient();
      const retryMock = jest.fn().mockResolvedValue(undefined);
      (worker as any)._createNewClientAndRetry = retryMock;

      await worker.internalRunWorker(client);
      if (event === "error") {
        mockStream.emit("error", new Error("14 UNAVAILABLE: Connection lost"));
      } else {
        mockStream.emit("end");
      }

      expect(retryMock).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);

      await jest.advanceTimersByTimeAsync(100);

      expect(retryMock).toHaveBeenCalledTimes(1);
      expect(mockStream.cancel).not.toHaveBeenCalled();
    });

    it("cancels the watchdog during shutdown without reconnecting", async () => {
      const worker = new TaskHubGrpcWorker({
        logger: new NoOpLogger(),
        silentDisconnectTimeoutMs: 10000,
      });
      const { client, mockStream } = createMockClient();
      const retryMock = jest.fn().mockResolvedValue(undefined);
      (worker as any)._createNewClientAndRetry = retryMock;
      (worker as any)._isRunning = true;
      mockStream.cancel.mockImplementation(() => {
        setTimeout(() => mockStream.emit("close"), 0);
      });

      await worker.internalRunWorker(client);
      const stopPromise = worker.stop();
      await jest.advanceTimersByTimeAsync(1000);
      await stopPromise;

      expect(jest.getTimerCount()).toBe(0);

      await jest.advanceTimersByTimeAsync(10000);

      expect(retryMock).not.toHaveBeenCalled();
    });
  });

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

  it("should not crash if _createNewClientAndRetry rejects during error recovery", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const { client, mockStream } = createMockClient();

    // Simulate a retry that throws — must not become an unhandled rejection
    const retryMock = jest.fn().mockRejectedValue(new Error("Retry failed"));
    (worker as any)._createNewClientAndRetry = retryMock;

    await worker.internalRunWorker(client);

    // Should not throw or cause unhandled promise rejection
    mockStream.emit("error", new Error("14 UNAVAILABLE: Connection lost"));
    await flushAsync();

    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(mockStream.destroy).toHaveBeenCalled();
  });

  it("should not crash if _createNewClientAndRetry rejects during end recovery", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const { client, mockStream } = createMockClient();

    // Simulate a retry that throws — must not become an unhandled rejection
    const retryMock = jest.fn().mockRejectedValue(new Error("Retry failed"));
    (worker as any)._createNewClientAndRetry = retryMock;

    await worker.internalRunWorker(client);

    // Should not throw or cause unhandled promise rejection
    mockStream.emit("end");
    await flushAsync();

    expect(retryMock).toHaveBeenCalledTimes(1);
    expect(mockStream.destroy).toHaveBeenCalled();
  });

  it("should also add no-op error guard in end handler to prevent crashes after cleanup", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const { client, mockStream } = createMockClient();

    const retryMock = jest.fn().mockResolvedValue(undefined);
    (worker as any)._createNewClientAndRetry = retryMock;

    await worker.internalRunWorker(client);

    // End fires → cleanup removes all listeners
    mockStream.emit("end");
    await flushAsync();

    // A stale error after end cleanup must not crash
    expect(() => {
      mockStream.emit("error", new Error("Stale error after end cleanup"));
    }).not.toThrow();

    // The no-op guard should remain
    expect(mockStream.listenerCount("error")).toBe(1);
  });
});
