// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { randomUUID } from "crypto";
import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  OrchestrationContext,
  OrchestrationStatus,
  Task,
  TOrchestrator,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

// Use DTS_CONNECTION_STRING for Azure or ENDPOINT/TASKHUB for an isolated emulator.
const connectionString = process.env.DTS_CONNECTION_STRING;
const endpoint = process.env.ENDPOINT || "http://localhost:8080";
const taskHub = process.env.TASKHUB || "default";

describe("Client wait cancellation DTS E2E", () => {
  let client: TaskHubGrpcClient;
  let worker: TaskHubGrpcWorker;
  let workerStarted: boolean;
  let instanceId: string | undefined;
  let waitCalls: number;
  let cancelledCalls: number;
  let onWaitStarted: () => void;
  const orchestrator: TOrchestrator = async function* clientWaitOrchestrator(
    ctx: OrchestrationContext,
  ): AsyncGenerator<Task<string>, string, string> {
    return yield ctx.waitForExternalEvent("finish");
  };

  beforeEach(() => {
    waitCalls = 0;
    cancelledCalls = 0;
    onWaitStarted = () => {};
    workerStarted = false;
    instanceId = undefined;
    // Observe real RPCs without replacing responses or changing transport behavior.
    const interceptor: grpc.Interceptor = (options, nextCall) => {
      const isWait = /\/WaitForInstance(Start|Completion)$/.test(options.method_definition.path);
      return new grpc.InterceptingCall(nextCall(options), {
        start: (metadata, listener, next) => {
          if (isWait) {
            waitCalls++;
            onWaitStarted();
          }
          next(metadata, listener);
        },
        cancel: (next) => {
          if (isWait) cancelledCalls++;
          next();
        },
      });
    };
    const clientBuilder = new DurableTaskAzureManagedClientBuilder();
    const workerBuilder = new DurableTaskAzureManagedWorkerBuilder();
    if (connectionString) {
      clientBuilder.connectionString(connectionString);
      workerBuilder.connectionString(connectionString);
    } else {
      clientBuilder.endpoint(endpoint, taskHub, null);
      workerBuilder.endpoint(endpoint, taskHub, null);
    }
    client = clientBuilder.grpcChannelOptions({ interceptors: [interceptor] }).build();
    worker = workerBuilder.build();
    worker.addOrchestrator(orchestrator);
  });

  afterEach(async () => {
    try {
      if (instanceId) {
        const state = await client.getOrchestrationState(instanceId, false);
        if (state?.runtimeStatus === OrchestrationStatus.COMPLETED) {
          await client.purgeOrchestration(instanceId);
        } else if (state) {
          await client.terminateOrchestration(instanceId, "client wait E2E cleanup");
        }
      }
    } finally {
      try {
        if (workerStarted) await worker.stop();
      } finally {
        await client.stop();
      }
    }
  });

  async function schedule(): Promise<string> {
    instanceId = await client.scheduleNewOrchestration(orchestrator, "wait-input", {
      instanceId: `client-wait-${randomUUID()}`,
    });
    console.log(JSON.stringify({ scenario: expect.getState().currentTestName, instanceId }));
    return instanceId;
  }

  async function startWorker(): Promise<void> {
    await worker.start();
    workerStarted = true;
  }

  async function finish(id: string): Promise<void> {
    await client.raiseOrchestrationEvent(id, "finish", "still-alive");
    const state = await client.waitForOrchestrationCompletion(id, true, 30);
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
    expect(state?.serializedInput).toBe('"wait-input"');
    expect(state?.serializedOutput).toBe('"still-alive"');
    console.log(JSON.stringify({ instanceId: id, outcome: "completed", waitCalls, cancelledCalls }));
  }

  it("starts and completes normally with payloads", async () => {
    await startWorker();
    const id = await schedule();
    const started = await client.waitForOrchestrationStart(id, true, 30);
    expect(started?.runtimeStatus).toBe(OrchestrationStatus.RUNNING);
    expect(started?.serializedInput).toBe('"wait-input"');
    await finish(id);
    expect(waitCalls).toBe(2);
    expect(cancelledCalls).toBe(0);
  }, 60000);

  it.each([
    ["start", "abort"],
    ["start", "timeout"],
    ["completion", "abort"],
    ["completion", "timeout"],
  ] as const)(
    "cancels %s wait by %s without terminating the orchestration",
    async (target, cause) => {
      if (target === "completion") await startWorker();
      const id = await schedule();
      if (target === "completion") await client.waitForOrchestrationStart(id, false, 30);
      const expectedStatus = target === "start" ? OrchestrationStatus.PENDING : OrchestrationStatus.RUNNING;
      expect((await client.getOrchestrationState(id))?.runtimeStatus).toBe(expectedStatus);
      const controller = new AbortController();
      const started = new Promise<void>((resolve) => (onWaitStarted = resolve));
      const callsBefore = waitCalls;
      const method = target === "start" ? "waitForOrchestrationStart" : "waitForOrchestrationCompletion";
      const result = client[method](id, true, cause === "timeout" ? 1 : 30, controller.signal);
      const reason = new Error("cancel only the client wait");
      const assertion =
        cause === "abort"
          ? expect(result).rejects.toBe(reason)
          : expect(result).rejects.toMatchObject({ name: "TimeoutError" });
      await started;
      if (cause === "abort") controller.abort(reason);
      await assertion;
      expect(waitCalls).toBe(callsBefore + 1);
      expect(cancelledCalls).toBe(1);
      expect((await client.getOrchestrationState(id))?.runtimeStatus).toBe(expectedStatus);
      console.log(
        JSON.stringify({ instanceId: id, target, cause, outcome: "wait-cancelled", cancelledCalls, expectedStatus }),
      );
      if (target === "start") {
        await startWorker();
        expect((await client.waitForOrchestrationStart(id, false, 30))?.runtimeStatus).toBe(
          OrchestrationStatus.RUNNING,
        );
      }
      await finish(id);
    },
    60000,
  );
});
