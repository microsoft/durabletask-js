// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { TaskEntity } from "../src/entities/task-entity";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import * as pb from "../src/proto/orchestrator_service_pb";
import { Logger } from "../src/types/logger.type";
import { ExponentialBackoff, withTimeout } from "../src/utils/backoff.util";
import { TaskHubGrpcWorker, TaskHubGrpcWorkerOptions } from "../src/worker/task-hub-grpc-worker";
import { VersionFailureStrategy, VersionMatchStrategy } from "../src/worker/versioning-options";

type WorkStream = grpc.ServerWritableStream<pb.GetWorkItemsRequest, pb.WorkItem>;
type SidecarHandlers = Partial<
  Pick<
    stubs.ITaskHubSidecarServiceServer,
    | "hello"
    | "getWorkItems"
    | "completeActivityTask"
    | "completeOrchestratorTask"
    | "completeEntityTask"
    | "abandonTaskOrchestratorWorkItem"
  >
>;

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => (resolve = complete));
  return { promise, resolve };
}

function grpcError(code: grpc.status): grpc.ServiceError {
  return Object.assign(new Error("injected delivery failure"), {
    code,
    details: "injected delivery failure",
    metadata: new grpc.Metadata(),
  });
}

function activityWorkItem(): pb.WorkItem {
  const request = new pb.ActivityRequest()
    .setName("deliveryActivity")
    .setTaskid(42)
    .setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("delivery-instance"));
  return new pb.WorkItem().setCompletiontoken("delivery-token").setActivityrequest(request);
}

