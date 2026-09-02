// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  ActivityContext,
  OrchestrationContext,
  ProtoOrchestrationStatus as OrchestrationStatus,
  Task,
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  TOrchestrator,
  whenAll,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

describe("DTS worker concurrency E2E", () => {
  let client: TaskHubGrpcClient;
  let worker: TaskHubGrpcWorker;
  let workerStarted = false;
  let releaseBarrier: (() => void) | undefined;

  beforeEach(() => {
    workerStarted = false;
    releaseBarrier = undefined;
    client = new DurableTaskAzureManagedClientBuilder().endpoint(endpoint, taskHub, null).build();
    worker = new DurableTaskAzureManagedWorkerBuilder()
      .endpoint(endpoint, taskHub, null)
      .concurrency({
        maximumConcurrentActivityWorkItems: 2,
        maximumConcurrentOrchestrationWorkItems: 1,
        maximumConcurrentEntityWorkItems: 1,
      })
      .build();
  });

  afterEach(async () => {
    releaseBarrier?.();
    if (workerStarted) {
      await worker.stop();
    }
    await client.stop();
  });

  it("caps a fan-out at two complete activity work-item lifecycles", async () => {
    let active = 0;
    let peak = 0;
    let entered = 0;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });

    const cappedActivity = async (_: ActivityContext, input: number): Promise<number> => {
      active++;
      entered++;
      peak = Math.max(peak, active);
      if (entered === 2) {
        releaseBarrier?.();
      }
      try {
        await barrier;
        return input * 2;
      } finally {
        active--;
      }
    };
    const fanOut: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const tasks: Task<any>[] = [];
      for (let index = 0; index < 6; index++) {
        tasks.push(ctx.callActivity(cappedActivity, index));
      }
      return yield whenAll(tasks);
    };

    worker.addActivity(cappedActivity);
    worker.addOrchestrator(fanOut);
    await worker.start();
    workerStarted = true;

    const instanceId = `concurrency-${Date.now()}`;
    await client.scheduleNewOrchestration(fanOut, undefined, instanceId);
    const state = await client.waitForOrchestrationCompletion(instanceId, undefined, 30);

    expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toBe(JSON.stringify([0, 2, 4, 6, 8, 10]));
    expect(entered).toBe(6);
    expect(peak).toBe(2);

    const purgeResult = await client.purgeOrchestration(instanceId);
    expect(purgeResult?.deletedInstanceCount).toBe(1);
    expect(await client.getOrchestrationState(instanceId)).toBeUndefined();
  }, 45000);
});
