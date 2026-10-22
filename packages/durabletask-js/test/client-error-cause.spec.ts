// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "events";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { NoOpLogger, PayloadStore, TaskHubGrpcClient } from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";

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

class ErrorDomainPayloadStore extends PayloadStore {
  readonly values = new Map<string, string>();
  upload = jest.fn(async (value: string, _signal?: AbortSignal) => {
    const token = `payload:${this.values.size}`;
    this.values.set(token, value);
    return token;
  });
  download = jest.fn(async (token: string, _signal?: AbortSignal) => {
    if (!this.values.has(token)) throw new Error(`Missing payload: ${token}`);
    return this.values.get(token)!;
  });
  isKnownPayloadToken(value: string): boolean {
    return value.startsWith("payload:");
  }
}

type ManagementRequest = pb.RewindInstanceRequest | pb.RestartInstanceRequest;
type ManagementResponse = pb.RewindInstanceResponse | pb.RestartInstanceResponse;
type ManagementCallback = (error: grpc.ServiceError | null, response: ManagementResponse) => void;

const managementOperations: {
  name: "rewind" | "restart";
  rpc: "rewindInstance" | "restartInstance";
  invoke: (client: TaskHubGrpcClient) => Promise<unknown>;
  response: () => ManagementResponse;
  mappings: { code: grpc.status; message: string }[];
}[] = [
  {
    name: "rewind",
    rpc: "rewindInstance",
    invoke: (client: TaskHubGrpcClient) => client.rewindInstance("test-instance", "test reason"),
    response: () => new pb.RewindInstanceResponse(),
    mappings: [
      { code: grpc.status.NOT_FOUND, message: "An orchestration with the instanceId 'test-instance' was not found." },
      { code: grpc.status.FAILED_PRECONDITION, message: "backend details" },
      { code: grpc.status.UNIMPLEMENTED, message: "backend details" },
      { code: grpc.status.CANCELLED, message: "The rewind operation for 'test-instance' was canceled." },
    ],
  },
  {
    name: "restart",
    rpc: "restartInstance",
    invoke: (client: TaskHubGrpcClient) => client.restartOrchestration("test-instance", true),
    response: () => new pb.RestartInstanceResponse().setInstanceid("restarted-instance"),
    mappings: [
      { code: grpc.status.NOT_FOUND, message: "An orchestration with the instanceId 'test-instance' was not found." },
      {
        code: grpc.status.FAILED_PRECONDITION,
        message: "An orchestration with the instanceId 'test-instance' cannot be restarted.",
      },
      { code: grpc.status.CANCELLED, message: "The restartOrchestration operation was canceled." },
    ],
  },
];

