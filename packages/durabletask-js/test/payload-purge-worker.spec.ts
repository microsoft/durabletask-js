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
import { getEventListeners } from "events";
import { createServer } from "net";
import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";

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
  async delete(_token: string, _signal?: AbortSignal): Promise<PayloadDeleteOutcome> {
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
    ["blob:v2:not-a-url", 3],
    ["blob:v2:", 3],
    ["blob:v2:ftp://account.invalid/c/b", 3],
    ["blob:v2:https://user:password@account.invalid/c/b", 3],
    ["blob:v2:https://account.invalid/c/", 3],
  ])("does not delete %s", async (token, disposition) => {
    const store = new Store();
    store.delete = jest.fn();
    expect(await deletePayloadChunk(store, [token], logger)).toEqual([{ Disposition: disposition }]);
    expect(store.delete).not.toHaveBeenCalled();
  });
  it.each([
    "blob:v2:https://account.invalid/c/nested/blob",
    "blob:v2:https://account.invalid/c/folder/",
    "blob:v2:https://account.invalid/c/%2F",
    "blob:v2:http://127.0.0.1:10000/account/container/blob",
  ])("preserves valid encoded, nested and path-style v2 tokens (%#)", async (token) => {
    const store = new Store();
    store.delete = jest.fn(async () => PayloadDeleteOutcome.Deleted);
    await expect(deletePayloadChunk(store, [token], logger)).resolves.toEqual([{ Disposition: 1 }]);
    expect(store.delete).toHaveBeenCalledWith(token, expect.any(AbortSignal));
  });
  it.each([
    [new TypeError("uncertain store failure"), 2],
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

  it("retries a native fetch connection failure on a valid v2 token without logging its URL or error", async () => {
    const portHolder = createServer();
    await new Promise<void>((resolve) => portHolder.listen(0, "127.0.0.1", resolve));
    const address = portHolder.address();
    if (!address || typeof address === "string") throw new Error("Expected an ephemeral loopback port");
    await new Promise<void>((resolve, reject) => portHolder.close((error) => (error ? reject(error) : resolve())));
    const token = `blob:v2:http://127.0.0.1:${address.port}/c/b`;
    // Native fetch errors must share the runtime realm with the classifier, not Jest's VM realm.
    const script = `
      require("ts-node").register({project: process.argv[2], transpileOnly: true, swc: true});
      const {deletePayloadChunk} = require(process.argv[3]);
      const controller = new AbortController();
      const warnings = [];
      let observed, watchdogFired = false;
      const store = {async delete(value, signal) {
        signal.throwIfAborted();
        try { await fetch(value.slice("blob:v2:".length), {method: "DELETE", signal}); }
        catch(error) {
          observed = {name: error.name, causeCode: error.cause?.code, sameRealmTypeError: error instanceof TypeError};
          throw error;
        }
      }};
      const logger = {warn: value => warnings.push(value), info() {}, error() {}, debug() {}};
      const watchdog = setTimeout(() => {watchdogFired = true; controller.abort();}, 800);
      deletePayloadChunk(store, [process.argv[1]], logger, controller.signal).then(outcomes => {
        clearTimeout(watchdog);
        console.log(JSON.stringify({outcomes, observed, warnings, watchdogFired, callerAborted: controller.signal.aborted}));
      }, error => {clearTimeout(watchdog); console.error(error); process.exitCode = 1;});
    `;
    const { stdout, stderr } = await promisify(execFile)(
      process.execPath,
      [
        "-e",
        script,
        token,
        join(__dirname, "..", "tsconfig.json"),
        join(__dirname, "..", "src", "payloads", "purge-worker.ts"),
      ],
      { cwd: join(__dirname, "../../.."), timeout: 4000 },
    );
    const result = JSON.parse(stdout);
    expect(stderr).toBe("");
    expect(result.watchdogFired).toBe(false);
    expect(result.observed).toEqual({ name: "TypeError", causeCode: "ECONNREFUSED", sameRealmTypeError: true });
    expect(result.outcomes).toEqual([{ Disposition: LargePayloadPurgeDisposition.Retry }]);
    expect(result.callerAborted).toBe(false);
    expect(JSON.stringify(result.warnings)).not.toContain("MalformedToken");
    expect(JSON.stringify(result.warnings)).not.toContain("127.0.0.1");
    expect(JSON.stringify(result.warnings)).not.toContain("fetch failed");
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

describe("purge delete cancellation", () => {
  const tokens = Array.from({ length: 50 }, (_, index) => `blob:v2:https://account.invalid/c/${index}`);

  it.each([{ input: [] }, { input: tokens }])(
    "rejects pre-aborted chunks before invoking the store (%#)",
    async ({ input }) => {
      const controller = new AbortController();
      const reason = Object.freeze(new Error("Already canceled cleanup"));
      const store = new Store();
      store.delete = jest.fn(async (_token: string, signal?: AbortSignal) => {
        signal?.throwIfAborted();
        return PayloadDeleteOutcome.Deleted;
      });
      controller.abort(reason);
      await expect(deletePayloadChunk(store, input, logger, controller.signal)).rejects.toBe(reason);
      expect(store.delete).not.toHaveBeenCalled();
    },
  );

  it.each([new Error("Stop cleanup"), new TypeError("Storage-shaped cancellation")])(
    "stops queued deletes, drains the active eight and preserves cancellation (%#)",
    async (reason) => {
      Object.freeze(reason);
      const controller = new AbortController();
      const store = new Store();
      let markEight!: () => void;
      const eightStarted = new Promise<void>((resolve) => (markEight = resolve));
      let release!: () => void;
      const drain = new Promise<void>((resolve) => (release = resolve));
      const signals: AbortSignal[] = [];
      let calls = 0;
      let active = 0;
      let peak = 0;
      let settled = false;
      let observed: unknown;
      store.delete = async (_token, signal) => {
        calls++;
        if (!signal) throw new Error("Expected a delete signal");
        signal.throwIfAborted();
        signals.push(signal);
        peak = Math.max(peak, ++active);
        let onAbort = () => {};
        try {
          return await new Promise<never>((_resolve, reject) => {
            onAbort = () => reject(signal.reason);
            signal.addEventListener("abort", onAbort, { once: true });
            if (calls === 8) markEight();
            if (signal.aborted) onAbort();
          });
        } finally {
          signal.removeEventListener("abort", onAbort);
          await drain;
          active--;
        }
      };
      const pending = deletePayloadChunk(store, tokens, logger, controller.signal).then(
        () => {
          settled = true;
        },
        (error: unknown) => {
          settled = true;
          observed = error;
        },
      );
      let watchdogFired = false;
      const watchdog = setTimeout(() => {
        watchdogFired = true;
        controller.abort(reason);
        release();
      }, 800);
      try {
        await Promise.race([
          eightStarted,
          pending.then(() => {
            throw new Error("Chunk settled before eight cancel-aware deletes started");
          }),
        ]);
        controller.abort(reason);
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(settled).toBe(false);
        expect(calls).toBe(8);
        release();
        await pending;
        expect(watchdogFired).toBe(false);
        expect(observed).toBe(reason);
        expect(calls).toBe(8);
        expect(peak).toBe(8);
        expect(active).toBe(0);
        expect(signals.every((signal) => getEventListeners(signal, "abort").length === 0)).toBe(true);
        expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
      } finally {
        clearTimeout(watchdog);
        controller.abort(reason);
        release();
        await pending;
      }
    },
  );

  it("does not turn a cancellation racing with a successful delete into success", async () => {
    const controller = new AbortController();
    const reason = Object.freeze(new Error("Canceled as the delete completed"));
    const store = new Store();
    store.delete = async () => {
      controller.abort(reason);
      return PayloadDeleteOutcome.Deleted;
    };
    await expect(deletePayloadChunk(store, [tokens[0]], logger, controller.signal)).rejects.toBe(reason);
  });

  it("keeps the per-delete timeout retryable without canceling the caller", async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const store = new Store();
    let deleteSignal: AbortSignal | undefined;
    store.delete = async (_token, signal) => {
      deleteSignal = signal;
      if (!signal) throw new Error("Expected a delete signal");
      signal.throwIfAborted();
      let onAbort = () => {};
      try {
        return await new Promise<PayloadDeleteOutcome>((_resolve, reject) => {
          onAbort = () => reject(signal.reason);
          signal.addEventListener("abort", onAbort, { once: true });
        });
      } finally {
        signal.removeEventListener("abort", onAbort);
      }
    };
    const pending = deletePayloadChunk(store, [tokens[0]], logger, controller.signal);
    try {
      await jest.advanceTimersByTimeAsync(59999);
      expect(deleteSignal?.aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      await expect(pending).resolves.toEqual([{ Disposition: LargePayloadPurgeDisposition.Retry }]);
      expect(deleteSignal?.aborted).toBe(true);
      expect(controller.signal.aborted).toBe(false);
      expect(getEventListeners(deleteSignal!, "abort")).toHaveLength(0);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      controller.abort();
      await pending.catch(() => {});
      jest.useRealTimers();
    }
  });
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
