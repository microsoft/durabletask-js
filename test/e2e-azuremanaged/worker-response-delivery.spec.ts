// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { randomUUID } from "crypto";
import {
  ActivityContext,
  EntityInstanceId,
  Logger,
  OrchestrationContext,
  ProtoOrchestrationStatus,
  Task,
  TaskEntity,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";
import * as pb from "../../packages/durabletask-js/src/proto/orchestrator_service_pb";

// Opt-in: use a dedicated existing task hub. This suite never provisions or deletes Azure resources.
const connectionString = process.env.WORKER_DELIVERY_CONNECTION_STRING;
const describeDelivery = connectionString ? describe : describe.skip;

describeDelivery("Worker response delivery with a real scheduler", () => {
  it.each([false, true])(
    "persists orchestration and entity results (injected delivery failures: %s)",
    async (inject) => {
      const runId = `response-delivery-${randomUUID()}`;
      const attempts = new Map<string, number>();
      const payloads = new Map<string, Buffer>();
      const methods = new Map<string, string>();
      let injectedFailures = 0;
      let activityExecutions = 0;
      let entityExecutions = 0;
      const errors: string[] = [];
      const logger: Logger = {
        error: (message) => errors.push(message),
        warn: () => {},
        info: () => {},
        debug: () => {},
      };

      const interceptor: grpc.Interceptor = (options, nextCall) => {
        if (!/\/Complete(Orchestrator|Activity|Entity)Task$/.test(options.method_definition.path)) {
          return new grpc.InterceptingCall(nextCall(options));
        }
        let begin: (() => void) | undefined;
        let fail: (() => void) | undefined;
        let forwarded = false;
        return new grpc.InterceptingCall(nextCall(options), {
          start(metadata, listener, next) {
            begin = () => next(metadata, listener);
            fail = () =>
              listener.onReceiveStatus({
                code: grpc.status.INTERNAL,
                details: "Test-only pre-send delivery fault; not an Azure outage",
                metadata: new grpc.Metadata(),
              });
          },
          sendMessage(message: pb.OrchestratorResponse | pb.ActivityResponse | pb.EntityBatchResult, next) {
            const key = `${options.method_definition.path}:${message.getCompletiontoken()}`;
            const attempt = (attempts.get(key) ?? 0) + 1;
            attempts.set(key, attempt);
            methods.set(key, options.method_definition.path);
            const bytes = Buffer.from(message.serializeBinary());
            if (payloads.has(key)) expect(bytes).toEqual(payloads.get(key));
            else payloads.set(key, bytes);
            if (inject && attempt === 1) {
              injectedFailures++;
              fail!();
            } else {
              forwarded = true;
              begin!();
              next(message);
            }
          },
          halfClose(next) {
            if (forwarded) next();
          },
        });
      };

      const activityName = `DeliveryActivity-${runId}`;
      const orchestrationName = `DeliveryOrchestrator-${runId}`;
      const entityName = `DeliveryCounter-${runId}`;
      const entityId = new EntityInstanceId(entityName, "counter");
      const activity = (_context: ActivityContext, input: number): number => {
        activityExecutions++;
        return input + 1;
      };
      const orchestration = async function* (
        context: OrchestrationContext,
      ): AsyncGenerator<Task<number>, number, number> {
        const result = yield context.callActivity(activityName, 41);
        return result;
      };
      class Counter extends TaskEntity<number> {
        add(value: number): void {
          entityExecutions++;
          this.state += value;
        }
        protected initializeState(): number {
          return 0;
        }
      }

      const client = new DurableTaskAzureManagedClientBuilder()
        .connectionString(connectionString!)
        .logger(logger)
        .build();
      const worker = new DurableTaskAzureManagedWorkerBuilder()
        .connectionString(connectionString!)
        .grpcChannelOptions({ interceptors: [interceptor] })
        .logger(logger)
        .useWorkItemFilters()
        .build();
      worker.addNamedActivity(activityName, activity);
      worker.addNamedOrchestrator(orchestrationName, orchestration);
      worker.addNamedEntity(entityName, () => new Counter());
      try {
        await worker.start();
        await client.scheduleNewOrchestration(orchestrationName, undefined, { instanceId: runId });
        await client.signalEntity(entityId, "add", 42);
        const state = await client.waitForOrchestrationCompletion(runId, true, 60);
        expect(state?.runtimeStatus).toBe(ProtoOrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
        expect(state?.serializedOutput).toBe("42");
        let entity = await client.getEntity<number>(entityId);
        const deadline = Date.now() + 30000;
        while (entity?.state !== 42 && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          entity = await client.getEntity<number>(entityId);
        }
        expect(entity?.state).toBe(42);
        expect(activityExecutions).toBe(1);
        expect(entityExecutions).toBe(1);
        expect(errors).toEqual([]);
        expect(new Set(methods.values())).toEqual(
          new Set([
            "/TaskHubSidecarService/CompleteOrchestratorTask",
            "/TaskHubSidecarService/CompleteActivityTask",
            "/TaskHubSidecarService/CompleteEntityTask",
          ]),
        );
        expect([...attempts.values()].every((count) => count === (inject ? 2 : 1))).toBe(true);
        expect(injectedFailures).toBe(inject ? attempts.size : 0);
        // Do not print completion tokens or credentials in evidence logs.
        console.log(
          JSON.stringify({
            runId,
            entityId: entityId.toString(),
            injected: inject,
            injectionLocation: inject ? "client interceptor, before sending to real scheduler" : "none",
            status: "Completed",
            output: state?.serializedOutput,
            entityState: entity?.state,
            activityExecutions,
            entityExecutions,
            injectedFailures,
            deliveries: [...attempts].map(([key, count]) => ({ method: methods.get(key), attempts: count })),
          }),
        );
      } finally {
        await worker.stop();
        await client.stop();
      }
    },
    120000,
  );
});
