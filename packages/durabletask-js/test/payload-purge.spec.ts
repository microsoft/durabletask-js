// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  NoOpLogger,
  PayloadStore,
  PayloadDeleteOutcome,
  ActivityContext,
  VersionMatchStrategy,
  WorkItemFilters,
  TaskFailedError,
} from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import * as lp from "../src/proto/large_payload_purge_pb";
import { LargePayloadPurgeService, ILargePayloadPurgeServer } from "../src/proto/large_payload_purge_grpc_pb";
import {
  blobPurgeJobOrchestrator,
  BlobPurgeConstants,
  BlobPurgeOutcome,
  LargePayloadPurgeDisposition,
} from "../src/payloads/purge";
import { deletePayloadChunk } from "../src/payloads/purge-worker";
import { RuntimeOrchestrationContext } from "../src/worker/runtime-orchestration-context";
import { RetryPolicy } from "../src/task/retry/retry-policy";

class Store extends PayloadStore {
  async upload(): Promise<string> {
    return "blob:v2:https://account.invalid/payloads/blob";
  }
  async download(): Promise<string> {
    return "null";
  }
  isKnownPayloadToken(value: string): boolean {
    return value.startsWith("blob:");
  }
  async delete(_token: string): Promise<PayloadDeleteOutcome> {
    return PayloadDeleteOutcome.Deleted;
  }
}
const logger = new NoOpLogger();

