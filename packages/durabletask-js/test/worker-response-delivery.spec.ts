// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter, getEventListeners } from "events";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { TaskEntity } from "../src/entities/task-entity";
import { NoOpLogger } from "../src/types/logger.type";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { VersionFailureStrategy, VersionMatchStrategy } from "../src/worker/versioning-options";

function grpcError(code: grpc.status): grpc.ServiceError {
  return Object.assign(new Error("injected delivery failure"), {
    code,
    details: "injected delivery failure",
    metadata: new grpc.Metadata(),
  });
}

function unaryCall(cancel = jest.fn()): grpc.ClientUnaryCall {
  return Object.assign(new EventEmitter(), { cancel, getPeer: () => "test", getAuthContext: () => null });
}

type CompleteCallback<TResponse = pb.CompleteTaskResponse> = (
  error: grpc.ServiceError | null,
  response: TResponse,
) => void;

function createLogger() {
  return { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
}

describe("Worker response delivery", () => {
  let stub: stubs.TaskHubSidecarServiceClient;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0);
    stub = new stubs.TaskHubSidecarServiceClient("localhost:1", grpc.credentials.createInsecure());
  });

  afterEach(() => {
    stub.close();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([grpc.status.UNAVAILABLE, grpc.status.UNKNOWN, grpc.status.DEADLINE_EXCEEDED, grpc.status.INTERNAL])(
    "retries status %s without re-executing the activity",
    async (code) => {
      const logger = createLogger();
      const errorLog = jest.spyOn(logger, "error");
      const worker = new TaskHubGrpcWorker({ logger });
      const activity = jest.fn(() => "saved-result");
      worker.addNamedActivity("deliveryActivity", activity);
      const req = new pb.ActivityRequest();
      req.setName("deliveryActivity");
      req.setTaskid(42);
      req.setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("delivery-instance"));
      const requests: pb.ActivityResponse[] = [];
      const completeActivityTask = jest
        .spyOn(stub, "completeActivityTask")
        .mockImplementation(
          (
            response: pb.ActivityResponse,
            _metadata: grpc.Metadata,
            optionsOrCallback: Partial<grpc.CallOptions> | CompleteCallback,
            callback?: CompleteCallback,
          ) => {
            requests.push(response);
            const respond = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!;
            respond(requests.length < 3 ? grpcError(code) : null, new pb.CompleteTaskResponse());
            return unaryCall();
          },
        );
      // Exercise the real executor and response delivery, replacing only the network boundary.
      const completion = worker["_executeActivityInternal"](req, "delivery-token", stub);

      await jest.runAllTimersAsync();
      await completion;

      expect(completeActivityTask).toHaveBeenCalledTimes(3);
      expect(activity).toHaveBeenCalledTimes(1);
      expect(requests.every((response) => response === requests[0])).toBe(true);
      expect(requests[0].getCompletiontoken()).toBe("delivery-token");
      expect(requests[0].getResult()?.getValue()).toBe('"saved-result"');
      expect(errorLog).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
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
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const error = code === undefined ? new Error("metadata failure") : grpcError(code);
    const method = jest.fn(() => {
      throw error;
    });
    await expect(worker["_deliverResponse"](stub, method, new pb.ActivityResponse())).rejects.toBe(error);
    expect(method).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("bounds delivery to ten attempts with .NET backoff and returns the final error", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const attempts: number[] = [];
    const error = grpcError(grpc.status.UNAVAILABLE);
    const method = jest.fn(() => {
      attempts.push(Date.now());
      throw error;
    });
    const delivery = worker["_deliverResponse"](stub, method, new pb.ActivityResponse());
    const rejection = expect(delivery).rejects.toBe(error);
    await jest.runAllTimersAsync();
    await rejection;
    expect(attempts.slice(1).map((time, i) => time - attempts[i])).toEqual([
      200, 400, 800, 1600, 3200, 6400, 12800, 15000, 15000,
    ]);
    expect(method).toHaveBeenCalledTimes(10);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("uses positive jitter above the capped exponential delay", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const attempts: number[] = [];
    const method = jest.fn(() => {
      attempts.push(Date.now());
      throw grpcError(grpc.status.INTERNAL);
    });
    const rejection = expect(worker["_deliverResponse"](stub, method, new pb.ActivityResponse())).rejects.toThrow();
    await jest.runAllTimersAsync();
    await rejection;
    expect(attempts.slice(1).map((time, i) => time - attempts[i])).toEqual([
      220, 440, 880, 1760, 3520, 7040, 14080, 16500, 16500,
    ]);
  });

  it("refreshes metadata on every delivery attempt", async () => {
    const metadataGenerator = jest.fn(async () => new grpc.Metadata());
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger(), metadataGenerator });
    const receivedMetadata: grpc.Metadata[] = [];
    const method = (_request: pb.ActivityResponse, metadata: grpc.Metadata, callback: CompleteCallback) => {
      receivedMetadata.push(metadata);
      callback(receivedMetadata.length === 1 ? grpcError(grpc.status.INTERNAL) : null, new pb.CompleteTaskResponse());
      return unaryCall();
    };
    const delivery = worker["_deliverResponse"](stub, method, new pb.ActivityResponse());
    await jest.runAllTimersAsync();
    await delivery;
    expect(metadataGenerator).toHaveBeenCalledTimes(2);
    expect(receivedMetadata[0]).not.toBe(receivedMetadata[1]);
  });

  it.each(["delay", "call"] as const)("cancels a retry %s and removes its resources", async (phase) => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const completion = new AbortController();
    const retry = new AbortController();
    worker["_responseDeliverySignals"].set(stub, { completion: completion.signal, retry: retry.signal });
    const cancel = jest.fn();
    let attempts = 0;
    const method = (_req: pb.ActivityResponse, _metadata: grpc.Metadata, callback: CompleteCallback) => {
      if (++attempts === 1) callback(grpcError(grpc.status.INTERNAL), new pb.CompleteTaskResponse());
      return unaryCall(cancel);
    };
    const result = worker["_deliverResponse"](stub, method, new pb.ActivityResponse());
    const rejection = expect(result).rejects.toThrow("stopped");
    await jest.advanceTimersByTimeAsync(phase === "delay" ? 0 : 200);
    retry.abort(new Error("stopped"));
    await rejection;
    expect(attempts).toBe(phase === "delay" ? 1 : 2);
    expect(cancel).toHaveBeenCalledTimes(phase === "delay" ? 0 : 1);
    expect(getEventListeners(completion.signal, "abort")).toHaveLength(0);
    expect(getEventListeners(retry.signal, "abort")).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("allows a draining first completion but does not retry after stop", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const completion = new AbortController();
    const retry = new AbortController();
    worker["_responseDeliverySignals"].set(stub, { completion: completion.signal, retry: retry.signal });
    retry.abort(new Error("stopped"));
    const method = jest.fn((_req: pb.ActivityResponse, _metadata: grpc.Metadata, callback: CompleteCallback) => {
      callback(null, new pb.CompleteTaskResponse());
      return unaryCall();
    });
    await expect(worker["_deliverResponse"](stub, method, new pb.ActivityResponse())).resolves.toBeDefined();
    expect(method).toHaveBeenCalledTimes(1);
    completion.abort(new Error("drain expired"));
    await expect(worker["_deliverResponse"](stub, method, new pb.ActivityResponse())).rejects.toThrow("drain expired");
    expect(method).toHaveBeenCalledTimes(1);
  });

  it.each(["initial metadata", "initial RPC", "backoff", "retry metadata", "retry RPC"])(
    "uses an explicit delivery signal during %s",
    async (phase) => {
      let resolveMetadata!: (metadata: grpc.Metadata) => void;
      const heldMetadata = new Promise<grpc.Metadata>((resolve) => (resolveMetadata = resolve));
      let metadataCalls = 0;
      const metadataGenerator = jest.fn(async () => {
        metadataCalls++;
        if (phase === "initial metadata" || (phase === "retry metadata" && metadataCalls === 2)) {
          return heldMetadata;
        }
        return new grpc.Metadata();
      });
      const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger(), metadataGenerator });
      const completion = new AbortController();
      const retry = new AbortController();
      const explicit = new AbortController();
      worker["_responseDeliverySignals"].set(stub, { completion: completion.signal, retry: retry.signal });
      const cancel = jest.fn();
      let attempts = 0;
      const method = (_req: pb.ActivityResponse, _metadata: grpc.Metadata, callback: CompleteCallback) => {
        if (++attempts === 1 && (phase === "backoff" || phase.startsWith("retry"))) {
          callback(grpcError(grpc.status.INTERNAL), new pb.CompleteTaskResponse());
        }
        return unaryCall(cancel);
      };
      let settled = false;
      let error: unknown;
      const delivery = worker["_deliverResponse"](stub, method, new pb.ActivityResponse(), explicit.signal).then(
        () => (settled = true),
        (reason: unknown) => {
          error = reason;
          settled = true;
        },
      );
      try {
        await jest.advanceTimersByTimeAsync(phase.startsWith("retry") ? 200 : 0);
        const sent = attempts;
        const reason = new Error("explicitly stopped");
        explicit.abort(reason);
        await jest.advanceTimersByTimeAsync(0);
        expect(settled).toBe(true);
        expect(error).toBe(reason);
        expect(completion.signal.aborted).toBe(false);
        expect(retry.signal.aborted).toBe(false);
        resolveMetadata(new grpc.Metadata());
        await jest.runAllTimersAsync();
        expect(attempts).toBe(sent);
        expect(cancel).toHaveBeenCalledTimes(phase.endsWith("RPC") ? 1 : 0);
        expect(getEventListeners(explicit.signal, "abort")).toHaveLength(0);
        expect(getEventListeners(completion.signal, "abort")).toHaveLength(0);
        expect(getEventListeners(retry.signal, "abort")).toHaveLength(0);
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        completion.abort();
        retry.abort();
        resolveMetadata(new grpc.Metadata());
        await jest.runAllTimersAsync();
        await delivery;
      }
    },
  );

  it.each(["initial", "retry"] as const)("cancels pending %s metadata at its shutdown boundary", async (phase) => {
    let resolveMetadata!: (metadata: grpc.Metadata) => void;
    const heldMetadata = new Promise<grpc.Metadata>((resolve) => (resolveMetadata = resolve));
    const metadataGenerator = jest.fn(() => heldMetadata);
    if (phase === "retry") metadataGenerator.mockResolvedValueOnce(new grpc.Metadata());
    const logger = createLogger();
    const worker = new TaskHubGrpcWorker({ logger, metadataGenerator, shutdownTimeoutMs: 1000 });
    const activity = jest.fn(() => "activity-result");
    worker.addNamedActivity("metadataActivity", activity);
    const completion = new AbortController();
    const retry = new AbortController();
    worker["_isRunning"] = true;
    worker["_stub"] = stub;
    worker["_completionAbortController"] = completion;
    worker["_abortController"] = retry;
    worker["_responseDeliverySignals"].set(stub, { completion: completion.signal, retry: retry.signal });
    const method = jest
      .spyOn(stub, "completeActivityTask")
      .mockImplementation(
        (
          _response,
          _metadata,
          optionsOrCallback: Partial<grpc.CallOptions> | CompleteCallback,
          callback?: CompleteCallback,
        ) => {
          const respond = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!;
          respond(grpcError(grpc.status.INTERNAL), new pb.CompleteTaskResponse());
          return unaryCall();
        },
      );
    const request = new pb.ActivityRequest()
      .setName("metadataActivity")
      .setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("metadata-instance"));
    worker["_executeActivity"](request, "metadata-token", stub);
    await jest.advanceTimersByTimeAsync(200);
    expect(metadataGenerator).toHaveBeenCalledTimes(phase === "initial" ? 1 : 2);
    expect(worker["_pendingWorkItems"].size).toBe(1);

    const stopping = worker.stop();
    try {
      await jest.advanceTimersByTimeAsync(0);
      if (phase === "initial") {
        await jest.advanceTimersByTimeAsync(999);
        expect(completion.signal.aborted).toBe(false);
        expect(worker["_pendingWorkItems"].size).toBe(1);
        await jest.advanceTimersByTimeAsync(1);
      }
      expect(worker["_pendingWorkItems"].size).toBe(0);
      expect(worker["_pendingWorkItemsByStub"].get(stub)?.size).toBe(0);
      expect(getEventListeners(completion.signal, "abort")).toHaveLength(0);
      expect(getEventListeners(retry.signal, "abort")).toHaveLength(0);

      resolveMetadata(new grpc.Metadata());
      await jest.runAllTimersAsync();
      await stopping;
      expect(method).toHaveBeenCalledTimes(phase === "initial" ? 0 : 1);
      expect(activity).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledTimes(phase === "initial" ? 1 : 0);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      resolveMetadata(new grpc.Metadata());
      await jest.runAllTimersAsync();
      await stopping;
    }
  });

  it("retains the original stub until its pending work has delivered its response", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const close = jest.spyOn(stub, "close");
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => (finish = resolve));
    worker["_trackPendingWorkItem"](stub, pending, () => {});
    worker["_deferStubClose"](stub);
    await jest.advanceTimersByTimeAsync(30000);
    expect(close).not.toHaveBeenCalled();
    finish();
    await jest.advanceTimersByTimeAsync(0);
    expect(close).toHaveBeenCalledTimes(1);
    expect(worker["_deferredStubCloseTimers"].size).toBe(0);
  });

  it("does not revive a stopped run's late response when a new run begins", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const oldCompletion = new AbortController();
    const oldRetry = new AbortController();
    worker["_responseDeliverySignals"].set(stub, {
      completion: oldCompletion.signal,
      retry: oldRetry.signal,
    });
    oldRetry.abort();
    oldCompletion.abort();
    worker["_completionAbortController"] = new AbortController();
    worker["_abortController"] = new AbortController();
    const method = jest.fn(() => unaryCall());
    await expect(worker["_deliverResponse"](stub, method, new pb.ActivityResponse())).rejects.toThrow();
    expect(method).not.toHaveBeenCalled();
    expect(getEventListeners(oldCompletion.signal, "abort")).toHaveLength(0);
    expect(getEventListeners(oldRetry.signal, "abort")).toHaveLength(0);
  });

  it("does not retain unrelated retired channels behind another channel's pending activity", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => (finish = resolve));
    worker.addNamedActivity("heldActivity", async () => pending);
    const request = new pb.ActivityRequest().setName("heldActivity");
    request.setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("held-instance"));
    jest
      .spyOn(stub, "completeActivityTask")
      .mockImplementation(
        (
          _response,
          _metadata,
          optionsOrCallback: Partial<grpc.CallOptions> | CompleteCallback,
          callback?: CompleteCallback,
        ) => {
          const respond = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!;
          respond(null, new pb.CompleteTaskResponse());
          return unaryCall();
        },
      );
    const unrelatedStub = new stubs.TaskHubSidecarServiceClient("localhost:2", grpc.credentials.createInsecure());
    const closeOwner = jest.spyOn(stub, "close");
    const closeUnrelated = jest.spyOn(unrelatedStub, "close");
    worker["_executeActivity"](request, "held-token", stub);
    worker["_deferStubClose"](stub);
    worker["_deferStubClose"](unrelatedStub);
    try {
      await jest.advanceTimersByTimeAsync(30000);
      expect(closeOwner).not.toHaveBeenCalled();
      expect(closeUnrelated).toHaveBeenCalledTimes(1);
    } finally {
      finish();
      await jest.runAllTimersAsync();
      unrelatedStub.close();
    }
    expect(closeOwner).toHaveBeenCalledTimes(1);
    expect(worker["_pendingWorkItems"].size).toBe(0);
  });

  it("logs the final activity delivery failure after exhausting attempts", async () => {
    const logger = createLogger();
    const errorLog = jest.spyOn(logger, "error");
    const worker = new TaskHubGrpcWorker({ logger });
    const execution = jest.fn(() => {
      throw new Error("activity failed");
    });
    worker.addNamedActivity("failingActivity", execution);
    const request = new pb.ActivityRequest().setName("failingActivity").setTaskid(1);
    request.setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("failed-activity"));
    const responses: pb.ActivityResponse[] = [];
    jest
      .spyOn(stub, "completeActivityTask")
      .mockImplementation(
        (
          response,
          _metadata,
          optionsOrCallback: Partial<grpc.CallOptions> | CompleteCallback,
          callback?: CompleteCallback,
        ) => {
          responses.push(response);
          const respond = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!;
          respond(grpcError(grpc.status.INTERNAL), new pb.CompleteTaskResponse());
          return unaryCall();
        },
      );
    const completion = worker["_executeActivityInternal"](request, "failure-token", stub);
    await jest.runAllTimersAsync();
    await completion;
    expect(responses).toHaveLength(10);
    expect(responses.every((response) => response === responses[0])).toBe(true);
    expect(responses[0].getFailuredetails()?.getErrormessage()).toBe("activity failed");
    expect(execution).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining("injected delivery failure"));
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(["orchestrator", "version-fail", "abandon", "entity-v1", "entity-v2", "entity-missing"] as const)(
    "retries the same %s response without repeating user execution",
    async (kind) => {
      const logger = createLogger();
      const errorLog = jest.spyOn(logger, "error");
      const worker = new TaskHubGrpcWorker({
        logger,
        versioning:
          kind === "version-fail" || kind === "abandon"
            ? {
                version: "2",
                matchStrategy: VersionMatchStrategy.Strict,
                failureStrategy: kind === "abandon" ? VersionFailureStrategy.Reject : VersionFailureStrategy.Fail,
              }
            : undefined,
      });
      const executed = jest.fn();
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
      if (kind !== "entity-missing") worker.addNamedEntity("deliveryCounter", () => new Counter());
      const requests: Array<pb.OrchestratorResponse | pb.EntityBatchResult | pb.AbandonOrchestrationTaskRequest> = [];
      const method = kind.startsWith("entity")
        ? "completeEntityTask"
        : kind === "abandon"
          ? "abandonTaskOrchestratorWorkItem"
          : "completeOrchestratorTask";
      jest
        .spyOn(stub, method)
        .mockImplementation(
          (
            response,
            _metadata,
            optionsOrCallback:
              | Partial<grpc.CallOptions>
              | CompleteCallback<pb.CompleteTaskResponse | pb.AbandonOrchestrationTaskResponse>,
            callback?: CompleteCallback<pb.CompleteTaskResponse | pb.AbandonOrchestrationTaskResponse>,
          ) => {
            requests.push(response);
            const respond = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!;
            const result =
              kind === "abandon" ? new pb.AbandonOrchestrationTaskResponse() : new pb.CompleteTaskResponse();
            respond(requests.length === 1 ? grpcError(grpc.status.INTERNAL) : null, result);
            return unaryCall();
          },
        );
      let delivery: Promise<void>;
      if (kind.startsWith("entity")) {
        if (kind === "entity-v2") {
          const req = new pb.EntityRequest().setInstanceid("@deliverycounter@key");
          const operation = new pb.EntityOperationSignaledEvent().setOperation("increment").setRequestid("req-1");
          req.setOperationrequestsList([new pb.HistoryEvent().setEntityoperationsignaled(operation)]);
          delivery = worker["_executeEntityV2Internal"](req, "response-token", stub);
        } else {
          const req = new pb.EntityBatchRequest().setInstanceid("@deliverycounter@key");
          req.setOperationsList([new pb.OperationRequest().setOperation("increment").setRequestid("req-1")]);
          delivery = worker["_executeEntityInternal"](req, "response-token", stub);
        }
      } else {
        const req = new pb.OrchestratorRequest().setInstanceid("delivery-instance");
        const started = new pb.ExecutionStartedEvent().setName("deliveryOrchestrator");
        started.setVersion(new StringValue().setValue("1"));
        req.setNeweventsList([
          new pb.HistoryEvent()
            .setTimestamp(Timestamp.fromDate(new Date()))
            .setOrchestratorstarted(new pb.OrchestratorStartedEvent()),
          new pb.HistoryEvent().setExecutionstarted(started),
        ]);
        delivery = worker["_executeOrchestratorInternal"](req, "response-token", stub);
      }
      await jest.runAllTimersAsync();
      await delivery;
      expect(requests).toHaveLength(2);
      expect(requests[1]).toBe(requests[0]);
      expect(requests[0].getCompletiontoken()).toBe("response-token");
      expect(executed).toHaveBeenCalledTimes(["abandon", "version-fail", "entity-missing"].includes(kind) ? 0 : 1);
      if (kind !== "entity-missing" && kind !== "version-fail") expect(errorLog).not.toHaveBeenCalled();
    },
  );
});