describe.each([true, false])("unary management error domains with payloads enabled=%s", (payloadsEnabled) => {
  let client: TaskHubGrpcClient;
  let store: ErrorDomainPayloadStore;
  let metadataGenerator: jest.Mock<Promise<grpc.Metadata>, []>;
  const call: grpc.ClientUnaryCall = Object.assign(new EventEmitter(), {
    cancel: jest.fn(),
    getPeer: () => "test",
    getAuthContext: () => null,
  });

  beforeEach(() => {
    store = new ErrorDomainPayloadStore();
    metadataGenerator = jest.fn(async () => new grpc.Metadata());
    client = new TaskHubGrpcClient({
      payloads: payloadsEnabled ? { store, thresholdBytes: 1 } : undefined,
      metadataGenerator,
      logger: new NoOpLogger(),
    });
  });

  afterEach(() => {
    client["_stub"].close();
  });

  if (payloadsEnabled) {
    it("externalizes eligible input once while retrying only RPCs with fresh metadata", async () => {
      const request = new pb.CreateInstanceRequest()
        .setName("workflow")
        .setInstanceid("instance")
        .setInput(new StringValue().setValue('"input"'));
      const response = new pb.CreateInstanceResponse().setInstanceid("instance");
      const failure = Object.freeze(createGrpcError(grpc.status.DEADLINE_EXCEEDED));
      const sentTokens: (string | undefined)[] = [];
      const rpc = jest.fn<
        grpc.ClientUnaryCall,
        [
          pb.CreateInstanceRequest,
          grpc.Metadata,
          (error: grpc.ServiceError | null, res: pb.CreateInstanceResponse) => void,
        ]
      >((req, _metadata, callback) => {
        sentTokens.push(req.getInput()?.getValue());
        callback(sentTokens.length < 3 ? failure : null, response);
        return call;
      });
      metadataGenerator.mockImplementation(async () => {
        const metadata = new grpc.Metadata();
        metadata.set("attempt", String(metadataGenerator.mock.calls.length));
        return metadata;
      });
      const handleRpcError = jest.fn((error: unknown, signal?: AbortSignal) => {
        expect(error).toBe(failure);
        expect(signal).toBe(store.upload.mock.calls[0][1]);
        return true;
      });
      const resolve = jest.spyOn(client["_payloads"]!, "resolve");
      const controller = new AbortController();

      await expect(client["_call"](rpc, request, metadataGenerator, controller.signal, handleRpcError)).resolves.toBe(
        response,
      );

      expect(store.upload).toHaveBeenCalledTimes(1);
      expect(store.values.get("payload:0")).toBe('"input"');
      expect(sentTokens).toEqual(["payload:0", "payload:0", "payload:0"]);
      expect(rpc.mock.calls.every(([req]) => req === request)).toBe(true);
      expect(rpc.mock.calls.map(([, metadata]) => metadata.get("attempt"))).toEqual([["1"], ["2"], ["3"]]);
      expect(handleRpcError).toHaveBeenCalledTimes(2);
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(resolve.mock.invocationCallOrder[0]).toBeGreaterThan(rpc.mock.invocationCallOrder[2]);
    });
  }

  describe.each(managementOperations)("$name", ({ name, rpc: rpcName, invoke, response, mappings }) => {
    let rpc: jest.Mock<grpc.ClientUnaryCall, [ManagementRequest, grpc.Metadata, ManagementCallback]>;

    beforeEach(() => {
      rpc = jest.fn<grpc.ClientUnaryCall, [ManagementRequest, grpc.Metadata, ManagementCallback]>(
        (_req, _metadata, callback) => {
          callback(null, response());
          return call;
        },
      );
      Object.defineProperty(client["_stub"], rpcName, { value: rpc });
    });

    it.each(mappings)(
      "preserves a reused frozen metadata error with mapped status $code without an RPC",
      async ({ code }) => {
        const failure = Object.freeze(createGrpcError(code, "metadata failed"));
        metadataGenerator.mockRejectedValue(failure);

        await expect(invoke(client)).rejects.toBe(failure);
        await expect(invoke(client)).rejects.toBe(failure);
        expect(metadataGenerator).toHaveBeenCalledTimes(2);
        expect(rpc).not.toHaveBeenCalled();
        expect(store.upload).toHaveBeenCalledTimes(payloadsEnabled && name === "rewind" ? 2 : 0);
        expect(store.download).not.toHaveBeenCalled();
      },
    );

    it.each(mappings)("maps genuine RPC status $code with the original frozen cause", async ({ code, message }) => {
      const failure = Object.freeze(createGrpcError(code, "backend details"));
      rpc.mockImplementation((_req, _metadata, callback) => {
        callback(failure, response());
        return call;
      });

      const pending = invoke(client);
      await expect(pending).rejects.toBeInstanceOf(Error);
      await expect(pending).rejects.toMatchObject({ message, cause: failure });
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(metadataGenerator).toHaveBeenCalledTimes(1);
    });

    it("preserves an unmapped RPC error without retry or mutation", async () => {
      const failure = Object.freeze(createGrpcError(grpc.status.INTERNAL, "unknown scheduler error"));
      rpc.mockImplementation((_req, _metadata, callback) => {
        callback(failure, response());
        return call;
      });

      await expect(invoke(client)).rejects.toBe(failure);
      expect(rpc).toHaveBeenCalledTimes(1);
    });

    it("preserves successful request options and result", async () => {
      const result = await invoke(client);
      const request = rpc.mock.calls[0][0];
      expect(request.getInstanceid()).toBe("test-instance");
      if (request instanceof pb.RewindInstanceRequest) {
        expect(request.getReason()?.getValue()).toBe(payloadsEnabled ? "payload:0" : "test reason");
        expect(store.upload).toHaveBeenCalledTimes(payloadsEnabled ? 1 : 0);
        expect(result).toBeUndefined();
      } else {
        expect(request.getRestartwithnewinstanceid()).toBe(true);
        expect(store.upload).not.toHaveBeenCalled();
        expect(result).toBe("restarted-instance");
      }
      expect(rpc).toHaveBeenCalledTimes(1);
    });

    if (payloadsEnabled) {
      it.each(mappings)("does not translate a mapped-status $code abort reason from the RPC", async ({ code }) => {
        const reason = Object.freeze(createGrpcError(code, "caller canceled"));
        rpc.mockImplementation((_req, _metadata, callback) => {
          client["_payloadCancellation"].abort(reason);
          callback(createGrpcError(grpc.status.CANCELLED), response());
          return call;
        });

        await expect(invoke(client)).rejects.toBe(reason);
        expect(rpc).toHaveBeenCalledTimes(1);
        expect(metadataGenerator).toHaveBeenCalledTimes(1);
      });
    }

    if (payloadsEnabled && name === "rewind") {
      it.each(mappings)("preserves upload status $code without invoking metadata or the RPC", async ({ code }) => {
        const failure = Object.freeze(createGrpcError(code, "upload failed"));
        store.upload.mockRejectedValue(failure);

        await expect(invoke(client)).rejects.toBe(failure);
        expect(store.upload).toHaveBeenCalledTimes(1);
        expect(metadataGenerator).not.toHaveBeenCalled();
        expect(rpc).not.toHaveBeenCalled();
      });
    }
  });
});

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
      const grpcError = createGrpcError(grpc.status.FAILED_PRECONDITION, "Orchestration is running");

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
        expect(error.message).toContain("was canceled");
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
      const grpcError = createGrpcError(grpc.status.FAILED_PRECONDITION, "Orchestration is still running");

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