describe("large payload auto-purge lifecycle transport", () => {
  let server: grpc.Server;
  let client: TaskHubGrpcClient;
  let calls: string[];
  let start: pb.CreateInstanceRequest | undefined;
  let event: pb.RaiseEventRequest | undefined;
  let startId: string;
  let stateName: string;
  let status: pb.OrchestrationStatus;
  let collision: boolean;
  let hostAddress: string;
  let rpcError: grpc.status | undefined;

  beforeEach(async () => {
    calls = [];
    start = undefined;
    event = undefined;
    startId = BlobPurgeConstants.instanceId;
    stateName = BlobPurgeConstants.orchestrator;
    status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING;
    collision = false;
    rpcError = undefined;
    server = new grpc.Server();
    const sidecar = {
      startInstance: (call, callback) => {
        calls.push("start");
        expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
        start = call.request;
        if (collision) callback({ code: grpc.status.ALREADY_EXISTS, message: "exists" });
        else callback(null, new pb.CreateInstanceResponse().setInstanceid(startId));
      },
      waitForInstanceStart: (call, callback) => {
        calls.push("wait");
        expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
        callback(
          null,
          new pb.GetInstanceResponse()
            .setExists(true)
            .setOrchestrationstate(
              new pb.OrchestrationState()
                .setInstanceid(BlobPurgeConstants.instanceId)
                .setName(stateName)
                .setOrchestrationstatus(status),
            ),
        );
      },
      raiseEvent: (call, callback) => {
        calls.push("event");
        event = call.request;
        expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
        callback(null, new pb.RaiseEventResponse());
      },
    } satisfies Pick<stubs.ITaskHubSidecarServiceServer, "startInstance" | "waitForInstanceStart" | "raiseEvent">;
    server.addService(stubs.TaskHubSidecarServiceService, sidecar);
    const purge = {
      setLargePayloadAutoPurge: (call, callback) => {
        calls.push(`setting:${call.request.getEnabled()}`);
        expect(call.metadata.get("taskhub")).toEqual(["payload-test"]);
        callback(null, new lp.SetLargePayloadAutoPurgeResponse());
      },
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
    } satisfies ILargePayloadPurgeServer;
    server.addService(LargePayloadPurgeService, purge);
    const port = await new Promise<number>((resolve, reject) =>
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, port) =>
        error ? reject(error) : resolve(port),
      ),
    );
    hostAddress = `127.0.0.1:${port}`;
    client = new TaskHubGrpcClient({
      hostAddress,
      defaultVersion: "business",
      metadataGenerator: async () => {
        const metadata = new grpc.Metadata();
        metadata.set("taskhub", "payload-test");
        return metadata;
      },
    });
  });
  afterEach(async () => {
    await client.stop();
    server.forceShutdown();
  });

  it("writes setting first, schedules unversioned singleton, verifies start and sends configuration", async () => {
    await client.setLargePayloadAutoPurge(true, 500);
    expect(calls).toEqual(["setting:true", "start", "wait", "event"]);
    expect(start!.getInstanceid()).toBe(BlobPurgeConstants.instanceId);
    expect(start!.getName()).toBe(BlobPurgeConstants.orchestrator);
    expect(start!.getVersion()?.getValue() ?? "").toBe("");
    expect(JSON.parse(start!.getInput()!.getValue())).toEqual({ PurgeBatchSize: 500, PurgedCount: 0 });
    expect(start!.getOrchestrationidreusepolicy()!.getReplaceablestatusList()).toEqual([
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED,
    ]);
    expect(event!.getName()).toBe("SetBatchSize");
    expect(event!.getInput()!.getValue()).toBe("500");
  });

  it("disables without validating batch, starting, waiting, or signaling", async () => {
    await client.setLargePayloadAutoPurge(false, NaN);
    expect(calls).toEqual(["setting:false"]);
  });

  it.each([0, 1001, NaN, 1.5])("rejects invalid enabling batch %s before mutating the backend", async (batch) => {
    await expect(client.setLargePayloadAutoPurge(true, batch)).rejects.toThrow(RangeError);
    expect(calls).toEqual([]);
  });

  it("rejects an unexpected backend start ID without waiting or signaling", async () => {
    startId = "different";
    await expect(client.setLargePayloadAutoPurge(true)).rejects.toThrow("unexpected");
    expect(calls).toEqual(["setting:true", "start"]);
  });

  it("accepts a deduplicated start only after verifying identity and Running status", async () => {
    collision = true;
    await client.setLargePayloadAutoPurge(true);
    expect(calls).toEqual(["setting:true", "start", "wait", "event"]);
  });

  it.each(["wrong-name", "suspended"])("does not configure a %s reserved-ID collision", async (kind) => {
    collision = true;
    if (kind === "wrong-name") stateName = "business";
    else status = pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED;
    await expect(client.setLargePayloadAutoPurge(true)).rejects.toThrow();
    expect(calls).toEqual(["setting:true", "start", "wait"]);
  });

  it("uses the current authenticated sidecar transport for reserved fetch/report activities", async () => {
    const worker = new TaskHubGrpcWorker({
      payloads: { store: new Store() },
      metadataGenerator: client["_metadataGenerator"],
      logger,
    });
    worker["_stub"] = client["_stub"];
    const fetch = worker["_registry"].getActivity(BlobPurgeConstants.fetch)!;
    const report = worker["_registry"].getActivity(BlobPurgeConstants.report)!;
    const tombstones = await fetch(new ActivityContext("job", 0), 10);
    expect(tombstones).toEqual([
      { TombstoneToken: "opaque:\u00e9:do-not-parse", PayloadToken: "blob:v2:https://a.invalid/c/b" },
    ]);
    await report(new ActivityContext("job", 1), [{ TombstoneToken: tombstones[0].TombstoneToken, Disposition: 1 }]);
    expect(calls).toEqual(["fetch", "report"]);
    rpcError = grpc.status.FAILED_PRECONDITION;
    expect(await fetch(new ActivityContext("job", 2), 10)).toEqual([]);
    rpcError = grpc.status.UNIMPLEMENTED;
    await expect(fetch(new ActivityContext("job", 3), 10)).rejects.toMatchObject({
      name: "System.NotImplementedException",
    });
  });
});

describe("payload purge worker registrations", () => {
  it.each<WorkItemFilters>([{}, { orchestrations: [], activities: [], entities: [] }])(
    "leaves all-empty filters unfiltered",
    (filters) => {
      const worker = new TaskHubGrpcWorker({ payloads: { store: new Store() }, workItemFilters: filters });
      expect(worker["_buildGetWorkItemsRequest"]().getWorkitemfilters()!.toObject()).toEqual({
        orchestrationsList: [],
        activitiesList: [],
        entitiesList: [],
      });
    },
  );
  it("augments entity-only filters, bypasses business versions, and does not mutate caller lists", () => {
    const filters: WorkItemFilters = { entities: [{ name: "counter" }] };
    const worker = new TaskHubGrpcWorker({
      payloads: { store: new Store() },
      workItemFilters: filters,
      versioning: { version: "business", matchStrategy: VersionMatchStrategy.Strict },
    });
    const wire = worker["_buildGetWorkItemsRequest"]().getWorkitemfilters()!;
    expect(wire.getOrchestrationsList().map((f) => [f.getName(), f.getVersionsList()])).toEqual([
      [BlobPurgeConstants.orchestrator, []],
    ]);
    expect(wire.getActivitiesList()).toHaveLength(3);
    expect(filters).toEqual({ entities: [{ name: "counter" }] });
    expect(worker["_checkVersionCompatibility"]("", BlobPurgeConstants.orchestrator).compatible).toBe(true);
    expect(worker["_checkVersionCompatibility"]("", "business").compatible).toBe(false);
  });
});

