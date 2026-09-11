// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "events";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { TaskEntity } from "../src/entities/task-entity";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { VersionFailureStrategy, VersionMatchStrategy } from "../src/worker/versioning-options";

type Callback<T = pb.CompleteTaskResponse> = (error: grpc.ServiceError | null, response: T) => void;

function grpcError(code: grpc.status): grpc.ServiceError {
  return Object.assign(new Error("delivery failed"), {
    code,
    details: "delivery failed",
    metadata: new grpc.Metadata(),
  });
}

function unaryCall(cancel = jest.fn()): grpc.ClientUnaryCall {
  return Object.assign(new EventEmitter(), { cancel, getPeer: () => "test", getAuthContext: () => null });
}

function activityRequest() {
  return new pb.ActivityRequest()
    .setName("answer")
    .setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("instance"));
}

describe("Worker response retries", () => {
  let stub: stubs.TaskHubSidecarServiceClient;
  let worker: TaskHubGrpcWorker;
  let logger: { error: jest.Mock; warn: jest.Mock; info: jest.Mock; debug: jest.Mock };
  let controller: AbortController;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0);
    stub = new stubs.TaskHubSidecarServiceClient("localhost:1", grpc.credentials.createInsecure());
    logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
    worker = new TaskHubGrpcWorker({ logger, shutdownTimeoutMs: 100 });
    controller = new AbortController();
    worker["_abortController"] = controller;
    worker["_stub"] = stub;
  });

  afterEach(() => {
    stub.close();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([grpc.status.UNAVAILABLE, grpc.status.UNKNOWN, grpc.status.DEADLINE_EXCEEDED, grpc.status.INTERNAL])(
    "retries transient status %s with the same request and fresh metadata",
    async (code) => {
      const metadata = jest.fn(async () => new grpc.Metadata());
      worker = new TaskHubGrpcWorker({ logger, metadataGenerator: metadata });
      const request = new pb.ActivityResponse().setCompletiontoken("token");
      const method = jest.fn((_request, _metadata, callback: Callback) => {
        callback(method.mock.calls.length === 1 ? grpcError(code) : null, new pb.CompleteTaskResponse());
        return unaryCall();
      });
      const delivery = worker["_deliverResponse"](method, request);
      await jest.runAllTimersAsync();
      await delivery;
      expect(method).toHaveBeenCalledTimes(2);
      expect(method.mock.calls.every(([sent]) => sent === request)).toBe(true);
      expect(metadata).toHaveBeenCalledTimes(2);
      expect(method.mock.calls[1][1]).not.toBe(method.mock.calls[0][1]);
    },
  );

  it.each([
    grpc.status.CANCELLED,
    grpc.status.INVALID_ARGUMENT,
    grpc.status.NOT_FOUND,
    grpc.status.ALREADY_EXISTS,
    grpc.status.PERMISSION_DENIED,
    grpc.status.RESOURCE_EXHAUSTED,
    grpc.status.FAILED_PRECONDITION,
    grpc.status.ABORTED,
    grpc.status.OUT_OF_RANGE,
    grpc.status.UNIMPLEMENTED,
    grpc.status.DATA_LOSS,
    grpc.status.UNAUTHENTICATED,
    undefined,
  ])("does not retry non-transient status %s", async (code) => {
    const error = code === undefined ? new Error("metadata failure") : grpcError(code);
    const method = jest.fn(() => {
      throw error;
    });
    await expect(worker["_deliverResponse"](method, new pb.ActivityResponse())).rejects.toBe(error);
    expect(method).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([0, 0.5])("bounds sends to ten with capped exponential delay and positive jitter (%s)", async (random) => {
    jest.spyOn(Math, "random").mockReturnValue(random);
    const attempts: number[] = [];
    const error = grpcError(grpc.status.INTERNAL);
    const method = jest.fn(() => {
      attempts.push(Date.now());
      throw error;
    });
    const delivery = worker["_deliverResponse"](method, new pb.ActivityResponse());
    const rejected = expect(delivery).rejects.toBe(error);
    await jest.runAllTimersAsync();
    await rejected;
    expect(attempts.slice(1).map((time, i) => time - attempts[i])).toEqual(
      [200, 400, 800, 1600, 3200, 6400, 12800, 15000, 15000].map((delay) => Math.floor(delay * (1 + random * 0.2))),
    );
    expect(method).toHaveBeenCalledTimes(10);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(["delay", "RPC", "metadata"] as const)(
    "stop prevents further sends while a retry awaits %s",
    async (phase) => {
      let finishMetadata!: (metadata: grpc.Metadata) => void;
      const metadata = new Promise<grpc.Metadata>((resolve) => (finishMetadata = resolve));
      const generateMetadata = jest.fn(async () => new grpc.Metadata());
      if (phase === "metadata")
        generateMetadata.mockImplementationOnce(async () => new grpc.Metadata()).mockImplementationOnce(() => metadata);
      worker["_metadataGenerator"] = generateMetadata;
      const cancel = jest.fn();
      const send = jest
        .spyOn(stub, "completeActivityTask")
        .mockImplementation(
          (_request, _metadata, optionsOrCallback: Partial<grpc.CallOptions> | Callback, callback?: Callback) => {
            const respond = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!;
            if (send.mock.calls.length === 1) respond(grpcError(grpc.status.INTERNAL), new pb.CompleteTaskResponse());
            return unaryCall(cancel);
          },
        );
      worker.addNamedActivity("answer", () => 42);
      worker["_isRunning"] = true;
      worker["_executeActivity"](activityRequest(), "token", stub);
      await jest.advanceTimersByTimeAsync(phase === "delay" ? 0 : 200);
      const stopping = worker.stop();
      await jest.advanceTimersByTimeAsync(1100);
      await stopping;
      finishMetadata(new grpc.Metadata());
      await jest.runAllTimersAsync();
      await Promise.all(worker["_pendingWorkItems"]);
      expect(send).toHaveBeenCalledTimes(phase === "RPC" ? 2 : 1);
      expect(cancel).toHaveBeenCalledTimes(phase === "RPC" ? 1 : 0);
      expect(logger.warn).toHaveBeenCalledTimes(phase === "metadata" ? 1 : 0);
      expect(worker["_pendingWorkItems"].size).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it("does not send a running activity's first response after shutdown starts", async () => {
    let finish!: () => void;
    worker.addNamedActivity("answer", () => new Promise<void>((resolve) => (finish = resolve)));
    const send = jest
      .spyOn(stub, "completeActivityTask")
      .mockImplementation(
        (_request, _metadata, optionsOrCallback: Partial<grpc.CallOptions> | Callback, callback?: Callback) => {
          (typeof optionsOrCallback === "function" ? optionsOrCallback : callback!)(
            null,
            new pb.CompleteTaskResponse(),
          );
          return unaryCall();
        },
      );
    const close = jest.spyOn(stub, "close");
    worker["_isRunning"] = true;
    worker["_executeActivity"](activityRequest(), "token", stub);
    await jest.advanceTimersByTimeAsync(0);
    const stopping = worker.stop();
    expect(close).not.toHaveBeenCalled();
    finish();
    await jest.advanceTimersByTimeAsync(1000);
    await stopping;
    expect(send).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each(
    (["activity", "orchestrator", "entity-v1", "entity-v2", "version-fail", "version-abandon"] as const).flatMap(
      (kind) =>
        (["retry", "already aborted", "initial metadata", "initial RPC"] as const).map((phase) => ({ kind, phase })),
    ),
  )("$kind response uses its dispatch-time run signal during $phase", async ({ kind, phase }) => {
    const mismatch = kind.startsWith("version");
    const executed = jest.fn();
    if (mismatch)
      worker = new TaskHubGrpcWorker({
        logger,
        shutdownTimeoutMs: 100,
        versioning: {
          version: "2",
          matchStrategy: VersionMatchStrategy.Strict,
          failureStrategy: kind === "version-fail" ? VersionFailureStrategy.Fail : VersionFailureStrategy.Reject,
        },
      });
    worker["_abortController"] = controller;
    worker.addNamedActivity("answer", () => {
      executed();
      return 42;
    });
    worker.addNamedOrchestrator("answer", async () => {
      executed();
      return 42;
    });
    class Counter extends TaskEntity<number> {
      increment() {
        executed();
        return ++this.state;
      }
      protected initializeState() {
        return 0;
      }
    }
    worker.addNamedEntity("counter", () => new Counter());
    let finishMetadata!: (metadata: grpc.Metadata) => void;
    const metadata = new Promise<grpc.Metadata>((resolve) => (finishMetadata = resolve));
    const generateMetadata = jest.fn(async () => new grpc.Metadata());
    if (phase === "initial metadata") generateMetadata.mockImplementation(() => metadata);
    worker["_metadataGenerator"] = generateMetadata;
    const cancel = jest.fn();
    let finishResponse = () => {};
    const requests: Array<
      pb.ActivityResponse | pb.OrchestratorResponse | pb.EntityBatchResult | pb.AbandonOrchestrationTaskRequest
    > = [];
    function complete<T>(result: T) {
      return (
        request: (typeof requests)[number],
        _metadata: grpc.Metadata,
        optionsOrCallback: Partial<grpc.CallOptions> | Callback<T>,
        callback?: Callback<T>,
      ) => {
        requests.push(request);
        const respond = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!;
        if (phase === "initial RPC") {
          finishResponse = () => respond(null, result);
        } else {
          respond(phase === "retry" && requests.length === 1 ? grpcError(grpc.status.INTERNAL) : null, result);
        }
        return unaryCall(cancel);
      };
    }
    jest.spyOn(stub, "completeActivityTask").mockImplementation(complete(new pb.CompleteTaskResponse()));
    jest.spyOn(stub, "completeOrchestratorTask").mockImplementation(complete(new pb.CompleteTaskResponse()));
    jest.spyOn(stub, "completeEntityTask").mockImplementation(complete(new pb.CompleteTaskResponse()));
    jest
      .spyOn(stub, "abandonTaskOrchestratorWorkItem")
      .mockImplementation(complete(new pb.AbandonOrchestrationTaskResponse()));
    const item = new pb.WorkItem().setCompletiontoken("token");
    if (kind === "activity") item.setActivityrequest(activityRequest());
    else if (kind === "orchestrator" || mismatch)
      item.setOrchestratorrequest(
        new pb.OrchestratorRequest()
          .setInstanceid("instance")
          .setNeweventsList([
            new pb.HistoryEvent()
              .setTimestamp(Timestamp.fromDate(new Date()))
              .setOrchestratorstarted(new pb.OrchestratorStartedEvent()),
            new pb.HistoryEvent().setExecutionstarted(
              new pb.ExecutionStartedEvent().setName("answer").setVersion(new StringValue().setValue("1")),
            ),
          ]),
      );
    else if (kind === "entity-v1")
      item.setEntityrequest(
        new pb.EntityBatchRequest()
          .setInstanceid("@counter@key")
          .setOperationsList([new pb.OperationRequest().setOperation("increment").setRequestid("req")]),
      );
    else
      item.setEntityrequestv2(
        new pb.EntityRequest()
          .setInstanceid("@counter@key")
          .setOperationrequestsList([
            new pb.HistoryEvent().setEntityoperationsignaled(
              new pb.EntityOperationSignaledEvent().setOperation("increment").setRequestid("req"),
            ),
          ]),
      );
    const wait = jest.spyOn(controller.signal, "addEventListener");
    if (phase === "already aborted") controller.abort();
    worker["_dispatchWorkItem"](item, stub);
    if (phase === "initial metadata" || phase === "initial RPC") {
      await jest.advanceTimersByTimeAsync(0);
      expect(generateMetadata).toHaveBeenCalledTimes(1);
      expect(requests).toHaveLength(phase === "initial RPC" ? 1 : 0);
      worker["_stub"] = stub;
      worker["_isRunning"] = true;
      const stopping = worker.stop();
      await jest.advanceTimersByTimeAsync(1100);
      await stopping;
    }
    worker["_abortController"] = new AbortController();
    finishMetadata(new grpc.Metadata());
    finishResponse();
    await jest.runAllTimersAsync();
    await Promise.all(worker["_pendingWorkItems"]);
    expect(executed).toHaveBeenCalledTimes(mismatch ? 0 : 1);
    if (phase === "retry") {
      expect(requests).toHaveLength(2);
      expect(requests[1]).toBe(requests[0]);
      expect(requests[1].getCompletiontoken()).toBe("token");
      expect(wait).toHaveBeenCalledWith("abort", expect.any(Function), { once: true });
      expect(logger.error).not.toHaveBeenCalled();
    } else {
      expect(requests).toHaveLength(phase === "initial RPC" ? 1 : 0);
      expect(cancel).toHaveBeenCalledTimes(phase === "initial RPC" ? 1 : 0);
      expect(controller.signal.aborted).toBe(true);
      expect(worker["_abortController"]!.signal.aborted).toBe(false);
    }
    expect(worker["_pendingWorkItems"].size).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("does not send an old run's first response when its activity returns after restart", async () => {
    let finish!: () => void;
    worker.addNamedActivity("answer", () => new Promise<void>((resolve) => (finish = resolve)));
    const send = jest
      .spyOn(stub, "completeActivityTask")
      .mockImplementation(
        (_request, _metadata, optionsOrCallback: Partial<grpc.CallOptions> | Callback, callback?: Callback) => {
          (typeof optionsOrCallback === "function" ? optionsOrCallback : callback!)(
            grpcError(grpc.status.INTERNAL),
            new pb.CompleteTaskResponse(),
          );
          return unaryCall();
        },
      );
    worker["_isRunning"] = true;
    worker["_executeActivity"](activityRequest(), "token", stub);
    await jest.advanceTimersByTimeAsync(0);
    const stopping = worker.stop();
    await jest.advanceTimersByTimeAsync(1100);
    await stopping;
    jest.spyOn(worker, "internalRunWorker").mockResolvedValue();
    await worker.start();
    try {
      finish();
      await jest.runAllTimersAsync();
      await Promise.all(worker["_pendingWorkItems"]);
      expect(send).not.toHaveBeenCalled();
      expect(controller.signal.aborted).toBe(true);
      expect(worker["_abortController"]!.signal.aborted).toBe(false);
    } finally {
      const stoppingNewRun = worker.stop();
      await jest.runAllTimersAsync();
      await stoppingNewRun;
    }
  });
});
