// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  OrchestrationContext,
  OrchestrationStatus,
  TOrchestrator,
} from "../src";

describe("External event name routing", () => {
  let backend: InMemoryOrchestrationBackend;
  let client: TestOrchestrationClient;
  let worker: TestOrchestrationWorker;

  beforeEach(() => {
    backend = new InMemoryOrchestrationBackend();
    client = new TestOrchestrationClient(backend);
    worker = new TestOrchestrationWorker(backend);
  });

  afterEach(async () => {
    try {
      await worker.stop();
    } finally {
      await client.stop();
      backend.reset();
    }
  });

  async function expectRunning(instanceId: string): Promise<void> {
    const state = await client.waitForOrchestrationStart(instanceId, true, 5);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
  }

  async function raiseAndWaitForCommit(instanceId: string, name: string, payload: unknown): Promise<void> {
    await client.raiseOrchestrationEvent(instanceId, name, payload);
    await backend.waitForState(
      instanceId,
      (instance) =>
        instance.history.some(
          (event) =>
            event.getEventraised()?.getName() === name &&
            event.getEventraised()?.getInput()?.getValue() === JSON.stringify(payload),
        ),
      5000,
    );
    const state = await client.getOrchestrationState(instanceId);
    expect(state?.failureDetails).toBeUndefined();
  }

  const eventNames = [
    { waitName: "constructor", raiseName: "Constructor" },
    { waitName: "Constructor", raiseName: "constructor" },
    { waitName: "__proto__", raiseName: "__PROTO__" },
    { waitName: "Approval", raiseName: "APPROVAL" },
    { waitName: "toString", raiseName: "TOSTRING" },
  ];

  it.each(eventNames)("delivers $waitName when the listener is registered first", async ({ waitName, raiseName }) => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      return yield ctx.waitForExternalEvent(waitName);
    };
    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await expectRunning(id);
    const payload = { event: waitName, value: 42 };
    await raiseAndWaitForCommit(id, raiseName, payload);

    const state = await client.waitForOrchestrationCompletion(id, true, 5);
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toBe(JSON.stringify(payload));
    expect(state?.failureDetails).toBeUndefined();
  });

  it.each(eventNames)("buffers $waitName before its listener is registered", async ({ waitName, raiseName }) => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.waitForExternalEvent("ready");
      return yield ctx.waitForExternalEvent(waitName);
    };
    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await expectRunning(id);
    const payload = { event: waitName, value: 42 };
    await raiseAndWaitForCommit(id, raiseName, payload);
    expect((await client.getOrchestrationState(id))?.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
    await client.raiseOrchestrationEvent(id, "ready");

    const state = await client.waitForOrchestrationCompletion(id, true, 5);
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toBe(JSON.stringify(payload));
    expect(state?.failureDetails).toBeUndefined();
    const events = backend.getInstance(id)?.history.filter((event) => event.hasEventraised());
    expect(events?.map((event) => event.getEventraised()?.getName())).toEqual([raiseName, "ready"]);
  });

  describe.each([false, true])("FIFO with buffered=%s", (buffered) => {
    it.each(["constructor", "__proto__", "approval"])("preserves falsy payloads and ordering for %s", async (name) => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        if (buffered) {
          yield ctx.waitForExternalEvent("ready");
        }
        const first = yield ctx.waitForExternalEvent(name);
        const second = yield ctx.waitForExternalEvent(name);
        return [first, second];
      };
      worker.addOrchestrator(orchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(orchestrator);
      await expectRunning(id);
      await raiseAndWaitForCommit(id, name.toUpperCase(), false);
      expect((await client.getOrchestrationState(id))?.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
      await raiseAndWaitForCommit(id, name, 0);
      if (buffered) {
        expect((await client.getOrchestrationState(id))?.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
        await client.raiseOrchestrationEvent(id, "ready");
      }

      const state = await client.waitForOrchestrationCompletion(id, true, 5);
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(state?.serializedOutput).toBe("[false,0]");
      expect(state?.failureDetails).toBeUndefined();
    });
  });

  it.each(["constructor", "__proto__", "approval"])(
    "carries buffered %s events through continue-as-new and consumes each once during replay",
    async (name) => {
      const orchestrator: TOrchestrator = async function* (
        ctx: OrchestrationContext,
        input: { iteration: number },
      ): any {
        if (input.iteration === 1) {
          yield ctx.waitForExternalEvent("continue");
          ctx.continueAsNew({ iteration: 2 }, true);
          return;
        }
        const first = yield ctx.waitForExternalEvent(name);
        const second = yield ctx.waitForExternalEvent(name);
        const third = yield ctx.waitForExternalEvent(name);
        return [first, second, third];
      };
      worker.addOrchestrator(orchestrator);
      await worker.start();

      const id = await client.scheduleNewOrchestration(orchestrator, { iteration: 1 });
      await expectRunning(id);
      const firstExecutionId = backend.getInstance(id)?.executionId;
      await raiseAndWaitForCommit(id, name.toUpperCase(), false);
      await raiseAndWaitForCommit(id, name, 0);
      await client.raiseOrchestrationEvent(id, "continue");
      await backend.waitForState(
        id,
        (instance) =>
          instance.executionId !== firstExecutionId &&
          instance.history.filter((event) => event.hasEventraised()).length === 2,
        5000,
      );

      await expectRunning(id);
      const carryover = backend.getInstance(id)?.history.filter((event) => event.hasEventraised());
      expect(carryover?.map((event) => event.getEventraised()?.getName())).toEqual([name, name]);
      expect(carryover?.map((event) => event.getEventraised()?.getInput()?.getValue())).toEqual(["false", "0"]);
      await raiseAndWaitForCommit(id, name.toUpperCase(), "fresh");

      const state = await client.waitForOrchestrationCompletion(id, true, 5);
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(state?.serializedOutput).toBe('[false,0,"fresh"]');
      expect(state?.failureDetails).toBeUndefined();
      expect(backend.getInstance(id)?.history.filter((event) => event.hasEventraised())).toHaveLength(3);
    },
  );
});
