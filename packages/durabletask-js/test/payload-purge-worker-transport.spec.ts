// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { TaskHubGrpcWorker, NoOpLogger, PayloadStore, ActivityContext } from "../src";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import * as lp from "../src/proto/large_payload_purge_pb";
import { LargePayloadPurgeService, ILargePayloadPurgeServer } from "../src/proto/large_payload_purge_grpc_pb";
import { BlobPurgeConstants } from "../src/payloads/purge";

class Store extends PayloadStore {
  async upload(): Promise<string> {
    return "blob:v2:https://account.invalid/c/blob";
  }
  async download(): Promise<string> {
    return "null";
  }
  isKnownPayloadToken(value: string): boolean {
    return value.startsWith("blob:");
  }
}

it("uses the current authenticated sidecar transport for reserved fetch/report activities", async () => {
  const calls: string[] = [];
  let rpcError: grpc.status | undefined;
  const server = new grpc.Server();
  const service = {
    getLargePayloadTombstones: (call, callback) => {
      calls.push("fetch");
      expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
      expect(Number(call.getDeadline()) - Date.now()).toBeLessThanOrEqual(61000);
      if (rpcError !== undefined) callback({ code: rpcError, message: "backend" });
      else
        callback(
          null,
          new lp.GetLargePayloadTombstonesResponse().setTombstonesList([
            new lp.LargePayloadTombstone()
              .setTombstoneToken("opaque:\u00e9:do-not-parse")
              .setPayloadToken("blob:v2:https://a.invalid/c/b"),
          ]),
        );
    },
    reportLargePayloadPurgeResults: (call, callback) => {
      calls.push("report");
      expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
      expect(Number(call.getDeadline()) - Date.now()).toBeLessThanOrEqual(61000);
      expect(call.request.getResultsList()[0].getTombstoneToken()).toBe("opaque:\u00e9:do-not-parse");
      callback(null, new lp.ReportLargePayloadPurgeResultsResponse());
    },
  } satisfies Pick<ILargePayloadPurgeServer, "getLargePayloadTombstones" | "reportLargePayloadPurgeResults">;
  server.addService(LargePayloadPurgeService, service);
  const port = await new Promise<number>((resolve, reject) =>
    server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, port) =>
      error ? reject(error) : resolve(port),
    ),
  );
  const first = new stubs.TaskHubSidecarServiceClient(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
  const replacement = new stubs.TaskHubSidecarServiceClient(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
  const firstCall = jest.spyOn(first, "makeUnaryRequest");
  const replacementCall = jest.spyOn(replacement, "makeUnaryRequest");
  try {
    const worker = new TaskHubGrpcWorker({
      payloads: { store: new Store() },
      logger: new NoOpLogger(),
      metadataGenerator: async () => {
        const metadata = new grpc.Metadata();
        metadata.set("taskhub", "payload-test");
        return metadata;
      },
    });
    worker["_stub"] = first;
    const fetch = worker["_registry"].getActivity(BlobPurgeConstants.fetch)!;
    const report = worker["_registry"].getActivity(BlobPurgeConstants.report)!;
    const tombstones = await fetch(new ActivityContext("job", 0), 10);
    expect(tombstones).toEqual([
      { TombstoneToken: "opaque:\u00e9:do-not-parse", PayloadToken: "blob:v2:https://a.invalid/c/b" },
    ]);
    worker["_stub"] = replacement;
    await report(new ActivityContext("job", 1), [{ TombstoneToken: tombstones[0].TombstoneToken, Disposition: 1 }]);
    expect(firstCall).toHaveBeenCalledTimes(1);
    expect(replacementCall).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["fetch", "report"]);
    rpcError = grpc.status.FAILED_PRECONDITION;
    expect(await fetch(new ActivityContext("job", 2), 10)).toEqual([]);
    rpcError = grpc.status.UNIMPLEMENTED;
    await expect(fetch(new ActivityContext("job", 3), 10)).rejects.toMatchObject({
      name: "System.NotImplementedException",
    });
  } finally {
    first.close();
    replacement.close();
    server.forceShutdown();
  }
});