describe("purge delete classification", () => {
  it("bounds deletes at eight and preserves positional dispositions without logging tokens", async () => {
    const store = new Store();
    let active = 0;
    let max = 0;
    store.delete = async (token) => {
      max = Math.max(max, ++active);
      await new Promise((resolve) => setImmediate(resolve));
      active--;
      if (token.endsWith("error")) throw Object.assign(new Error(token), { statusCode: 403 });
      return PayloadDeleteOutcome.Deleted;
    };
    const tokens = Array.from({ length: 50 }, (_, i) => `blob:v2:https://a.invalid/c/${i === 3 ? "error" : i}`);
    const warn = jest.fn();
    const outcomes = await deletePayloadChunk(store, tokens, {
      ...logger,
      warn,
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    });
    expect(max).toBe(8);
    expect(outcomes.map((o) => o.Disposition)).toEqual(tokens.map((_, i) => (i === 3 ? 2 : 1)));
    expect(JSON.stringify(warn.mock.calls)).not.toContain("a.invalid");
  });
  it.each([
    ["blob:v1:c:b", 3],
    ["blob:v3:future", 2],
  ])("does not delete %s", async (token, disposition) => {
    const store = new Store();
    store.delete = jest.fn();
    expect(await deletePayloadChunk(store, [token], logger)).toEqual([{ Disposition: disposition }]);
    expect(store.delete).not.toHaveBeenCalled();
  });
  it.each([
    [new TypeError("bad token"), 3],
    [Object.assign(new Error("bad"), { statusCode: 400 }), 3],
    [Object.assign(new Error("bad"), { statusCode: 401 }), 2],
    [Object.assign(new Error("bad"), { statusCode: 412 }), 2],
    [new Error("network"), 2],
  ])("classifies storage errors without losing tombstones (%#)", async (error, disposition) => {
    const store = new Store();
    store.delete = async () => {
      throw error;
    };
    expect(await deletePayloadChunk(store, ["blob:v2:https://a.invalid/c/b"], logger)).toEqual([
      { Disposition: disposition },
    ]);
  });
  it.each([PayloadDeleteOutcome.Deleted, PayloadDeleteOutcome.AlreadyAbsent, PayloadDeleteOutcome.NotStoreOwned])(
    "maps confirmed delete outcome %s to terminal success",
    async (outcome) => {
      const store = new Store();
      store.delete = async () => outcome;
      expect(await deletePayloadChunk(store, ["blob:v2:https://a.invalid/c/b"], logger)).toEqual([{ Disposition: 1 }]);
    },
  );
});

