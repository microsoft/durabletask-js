// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  TaskHubGrpcWorker,
  NoOpLogger,
  PayloadStore,
  PayloadDeleteOutcome,
  VersionMatchStrategy,
  WorkItemFilters,
  TaskFailedError,
} from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import { BlobPurgeConstants, BlobPurgeOutcome, LargePayloadPurgeDisposition } from "../src/payloads/purge";
import { blobPurgeJobOrchestrator } from "../src/payloads/purge-orchestrator";
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
