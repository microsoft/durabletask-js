// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { TaskHubGrpcClient } from "../src";

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
 * Accesses the internal _stub on a TaskHubGrpcClient for test mocking.
 */
function getStub(client: TaskHubGrpcClient): any {
  return (client as any)._stub;
}

describe("TaskHubGrpcClient error cause preservation", () => {
  let client: TaskHubGrpcClient;

  beforeEach(() => {
    client = new TaskHubGrpcClient({ hostAddress: "localhost:4001" });
  });

  describe("rewindInstance", () => {
    it("should preserve error cause for NOT_FOUND gRPC errors", async () => {
      const grpcError = createGrpcError(grpc.status.NOT_FOUND, "Instance not found");

      getStub(client).rewindInstance = (_req: any, _metadata: any, callback: any) => {
        callback(grpcError, null);
        return {} as grpc.ClientUnaryCall;
      };

      try {
        await client.rewindInstance("test-instance", "test reason");
        fail("Expected an error to be thrown");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error);
        const error = e as Error;
        expect(error.message).toContain("test-instance");
        expect(error.message).toContain("was not found");
        expect(error.cause).toBe(grpcError);
      }
    });

    it("should preserve error cause for FAILED_PRECONDITION gRPC errors", async () => {
      const grpcError = createGrpcError(
        grpc.status.FAILED_PRECONDITION,
        "Orchestration is running",
      );

      getStub(client).rewindInstance = (_req: any, _metadata: any, callback: any) => {
        callback(grpcError, null);
        return {} as grpc.ClientUnaryCall;
      };

      try {
        await client.rewindInstance("test-instance", "test reason");
        fail("Expected an error to be thrown");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error);
        const error = e as Error;
        expect(error.message).toBe("Orchestration is running");
        expect(error.cause).toBe(grpcError);
      }
    });

    it("should preserve error cause for UNIMPLEMENTED gRPC errors", async () => {
      const grpcError = createGrpcError(grpc.status.UNIMPLEMENTED, "");

      getStub(client).rewindInstance = (_req: any, _metadata: any, callback: any) => {
        callback(grpcError, null);
        return {} as grpc.ClientUnaryCall;
      };

      try {
        await client.rewindInstance("test-instance", "test reason");
        fail("Expected an error to be thrown");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error);
        const error = e as Error;
        expect(error.message).toContain("not supported by the backend");
        expect(error.cause).toBe(grpcError);
      }
    });

    it("should preserve error cause for CANCELLED gRPC errors", async () => {
      const grpcError = createGrpcError(grpc.status.CANCELLED, "Cancelled");

      getStub(client).rewindInstance = (_req: any, _metadata: any, callback: any) => {
        callback(grpcError, null);
        return {} as grpc.ClientUnaryCall;
      };

      try {
        await client.rewindInstance("test-instance", "test reason");
        fail("Expected an error to be thrown");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error);
        const error = e as Error;
        expect(error.message).toContain("was cancelled");
        expect(error.cause).toBe(grpcError);
      }
    });

    it("should rethrow unrecognized gRPC errors without wrapping", async () => {
      const grpcError = createGrpcError(grpc.status.INTERNAL, "Internal server error");

      getStub(client).rewindInstance = (_req: any, _metadata: any, callback: any) => {
        callback(grpcError, null);
        return {} as grpc.ClientUnaryCall;
      };

      try {
        await client.rewindInstance("test-instance", "test reason");
        fail("Expected an error to be thrown");
      } catch (e: unknown) {
        // Unrecognized gRPC status codes should be rethrown as-is
        expect(e).toBe(grpcError);
      }
    });
  });

  describe("restartOrchestration", () => {
    it("should preserve error cause for NOT_FOUND gRPC errors", async () => {
      const grpcError = createGrpcError(grpc.status.NOT_FOUND, "Instance not found");

      getStub(client).restartInstance = (_req: any, _metadata: any, callback: any) => {
        callback(grpcError, null);
        return {} as grpc.ClientUnaryCall;
      };

      try {
        await client.restartOrchestration("test-instance");
        fail("Expected an error to be thrown");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error);
        const error = e as Error;
        expect(error.message).toContain("test-instance");
        expect(error.message).toContain("was not found");
        expect(error.cause).toBe(grpcError);
      }
    });

    it("should preserve error cause for FAILED_PRECONDITION gRPC errors", async () => {
      const grpcError = createGrpcError(
        grpc.status.FAILED_PRECONDITION,
        "Orchestration is still running",
      );

      getStub(client).restartInstance = (_req: any, _metadata: any, callback: any) => {
        callback(grpcError, null);
        return {} as grpc.ClientUnaryCall;
      };

      try {
        await client.restartOrchestration("test-instance");
        fail("Expected an error to be thrown");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error);
        const error = e as Error;
        expect(error.message).toContain("test-instance");
        expect(error.message).toContain("cannot be restarted");
        expect(error.cause).toBe(grpcError);
      }
    });

    it("should preserve error cause for CANCELLED gRPC errors", async () => {
      const grpcError = createGrpcError(grpc.status.CANCELLED, "Cancelled");

      getStub(client).restartInstance = (_req: any, _metadata: any, callback: any) => {
        callback(grpcError, null);
        return {} as grpc.ClientUnaryCall;
      };

      try {
        await client.restartOrchestration("test-instance");
        fail("Expected an error to be thrown");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error);
        const error = e as Error;
        expect(error.message).toContain("was canceled");
        expect(error.cause).toBe(grpcError);
      }
    });

    it("should rethrow unrecognized gRPC errors without wrapping", async () => {
      const grpcError = createGrpcError(grpc.status.INTERNAL, "Internal server error");

      getStub(client).restartInstance = (_req: any, _metadata: any, callback: any) => {
        callback(grpcError, null);
        return {} as grpc.ClientUnaryCall;
      };

      try {
        await client.restartOrchestration("test-instance");
        fail("Expected an error to be thrown");
      } catch (e: unknown) {
        // Unrecognized gRPC status codes should be rethrown as-is
        expect(e).toBe(grpcError);
      }
    });

    it("should validate instanceId parameter", async () => {
      await expect(client.restartOrchestration("")).rejects.toThrow("instanceId cannot be null or empty");
    });
  });
});
