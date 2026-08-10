// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  OrchestrationAlreadyExistsError,
  OrchestrationContext,
  OrchestrationStatus,
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  TOrchestrator,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

const connectionString = process.env.DTS_CONNECTION_STRING;
const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

function createClient(): TaskHubGrpcClient {
  return connectionString
    ? new DurableTaskAzureManagedClientBuilder().connectionString(connectionString).build()
    : new DurableTaskAzureManagedClientBuilder().endpoint(endpoint, taskHub, null).build();
}

function createWorker(): TaskHubGrpcWorker {
  return connectionString
    ? new DurableTaskAzureManagedWorkerBuilder().connectionString(connectionString).build()
    : new DurableTaskAzureManagedWorkerBuilder().endpoint(endpoint, taskHub, null).build();
}

describe("Orchestration ID reuse policy E2E", () => {
  jest.setTimeout(120000);

  let client: TaskHubGrpcClient;
  let worker: TaskHubGrpcWorker;

  const reusableOrchestrator: TOrchestrator = async function* (
    ctx: OrchestrationContext,
    input: { value: string; wait: boolean },
  ): any {
    if (input.wait) {
      yield ctx.waitForExternalEvent("finish");
    }
    return input.value;
  };

  beforeEach(async () => {
    client = createClient();
    worker = createWorker();
    worker.addOrchestrator(reusableOrchestrator);
    await worker.start();
  });

  afterEach(async () => {
    await worker.stop();
    await client.stop();
  });

  it("rejects a duplicate whose running status is selected for deduplication", async () => {
    const instanceId = `reuse-dedupe-${Date.now()}`;
    await client.scheduleNewOrchestration(reusableOrchestrator, { value: "original", wait: true }, { instanceId });
    await client.waitForOrchestrationStart(instanceId, false, 30);

    await expect(
      client.scheduleNewOrchestration(
        reusableOrchestrator,
        { value: "replacement", wait: false },
        { instanceId, dedupeStatuses: [OrchestrationStatus.RUNNING] },
      ),
    ).rejects.toBeInstanceOf(OrchestrationAlreadyExistsError);

    const state = await client.getOrchestrationState(instanceId, true);
    expect(state?.serializedInput).toBe(JSON.stringify({ value: "original", wait: true }));
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
  }, 60000);

  it("replaces a duplicate whose running status is reusable", async () => {
    const instanceId = `reuse-replace-${Date.now()}`;
    await client.scheduleNewOrchestration(reusableOrchestrator, { value: "original", wait: true }, { instanceId });
    await client.waitForOrchestrationStart(instanceId, false, 30);

    await client.scheduleNewOrchestration(
      reusableOrchestrator,
      { value: "replacement", wait: false },
      { instanceId, dedupeStatuses: [] },
    );

    const state = await client.waitForOrchestrationCompletion(instanceId, true, 30);
    expect(state?.serializedInput).toBe(JSON.stringify({ value: "replacement", wait: false }));
    expect(state?.serializedOutput).toBe(JSON.stringify("replacement"));
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
  }, 60000);

  it("surfaces the backend rejection for terminated dedupe with reusable suspended instances", async () => {
    const instanceId = `reuse-suspended-${Date.now()}`;
    await client.scheduleNewOrchestration(reusableOrchestrator, { value: "original", wait: true }, { instanceId });
    await client.waitForOrchestrationStart(instanceId, false, 30);
    await client.suspendOrchestration(instanceId);

    let suspendedState = await client.getOrchestrationState(instanceId);
    for (let attempt = 0; attempt < 30 && suspendedState?.runtimeStatus !== OrchestrationStatus.SUSPENDED; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      suspendedState = await client.getOrchestrationState(instanceId);
    }
    expect(suspendedState?.runtimeStatus).toBe(OrchestrationStatus.SUSPENDED);

    await expect(
      client.scheduleNewOrchestration(
        reusableOrchestrator,
        { value: "replacement", wait: false },
        {
          instanceId,
          dedupeStatuses: [OrchestrationStatus.TERMINATED, OrchestrationStatus.RUNNING, OrchestrationStatus.PENDING],
        },
      ),
    ).rejects.toThrow(
      "Invalid reusable statuses: cannot exclude 'Terminated' while also allowing reuse of running instances",
    );

    const state = await client.getOrchestrationState(instanceId, true);
    expect(state?.serializedInput).toBe(JSON.stringify({ value: "original", wait: true }));
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.SUSPENDED);
  }, 120000);

  it("preserves backend default duplicate behavior when dedupe statuses are undefined", async () => {
    const instanceId = `reuse-default-${Date.now()}`;
    await client.scheduleNewOrchestration(reusableOrchestrator, { value: "original", wait: true }, { instanceId });
    await client.waitForOrchestrationStart(instanceId, false, 30);

    await expect(
      client.scheduleNewOrchestration(
        reusableOrchestrator,
        { value: "replacement", wait: false },
        { instanceId, dedupeStatuses: undefined },
      ),
    ).rejects.toBeInstanceOf(OrchestrationAlreadyExistsError);
  }, 60000);
});
