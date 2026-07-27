// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  OrchestrationStatus,
  OrchestrationContext,
  TOrchestrator,
} from "../src";

/**
 * Tests that TestOrchestrationClient serializes null values the same way as the
 * real TaskHubGrpcClient.
 *
 * The real client unconditionally calls JSON.stringify(data) even when the value
 * is null, which produces the string "null". The test client must match this
 * behavior so that orchestrations tested with the in-memory backend receive the
 * same values they would in production.
 */
describe("TestOrchestrationClient null serialization", () => {
  let backend: InMemoryOrchestrationBackend;
  let client: TestOrchestrationClient;
  let worker: TestOrchestrationWorker;

  beforeEach(async () => {
    backend = new InMemoryOrchestrationBackend();
    client = new TestOrchestrationClient(backend);
    worker = new TestOrchestrationWorker(backend);
  });

  afterEach(async () => {
    if (worker) {
      try {
        await worker.stop();
      } catch {
        // Ignore if not running
      }
    }
    backend.reset();
  });

  it("raiseOrchestrationEvent with null data should deliver null (not undefined)", async () => {
    let receivedValue: any = "sentinel";

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      receivedValue = yield ctx.waitForExternalEvent("my_event");
      return receivedValue;
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await client.waitForOrchestrationStart(id, false, 5);

    // Raise event with no data (defaults to null)
    await client.raiseOrchestrationEvent(id, "my_event");

    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    // The orchestrator should receive null — the same value the real client delivers.
    // Before this fix, the test client would deliver undefined instead.
    expect(receivedValue).toBeNull();
    expect(state?.serializedOutput).toEqual("null");
  });

  it("raiseOrchestrationEvent with explicit null should deliver null", async () => {
    let receivedValue: any = "sentinel";

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      receivedValue = yield ctx.waitForExternalEvent("my_event");
      return receivedValue;
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await client.waitForOrchestrationStart(id, false, 5);

    // Raise event with explicit null
    await client.raiseOrchestrationEvent(id, "my_event", null);

    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(receivedValue).toBeNull();
  });

  it("raiseOrchestrationEvent with non-null data should work normally", async () => {
    let receivedValue: any = "sentinel";

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      receivedValue = yield ctx.waitForExternalEvent("my_event");
      return receivedValue;
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await client.waitForOrchestrationStart(id, false, 5);

    await client.raiseOrchestrationEvent(id, "my_event", { key: "value" });

    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(receivedValue).toEqual({ key: "value" });
  });

  it("raiseOrchestrationEvent with falsy values should serialize them", async () => {
    const receivedValues: any[] = [];

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      receivedValues.push(yield ctx.waitForExternalEvent("e1"));
      receivedValues.push(yield ctx.waitForExternalEvent("e2"));
      receivedValues.push(yield ctx.waitForExternalEvent("e3"));
      return receivedValues;
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await client.waitForOrchestrationStart(id, false, 5);

    // 0, false, and "" are all falsy but valid JSON values
    await client.raiseOrchestrationEvent(id, "e1", 0);
    await client.raiseOrchestrationEvent(id, "e2", false);
    await client.raiseOrchestrationEvent(id, "e3", "");

    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(receivedValues[0]).toBe(0);
    expect(receivedValues[1]).toBe(false);
    expect(receivedValues[2]).toBe("");
  });

  it("terminateOrchestration with null output should store null (not undefined)", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.waitForExternalEvent("never");
      return "never reached";
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await client.waitForOrchestrationStart(id, false, 5);

    // Terminate with no output (defaults to null)
    await client.terminateOrchestration(id);

    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.TERMINATED);
    // The real client stores "null" as the serialized output, not undefined
    expect(state?.serializedOutput).toEqual("null");
  });

  it("terminateOrchestration with explicit output should serialize it", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.waitForExternalEvent("never");
      return "never reached";
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await client.waitForOrchestrationStart(id, false, 5);

    await client.terminateOrchestration(id, "stopped");

    const state = await client.waitForOrchestrationCompletion(id, true, 10);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.TERMINATED);
    expect(state?.serializedOutput).toEqual(JSON.stringify("stopped"));
  });
});