describe("Worker response delivery over gRPC", () => {
  let server: grpc.Server;
  let worker: TaskHubGrpcWorker | undefined;
  let logger: Logger;
  let activity: jest.Mock<Promise<string>, []>;
  let firstStream: ReturnType<typeof deferred<WorkStream>>;
  let terminalError: ReturnType<typeof deferred<string>>;
  let shutdownWaiting: ReturnType<typeof deferred<void>>;

  beforeEach(() => {
    server = new grpc.Server();
    worker = undefined;
    activity = jest.fn(async () => "activity-result");
    firstStream = deferred<WorkStream>();
    terminalError = deferred<string>();
    shutdownWaiting = deferred();
    logger = {
      error: jest.fn((message: string) => {
        if (message.includes("Failed to deliver activity response")) terminalError.resolve(message);
      }),
      warn: jest.fn(),
      info: jest.fn((message: string) => {
        if (message.includes("pending work item(s) to complete")) shutdownWaiting.resolve();
      }),
      debug: jest.fn(),
    };
  });

  afterEach(async () => {
    try {
      if (worker?.["_isRunning"]) await withTimeout(worker.stop(), 5000);
    } finally {
      server.forceShutdown();
      jest.restoreAllMocks();
    }
  });

  async function startWorker(
    handlers: SidecarHandlers,
    options: TaskHubGrpcWorkerOptions = {},
    register?: (worker: TaskHubGrpcWorker) => void,
  ): Promise<WorkStream> {
    server.addService(stubs.TaskHubSidecarServiceService, {
      hello: (_call: grpc.ServerUnaryCall<Empty, Empty>, callback: grpc.sendUnaryData<Empty>) =>
        callback(null, new Empty()),
      getWorkItems: (call: WorkStream) => {
        call.once("cancelled", () => call.end());
        call.write(new pb.WorkItem().setHealthping(new pb.HealthPing()));
        firstStream.resolve(call);
      },
      ...handlers,
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, boundPort) =>
        error ? reject(error) : resolve(boundPort),
      );
    });
    worker = new TaskHubGrpcWorker({
      hostAddress: `127.0.0.1:${port}`,
      logger,
      shutdownTimeoutMs: 1000,
      ...options,
    });
    worker.addNamedActivity("deliveryActivity", activity);
    register?.(worker);
    await worker.start();
    return withTimeout(firstStream.promise, 5000, "Worker did not open its work-item stream");
  }

  async function drainWork(): Promise<void> {
    await withTimeout(Promise.all(worker!["_pendingWorkItems"]), 5000, "Response delivery did not finish");
    expect(worker!["_pendingWorkItems"].size).toBe(0);
  }

  it.each([grpc.status.INTERNAL, grpc.status.UNKNOWN, grpc.status.UNAVAILABLE, grpc.status.DEADLINE_EXCEEDED])(
    "recovers status %s after committed headers without re-executing the activity",
    async (code) => {
      const requests: pb.ActivityResponse[] = [];
      const accepted = deferred();
      const stream = await startWorker({
        completeActivityTask: (call, callback) => {
          requests.push(call.request);
          // Committed headers prohibit gRPC's transparent/service-config retries.
          call.sendMetadata(new grpc.Metadata());
          if (requests.length === 1) callback(grpcError(code));
          else {
            callback(null, new pb.CompleteTaskResponse());
            accepted.resolve();
          }
        },
      });
      stream.write(activityWorkItem());
      await withTimeout(accepted.promise, 5000);
      await drainWork();

      expect(requests).toHaveLength(2);
      expect(requests[1].serializeBinary()).toEqual(requests[0].serializeBinary());
      expect(requests[1].getCompletiontoken()).toBe("delivery-token");
      expect(requests[1].getResult()?.getValue()).toBe('"activity-result"');
      expect(requests[1].getTaskid()).toBe(42);
      expect(requests[1].getInstanceid()).toBe("delivery-instance");
      expect(activity).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
    },
  );

  it("reports a permanent failure once without retrying or re-executing", async () => {
    const requests: pb.ActivityResponse[] = [];
    const stream = await startWorker({
      completeActivityTask: (call, callback) => {
        requests.push(call.request);
        callback(grpcError(grpc.status.INVALID_ARGUMENT));
      },
    });
    stream.write(activityWorkItem());

    expect(await withTimeout(terminalError.promise, 5000)).toContain("INVALID_ARGUMENT");
    await drainWork();
    expect(requests).toHaveLength(1);
    expect(requests[0].getCompletiontoken()).toBe("delivery-token");
    expect(activity).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("retries explicit-signal abandonment with the same completion token", async () => {
    const requests: pb.AbandonOrchestrationTaskRequest[] = [];
    await startWorker({
      abandonTaskOrchestratorWorkItem: (call, callback) => {
        requests.push(call.request);
        call.sendMetadata(new grpc.Metadata());
        if (requests.length === 1) callback(grpcError(grpc.status.INTERNAL));
        else callback(null, new pb.AbandonOrchestrationTaskResponse());
      },
    });
    const controller = new AbortController();
    await withTimeout(
      worker!["_abandonOrchestrationWorkItem"](worker!["_stub"]!, "explicit-abandon-token", controller.signal),
      5000,
    );
    expect(requests).toHaveLength(2);
    expect(requests[1].serializeBinary()).toEqual(requests[0].serializeBinary());
    expect(requests[1].getCompletiontoken()).toBe("explicit-abandon-token");
    expect(activity).not.toHaveBeenCalled();
  });

  it.each(["metadata", "RPC"])("explicit abandonment cancellation stops initial %s immediately", async (phase) => {
    const metadata = deferred<grpc.Metadata>();
    const started = deferred();
    const cancelled = deferred();
    let holdMetadata = false;
    await startWorker(
      {
        abandonTaskOrchestratorWorkItem: (call) => {
          call.once("cancelled", () => cancelled.resolve());
          started.resolve();
        },
      },
      {
        metadataGenerator: async () => {
          if (holdMetadata) {
            started.resolve();
            return metadata.promise;
          }
          return new grpc.Metadata();
        },
      },
    );
    holdMetadata = phase === "metadata";
    const send = jest.spyOn(worker!["_stub"]!, "abandonTaskOrchestratorWorkItem");
    const controller = new AbortController();
    const reason = new Error("abandonment cancelled");
    const delivery = worker!["_abandonOrchestrationWorkItem"](
      worker!["_stub"]!,
      "explicit-abandon-token",
      controller.signal,
    );
    const rejection = expect(delivery).rejects.toBe(reason);
    try {
      await withTimeout(started.promise, 5000);
      controller.abort(reason);
      await withTimeout(rejection, 1000, "Initial abandonment did not observe the explicit signal");
      if (phase === "RPC") await withTimeout(cancelled.promise, 5000);
      expect(worker!["_completionAbortController"]!.signal.aborted).toBe(false);
      expect(worker!["_abortController"]!.signal.aborted).toBe(false);
      metadata.resolve(new grpc.Metadata());
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(send).toHaveBeenCalledTimes(phase === "metadata" ? 0 : 1);
      expect(activity).not.toHaveBeenCalled();
    } finally {
      controller.abort(reason);
      metadata.resolve(new grpc.Metadata());
      await rejection;
    }
  });

  it("bounds SDK delivery to ten attempts while preserving configured transport retries", async () => {
    const wait = ExponentialBackoff.prototype.wait;
    jest.spyOn(ExponentialBackoff.prototype, "wait").mockImplementation(function (
      this: ExponentialBackoff,
      signal,
      onDelay,
    ) {
      // Shorten only response delays, retaining the real wait and retry accounting.
      if (this["_initialDelayMs"] === 200) this["_currentDelayMs"] = 1;
      return wait.call(this, signal, onDelay);
    });
    const requests: pb.ActivityResponse[] = [];
    const transportAttempts: grpc.MetadataValue[][] = [];
    const stream = await startWorker(
      {
        completeActivityTask: (call, callback) => {
          requests.push(call.request);
          transportAttempts.push(call.metadata.get("grpc-previous-rpc-attempts"));
          // Trailers-only errors would be eligible for the configured channel retry policy.
          callback(grpcError(grpc.status.INTERNAL));
        },
      },
      {
        options: {
          "grpc.enable_retries": 1,
          "grpc.service_config": JSON.stringify({
            methodConfig: [
              {
                name: [{}],
                retryPolicy: {
                  maxAttempts: 5,
                  initialBackoff: "0.001s",
                  maxBackoff: "0.001s",
                  backoffMultiplier: 1,
                  retryableStatusCodes: ["INTERNAL"],
                },
              },
            ],
          }),
        },
      },
    );
    const sdkDeliveries = jest.spyOn(worker!["_stub"]!, "completeActivityTask");
    stream.write(activityWorkItem());
    expect(await withTimeout(terminalError.promise, 5000)).toContain("INTERNAL");
    await drainWork();

    expect(sdkDeliveries).toHaveBeenCalledTimes(10);
    expect(requests).toHaveLength(50);
    expect(transportAttempts).toEqual(Array.from({ length: 10 }, () => [[], ["1"], ["2"], ["3"], ["4"]]).flat());
    expect(requests.every((request) => request.getCompletiontoken() === "delivery-token")).toBe(true);
    expect(requests.every((request) => request.getResult()?.getValue() === '"activity-result"')).toBe(true);
    expect(activity).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it.each(["delay", "RPC"] as const)("stop cancels a retry %s without subsequent attempts", async (phase) => {
    const retryWaiting = deferred();
    const retriedCall = deferred();
    const cancelled = deferred();
    const wait = ExponentialBackoff.prototype.wait;
    jest.spyOn(ExponentialBackoff.prototype, "wait").mockImplementation(function (
      this: ExponentialBackoff,
      signal,
      onDelay,
    ) {
      const waiting = wait.call(this, signal, onDelay);
      if (this["_initialDelayMs"] === 200) retryWaiting.resolve();
      return waiting;
    });
    let attempts = 0;
    const stream = await startWorker({
      completeActivityTask: (call, callback) => {
        if (++attempts === 1) callback(grpcError(grpc.status.INTERNAL));
        else {
          call.once("cancelled", () => cancelled.resolve());
          retriedCall.resolve();
        }
      },
    });
    stream.write(activityWorkItem());
    await withTimeout(phase === "delay" ? retryWaiting.promise : retriedCall.promise, 5000);

    const stopping = worker!.stop();
    if (phase === "RPC") await withTimeout(cancelled.promise, 5000, "Retried RPC was not cancelled");
    await withTimeout(stopping, 5000);
    await drainWork();
    expect(attempts).toBe(phase === "delay" ? 1 : 2);
    expect(activity).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining("Shutdown timed out"));
    expect(worker!["_stub"]!.getChannel().getConnectivityState(false)).toBe(grpc.connectivityState.SHUTDOWN);
  });

  it.each(["initial", "retry"] as const)("stop settles pending %s metadata without a late RPC", async (phase) => {
    const metadata = deferred<grpc.Metadata>();
    const metadataWaiting = deferred();
    let holdMetadata = false;
    let received = 0;
    const stream = await startWorker(
      {
        completeActivityTask: (call, callback) => {
          received++;
          holdMetadata = true;
          call.sendMetadata(new grpc.Metadata());
          callback(grpcError(grpc.status.INTERNAL));
        },
      },
      {
        shutdownTimeoutMs: phase === "initial" ? 100 : 3000,
        metadataGenerator: async () => {
          if (holdMetadata) {
            metadataWaiting.resolve();
            return metadata.promise;
          }
          return new grpc.Metadata();
        },
      },
    );
    holdMetadata = phase === "initial";
    const send = jest.spyOn(worker!["_stub"]!, "completeActivityTask");
    stream.write(activityWorkItem());
    await withTimeout(metadataWaiting.promise, 5000);
    const pending = Promise.all(worker!["_pendingWorkItems"]);
    const stopping = worker!.stop();
    try {
      if (phase === "initial") {
        await withTimeout(shutdownWaiting.promise, 5000);
        expect(worker!["_completionAbortController"]!.signal.aborted).toBe(false);
        expect(worker!["_pendingWorkItems"].size).toBe(1);
      }
      await withTimeout(pending, 1000, "Metadata wait did not settle on cancellation");
      await withTimeout(stopping, 5000);
      await drainWork();

      metadata.resolve(new grpc.Metadata());
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(send).toHaveBeenCalledTimes(phase === "initial" ? 0 : 1);
      expect(received).toBe(phase === "initial" ? 0 : 1);
      expect(activity).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledTimes(phase === "initial" ? 1 : 0);
    } finally {
      metadata.resolve(new grpc.Metadata());
      await withTimeout(stopping, 5000);
    }
  });

  it("graceful stop retains the stub until running activity work sends its initial completion", async () => {
    const started = deferred();
    const finishActivity = deferred<string>();
    const received = deferred<grpc.sendUnaryData<pb.CompleteTaskResponse>>();
    const requests: pb.ActivityResponse[] = [];
    activity.mockImplementation(() => {
      started.resolve();
      return finishActivity.promise;
    });
    const stream = await startWorker(
      {
        completeActivityTask: (call, callback) => {
          requests.push(call.request);
          received.resolve(callback);
        },
      },
      { shutdownTimeoutMs: 3000 },
    );
    const close = jest.spyOn(worker!["_stub"]!, "close");
    stream.write(activityWorkItem());
    await withTimeout(started.promise, 5000);

    const stopping = worker!.stop();
    await withTimeout(shutdownWaiting.promise, 5000);
    expect(close).not.toHaveBeenCalled();
    finishActivity.resolve("drained-result");
    const complete = await withTimeout(received.promise, 5000);
    expect(close).not.toHaveBeenCalled();
    complete(null, new pb.CompleteTaskResponse());
    await withTimeout(stopping, 5000);

    expect(requests).toHaveLength(1);
    expect(requests[0].getCompletiontoken()).toBe("delivery-token");
    expect(requests[0].getResult()?.getValue()).toBe('"drained-result"');
    expect(activity).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    await drainWork();
  });

  it("shutdown timeout cancels an initial completion RPC that never responds", async () => {
    const received = deferred<grpc.ServerUnaryCall<pb.ActivityResponse, pb.CompleteTaskResponse>>();
    const cancelled = deferred();
    let attempts = 0;
    const stream = await startWorker(
      {
        completeActivityTask: (call) => {
          attempts++;
          call.once("cancelled", () => cancelled.resolve());
          received.resolve(call);
        },
      },
      { shutdownTimeoutMs: 100 },
    );
    stream.write(activityWorkItem());
    const call = await withTimeout(received.promise, 5000);

    const stopping = worker!.stop();
    await withTimeout(shutdownWaiting.promise, 5000);
    expect(call.cancelled).toBe(false);
    await withTimeout(cancelled.promise, 5000, "Initial RPC was not cancelled after shutdown timeout");
    await withTimeout(stopping, 5000);
    await drainWork();

    expect(attempts).toBe(1);
    expect(activity).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Shutdown timed out after 100ms"));
    expect(worker!["_stub"]!.getChannel().getConnectivityState(false)).toBe(grpc.connectivityState.SHUTDOWN);
  });

  it.each(["orchestrator", "entity-v1", "entity-v2", "version-fail", "abandon"] as const)(
    "recovers the same %s completion payload without executing user code again",
    async (kind) => {
      const executed = jest.fn();
      const versionMismatch = kind === "version-fail" || kind === "abandon";
      type Response = pb.OrchestratorResponse | pb.EntityBatchResult | pb.AbandonOrchestrationTaskRequest;
      const requests: Response[] = [];
      const accepted = deferred();
      const complete = <TResponse>(
        call: grpc.ServerUnaryCall<Response, TResponse>,
        callback: grpc.sendUnaryData<TResponse>,
        response: TResponse,
      ) => {
        requests.push(call.request);
        call.sendMetadata(new grpc.Metadata());
        if (requests.length === 1) callback(grpcError(grpc.status.INTERNAL));
        else {
          callback(null, response);
          accepted.resolve();
        }
      };
      const stream = await startWorker(
        {
          completeOrchestratorTask: (call, callback) => complete(call, callback, new pb.CompleteTaskResponse()),
          completeEntityTask: (call, callback) => complete(call, callback, new pb.CompleteTaskResponse()),
          abandonTaskOrchestratorWorkItem: (call, callback) =>
            complete(call, callback, new pb.AbandonOrchestrationTaskResponse()),
        },
        {
          versioning: versionMismatch
            ? {
                version: "2",
                matchStrategy: VersionMatchStrategy.Strict,
                failureStrategy: kind === "abandon" ? VersionFailureStrategy.Reject : VersionFailureStrategy.Fail,
              }
            : undefined,
        },
        (worker) => {
          worker.addNamedOrchestrator("deliveryOrchestrator", async () => {
            executed();
            return "orchestration-result";
          });
          class Counter extends TaskEntity<number> {
            increment(): number {
              executed();
              return ++this.state;
            }
            protected initializeState(): number {
              return 0;
            }
          }
          worker.addNamedEntity("deliveryCounter", () => new Counter());
        },
      );
      const item = new pb.WorkItem().setCompletiontoken("work-token");
      if (kind === "orchestrator" || versionMismatch) {
        const request = new pb.OrchestratorRequest().setInstanceid("delivery-instance");
        request.setNeweventsList([
          new pb.HistoryEvent()
            .setTimestamp(Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")))
            .setOrchestratorstarted(new pb.OrchestratorStartedEvent()),
          new pb.HistoryEvent().setExecutionstarted(
            new pb.ExecutionStartedEvent().setName("deliveryOrchestrator").setVersion(new StringValue().setValue("1")),
          ),
        ]);
        item.setOrchestratorrequest(request);
      } else if (kind === "entity-v1") {
        item.setEntityrequest(
          new pb.EntityBatchRequest()
            .setInstanceid("@deliverycounter@key")
            .setOperationsList([new pb.OperationRequest().setOperation("increment").setRequestid("req-1")]),
        );
      } else {
        item.setEntityrequestv2(
          new pb.EntityRequest()
            .setInstanceid("@deliverycounter@key")
            .setOperationrequestsList([
              new pb.HistoryEvent().setEntityoperationsignaled(
                new pb.EntityOperationSignaledEvent().setOperation("increment").setRequestid("req-1"),
              ),
            ]),
        );
      }
      stream.write(item);
      await withTimeout(accepted.promise, 5000);
      await drainWork();

      expect(requests).toHaveLength(2);
      expect(requests[1].serializeBinary()).toEqual(requests[0].serializeBinary());
      expect(requests[1].getCompletiontoken()).toBe("work-token");
      const response = requests[1];
      expect(response).toBeInstanceOf(
        kind === "abandon"
          ? pb.AbandonOrchestrationTaskRequest
          : kind.startsWith("entity")
            ? pb.EntityBatchResult
            : pb.OrchestratorResponse,
      );
      if (response instanceof pb.OrchestratorResponse) {
        expect(response.getInstanceid()).toBe("delivery-instance");
        expect(response.getActionsList()).toHaveLength(1);
        const completion = response.getActionsList()[0].getCompleteorchestration();
        if (kind === "version-fail") {
          expect(completion?.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
          expect(completion?.getFailuredetails()?.getErrortype()).toBe("VersionMismatch");
          expect(completion?.getFailuredetails()?.getIsnonretriable()).toBe(true);
        } else {
          expect(completion?.getResult()?.getValue()).toBe('"orchestration-result"');
        }
      } else if (response instanceof pb.EntityBatchResult) {
        expect(response.getEntitystate()?.getValue()).toBe("1");
        expect(response.getResultsList()).toHaveLength(1);
        expect(response.getResultsList()[0].getSuccess()?.getResult()?.getValue()).toBe("1");
      }
      expect(executed).toHaveBeenCalledTimes(versionMismatch ? 0 : 1);
      expect(logger.error).not.toHaveBeenCalled();
    },
  );

  it("reconnects through hello and cancels a retried completion on its original stub", async () => {
    const secondStream = deferred();
    const started = deferred();
    const finishActivity = deferred<string>();
    const retriedCall = deferred();
    const cancelled = deferred();
    let helloCalls = 0;
    let streamCalls = 0;
    let attempts = 0;
    activity.mockImplementation(() => {
      started.resolve();
      return finishActivity.promise;
    });
    const stream = await startWorker(
      {
        hello: (_call, callback) => {
          helloCalls++;
          callback(null, new Empty());
        },
        getWorkItems: (call) => {
          call.once("cancelled", () => call.end());
          call.write(new pb.WorkItem().setHealthping(new pb.HealthPing()));
          if (++streamCalls === 1) firstStream.resolve(call);
          else secondStream.resolve();
        },
        completeActivityTask: (call, callback) => {
          if (++attempts === 1) callback(grpcError(grpc.status.INTERNAL));
          else {
            call.once("cancelled", () => cancelled.resolve());
            retriedCall.resolve();
          }
        },
      },
      { channelRecreateFailureThreshold: 1 },
    );
    const originalStub = worker!["_stub"]!;
    const close = jest.spyOn(originalStub, "close");
    stream.write(activityWorkItem());
    await withTimeout(started.promise, 5000);
    stream.emit("error", grpcError(grpc.status.UNAVAILABLE));
    await withTimeout(secondStream.promise, 5000, "Worker did not reconnect");
    expect(worker!["_stub"]).not.toBe(originalStub);
    expect(close).not.toHaveBeenCalled();

    finishActivity.resolve("original-stub-result");
    await withTimeout(retriedCall.promise, 5000);
    const stopping = worker!.stop();
    await withTimeout(cancelled.promise, 5000, "Retired stub RPC was not cancelled");
    await withTimeout(stopping, 5000);
    await drainWork();

    expect(helloCalls).toBe(2);
    expect(streamCalls).toBe(2);
    expect(attempts).toBe(2);
    expect(activity).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining("Shutdown timed out"));
    expect(close).toHaveBeenCalledTimes(1);
    expect(worker!["_deferredStubCloseTimers"].size).toBe(0);
  });
});