describe("replay-safe purge runner", () => {
  it("chunks 50 tokens, schedules four chunks per wave, and echoes opaque tombstones unchanged", async () => {
    const context = new RuntimeOrchestrationContext("job");
    const run = blobPurgeJobOrchestrator(context, { PurgeBatchSize: 500, PurgedCount: 2 });
    await run.next();
    const tombstones = Array.from({ length: 251 }, (_, i) => ({
      TombstoneToken: `opaque:${i}`,
      PayloadToken: `blob:v2:https://a/c/${i}`,
    }));
    await run.next(tombstones);
    let actions = Object.values(context._pendingActions);
    expect(actions.filter((a) => a.getScheduletask()?.getName() === BlobPurgeConstants.delete)).toHaveLength(4);
    await run.next(Array.from({ length: 4 }, () => Array.from({ length: 50 }, () => ({ Disposition: 1 }))));
    actions = Object.values(context._pendingActions);
    expect(actions.filter((a) => a.getScheduletask()?.getName() === BlobPurgeConstants.delete)).toHaveLength(6);
    await run.next([Array.from({ length: 50 }, () => ({ Disposition: 1 })), [{ Disposition: 1 }]]);
    const report = Object.values(context._pendingActions).find(
      (a) => a.getScheduletask()?.getName() === BlobPurgeConstants.report,
    )!;
    expect(JSON.parse(report.getScheduletask()!.getInput()!.getValue())).toEqual(
      tombstones.map((t) => ({ TombstoneToken: t.TombstoneToken, Disposition: 1 })),
    );
    await run.return();
  });

  it("drains delivered and buffered configuration before continue-as-new on cycle five", async () => {
    const context = new RuntimeOrchestrationContext("job");
    const run = blobPurgeJobOrchestrator(context, { PurgeBatchSize: 500, PurgedCount: 3 });
    await run.next();
    for (let cycle = 0; cycle < 5; cycle++) {
      await run.next([{ TombstoneToken: "opaque", PayloadToken: "blob:v2:https://a/c/b" }]);
      await run.next([[{ Disposition: 1 }]]);
      if (cycle === 4) {
        context._pendingEvents.setbatchsize[0].complete(60);
        context._receivedEvents.setbatchsize = [70, 80];
      }
      await run.next(null);
    }
    expect(context._newInput).toEqual({ PurgeBatchSize: 80, PurgedCount: 8 });
    expect(context._saveEvents).toBe(true);
  });

  it("waits for explicit configuration on unsupported backends without scheduling a retry timer", async () => {
    const context = new RuntimeOrchestrationContext("job");
    const call = jest.spyOn(context, "callActivity");
    const run = blobPurgeJobOrchestrator(context, { PurgeBatchSize: 500, PurgedCount: 0 });
    await run.next();
    const policy = call.mock.calls[0][2]!.retry;
    expect(policy).toBeInstanceOf(RetryPolicy);
    expect(
      (policy as RetryPolicy).shouldRetry({ errorType: "System.NotImplementedException", message: "unsupported" }),
    ).toBe(false);
    const failure = new TaskFailedError(
      "unsupported",
      new pb.TaskFailureDetails().setErrortype("System.NotImplementedException"),
    );
    const waiting = await run.throw(failure);
    expect(waiting.value).toBe(context._pendingEvents.setbatchsize[0]);
    expect(Object.values(context._pendingActions).some((a) => a.hasCreatetimer())).toBe(false);
    expect(JSON.parse(context.getCustomStatus()!).Status).toBe("BackendUnsupported");
    context._pendingEvents.setbatchsize[0].complete(100);
    await run.next(100);
    expect(call).toHaveBeenCalledTimes(2);
    await run.return();
  });

  it("backs off all-Retry results and cancels its idle timer when configuration arrives", async () => {
    const context = new RuntimeOrchestrationContext("job");
    const timer = jest.spyOn(context, "createTimer");
    const run = blobPurgeJobOrchestrator(context, { PurgeBatchSize: 10, PurgedCount: 0 });
    await run.next();
    await run.next([{ TombstoneToken: "opaque", PayloadToken: "blob:v2:https://a/c/b" }]);
    await run.next([[{ Disposition: LargePayloadPurgeDisposition.Retry } satisfies BlobPurgeOutcome]]);
    await run.next(null);
    expect(timer).toHaveBeenCalledTimes(1);
    expect((timer.mock.calls[0][0] as Date).getTime() - context.currentUtcDateTime.getTime()).toBe(60000);
    context._pendingEvents.setbatchsize[0].complete(20);
    await run.next(context._pendingEvents.setbatchsize[0]);
    expect(timer.mock.results[0].value.isCanceled).toBe(true);
    await run.return();
  });

  it("waits for configuration before rolling over an unsupported fifth cycle", async () => {
    const context = new RuntimeOrchestrationContext("job");
    const run = blobPurgeJobOrchestrator(context, { PurgeBatchSize: 500, PurgedCount: 0 }, logger);
    await run.next();
    for (let cycle = 0; cycle < 4; cycle++) {
      await run.next([{ TombstoneToken: "opaque", PayloadToken: "blob:v2:https://a/c/b" }]);
      await run.next([[{ Disposition: 1 }]]);
      await run.next(null);
    }
    const failure = new TaskFailedError(
      "unsupported",
      new pb.TaskFailureDetails().setErrortype("System.NotImplementedException"),
    );
    const waiting = await run.throw(failure);
    expect(waiting.done).toBe(false);
    expect(context._newInput).toBeUndefined();
    expect(Object.values(context._pendingActions).some((action) => action.hasCreatetimer())).toBe(false);
    context._pendingEvents.setbatchsize[0].complete(60);
    context._receivedEvents.setbatchsize = [70];
    expect((await run.next(60)).done).toBe(true);
    expect(context._newInput).toEqual({ PurgeBatchSize: 70, PurgedCount: 4 });
    expect(context._saveEvents).toBe(true);
  });
});
