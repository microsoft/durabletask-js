// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Tests that TaskHubGrpcClient.getOrchestrationHistory properly cleans up the
 * gRPC stream after completion or error.
 *
 * Without proper cleanup (removeAllListeners + no-op error handler + destroy),
 * the stream can leak resources and a late "error" event after removeAllListeners()
 * will be unhandled — crashing the Node.js process.
 */

import { EventEmitter } from "events";
import * as grpc from "@grpc/grpc-js";
import { TaskHubGrpcClient } from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";

/**
 * Creates a mock stream that tracks destroy and cancel calls.
 */
function createMockStream(): EventEmitter & {
  destroy: jest.Mock;
  cancel: jest.Mock;
} {
  const mockStream = new EventEmitter() as EventEmitter & {
    destroy: jest.Mock;
    cancel: jest.Mock;
  };
  mockStream.destroy = jest.fn();
  mockStream.cancel = jest.fn();
  return mockStream;
}

/**
 * Creates a mock gRPC ServiceError with the specified status code and details.
 */
function createGrpcError(code: grpc.status, details: string = ""): grpc.ServiceError {
  const error = new Error(details) as grpc.ServiceError;
  error.code = code;
  error.details = details;
  error.metadata = new grpc.Metadata();
  return error;
}

/**
 * Creates a HistoryChunk protobuf message with a single OrchestratorStarted event.
 */
function createHistoryChunk(): pb.HistoryChunk {
  const chunk = new pb.HistoryChunk();
  const event = new pb.HistoryEvent();
  event.setEventid(1);
  event.setTimestamp(Timestamp.fromDate(new Date()));
  const orchestratorStarted = new pb.OrchestratorStartedEvent();
  event.setOrchestratorstarted(orchestratorStarted);
  chunk.setEventsList([event]);
  return chunk;
}

/**
 * Accesses the internal _stub on a TaskHubGrpcClient for test mocking.
 */
function getStub(client: TaskHubGrpcClient): any {
  return (client as any)._stub;
}

describe("TaskHubGrpcClient.getOrchestrationHistory stream cleanup", () => {
  let client: TaskHubGrpcClient;
  let mockStream: ReturnType<typeof createMockStream>;

  beforeEach(() => {
    client = new TaskHubGrpcClient({ hostAddress: "localhost:4001" });
    mockStream = createMockStream();
    getStub(client).streamInstanceHistory = jest.fn().mockReturnValue(mockStream);
  });

  it("should destroy the stream after successful completion", async () => {
    const historyPromise = client.getOrchestrationHistory("test-instance");

    // Emit some data followed by end
    mockStream.emit("data", createHistoryChunk());
    mockStream.emit("end");

    const history = await historyPromise;
    expect(history).toHaveLength(1);
    expect(mockStream.destroy).toHaveBeenCalled();
  });

  it("should destroy the stream after a gRPC INTERNAL error", async () => {
    const historyPromise = client.getOrchestrationHistory("test-instance");

    const grpcError = createGrpcError(grpc.status.INTERNAL, "Internal server error");
    mockStream.emit("error", grpcError);

    await expect(historyPromise).rejects.toThrow("An error occurred while retrieving the history");
    expect(mockStream.destroy).toHaveBeenCalled();
  });

  it("should destroy the stream after NOT_FOUND error (resolves with empty array)", async () => {
    const historyPromise = client.getOrchestrationHistory("test-instance");

    const grpcError = createGrpcError(grpc.status.NOT_FOUND, "Not found");
    mockStream.emit("error", grpcError);

    const history = await historyPromise;
    expect(history).toEqual([]);
    expect(mockStream.destroy).toHaveBeenCalled();
  });

  it("should destroy the stream after CANCELLED error", async () => {
    const historyPromise = client.getOrchestrationHistory("test-instance");

    const grpcError = createGrpcError(grpc.status.CANCELLED, "Cancelled");
    mockStream.emit("error", grpcError);

    await expect(historyPromise).rejects.toThrow("was canceled");
    expect(mockStream.destroy).toHaveBeenCalled();
  });

  it("should not crash from a late error event after successful stream end", async () => {
    const historyPromise = client.getOrchestrationHistory("test-instance");

    mockStream.emit("end");
    await historyPromise;

    // After cleanup, a late error event must not throw.
    // Without the no-op error handler added after removeAllListeners(),
    // this would crash the process with an unhandled 'error' event.
    expect(() => {
      mockStream.emit("error", new Error("Late error after cleanup"));
    }).not.toThrow();
  });

  it("should not crash from a late error event after stream error", async () => {
    const historyPromise = client.getOrchestrationHistory("test-instance");

    const grpcError = createGrpcError(grpc.status.NOT_FOUND, "Not found");
    mockStream.emit("error", grpcError);

    await historyPromise; // Resolves with [] for NOT_FOUND

    // After cleanup, a late error event must not throw.
    expect(() => {
      mockStream.emit("error", new Error("Late error after cleanup"));
    }).not.toThrow();
  });

  it("should validate instanceId parameter", async () => {
    await expect(client.getOrchestrationHistory("")).rejects.toThrow("instanceId is required");
  });

  it("should rethrow unrecognized gRPC errors without wrapping", async () => {
    const historyPromise = client.getOrchestrationHistory("test-instance");

    const grpcError = createGrpcError(grpc.status.PERMISSION_DENIED, "Denied");
    mockStream.emit("error", grpcError);

    await expect(historyPromise).rejects.toBe(grpcError);
    expect(mockStream.destroy).toHaveBeenCalled();
  });
});
