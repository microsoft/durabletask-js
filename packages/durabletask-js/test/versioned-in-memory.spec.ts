// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  OrchestrationStatus,
  OrchestrationContext,
  RetryPolicy,
  RetryContext,
  Task,
} from "../src";

describe("Versioned in-memory workflows", () => {
  let backend: InMemoryOrchestrationBackend;
  let client: TestOrchestrationClient;
  let worker: TestOrchestrationWorker;

  beforeEach(() => {
    backend = new InMemoryOrchestrationBackend();
    client = new TestOrchestrationClient(backend);
    worker = new TestOrchestrationWorker(backend, { versioning: { defaultVersion: "v2" } });
  });

  afterEach(async () => {
    await worker.stop();
    backend.reset();
  });

  it("preserves inferred function names across versioned test-worker registrations", async () => {
    for (const version of ["v1", "v2"]) {
      async function* Flow(ctx: OrchestrationContext): AsyncGenerator<Task<unknown>, unknown, unknown> {
        return yield ctx.callActivity("Work");
      }
      function Work() {
        return version;
      }
      expect(worker.addOrchestrator(Flow, version)).toBe("Flow");
      expect(worker.addActivity(Work, version)).toBe("Work");
    }
    await worker.start();
    for (const version of ["v1", "v2"]) {
      const id = await client.scheduleNewOrchestration("Flow", undefined, { version });
      const state = await client.waitForOrchestrationCompletion(id, true, 5);
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(state?.serializedOutput).toBe(JSON.stringify(version));
    }
  });

  it("runs same-name orchestrations and activities side by side through replay", async () => {
    for (const version of ["v1", "v2"]) {
      worker.addNamedOrchestrator(
        "Flow",
        async function* (ctx): AsyncGenerator<Task<unknown>, unknown[], unknown> {
          const activity = yield ctx.callActivity("Work");
          const child = yield ctx.callSubOrchestrator("Child");
          const explicit = yield ctx.callSubOrchestrator("Child", undefined, { version: "v1" });
          const unversioned = yield ctx.callSubOrchestrator("Child", undefined, { version: "" });
          return [ctx.version, activity, child, explicit, unversioned];
        },
        version,
      );
      worker.addNamedOrchestrator("Child", (ctx) => [version, ctx.version], version);
      worker.addNamedActivity("Work", () => version, version);
    }
    worker.addNamedOrchestrator("Child", (ctx) => ["legacy", ctx.version]);
    await worker.start();
    for (const version of ["v1", "v2"]) {
      const id = await client.scheduleNewOrchestration("Flow", undefined, { version });
      const state = await client.waitForOrchestrationCompletion(id, true, 5);
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(state?.serializedOutput).toBe(
        JSON.stringify([version, version, ["v2", "v2"], ["v1", "v1"], ["legacy", ""]]),
      );
      const history = backend.getInstance(id)!.history;
      expect(
        history
          .find((event) => event.hasTaskscheduled())
          ?.getTaskscheduled()
          ?.getVersion()
          ?.getValue(),
      ).toBe(version);
      expect(
        history
          .filter((event) => event.hasSuborchestrationinstancecreated())
          .map((event) => event.getSuborchestrationinstancecreated()?.getVersion()?.getValue() ?? ""),
      ).toEqual(["v2", "v1", ""]);
    }
  });

  it.each(["policy", "handler"] as const)("retains activity versions through %s retries", async (kind) => {
    let attempts = 0;
    const retry =
      kind === "policy"
        ? new RetryPolicy({ maxNumberOfAttempts: 2, firstRetryIntervalInMilliseconds: 1 })
        : (ctx: RetryContext) => ctx.lastAttemptNumber < 2;
    worker.addNamedOrchestrator("Flow", async function* (ctx): AsyncGenerator<Task<unknown>, unknown[], unknown> {
      const activity = yield ctx.callActivity("Work", undefined, { version: "v1", retry });
      return [activity];
    });
    worker.addNamedActivity(
      "Work",
      () => {
        if (++attempts === 1) throw new Error("retry activity");
        return "activity-v1";
      },
      "v1",
    );
    worker.addNamedActivity(
      "Work",
      () => {
        throw new Error("wrong activity version");
      },
      "v2",
    );
    await worker.start();
    const id = await client.scheduleNewOrchestration("Flow");
    const state = await client.waitForOrchestrationCompletion(id, true, 5);
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toBe('["activity-v1"]');
    expect(attempts).toBe(2);
  });

  it("does not dispatch an unknown version to the unversioned implementation after opting into versions", async () => {
    const wrong = jest.fn(() => "wrong");
    worker.addNamedOrchestrator("Flow", wrong);
    worker.addNamedOrchestrator("Flow", wrong, "v1");
    await worker.start();
    const id = await client.scheduleNewOrchestration("Flow", undefined, { version: "v3" });
    const state = await client.waitForOrchestrationCompletion(id, true, 5);
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.FAILED);
    expect(wrong).not.toHaveBeenCalled();
  });

  it("reports missing activity versions as non-retriable failures", async () => {
    const wrong = jest.fn(() => "wrong");
    worker.addNamedOrchestrator("Flow", async function* (ctx) {
      yield ctx.callActivity("Work", undefined, {
        version: "missing",
        retry: new RetryPolicy({ maxNumberOfAttempts: 2, firstRetryIntervalInMilliseconds: 1 }),
      });
    });
    worker.addNamedActivity("Work", wrong, "v1");
    await worker.start();
    const id = await client.scheduleNewOrchestration("Flow");
    const state = await client.waitForOrchestrationCompletion(id, true, 5);
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.FAILED);
    expect(wrong).not.toHaveBeenCalled();
    const history = backend.getInstance(id)!.history;
    expect(history.filter((event) => event.hasTaskscheduled())).toHaveLength(1);
    expect(
      history
        .find((event) => event.hasTaskfailed())
        ?.getTaskfailed()
        ?.getFailuredetails()
        ?.getIsnonretriable(),
    ).toBe(true);
  });
});
