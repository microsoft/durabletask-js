// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "events";
import { BoolValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { TaskHubGrpcClient } from "../src/client/client";
import { TimeoutError } from "../src/exception/timeout-error";
import { OrchestrationStatus } from "../src/orchestration/enum/orchestration-status.enum";
import { PurgeInstanceCriteria } from "../src/orchestration/orchestration-purge-criteria";
import { PurgeResult } from "../src/orchestration/orchestration-purge-result";
import * as pb from "../src/proto/orchestrator_service_pb";
import { NoOpLogger } from "../src/types/logger.type";

type Callback = (error: grpc.ServiceError | null, response?: pb.PurgeInstancesResponse) => void;

describe("PurgeResult", () => {
  it.each([0, 3])("keeps legacy count-only construction compatible for count %i", (deletedInstanceCount) => {
    expect(new PurgeResult(deletedInstanceCount)).toEqual({ deletedInstanceCount, isComplete: undefined });
  });
});

describe("TaskHubGrpcClient purge", () => {
  let client: TaskHubGrpcClient;
  let criteria: PurgeInstanceCriteria;
  let callback: Callback;
  const createdTimeFrom = new Date("2026-01-01T00:00:00Z");
  const createdTimeTo = new Date("2026-02-01T00:00:00Z");
  const cancel = jest.fn();
  const call: grpc.ClientUnaryCall = Object.assign(new EventEmitter(), {
    cancel,
    getPeer: () => "test",
    getAuthContext: () => null,
  });
  const rpc = jest.fn<grpc.ClientUnaryCall, [pb.PurgeInstancesRequest, grpc.Metadata, Callback]>();

  beforeEach(() => {
    cancel.mockReset();
    rpc.mockReset().mockImplementation((_req, _metadata, cb) => {
      callback = cb;
      return call;
    });
    client = new TaskHubGrpcClient({ logger: new NoOpLogger() });
    Object.defineProperty(client["_stub"], "purgeInstances", { value: rpc });
    criteria = new PurgeInstanceCriteria();
    criteria.setCreatedTimeFrom(createdTimeFrom);
    criteria.setCreatedTimeTo(createdTimeTo);
    criteria.setRuntimeStatusList([OrchestrationStatus.COMPLETED, OrchestrationStatus.FAILED]);
  });

  afterEach(() => {
    client["_stub"].close();
    jest.useRealTimers();
  });

  describe.each(["single instance", "filter"] as const)("%s", (path) => {
    const value = () => (path === "single instance" ? "instance-1" : criteria);

    describe.each([0, 3])("deleted count %i", (deletedInstanceCount) => {
      it.each([true, false, undefined])("preserves wire completion status %p", async (isComplete) => {
        const response = new pb.PurgeInstancesResponse();
        response.setDeletedinstancecount(deletedInstanceCount);
        if (isComplete !== undefined) {
          response.setIscomplete(new BoolValue().setValue(isComplete));
        }

        const result = client.purgeOrchestration(value(), { recursive: true });
        callback(null, pb.PurgeInstancesResponse.deserializeBinary(response.serializeBinary()));

        await expect(result).resolves.toEqual({ deletedInstanceCount, isComplete });
        expect(rpc).toHaveBeenCalledTimes(1);
        const request = rpc.mock.calls[0][0];
        expect(request.getRecursive()).toBe(true);
        expect(request.hasInstancebatch()).toBe(false);
        expect(request.getIsorchestration()).toBe(false);
        if (path === "single instance") {
          expect(request.getInstanceid()).toBe("instance-1");
          expect(request.hasPurgeinstancefilter()).toBe(false);
        } else {
          expect(request.hasInstanceid()).toBe(false);
          const filter = request.getPurgeinstancefilter();
          expect(filter?.getCreatedtimefrom()?.toDate()).toEqual(createdTimeFrom);
          expect(filter?.getCreatedtimeto()?.toDate()).toEqual(createdTimeTo);
          expect(filter?.getRuntimestatusList()).toEqual([
            pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
            pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
          ]);
          expect(filter?.hasTimeout()).toBe(false);
        }
      });
    });

    it.each([undefined, false])("keeps recursive %p disabled", async (recursive) => {
      const result = client.purgeOrchestration(value(), recursive === undefined ? undefined : { recursive });
      callback(null, new pb.PurgeInstancesResponse());

      await result;
      expect(rpc.mock.calls[0][0].getRecursive()).toBe(false);
    });

    it("preserves a missing response", async () => {
      const result = client.purgeOrchestration(value());
      callback(null);

      await expect(result).resolves.toBeUndefined();
    });

    it("propagates service errors unchanged", async () => {
      const error = Object.assign(new Error("remote failure"), {
        code: grpc.status.INTERNAL,
        details: "remote failure",
        metadata: new grpc.Metadata(),
      });
      const result = client.purgeOrchestration(value());
      callback(error);

      await expect(result).rejects.toBe(error);
      expect(rpc).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the filter timeout local without canceling or retrying the RPC", async () => {
    jest.useFakeTimers();
    criteria.setTimeout(50);
    const result = client.purgeOrchestration(criteria);
    const assertion = expect(result).rejects.toEqual(
      new TimeoutError("Timed out waiting for purge operation after 50ms"),
    );

    await jest.advanceTimersByTimeAsync(49);
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    await assertion;
    expect(jest.getTimerCount()).toBe(0);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0].getPurgeinstancefilter()?.hasTimeout()).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
    callback(null, new pb.PurgeInstancesResponse());
  });
});
