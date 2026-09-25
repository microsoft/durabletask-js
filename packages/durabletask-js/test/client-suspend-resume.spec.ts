// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { TaskHubGrpcClient } from "../src/client/client";
import { NoOpLogger } from "../src/types/logger.type";
import * as pb from "../src/proto/orchestrator_service_pb";
import { TaskHubSidecarServiceService } from "../src/proto/orchestrator_service_grpc_pb";

describe("Client suspend/resume reasons over real gRPC", () => {
  const server = new grpc.Server();
  let client: TaskHubGrpcClient;
  let requests: (pb.SuspendRequest | pb.ResumeRequest)[];
  let error: grpc.ServerErrorResponse | null;

  beforeAll(async () => {
    server.addService(TaskHubSidecarServiceService, {
      suspendInstance: (
        call: grpc.ServerUnaryCall<pb.SuspendRequest, pb.SuspendResponse>,
        callback: grpc.sendUnaryData<pb.SuspendResponse>,
      ) => {
        requests.push(call.request);
        callback(error, new pb.SuspendResponse());
      },
      resumeInstance: (
        call: grpc.ServerUnaryCall<pb.ResumeRequest, pb.ResumeResponse>,
        callback: grpc.sendUnaryData<pb.ResumeResponse>,
      ) => {
        requests.push(call.request);
        callback(error, new pb.ResumeResponse());
      },
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
        if (error) reject(error);
        else resolve(boundPort);
      });
    });
    client = new TaskHubGrpcClient({
      hostAddress: `127.0.0.1:${port}`,
      logger: new NoOpLogger(),
    });
  });

  beforeEach(() => {
    requests = [];
    error = null;
  });

  afterAll(async () => {
    await client.stop();
    server.forceShutdown();
  });

  describe.each(["suspendOrchestration", "resumeOrchestration"] as const)("%s", (method) => {
    it.each(['  "maintenance"\n\u6682\u505c  ', "", undefined, null])(
      "preserves the value and presence of reason %p",
      async (reason) => {
        await Reflect.apply(client[method], client, ["instance-1", reason]);

        expect(requests).toHaveLength(1);
        expect(requests[0].getInstanceid()).toBe("instance-1");
        expect(requests[0].hasReason()).toBe(reason != null);
        expect(requests[0].getReason()?.getValue()).toBe(reason ?? undefined);
      },
    );

    it("keeps one-argument calls valid and omits the reason", async () => {
      await client[method]("instance-1");

      expect(requests).toHaveLength(1);
      expect(requests[0].getInstanceid()).toBe("instance-1");
      expect(requests[0].hasReason()).toBe(false);
    });

    it.each(["", undefined, null])("rejects invalid instanceId %p before sending an RPC", async (instanceId) => {
      await expect(Reflect.apply(client[method], client, [instanceId, "maintenance"])).rejects.toThrow(
        "instanceId is required",
      );
      expect(requests).toHaveLength(0);
    });

    it("preserves service failures", async () => {
      error = Object.assign(new Error("Invalid instance state"), {
        code: grpc.status.FAILED_PRECONDITION,
        details: "Invalid instance state",
      });

      await expect(Reflect.apply(client[method], client, ["instance-1", "maintenance"])).rejects.toMatchObject({
        code: grpc.status.FAILED_PRECONDITION,
        details: "Invalid instance state",
      });
      expect(requests).toHaveLength(1);
    });
  });
});
