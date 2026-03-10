// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { EventEmitter } from "events";
import * as grpc from "@grpc/grpc-js";
import * as pb from "../src/proto/orchestrator_service_pb";
import { TaskHubGrpcClient } from "../src/client/client";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";

/**
 * Creates a mock gRPC readable stream backed by an EventEmitter.
 * Tracks whether destroy() was called.
 */
function createMockStream() {
  const emitter = new EventEmitter();
  const mockStream = Object.assign(emitter, {
    destroyed: false,
    destroy: jest.fn(() => {
      mockStream.destroyed = true;
    }),
    cancel: jest.fn(),
    getPeer: jest.fn(() => "localhost:4001"),
  });
  return mockStream;
}

/**
 * Creates a mock gRPC stub with streamInstanceHistory returning the given mock stream.
 */
function createMockStub(mockStream: ReturnType<typeof createMockStream>) {
  return {
    streamInstanceHistory: jest.fn(() => mockStream),
    close: jest.fn(),
  };
}

/**
 * Creates a HistoryChunk proto with a single ExecutionStarted event.
 */
function createMockHistoryChunk(): pb.HistoryChunk {
  const chunk = new pb.HistoryChunk();
  const event = new pb.HistoryEvent();
  event.setEventid(1);
  const ts = new Timestamp();
  ts.fromDate(new Date());
  event.setTimestamp(ts);
  const executionStarted = new pb.ExecutionStartedEvent();
  executionStarted.setName("TestOrchestration");
  event.setExecutionstarted(executionStarted);
  chunk.setEventsList([event]);
  return chunk;
}

describe("TaskHubGrpcClient stream cleanup", () => {
  let client: TaskHubGrpcClient;
  let mockStream: ReturnType<typeof createMockStream>;
  let mockStub: ReturnType<typeof createMockStub>;

  beforeEach(() => {
    mockStream = createMockStream();
    mockStub = createMockStub(mockStream);

    // Create a client with a dummy address, then replace the stub with our mock
    client = new TaskHubGrpcClient({ hostAddress: "localhost:4001" });
    (client as any)._stub = mockStub;
  });

  describe("getOrchestrationHistory", () => {
    it("should destroy stream on successful completion", async () => {
      // Arrange
      const promise = client.getOrchestrationHistory("test-instance");

      // Act - simulate stream emitting data then ending
      mockStream.emit("data", createMockHistoryChunk());
      mockStream.emit("end");

      const result = await promise;

      // Assert
      expect(result).toHaveLength(1);
      expect(mockStream.destroy).toHaveBeenCalledTimes(1);
    });

    it("should destroy stream when receiving empty history", async () => {
      // Arrange
      const promise = client.getOrchestrationHistory("test-instance");

      // Act - simulate stream ending without data
      mockStream.emit("end");

      const result = await promise;

      // Assert
      expect(result).toHaveLength(0);
      expect(mockStream.destroy).toHaveBeenCalledTimes(1);
    });

    it("should destroy stream on NOT_FOUND error", async () => {
      // Arrange
      const promise = client.getOrchestrationHistory("nonexistent-instance");

      // Act - simulate NOT_FOUND error
      const error = Object.assign(new Error("Not found"), {
        code: grpc.status.NOT_FOUND,
        details: "Not found",
        metadata: new grpc.Metadata(),
      });
      mockStream.emit("error", error);

      const result = await promise;

      // Assert - NOT_FOUND resolves with empty array
      expect(result).toHaveLength(0);
      expect(mockStream.destroy).toHaveBeenCalledTimes(1);
    });

    it("should destroy stream on CANCELLED error", async () => {
      // Arrange
      const promise = client.getOrchestrationHistory("test-instance");

      // Act - simulate CANCELLED error
      const error = Object.assign(new Error("Cancelled"), {
        code: grpc.status.CANCELLED,
        details: "Cancelled",
        metadata: new grpc.Metadata(),
      });
      mockStream.emit("error", error);

      // Assert
      await expect(promise).rejects.toThrow("canceled");
      expect(mockStream.destroy).toHaveBeenCalledTimes(1);
    });

    it("should destroy stream on INTERNAL error", async () => {
      // Arrange
      const promise = client.getOrchestrationHistory("test-instance");

      // Act - simulate INTERNAL error
      const error = Object.assign(new Error("Internal"), {
        code: grpc.status.INTERNAL,
        details: "Internal",
        metadata: new grpc.Metadata(),
      });
      mockStream.emit("error", error);

      // Assert
      await expect(promise).rejects.toThrow("error occurred while retrieving the history");
      expect(mockStream.destroy).toHaveBeenCalledTimes(1);
    });

    it("should destroy stream on unexpected gRPC error", async () => {
      // Arrange
      const promise = client.getOrchestrationHistory("test-instance");

      // Act - simulate unexpected error (e.g. UNAVAILABLE)
      const error = Object.assign(new Error("Unavailable"), {
        code: grpc.status.UNAVAILABLE,
        details: "Unavailable",
        metadata: new grpc.Metadata(),
      });
      mockStream.emit("error", error);

      // Assert
      await expect(promise).rejects.toThrow("Unavailable");
      expect(mockStream.destroy).toHaveBeenCalledTimes(1);
    });

    it("should destroy stream after processing multiple data chunks", async () => {
      // Arrange
      const promise = client.getOrchestrationHistory("test-instance");

      // Act - simulate multiple chunks then end
      mockStream.emit("data", createMockHistoryChunk());
      mockStream.emit("data", createMockHistoryChunk());
      mockStream.emit("data", createMockHistoryChunk());
      mockStream.emit("end");

      const result = await promise;

      // Assert
      expect(result).toHaveLength(3);
      expect(mockStream.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
