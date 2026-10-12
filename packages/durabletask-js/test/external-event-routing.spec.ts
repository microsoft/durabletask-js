// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  OrchestrationContext,
  OrchestrationStatus,
  TOrchestrator,
  whenAny,
} from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";

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

  describe("continue-as-new trailing events", () => {
    async function continueWithBatch(
      orchestrator: TOrchestrator,
      input: unknown,
      events: ReadonlyArray<readonly [string, unknown]>,
    ) {
      worker.addOrchestrator(orchestrator);
      await worker.start();
      const id = await client.scheduleNewOrchestration(orchestrator, input);
      await expectRunning(id);
      const initialExecutionId = backend.getInstance(id)?.executionId;
      expect(initialExecutionId).toBeDefined();
      await worker.stop();
      expect(backend.hasPendingWork()).toBe(false);

      // With no worker polling, these public events form one real backend work item.
      for (const [name, payload] of events) {
        await client.raiseOrchestrationEvent(id, name, payload);
      }
      expect(
        backend
          .getInstance(id)
          ?.pendingEvents.map((event) => [
            event.getEventraised()?.getName(),
            event.getEventraised()?.getInput()?.getValue(),
          ]),
      ).toEqual(events.map(([name, payload]) => [name, JSON.stringify(payload)]));

      let carryover: pb.HistoryEvent[] = [];
      const continued = backend.waitForState(
        id,
        (instance) => {
          if (instance.executionId === initialExecutionId) {
            return false;
          }
          carryover = instance.pendingEvents.filter((event) => event.hasEventraised());
          return true;
        },
        5000,
      );
      worker = new TestOrchestrationWorker(backend);
      worker.addOrchestrator(orchestrator);
      await worker.start();
      await continued;
      await backend.waitForState(
        id,
        (instance) =>
          instance.executionId !== initialExecutionId &&
          instance.status !== pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING &&
          instance.pendingEvents.length === 0,
        5000,
      );
      const instance = backend.getInstance(id);
      expect(
        instance?.history
          .find((event) => event.hasExecutionstarted())
          ?.getExecutionstarted()
          ?.getOrchestrationinstance()
          ?.getExecutionid()
          ?.getValue(),
      ).toBe(instance?.executionId);
      expect(instance?.executionId).not.toBe(initialExecutionId);
      expect(backend.hasPendingWork()).toBe(false);
      expect((await client.getOrchestrationState(id))?.failureDetails).toBeUndefined();
      return { id, carryover };
    }

    it.each([true, false])("retains the same-batch message with an old listener=%s", async (oldListener) => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, iteration: number): any {
        if (iteration === 1) {
          const rotate = ctx.waitForExternalEvent("rotate");
          if (oldListener) {
            const message = ctx.waitForExternalEvent("message");
            yield whenAny([rotate, message]);
          } else {
            yield rotate;
          }
          ctx.continueAsNew(2, true);
          return;
        }
        return yield ctx.waitForExternalEvent("message");
      };
      const payload = { kind: "original", value: 42 };
      const { id, carryover } = await continueWithBatch(orchestrator, 1, [
        ["rotate", null],
        ["message", payload],
      ]);

      expect(carryover.map((event) => event.getEventraised()?.getInput()?.getValue())).toEqual([
        JSON.stringify(payload),
      ]);
      const state = await client.waitForOrchestrationCompletion(id, true, 5);
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(state?.serializedInput).toBe("2");
      expect(state?.serializedOutput).toBe(JSON.stringify(payload));
      expect(backend.getInstance(id)?.history.filter((event) => event.hasEventraised())).toHaveLength(1);
    });

    it("preserves case-insensitive FIFO and falsy trailing payloads exactly once across replay", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, iteration: number): any {
        if (iteration === 1) {
          yield whenAny([ctx.waitForExternalEvent("rotate"), ctx.waitForExternalEvent("MeSsAgE")]);
          ctx.continueAsNew(2, true);
          return;
        }
        const values: unknown[] = [];
        for (let i = 0; i < 4; i++) {
          values.push(yield ctx.waitForExternalEvent("MESSAGE"));
        }
        ctx.setCustomStatus(values);
        values.push(yield ctx.waitForExternalEvent("message"));
        return values;
      };
      const payloads = [false, 0, "", null];
      const { id, carryover } = await continueWithBatch(orchestrator, 1, [
        ["rotate", null],
        ["MeSsAgE", false],
        ["MESSAGE", 0],
        ["message", ""],
        ["mEsSaGe", null],
      ]);
      expect(carryover.map((event) => event.getEventraised()?.getName())).toEqual(Array(4).fill("message"));
      expect(carryover.map((event) => event.getEventraised()?.getInput()?.getValue())).toEqual(
        payloads.map((payload) => JSON.stringify(payload)),
      );
      const waiting = await client.getOrchestrationState(id);
      expect(waiting?.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
      expect(waiting?.serializedCustomStatus).toBe(JSON.stringify(payloads));
      const fresh = { kind: "fresh" };
      await raiseAndWaitForCommit(id, "MESSAGE", fresh);

      const state = await client.waitForOrchestrationCompletion(id, true, 5);
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(state?.serializedOutput).toBe(JSON.stringify([...payloads, fresh]));
      expect(backend.getInstance(id)?.history.filter((event) => event.hasEventraised())).toHaveLength(5);
    });

    it("delivers a message submitted after the new generation is committed", async () => {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, iteration: number): any {
        if (iteration === 1) {
          yield whenAny([ctx.waitForExternalEvent("rotate"), ctx.waitForExternalEvent("message")]);
          ctx.continueAsNew(2, true);
          return;
        }
        return yield ctx.waitForExternalEvent("message");
      };
      const { id, carryover } = await continueWithBatch(orchestrator, 1, [["rotate", null]]);
      expect(carryover).toHaveLength(0);
      expect((await client.getOrchestrationState(id))?.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
      const payload = { kind: "original" };
      await raiseAndWaitForCommit(id, "message", payload);

      const state = await client.waitForOrchestrationCompletion(id, true, 5);
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(state?.serializedOutput).toBe(JSON.stringify(payload));
      expect(backend.getInstance(id)?.history.filter((event) => event.hasEventraised())).toHaveLength(1);
    });

    it("does not carry a message actually consumed before rotation", async () => {
      const orchestrator: TOrchestrator = async function* (
        ctx: OrchestrationContext,
        input: { iteration: number; consumed?: unknown },
      ): any {
        if (input.iteration === 1) {
          const rotate = ctx.waitForExternalEvent("rotate");
          const message = ctx.waitForExternalEvent("message");
          yield whenAny([rotate, message]);
          const consumed = message.getResult();
          yield rotate;
          ctx.continueAsNew({ iteration: 2, consumed }, true);
          return;
        }
        const fresh = yield ctx.waitForExternalEvent("message");
        return { consumed: input.consumed, fresh };
      };
      const consumed = { kind: "consumed" };
      const { id, carryover } = await continueWithBatch(orchestrator, { iteration: 1 }, [
        ["message", consumed],
        ["rotate", null],
      ]);
      expect(carryover).toHaveLength(0);
      expect((await client.getOrchestrationState(id))?.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
      expect(backend.getInstance(id)?.history.filter((event) => event.hasEventraised())).toHaveLength(0);
      const fresh = { kind: "fresh" };
      await raiseAndWaitForCommit(id, "message", fresh);

      const state = await client.waitForOrchestrationCompletion(id, true, 5);
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
      expect(state?.serializedOutput).toBe(JSON.stringify({ consumed, fresh }));
    });

    it.each([true, false])(
      "drops trailing messages with saveEvents=false and an old listener=%s",
      async (oldListener) => {
        const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, iteration: number): any {
          if (iteration === 1) {
            const rotate = ctx.waitForExternalEvent("rotate");
            yield oldListener ? whenAny([rotate, ctx.waitForExternalEvent("message")]) : rotate;
            ctx.continueAsNew(2, false);
            return;
          }
          return yield ctx.waitForExternalEvent("message");
        };
        const { id, carryover } = await continueWithBatch(orchestrator, 1, [
          ["rotate", null],
          ["message", { kind: "discarded" }],
        ]);
        expect(carryover).toHaveLength(0);
        expect((await client.getOrchestrationState(id))?.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
        expect(backend.getInstance(id)?.history.filter((event) => event.hasEventraised())).toHaveLength(0);
        const fresh = { kind: "fresh" };
        await raiseAndWaitForCommit(id, "message", fresh);

        const state = await client.waitForOrchestrationCompletion(id, true, 5);
        expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
        expect(state?.serializedOutput).toBe(JSON.stringify(fresh));
      },
    );
  });
});
