// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  OrchestrationStatus,
  whenAll,
} from "../src";

describe("Public task composition", () => {
  let backend: InMemoryOrchestrationBackend;
  let client: TestOrchestrationClient;
  let worker: TestOrchestrationWorker;
  let invocations: Map<string, string[]>;

  beforeEach(async () => {
    backend = new InMemoryOrchestrationBackend();
    client = new TestOrchestrationClient(backend);
    worker = new TestOrchestrationWorker(backend);
    invocations = new Map();
    worker.addNamedActivity("Echo", (context, value: string) => {
      const values = invocations.get(context.orchestrationId) ?? [];
      values.push(value);
      invocations.set(context.orchestrationId, values);
      return value;
    });
    worker.addNamedOrchestrator("Shared", async function* (context): any {
      const a = context.callActivity("Echo", "A");
      const b = context.callActivity("Echo", "B");
      const c = context.callActivity("Echo", "C");
      const first = whenAll([a, b]);
      const second = whenAll([a, c]);
      return yield whenAll([first, second]);
    });
    worker.addNamedOrchestrator("Duplicate", async function* (context): any {
      const task = context.callActivity("Echo", "V");
      return yield whenAll([task, task]);
    });
    worker.addNamedOrchestrator("Disjoint", async function* (context): any {
      const first = whenAll([context.callActivity("Echo", "A"), context.callActivity("Echo", "B")]);
      const second = whenAll([context.callActivity("Echo", "C"), context.callActivity("Echo", "D")]);
      return yield whenAll([first, second]);
    });
    await worker.start();
  });

  afterEach(async () => {
    await worker.stop();
    await client.stop();
    backend.reset();
  });

  it.each([
    {
      name: "Shared",
      values: ["A", "B", "C"],
      output: [
        ["A", "B"],
        ["A", "C"],
      ],
    },
    { name: "Duplicate", values: ["V"], output: ["V", "V"] },
  ])("completes $name without executing an activity twice on a reused worker", async ({ name, values, output }) => {
    const controlId = await client.scheduleNewOrchestration("Disjoint");
    const control = await client.waitForOrchestrationCompletion(controlId, true, 3);
    expect(control?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
    expect(control?.serializedOutput).toBe(
      JSON.stringify([
        ["A", "B"],
        ["C", "D"],
      ]),
    );
    expect(invocations.get(controlId)).toEqual(["A", "B", "C", "D"]);

    const id = await client.scheduleNewOrchestration(name);
    const instance = await backend.waitForState(
      id,
      (instance) => {
        const scheduled = instance.history
          .filter((event) => event.hasTaskscheduled())
          .map((event) => event.getEventid());
        const completed = instance.history
          .filter((event) => event.hasTaskcompleted())
          .map((event) => event.getTaskcompleted()!.getTaskscheduledid());
        return (
          scheduled.length === values.length &&
          completed.length === values.length &&
          new Set(scheduled).size === values.length &&
          new Set(completed).size === values.length &&
          scheduled.every((taskId) => completed.includes(taskId)) &&
          instance.pendingEvents.length === 0
        );
      },
      3000,
    );
    expect(instance?.history.filter((event) => event.hasTaskfailed())).toHaveLength(0);
    expect(invocations.get(id)).toEqual(values);
    expect(backend.hasPendingWork()).toBe(false);

    const state = await client.getOrchestrationState(id, true);
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
    expect(state?.failureDetails).toBeUndefined();
    expect(state?.serializedOutput).toBe(JSON.stringify(output));
    expect(await client.waitForOrchestrationCompletion(id, true, 3)).toMatchObject({
      runtimeStatus: OrchestrationStatus.COMPLETED,
      serializedOutput: JSON.stringify(output),
    });
  });
});
