// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import * as otel from "@opentelemetry/api";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import * as pbh from "../src/utils/pb-helper.util";
import { ExponentialBackoff } from "../src/utils/backoff.util";
import { NoOpLogger } from "../src/types/logger.type";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { OrchestrationExecutor } from "../src/worker/orchestration-executor";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { VersionFailureStrategy, VersionMatchStrategy } from "../src/worker/versioning-options";
import { DurableTaskAttributes } from "../src/tracing";

type HistoryCall = grpc.ServerWritableStream<pb.StreamInstanceHistoryRequest, pb.HistoryChunk>;

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for worker history streaming");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

function chunk(events: pb.HistoryEvent[]): pb.HistoryChunk {
  return new pb.HistoryChunk().setEventsList(events);
}

describe("Worker history streaming over gRPC", () => {
  const instanceId = "history-instance";
  const executionId = "history-execution";
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider();
  let server: grpc.Server;
  let worker: TaskHubGrpcWorker;
  let subscription: grpc.ServerWritableStream<pb.GetWorkItemsRequest, pb.WorkItem> | undefined;
  let historyCalls: HistoryCall[];
  let responses: pb.OrchestratorResponse[];
  let responseMetadata: grpc.Metadata[];
  let abandonments: pb.AbandonOrchestrationTaskRequest[];
  let abandonmentMetadata: grpc.Metadata[];
  let onHistory: (call: HistoryCall) => void;
  let onComplete: stubs.ITaskHubSidecarServiceServer["completeOrchestratorTask"];
  let historySpy: jest.SpyInstance;

  beforeAll(() => {
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();
  });

  afterAll(async () => {
    await provider.shutdown();
    otel.trace.disable();
  });

  beforeEach(async () => {
    exporter.reset();
    subscription = undefined;
    historyCalls = [];
    responses = [];
    responseMetadata = [];
    abandonments = [];
    abandonmentMetadata = [];
    onHistory = (call) => call.end();
    onComplete = (_call, callback) => callback(null, new pb.CompleteTaskResponse());
    historySpy = jest.spyOn(stubs.TaskHubSidecarServiceClient.prototype, "streamInstanceHistory");
    server = new grpc.Server();
    const service = {
      hello: (_call, callback) => callback(null, new Empty()),
      getWorkItems: (call) => {
        subscription = call;
        call.on("cancelled", () => call.end());
      },
      streamInstanceHistory: (call) => {
        historyCalls.push(call);
        onHistory(call);
      },
      completeOrchestratorTask: (call, callback) => {
        responses.push(call.request);
        responseMetadata.push(call.metadata);
        onComplete(call, callback);
      },
      abandonTaskOrchestratorWorkItem: (call, callback) => {
        abandonments.push(call.request);
        abandonmentMetadata.push(call.metadata);
        callback(null, new pb.AbandonOrchestrationTaskResponse());
      },
    } satisfies Pick<
      stubs.ITaskHubSidecarServiceServer,
      | "hello"
      | "getWorkItems"
      | "streamInstanceHistory"
      | "completeOrchestratorTask"
      | "abandonTaskOrchestratorWorkItem"
    >;
    server.addService(stubs.TaskHubSidecarServiceService, service);
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
        if (error) reject(error);
        else resolve(boundPort);
      });
    });
    worker = new TaskHubGrpcWorker({
      hostAddress: `127.0.0.1:${port}`,
      logger: new NoOpLogger(),
      metadataGenerator: async () => {
        const metadata = new grpc.Metadata();
        metadata.set("taskhub", "history-test");
        metadata.set("authorization", "test-token");
        return metadata;
      },
    });
  });

  afterEach(async () => {
    if (worker["_isRunning"]) {
      await worker.stop();
    }
    server.forceShutdown();
    jest.restoreAllMocks();
  });

  async function start(): Promise<void> {
    await worker.start();
    await waitFor(() => subscription !== undefined);
  }

  function request(streaming = true): pb.OrchestratorRequest {
    return new pb.OrchestratorRequest()
      .setInstanceid(instanceId)
      .setExecutionid(pbh.getStringValue(executionId))
      .setNeweventsList([pbh.newOrchestratorStartedEvent()])
      .setRequireshistorystreaming(streaming);
  }

  function send(req: pb.OrchestratorRequest, token = "history-token"): void {
    subscription!.write(new pb.WorkItem().setOrchestratorrequest(req).setCompletiontoken(token));
  }

  async function settled(): Promise<void> {
    await waitFor(() => worker["_pendingWorkItems"].size === 0);
    expect(worker["_historyCancellations"].size).toBe(0);
  }

  function expectStreamCleanedUp(): void {
    const stream = historySpy.mock.results[0].value as grpc.ClientReadableStream<pb.HistoryChunk>;
    for (const event of ["data", "end", "error", "close"]) {
      expect(stream.listenerCount(event)).toBe(0);
    }
  }

  function expectHistoryFailure(message: string): void {
    expect(abandonments).toHaveLength(0);
    expect(responses).toHaveLength(1);
    const response = responses[0];
    expect(response.getInstanceid()).toBe(instanceId);
    expect(response.getCompletiontoken()).toBe("history-token");
    expect(response.getActionsList()).toHaveLength(1);
    const completed = response.getActionsList()[0].getCompleteorchestration()!;
    expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completed.getFailuredetails()!.getErrortype()).toBe("Error");
    expect(completed.getFailuredetails()!.getErrormessage()).toContain(message);
    expect(completed.getFailuredetails()!.getStacktrace()!.getValue()).toBeTruthy();
  }

  it("advertises only HistoryStreaming, retaining concurrency hints", async () => {
    await start();
    expect(subscription!.request.getCapabilitiesList()).toEqual([
      pb.WorkerCapability.WORKER_CAPABILITY_HISTORY_STREAMING,
    ]);
    expect(subscription!.request.getMaxconcurrentorchestrationworkitems()).toBeGreaterThan(0);
  });

  it.each([false, true])("replays complete ordered history (streaming=%s) before new events", async (streaming) => {
    const replayStates: boolean[] = [];
    worker.addOrchestrator(async function* orderedHistory(ctx: OrchestrationContext, input: number): AsyncGenerator {
      const activity = yield ctx.callActivity("echo", input);
      replayStates.push(ctx.isReplaying);
      const first = yield ctx.waitForExternalEvent("signal");
      const second = yield ctx.waitForExternalEvent("signal");
      replayStates.push(ctx.isReplaying);
      return { input, activity, first, second };
    });
    const pastEvents = [
      pbh.newOrchestratorStartedEvent(),
      pbh.newExecutionStartedEvent("orderedHistory", instanceId, "7", undefined, executionId, "1.0"),
      pbh.newTaskScheduledEvent(1, "echo", "7"),
      pbh.newTaskCompletedEvent(1, "14"),
      pbh.newEventRaisedEvent("signal", '"past"'),
    ];
    const traceId = "1234567890abcdef1234567890abcdef";
    const parentSpanId = "1234567890abcdef";
    const replaySpanId = "abcdef1234567890";
    pastEvents[1]
      .getExecutionstarted()!
      .setParenttracecontext(new pb.TraceContext().setTraceparent(`00-${traceId}-${parentSpanId}-01`));
    const newEvents = [pbh.newOrchestratorStartedEvent(), pbh.newEventRaisedEvent("signal", '"new"')];
    const req = request(streaming)
      .setNeweventsList(newEvents)
      .setOrchestrationtracecontext(
        new pb.OrchestrationTraceContext()
          .setSpanid(pbh.getStringValue(replaySpanId))
          .setSpanstarttime(Timestamp.fromDate(new Date("2026-01-01T00:00:00Z"))),
      );
    // Streaming replaces inline history; this deliberately invalid prefix must never be replayed.
    req.setPasteventsList(streaming ? [pbh.newTaskCompletedEvent(999, "0")] : pastEvents);
    onHistory = (call) => {
      call.write(chunk(pastEvents.slice(0, 2)));
      call.write(chunk([]));
      call.write(chunk(pastEvents.slice(2)));
      call.end();
    };
    worker["_versioning"] = { version: "1.0", matchStrategy: VersionMatchStrategy.Strict };
    const execute = jest.spyOn(OrchestrationExecutor.prototype, "execute");
    await start();
    send(req);
    await waitFor(() => responses.length > 0 || abandonments.length > 0);
    await settled();

    expect(abandonments).toHaveLength(0);
    expect(responses).toHaveLength(1);
    const response = responses[0];
    expect(response.getCompletiontoken()).toBe("history-token");
    expect(response.getInstanceid()).toBe(instanceId);
    const completed = response.getActionsList()[0].getCompleteorchestration()!;
    expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(JSON.parse(completed.getResult()!.getValue())).toEqual({
      input: 7,
      activity: 14,
      first: "past",
      second: "new",
    });
    expect(replayStates).toEqual([true, false]);
    expect(execute.mock.calls[0][3]).toBe(executionId);
    expect(execute.mock.calls[0][1].map((event) => event.toObject())).toEqual(
      pastEvents.map((event) => event.toObject()),
    );
    expect(execute.mock.calls[0][2].map((event) => event.toObject())).toEqual(
      newEvents.map((event) => event.toObject()),
    );
    expect(response.hasOrchestrationtracecontext()).toBe(true);
    expect(response.getOrchestrationtracecontext()!.getSpanid()!.getValue()).toBe(replaySpanId);
    const span = exporter.getFinishedSpans().find((item) => item.name === "orchestration:orderedHistory@(1.0)")!;
    expect(span.spanContext().traceId).toBe(traceId);
    expect(span.parentSpanId).toBe(parentSpanId);
    expect(span.attributes[DurableTaskAttributes.REPLAY_SPAN_ID]).toBe(replaySpanId);
    expect(historyCalls).toHaveLength(streaming ? 1 : 0);
    if (streaming) {
      expect(historyCalls[0].request.toObject()).toEqual({
        instanceid: instanceId,
        executionid: { value: executionId },
        forworkitemprocessing: true,
      });
      expect(historyCalls[0].metadata.get("taskhub")).toEqual(["history-test"]);
      expect(historyCalls[0].metadata.get("authorization")).toEqual(["test-token"]);
      expectStreamCleanedUp();
    }
  });

  it.each([false, true])("accepts an empty history stream (empty chunk=%s)", async (emptyChunk) => {
    worker.addOrchestrator(async function emptyHistory() {
      return "empty-history";
    });
    onHistory = (call) => {
      if (emptyChunk) call.write(chunk([]));
      call.end();
    };
    await start();
    send(
      request().setNeweventsList([
        pbh.newOrchestratorStartedEvent(),
        pbh.newExecutionStartedEvent("emptyHistory", instanceId),
      ]),
    );
    await waitFor(() => responses.length > 0);
    await settled();
    expect(historyCalls).toHaveLength(1);
    expect(responses[0].getActionsList()[0].getCompleteorchestration()!.getResult()!.getValue()).toBe(
      '"empty-history"',
    );
    expectStreamCleanedUp();
  });

  it.each<[VersionMatchStrategy, boolean]>([
    [VersionMatchStrategy.None, false],
    [VersionMatchStrategy.Strict, false],
    [VersionMatchStrategy.None, true],
    [VersionMatchStrategy.Strict, true],
  ])("fails OK history missing ExecutionStarted (strategy=%s, nonempty=%s)", async (matchStrategy, nonempty) => {
    worker["_versioning"] = { version: "1", matchStrategy, failureStrategy: VersionFailureStrategy.Fail };
    worker.addOrchestrator(async function* resumedHistory(ctx: OrchestrationContext, input: number): AsyncGenerator {
      return yield ctx.callActivity("echo", input);
    });
    const pastEvents = [
      pbh.newOrchestratorStartedEvent(),
      pbh.newExecutionStartedEvent("resumedHistory", instanceId, "7", undefined, executionId, "1"),
      pbh.newTaskScheduledEvent(1, "echo", "7"),
    ];
    const req = request()
      .setPasteventsList(pastEvents)
      .setNeweventsList([pbh.newOrchestratorStartedEvent(), pbh.newTaskCompletedEvent(1, "14")]);
    onHistory = (call) => {
      if (nonempty) call.write(chunk([pastEvents[2]]));
      call.end();
    };
    const execute = jest.spyOn(OrchestrationExecutor.prototype, "execute");
    await start();
    send(req);
    await waitFor(() => responses.length > 0 || abandonments.length > 0);
    await settled();
    expectHistoryFailure("The provided orchestration history was incomplete");
    expect(execute).not.toHaveBeenCalled();
    expect(exporter.getFinishedSpans()).toHaveLength(0);
    expectStreamCleanedUp();
  });

  it.each([grpc.status.UNAVAILABLE, grpc.status.CANCELLED])(
    "fails incomplete history on non-shutdown gRPC status %s",
    async (code) => {
      const orchestrator = jest.fn(async function shouldNotExecute() {
        return "incorrect";
      });
      worker.addNamedOrchestrator("shouldNotExecute", orchestrator);
      const events = [pbh.newOrchestratorStartedEvent(), pbh.newExecutionStartedEvent("shouldNotExecute", instanceId)];
      let chunksReceived = 0;
      onHistory = (call) => {
        const stream = historySpy.mock.results[0].value as grpc.ClientReadableStream<pb.HistoryChunk>;
        stream.once("data", () => {
          chunksReceived++;
          call.emit("error", Object.assign(new Error("history transport failed"), { code }));
        });
        call.write(chunk(events));
      };
      const execute = jest.spyOn(OrchestrationExecutor.prototype, "execute");
      await start();
      send(request().setPasteventsList(events));
      await waitFor(() => abandonments.length > 0 || responses.length > 0);
      await settled();
      expectHistoryFailure("history transport failed");
      expect(chunksReceived).toBe(1);
      expect(orchestrator).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
      expect(responseMetadata[0].get("taskhub")).toEqual(["history-test"]);
      expect(responseMetadata[0].get("authorization")).toEqual(["test-token"]);
      expect(exporter.getFinishedSpans()).toHaveLength(0);
      expectStreamCleanedUp();
    },
  );

  it.each([VersionFailureStrategy.Reject, VersionFailureStrategy.Fail])(
    "checks streamed versions before dispatch (strategy=%s)",
    async (failureStrategy) => {
      worker["_versioning"] = { version: "1", matchStrategy: VersionMatchStrategy.Strict, failureStrategy };
      onHistory = (call) => {
        call.write(
          chunk([pbh.newExecutionStartedEvent("unregistered", instanceId, undefined, undefined, executionId, "2")]),
        );
        call.end();
      };
      const execute = jest.spyOn(OrchestrationExecutor.prototype, "execute");
      await start();
      send(request());
      await waitFor(() => responses.length > 0 || abandonments.length > 0);
      await settled();
      expect(historyCalls).toHaveLength(1);
      expect(execute).not.toHaveBeenCalled();
      if (failureStrategy === VersionFailureStrategy.Reject) {
        expect(abandonments[0].getCompletiontoken()).toBe("history-token");
        expect(abandonmentMetadata[0].get("taskhub")).toEqual(["history-test"]);
        expect(abandonmentMetadata[0].get("authorization")).toEqual(["test-token"]);
      } else {
        expect(abandonments).toHaveLength(0);
        expect(responses[0].getActionsList()[0].getCompleteorchestration()!.getFailuredetails()!.getErrortype()).toBe(
          "VersionMismatch",
        );
      }
    },
  );

  it("cancels outstanding history on stop without executing or leaving pending work", async () => {
    let cancelled = false;
    onHistory = (call) => {
      call.on("cancelled", () => {
        cancelled = true;
        call.end();
      });
      call.write(chunk([]));
    };
    const execute = jest.spyOn(OrchestrationExecutor.prototype, "execute");
    await start();
    send(request());
    await waitFor(() => historyCalls.length > 0 || responses.length > 0);
    expect(historyCalls).toHaveLength(1);
    expect(worker["_pendingWorkItems"].size).toBe(1);
    await worker.stop();
    expect(cancelled).toBe(true);
    expect(execute).not.toHaveBeenCalled();
    expect(responses).toHaveLength(0);
    expect(worker["_pendingWorkItems"].size).toBe(0);
    expectStreamCleanedUp();
  });

  it.each([false, true])(
    "stops pending metadata hydration before late settlement (reject=%s)",
    async (rejectMetadata) => {
      await start();
      let releaseMetadata!: () => void;
      const metadata = new Promise<grpc.Metadata>((resolve, reject) => {
        releaseMetadata = () => {
          if (rejectMetadata) reject(new Error("late metadata failure"));
          else resolve(new grpc.Metadata());
        };
      });
      const getMetadata = jest.fn(() => metadata);
      worker["_metadataGenerator"] = getMetadata;
      const execute = jest.spyOn(OrchestrationExecutor.prototype, "execute");
      send(request());
      await waitFor(() => getMetadata.mock.calls.length > 0);
      worker["_shutdownTimeoutMs"] = 50;
      await worker.stop();
      expect(historyCalls).toHaveLength(0);
      expect(execute).not.toHaveBeenCalled();
      expect(responses).toHaveLength(0);
      expect(worker["_pendingWorkItems"].size).toBe(0);
      expect(worker["_historyCancellations"].size).toBe(0);
      releaseMetadata();
      await new Promise((resolve) => setImmediate(resolve));
      expect(historyCalls).toHaveLength(0);
      expect(abandonments).toHaveLength(0);
      expect(responses).toHaveLength(0);
    },
  );

  it("fails on history metadata failure without using inline history", async () => {
    await start();
    worker["_metadataGenerator"] = jest
      .fn()
      .mockRejectedValueOnce(new Error("token refresh failed"))
      .mockResolvedValue(new grpc.Metadata());
    const execute = jest.spyOn(OrchestrationExecutor.prototype, "execute");
    send(request());
    await waitFor(() => responses.length > 0 || abandonments.length > 0);
    await settled();
    expect(historyCalls).toHaveLength(0);
    expect(execute).not.toHaveBeenCalled();
    expectHistoryFailure("token refresh failed");
  });

  it.each(["history failure", "orchestration completion", "version failure"])(
    "does not submit %s after stop during response metadata",
    async (outcome) => {
      worker.addOrchestrator(async function shutdownHistory() {
        return "complete";
      });
      onHistory = (call) => {
        call.write(
          chunk([pbh.newExecutionStartedEvent("shutdownHistory", instanceId, undefined, undefined, executionId, "2")]),
        );
        call.end();
      };
      if (outcome === "version failure") {
        worker["_versioning"] = {
          version: "1",
          matchStrategy: VersionMatchStrategy.Strict,
          failureStrategy: VersionFailureStrategy.Fail,
        };
      }
      await start();
      let releaseMetadata!: (metadata: grpc.Metadata) => void;
      const metadata = new Promise<grpc.Metadata>((resolve) => {
        releaseMetadata = resolve;
      });
      const getMetadata = jest.fn(() => metadata);
      if (outcome === "history failure") getMetadata.mockRejectedValueOnce(new Error("token refresh failed"));
      else getMetadata.mockResolvedValueOnce(new grpc.Metadata());
      worker["_metadataGenerator"] = getMetadata;
      const complete = jest.spyOn(stubs.TaskHubSidecarServiceClient.prototype, "completeOrchestratorTask");
      try {
        send(request());
        await waitFor(() => getMetadata.mock.calls.length === 2);
        worker["_shutdownTimeoutMs"] = 50;
        await worker.stop();
      } finally {
        releaseMetadata(new grpc.Metadata());
      }
      await settled();
      expect(complete).not.toHaveBeenCalled();
      expect(responses).toHaveLength(0);
      expect(abandonments).toHaveLength(0);
      expect(historyCalls).toHaveLength(outcome === "history failure" ? 0 : 1);
    },
  );

  it.each(["history failure", "orchestration completion", "version failure"])(
    "retries the same streamed %s response without hydrating or executing again",
    async (outcome) => {
      const orchestrator = jest.fn(async () => "complete");
      worker.addNamedOrchestrator("retryHistory", orchestrator);
      onHistory = (call) => {
        if (outcome !== "history failure") {
          call.write(
            chunk([pbh.newExecutionStartedEvent("retryHistory", instanceId, undefined, undefined, executionId, "2")]),
          );
        }
        call.end();
      };
      if (outcome === "version failure") {
        worker["_versioning"] = {
          version: "1",
          matchStrategy: VersionMatchStrategy.Strict,
          failureStrategy: VersionFailureStrategy.Fail,
        };
      }
      onComplete = (call, callback) => {
        call.sendMetadata(new grpc.Metadata());
        if (responses.length === 1) callback({ code: grpc.status.INTERNAL, message: "retry response" });
        else callback(null, new pb.CompleteTaskResponse());
      };
      const complete = jest.spyOn(stubs.TaskHubSidecarServiceClient.prototype, "completeOrchestratorTask");
      const execute = jest.spyOn(OrchestrationExecutor.prototype, "execute");
      await start();
      let metadataCalls = 0;
      worker["_metadataGenerator"] = async () => {
        const metadata = new grpc.Metadata();
        metadata.set("attempt", String(++metadataCalls));
        return metadata;
      };
      send(request());
      await waitFor(() => responses.length > 0);
      await settled();
      expect(responses).toHaveLength(2);
      expect(responses[1].serializeBinary()).toEqual(responses[0].serializeBinary());
      expect(complete.mock.calls[1][0]).toBe(complete.mock.calls[0][0]);
      expect(responses[1].getInstanceid()).toBe(instanceId);
      expect(responses[1].getCompletiontoken()).toBe("history-token");
      expect(responses[1].getActionsList()[0].getCompleteorchestration()!.getOrchestrationstatus()).toBe(
        outcome === "orchestration completion"
          ? pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED
          : pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      );
      expect(responseMetadata.map((metadata) => metadata.get("attempt"))).toEqual([["2"], ["3"]]);
      expect(historyCalls).toHaveLength(1);
      expect(execute).toHaveBeenCalledTimes(outcome === "orchestration completion" ? 1 : 0);
      expect(orchestrator).toHaveBeenCalledTimes(outcome === "orchestration completion" ? 1 : 0);
      expect(abandonments).toHaveLength(0);
      expectStreamCleanedUp();
    },
  );

  it.each(["initial RPC", "retry delay"])("stops history-failure delivery during %s", async (phase) => {
    let cancelled = false;
    onComplete = (call, callback) => {
      if (phase === "retry delay") callback({ code: grpc.status.INTERNAL, message: "retry response" });
      else {
        call.on("cancelled", () => {
          cancelled = true;
          callback(null, new pb.CompleteTaskResponse());
        });
      }
    };
    const wait = jest.spyOn(ExponentialBackoff.prototype, "wait");
    await start();
    const signal = worker["_abortController"]!.signal;
    send(request());
    await waitFor(() => (phase === "initial RPC" ? responses.length > 0 : wait.mock.calls.length > 0));
    await worker.stop();
    await settled();
    expect(responses).toHaveLength(1);
    if (phase === "initial RPC") expect(cancelled).toBe(true);
    else expect(wait).toHaveBeenCalledWith(signal);
    expect(historyCalls).toHaveLength(1);
    expect(abandonments).toHaveLength(0);
  });

  it("uses the work item's captured stub when the worker channel is replaced", async () => {
    worker.addOrchestrator(async function capturedStub() {
      return "original-channel";
    });
    onHistory = (call) => {
      call.write(chunk([pbh.newOrchestratorStartedEvent(), pbh.newExecutionStartedEvent("capturedStub", instanceId)]));
      call.end();
    };
    await start();
    const originalStub = worker["_stub"]!;
    worker["_deferStubClose"](originalStub);
    worker["_stub"] = new stubs.TaskHubSidecarServiceClient("127.0.0.1:1", grpc.credentials.createInsecure());
    send(request());
    await waitFor(() => responses.length > 0);
    await settled();
    expect(historyCalls).toHaveLength(1);
    expect(responses[0].getActionsList()[0].getCompleteorchestration()!.getResult()!.getValue()).toBe(
      '"original-channel"',
    );
  });

  it("tracks concurrent streams without adding per-work-item abort listeners", async () => {
    const warnings: Error[] = [];
    const onWarning = (warning: Error) => warnings.push(warning);
    process.on("warning", onWarning);
    onHistory = (call) => call.on("cancelled", () => call.end());
    try {
      await start();
      for (let i = 0; i < 12; i++) {
        send(request().setInstanceid(`concurrent-${i}`), `token-${i}`);
      }
      await waitFor(() => historyCalls.length === 12);
      expect(worker["_pendingWorkItems"].size).toBe(12);
      await worker.stop();
      expect(worker["_pendingWorkItems"].size).toBe(0);
      expect(warnings.filter((warning) => warning.name === "MaxListenersExceededWarning")).toHaveLength(0);
      expect(responses).toHaveLength(0);
    } finally {
      process.removeListener("warning", onWarning);
    }
  });
});
