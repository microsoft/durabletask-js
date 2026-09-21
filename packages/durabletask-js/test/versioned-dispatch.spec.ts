// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { NoOpLogger, Task, TaskHubGrpcWorker, VersionMatchStrategy, RetryPolicy, RetryContext } from "../src";
import { Registry } from "../src/worker/registry";
import { ActivityExecutor } from "../src/worker/activity-executor";
import { generateWorkItemFiltersFromRegistry } from "../src/worker/work-item-filters";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as ph from "../src/utils/pb-helper.util";

describe.each(["orchestrator", "activity"] as const)("%s version registrations", (kind) => {
  function setup() {
    const registry = new Registry();
    const add =
      kind === "orchestrator" ? registry.addNamedOrchestrator.bind(registry) : registry.addNamedActivity.bind(registry);
    const get = kind === "orchestrator" ? registry.getOrchestrator.bind(registry) : registry.getActivity.bind(registry);
    return { registry, add, get };
  }

  it("dispatches exact versions without changing case-sensitive task names", () => {
    const { add, get } = setup();
    const v1 = () => 1;
    const v2 = () => 2;
    add("Work", v1, "V1");
    add("Work", v2, "v2");
    expect(get("Work", "v1")).toBe(v1);
    expect(get("Work", "V2")).toBe(v2);
    expect(get("work", "v1")).toBeUndefined();
    expect(get("Work")).toBeUndefined();
    expect(get("Work", "v3")).toBeUndefined();
  });

  it("uses an unversioned fallback only while the name has no versioned registrations", () => {
    const { add, get } = setup();
    const legacy = () => 0;
    add("Work", legacy);
    expect(get("Work", "v1")).toBe(legacy);
    add("Work", () => 1, "v1");
    expect(get("Work", "v2")).toBeUndefined();
    expect(get("Work", "")).toBe(legacy);
    expect(get("Work")).toBe(legacy);
  });

  it("rejects duplicate version identities and whitespace-only registration versions", () => {
    const { add } = setup();
    add("Work", () => 1, "V1");
    expect(() => add("Work", () => 2, "v1")).toThrow(/already exists/);
    add("Work", () => 0);
    expect(() => add("Work", () => 0, "")).toThrow(/already exists/);
    expect(() => add("Other", () => 0, " \t")).toThrow(/version/i);
  });

  it("does not equate numeric components or trim nonempty version strings", () => {
    const { add, get } = setup();
    const one = () => 1;
    const oneDotZero = () => 2;
    const padded = () => 3;
    add("Work", one, "1");
    add("Work", oneDotZero, "1.0");
    add("Work", padded, " 1 ");
    expect(get("Work", "1")).toBe(one);
    expect(get("Work", "1.0")).toBe(oneDotZero);
    expect(get("Work", " 1 ")).toBe(padded);
  });

  it("normalizes null versions from JavaScript callers to unversioned", () => {
    const { add, get } = setup();
    const legacy = () => 0;
    Reflect.apply(add, undefined, ["Work", legacy, null]);
    add("Work", () => 1, "v1");
    expect(get("Work")).toBe(legacy);
    expect(Reflect.apply(get, undefined, ["Work", null])).toBe(legacy);
    expect(() => add("Work", legacy, "")).toThrow(/already exists/);
  });

  it("enumerates every registration but deduplicates names and auto filters", () => {
    const { registry, add } = setup();
    const fn = () => 1;
    add("Work", fn, "v2");
    add("Work", fn, "v1");
    add("Work", fn);
    add("Legacy", fn);
    const registrations =
      kind === "orchestrator" ? registry.getOrchestratorRegistrations() : registry.getActivityRegistrations();
    expect(registrations).toEqual([
      { name: "Work", version: "v2", fn },
      { name: "Work", version: "v1", fn },
      { name: "Work", version: "", fn },
      { name: "Legacy", version: "", fn },
    ]);
    const names = kind === "orchestrator" ? registry.getOrchestratorNames() : registry.getActivityNames();
    expect(names).toEqual(["Work", "Legacy"]);
    const key = kind === "orchestrator" ? "orchestrations" : "activities";
    expect(generateWorkItemFiltersFromRegistry(registry)[key]).toEqual([
      { name: "Work", versions: ["", "v1", "v2"] },
      { name: "Legacy", versions: [] },
    ]);
    for (const version of ["v1", undefined]) {
      expect(
        generateWorkItemFiltersFromRegistry(registry, {
          matchStrategy: VersionMatchStrategy.Strict,
          version,
        })[key],
      ).toEqual([
        { name: "Work", versions: [version ?? ""] },
        { name: "Legacy", versions: [version ?? ""] },
      ]);
    }
  });
});

describe("Versioned execution", () => {
  const start = new Date("2026-01-01T00:00:00Z");

  function request(name: string, version?: string) {
    return new pb.OrchestratorRequest()
      .setInstanceid("instance")
      .setNeweventsList([
        ph.newOrchestratorStartedEvent(start),
        ph.newExecutionStartedEvent(name, "instance", undefined, undefined, "execution", version),
      ]);
  }

  async function run(worker: TaskHubGrpcWorker, req: pb.OrchestratorRequest) {
    return pb.OrchestratorResponse.deserializeBinary(
      await worker.processOrchestratorRequest(req.serializeBinary()),
    ).getActionsList();
  }

  it("selects the history version on initial execution and replay, not the worker default", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      versioning: { version: "unrelated", defaultVersion: "v2" },
    });
    for (const version of ["v1", "v2"]) {
      worker.addNamedOrchestrator(
        "Flow",
        async function* (ctx): AsyncGenerator<Task<unknown>, unknown[], unknown> {
          const value = yield ctx.callActivity("Work");
          return [version, ctx.version, value];
        },
        version,
      );
    }
    for (const version of ["v1", "v2"]) {
      const req = request("Flow", version);
      const actions = await run(worker, req);
      expect(actions).toHaveLength(1);
      expect(actions[0].getScheduletask()?.getVersion()?.getValue()).toBe(version);
      req
        .setPasteventsList([...req.getNeweventsList(), ph.newTaskScheduledEvent(1, "Work")])
        .setNeweventsList([ph.newTaskCompletedEvent(1, '"result"')]);
      const replay = await run(worker, req);
      expect(replay[0].getCompleteorchestration()?.getResult()?.getValue()).toBe(
        JSON.stringify([version, version, "result"]),
      );
    }
  });

  it.each([undefined, "", "missing"])(
    "fails a missing version %s instead of invoking another implementation",
    async (version) => {
      const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
      const wrong = jest.fn(() => "wrong");
      worker.addNamedOrchestrator("Flow", wrong, "v1");
      const actions = await run(worker, request("Flow", version));
      const failure = actions[0].getCompleteorchestration();
      expect(failure?.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(failure?.getFailuredetails()?.getErrortype()).toBe("OrchestratorNotRegisteredError");
      expect(failure?.getFailuredetails()?.getErrormessage()).toContain(version ?? "");
      expect(wrong).not.toHaveBeenCalled();
    },
  );

  it("normalizes whitespace-only wire versions to unversioned dispatch", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    worker.addNamedOrchestrator("Flow", () => "unversioned");
    worker.addNamedOrchestrator("Flow", () => "v1", "v1");
    const actions = await run(worker, request("Flow", " \t"));
    expect(actions[0].getCompleteorchestration()?.getResult()?.getValue()).toBe('"unversioned"');
  });

  it.each([
    [undefined, undefined, ""],
    ["child-default", undefined, "child-default"],
    ["child-default", "override", "override"],
    ["child-default", "", ""],
    ["", undefined, ""],
  ])("schedules children with default=%s explicit=%s as %s", async (defaultVersion, version, expected) => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger(), versioning: { defaultVersion } });
    worker.addNamedOrchestrator(
      "Flow",
      async function* (ctx) {
        yield ctx.callSubOrchestrator("Child", undefined, { version });
      },
      "parent",
    );
    const actions = await run(worker, request("Flow", "parent"));
    expect(actions[0].getCreatesuborchestration()?.getVersion()?.getValue() ?? "").toBe(expected);
  });

  it.each([undefined, "override", ""])("schedules activities with explicit version %s", async (version) => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      versioning: { defaultVersion: "not-the-activity-default" },
    });
    worker.addNamedOrchestrator(
      "Flow",
      async function* (ctx) {
        yield ctx.callActivity("Work", undefined, { version });
      },
      "parent",
    );
    const actions = await run(worker, request("Flow", "parent"));
    expect(actions[0].getScheduletask()?.getVersion()?.getValue() ?? "").toBe(version ?? "parent");
  });

  it("does not apply the child default to continue-as-new", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger(), versioning: { defaultVersion: "v2" } });
    worker.addNamedOrchestrator("Flow", (ctx) => ctx.continueAsNew(1, false), "v1");
    const actions = await run(worker, request("Flow", "v1"));
    expect(actions[0].getCompleteorchestration()?.hasNewversion()).toBe(false);
  });

  it.each(["policy", "handler"] as const)(
    "retains default, explicit and empty child versions through %s retry replay",
    async (kind) => {
      for (const version of [undefined, "override", ""]) {
        const worker = new TaskHubGrpcWorker({
          logger: new NoOpLogger(),
          versioning: { defaultVersion: "child-default" },
        });
        const retry =
          kind === "policy"
            ? new RetryPolicy({ maxNumberOfAttempts: 2, firstRetryIntervalInMilliseconds: 1 })
            : (ctx: RetryContext) => ctx.lastAttemptNumber < 2;
        worker.addNamedOrchestrator(
          "Flow",
          async function* (ctx) {
            yield ctx.callSubOrchestrator("Child", undefined, { version, retry });
            return "done";
          },
          "parent",
        );
        const req = request("Flow", "parent");
        const initial = (await run(worker, req))[0];
        const childId = initial.getCreatesuborchestration()!.getInstanceid();
        req
          .setPasteventsList([
            ...req.getNeweventsList(),
            ph.newSubOrchestrationCreatedEvent(initial.getId(), "Child", childId),
          ])
          .setNeweventsList([ph.newSubOrchestrationFailedEvent(initial.getId(), new Error("retry"))]);
        let actions = await run(worker, req);
        if (kind === "policy") {
          const timer = actions[0];
          const fireAt = timer.getCreatetimer()!.getFireat()!.toDate();
          req
            .setPasteventsList([
              ...req.getPasteventsList(),
              ...req.getNeweventsList(),
              ph.newTimerCreatedEvent(timer.getId(), fireAt),
            ])
            .setNeweventsList([ph.newOrchestratorStartedEvent(fireAt), ph.newTimerFiredEvent(timer.getId(), fireAt)]);
          actions = await run(worker, req);
        }
        expect(actions).toHaveLength(1);
        const retried = actions[0];
        expect(retried.getCreatesuborchestration()?.getVersion()?.getValue() ?? "").toBe(version ?? "child-default");
        expect(retried.getCreatesuborchestration()?.getInstanceid()).toBe(childId);
        req
          .setPasteventsList([
            ...req.getPasteventsList(),
            ...req.getNeweventsList(),
            ph.newSubOrchestrationCreatedEvent(retried.getId(), "Child", childId),
          ])
          .setNeweventsList([ph.newSubOrchestrationCompletedEvent(retried.getId(), '"child"')]);
        const completed = await run(worker, req);
        expect(completed[0].getCompleteorchestration()?.getResult()?.getValue()).toBe('"done"');
      }
    },
  );

  it("dispatches activities by version and reports missing versions with the standard error", async () => {
    const registry = new Registry();
    registry.addNamedActivity("Work", () => "unversioned");
    registry.addNamedActivity("Work", () => "v1", "v1");
    registry.addNamedActivity("Work", () => "v2", "v2");
    const executor = new ActivityExecutor(registry, new NoOpLogger());
    for (const version of ["", "v1", "v2"]) {
      await expect(executor.execute("instance", "Work", 1, undefined, version)).resolves.toBe(
        JSON.stringify(version || "unversioned"),
      );
    }
    await expect(executor.execute("instance", "Work", 1, undefined, "missing")).rejects.toThrow(/Work.*missing/);
    await expect(executor.execute("instance", "Work", 1, undefined, " \t")).resolves.toBe('"unversioned"');
  });
});
