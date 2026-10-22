// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  PayloadStore,
  NoOpLogger,
  TaskEntity,
  OrchestrationAlreadyExistsError,
  OrchestrationStatus,
} from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import * as pbh from "../src/utils/pb-helper.util";

const text = (value: string) => new StringValue().setValue(value);
type WorkKind = "activity" | "orchestrator" | "streamed-orchestrator" | "entity-v1" | "entity-v2";

function workItem(kind: WorkKind, input: string, token: string): pb.WorkItem {
  const item = new pb.WorkItem().setCompletiontoken(token);
  if (kind === "activity") {
    return item.setActivityrequest(
      new pb.ActivityRequest()
        .setName("echo")
        .setTaskid(1)
        .setInput(text(input))
        .setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("instance")),
    );
  }
  if (kind === "orchestrator" || kind === "streamed-orchestrator") {
    return item.setOrchestratorrequest(
      new pb.OrchestratorRequest()
        .setInstanceid("instance")
        .setRequireshistorystreaming(kind === "streamed-orchestrator")
        .setNeweventsList(
          kind === "streamed-orchestrator"
            ? [pbh.newOrchestratorStartedEvent()]
            : [pbh.newOrchestratorStartedEvent(), pbh.newExecutionStartedEvent("flow", "instance", input)],
        ),
    );
  }
  if (kind === "entity-v1") {
    return item.setEntityrequest(
      new pb.EntityBatchRequest()
        .setInstanceid("@echo@key")
        .setOperationsList([
          new pb.OperationRequest().setOperation("echo").setRequestid("request").setInput(text(input)),
        ]),
    );
  }
  return item.setEntityrequestv2(
    new pb.EntityRequest()
      .setInstanceid("@echo@key")
      .setOperationrequestsList([
        new pb.HistoryEvent().setEntityoperationcalled(
          new pb.EntityOperationCalledEvent().setOperation("echo").setRequestid("request").setInput(text(input)),
        ),
      ]),
  );
}

class MemoryStore extends PayloadStore {
  readonly values = new Map<string, string>();
  async upload(value: string): Promise<string> {
    const token = `payload:${this.values.size}`;
    this.values.set(token, value);
    return token;
  }
  async download(token: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (!this.values.has(token)) throw new Error("Missing blob");
    return this.values.get(token)!;
  }
  isKnownPayloadToken(value: string): boolean {
    return value.startsWith("payload:");
  }
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Timed out");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("transparent payload transport over gRPC", () => {
  let server: grpc.Server;
  let client: TaskHubGrpcClient;
  let worker: TaskHubGrpcWorker;
  let store: MemoryStore;
  let hostAddress: string;
  let input: string;
  let subscription: grpc.ServerWritableStream<pb.GetWorkItemsRequest, pb.WorkItem> | undefined;
  let activityResponse: pb.ActivityResponse | undefined;
  let activityCalls: number;
  let requestedInput: string | undefined;
  let orchestrationResponses: pb.OrchestratorResponse[];
  let activityResponses: pb.ActivityResponse[];
  let entityResponses: pb.EntityBatchResult[];
  let abandonments: { kind: string; token: string }[];
  let onCompleteActivity: stubs.ITaskHubSidecarServiceServer["completeActivityTask"];
  let errors: jest.Mock;
  let historyEvents: pb.HistoryEvent[];
  let startCalls: grpc.ServerUnaryCall<pb.CreateInstanceRequest, pb.CreateInstanceResponse>[];
  let onStartInstance: stubs.ITaskHubSidecarServiceServer["startInstance"];
  let clientStopped: boolean;

  beforeEach(async () => {
    store = new MemoryStore();
    input = await store.upload(JSON.stringify({ message: "hydrated" }));
    subscription = undefined;
    activityResponse = undefined;
    activityCalls = 0;
    requestedInput = undefined;
    orchestrationResponses = [];
    activityResponses = [];
    entityResponses = [];
    abandonments = [];
    errors = jest.fn();
    clientStopped = false;
    startCalls = [];
    onStartInstance = (call, callback) =>
      callback(null, new pb.CreateInstanceResponse().setInstanceid(call.request.getInstanceid()));
    onCompleteActivity = (_call, callback) => callback(null, new pb.CompleteTaskResponse());
    historyEvents = [pbh.newExecutionStartedEvent("flow", "instance", input)];
    server = new grpc.Server();
    const state = () =>
      new pb.OrchestrationState()
        .setInstanceid("instance")
        .setName("workflow")
        .setInput(text(input))
        .setOutput(text(input))
        .setCustomstatus(text(input));
    const service = {
      hello: (_call, callback) => callback(null, new Empty()),
      startInstance: (call, callback) => {
        startCalls.push(call);
        requestedInput = call.request.getInput()?.getValue();
        onStartInstance(call, callback);
      },
      getInstance: (_call, callback) =>
        callback(null, new pb.GetInstanceResponse().setExists(true).setOrchestrationstate(state())),
      waitForInstanceStart: (_call, callback) =>
        callback(null, new pb.GetInstanceResponse().setExists(true).setOrchestrationstate(state())),
      queryInstances: (_call, callback) =>
        callback(null, new pb.QueryInstancesResponse().setOrchestrationstateList([state()])),
      streamInstanceHistory: (call) => {
        call.write(new pb.HistoryChunk().setEventsList(historyEvents));
        call.end();
      },
      getWorkItems: (call) => {
        subscription = call;
        call.on("cancelled", () => call.end());
      },
      completeActivityTask: (call, callback) => {
        activityResponse = call.request;
        activityResponses.push(call.request);
        onCompleteActivity(call, callback);
      },
      completeOrchestratorTask: (call, callback) => {
        orchestrationResponses.push(call.request);
        callback(null, new pb.CompleteTaskResponse());
      },
      completeEntityTask: (call, callback) => {
        entityResponses.push(call.request);
        callback(null, new pb.CompleteTaskResponse());
      },
      abandonTaskActivityWorkItem: (call, callback) => {
        abandonments.push({ kind: "activity", token: call.request.getCompletiontoken() });
        callback(null, new pb.AbandonActivityTaskResponse());
      },
      abandonTaskOrchestratorWorkItem: (call, callback) => {
        abandonments.push({ kind: "orchestrator", token: call.request.getCompletiontoken() });
        callback(null, new pb.AbandonOrchestrationTaskResponse());
      },
      abandonTaskEntityWorkItem: (call, callback) => {
        abandonments.push({ kind: "entity", token: call.request.getCompletiontoken() });
        callback(null, new pb.AbandonEntityTaskResponse());
      },
    } satisfies Pick<
      stubs.ITaskHubSidecarServiceServer,
      | "hello"
      | "startInstance"
      | "getInstance"
      | "waitForInstanceStart"
      | "queryInstances"
      | "streamInstanceHistory"
      | "getWorkItems"
      | "completeActivityTask"
      | "completeOrchestratorTask"
      | "completeEntityTask"
      | "abandonTaskActivityWorkItem"
      | "abandonTaskOrchestratorWorkItem"
      | "abandonTaskEntityWorkItem"
    >;
    server.addService(stubs.TaskHubSidecarServiceService, service);
    const port = await new Promise<number>((resolve, reject) =>
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, port) =>
        error ? reject(error) : resolve(port),
      ),
    );
    hostAddress = `127.0.0.1:${port}`;
    const payloads = { store, thresholdBytes: 1 };
    client = new TaskHubGrpcClient({ hostAddress, payloads, logger: new NoOpLogger() });
    worker = new TaskHubGrpcWorker({ hostAddress, payloads, logger: new NoOpLogger() });
    worker.addNamedActivity("echo", async (_context, value) => {
      activityCalls++;
      return value;
    });
  });

  afterEach(async () => {
    if (worker["_isRunning"]) await worker.stop();
    if (!clientStopped) await client.stop();
    server.forceShutdown();
    jest.restoreAllMocks();
  });

  function registerPayloadWorker(output?: unknown, maxPayloadBytes?: number): jest.Mock {
    worker = new TaskHubGrpcWorker({
      hostAddress,
      payloads: { store, thresholdBytes: 1, maxPayloadBytes },
      logger: { error: errors, warn: () => {}, info: () => {}, debug: () => {} },
    });
    const invoked = jest.fn((value: unknown) => output ?? value);
    worker.addNamedActivity("echo", async (_context, value) => invoked(value));
    worker.addNamedOrchestrator("flow", async (_context, value) => invoked(value));
    class Echo extends TaskEntity<null> {
      echo(value: unknown) {
        return invoked(value);
      }
      protected initializeState(): null {
        return null;
      }
    }
    worker.addNamedEntity("echo", () => new Echo());
    return invoked;
  }

  const completeCount = () => activityResponses.length + orchestrationResponses.length + entityResponses.length;

  it("externalizes before sending and hydrates state, wait, query and streamed history before conversion", async () => {
    await client.scheduleNewOrchestration("workflow", { message: "request" });
    expect(requestedInput).toMatch(/^payload:/);
    expect(await store.download(requestedInput!)).toBe('{"message":"request"}');
    expect((await client.getOrchestrationState("instance"))!.serializedInput).toBe('{"message":"hydrated"}');
    expect((await client.waitForOrchestrationStart("instance"))!.serializedInput).toBe('{"message":"hydrated"}');
    const states = [];
    for await (const item of client.getAllInstances({ fetchInputsAndOutputs: true })) states.push(item);
    expect(states[0].serializedInput).toBe('{"message":"hydrated"}');
    const history = await client.getOrchestrationHistory("instance");
    expect(history[0]).toMatchObject({ input: '{"message":"hydrated"}' });
  });

  describe("scheduling error domains", () => {
    it.each([grpc.status.ALREADY_EXISTS, grpc.status.INVALID_ARGUMENT])(
      "preserves upload status %s without scheduling",
      async (code) => {
        const failure = Object.assign(new Error("storage rejected upload"), {
          code,
          details: "storage rejected upload",
          metadata: new grpc.Metadata(),
        });
        const upload = jest.spyOn(store, "upload").mockRejectedValue(failure);
        const metadata = jest.fn(async () => new grpc.Metadata());
        client["_metadataGenerator"] = metadata;

        await expect(client.scheduleNewOrchestration("workflow", { message: "request" })).rejects.toBe(failure);
        expect(upload).toHaveBeenCalledTimes(1);
        expect(metadata).not.toHaveBeenCalled();
        expect(startCalls).toHaveLength(0);
      },
    );

    describe.each([true, false])("with payloads enabled=%s", (payloadsEnabled) => {
      beforeEach(async () => {
        await client.stop();
        client = new TaskHubGrpcClient({
          hostAddress,
          payloads: payloadsEnabled ? { store, thresholdBytes: 1 } : undefined,
          defaultVersion: "default-version",
          logger: new NoOpLogger(),
        });
      });

      it.each([grpc.status.ALREADY_EXISTS, grpc.status.INVALID_ARGUMENT])(
        "preserves metadata status %s without scheduling",
        async (code) => {
          const failure = Object.assign(new Error("metadata rejected request"), { code });
          const upload = jest.spyOn(store, "upload");
          const metadata = jest.fn(async () => {
            throw failure;
          });
          client["_metadataGenerator"] = metadata;

          await expect(client.scheduleNewOrchestration("workflow", { message: "request" })).rejects.toBe(failure);
          expect(metadata).toHaveBeenCalledTimes(1);
          expect(upload).toHaveBeenCalledTimes(payloadsEnabled ? 1 : 0);
          expect(startCalls).toHaveLength(0);
        },
      );

      it.each([
        [grpc.status.ALREADY_EXISTS, OrchestrationAlreadyExistsError],
        [grpc.status.INVALID_ARGUMENT, TypeError],
      ])("translates actual startInstance status %s with its cause and details", async (code, expectedError) => {
        onStartInstance = (_call, callback) => callback({ code, details: "scheduler rejected start" });

        const scheduled = client.scheduleNewOrchestration("workflow", { message: "request" });
        await expect(scheduled).rejects.toBeInstanceOf(expectedError);
        await expect(scheduled).rejects.toMatchObject({
          message: "scheduler rejected start",
          cause: expect.objectContaining({ code, details: "scheduler rejected start" }),
        });
        expect(startCalls).toHaveLength(1);
      });

      it.each([undefined, "explicit-version"])(
        "preserves successful scheduling options (version=%s)",
        async (version) => {
          const metadata = new grpc.Metadata();
          metadata.set("taskhub", "scheduling-error-domains");
          const generateMetadata = jest.fn(async () => metadata);
          client["_metadataGenerator"] = generateMetadata;
          onStartInstance = (_call, callback) =>
            callback(null, new pb.CreateInstanceResponse().setInstanceid("scheduled-instance"));
          const upload = jest.spyOn(store, "upload");
          const startAt = new Date("2026-10-22T15:00:00.000Z");
          const input = { message: "request \u4f60\u597d" };

          await expect(
            client.scheduleNewOrchestration("workflow", input, {
              instanceId: "requested-instance",
              startAt,
              tags: { owner: "scheduling-error-domains" },
              version,
              dedupeStatuses: [OrchestrationStatus.COMPLETED],
            }),
          ).resolves.toBe("scheduled-instance");

          expect(startCalls).toHaveLength(1);
          const { request, metadata: receivedMetadata } = startCalls[0];
          expect(request.getName()).toBe("workflow");
          expect(request.getInstanceid()).toBe("requested-instance");
          expect(request.getScheduledstarttimestamp()?.toDate()).toEqual(startAt);
          expect(request.getVersion()?.getValue()).toBe(version ?? "default-version");
          expect(request.getTagsMap().get("owner")).toBe("scheduling-error-domains");
          expect(request.getOrchestrationidreusepolicy()?.getReplaceablestatusList()).toHaveLength(6);
          expect(request.getOrchestrationidreusepolicy()?.getReplaceablestatusList()).not.toContain(
            pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
          );
          expect(receivedMetadata.get("taskhub")).toEqual(["scheduling-error-domains"]);
          expect(generateMetadata).toHaveBeenCalledTimes(1);
          expect(upload).toHaveBeenCalledTimes(payloadsEnabled ? 1 : 0);
          const wireInput = request.getInput()!.getValue();
          expect(payloadsEnabled ? await store.download(wireInput) : wireInput).toBe(JSON.stringify(input));
        },
      );
    });

    it("preserves stop cancellation during upload without starting the scheduling RPC", async () => {
      let uploadSignal: AbortSignal | undefined;
      const upload = jest.spyOn(store, "upload").mockImplementation(
        (_value: string, signal?: AbortSignal) =>
          new Promise<string>((_resolve, reject) => {
            uploadSignal = signal;
            signal!.addEventListener("abort", () => reject(signal!.reason), { once: true });
          }),
      );
      const pending = client.scheduleNewOrchestration("workflow", { message: "request" });
      const rejected = pending.catch((error: unknown) => error);
      await waitFor(() => !!uploadSignal);
      clientStopped = true;
      await client.stop();

      expect(await rejected).toBe(uploadSignal!.reason);
      expect(uploadSignal!.aborted).toBe(true);
      expect(upload).toHaveBeenCalledTimes(1);
      expect(startCalls).toHaveLength(0);
    });

    it("preserves stop cancellation of the pending scheduling RPC", async () => {
      let canceled = false;
      onStartInstance = (call) => {
        call.on("cancelled", () => {
          canceled = true;
        });
      };
      const pending = client.scheduleNewOrchestration("workflow", { message: "request" });
      const rejected = pending.catch((error: unknown) => error);
      await waitFor(() => startCalls.length === 1);
      clientStopped = true;
      await client.stop();
      await waitFor(() => canceled);

      expect(await rejected).toBe(client["_payloadCancellation"].signal.reason);
      expect(startCalls).toHaveLength(1);
    });
  });

  it("advertises support, awaits input hydration and externalizes worker output", async () => {
    await worker.start();
    await waitFor(() => !!subscription);
    expect(subscription!.request.getCapabilitiesList()).toContain(pb.WorkerCapability.WORKER_CAPABILITY_LARGE_PAYLOADS);
    subscription!.write(
      new pb.WorkItem()
        .setCompletiontoken("completion")
        .setActivityrequest(
          new pb.ActivityRequest()
            .setName("echo")
            .setTaskid(1)
            .setInput(text(input))
            .setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("instance")),
        ),
    );
    await waitFor(() => !!activityResponse);
    expect(activityCalls).toBe(1);
    expect(abandonments).toEqual([]);
    expect(activityResponse!.getCompletiontoken()).toBe("completion");
    expect(await store.download(activityResponse!.getResult()!.getValue())).toBe('{"message":"hydrated"}');
  });

  it("propagates missing streamed payloads rather than returning tokens or succeeding early at end", async () => {
    store.values.clear();
    await expect(client.getOrchestrationHistory("instance")).rejects.toThrow("Missing blob");
  });

  it("hydrates streamed orchestration history before user execution and externalizes its result", async () => {
    let observed: unknown;
    worker.addNamedOrchestrator("flow", async (_ctx, value) => {
      observed = value;
      return value;
    });
    await worker.start();
    await waitFor(() => !!subscription);
    subscription!.write(
      new pb.WorkItem()
        .setCompletiontoken("streamed")
        .setOrchestratorrequest(
          new pb.OrchestratorRequest()
            .setInstanceid("instance")
            .setRequireshistorystreaming(true)
            .setNeweventsList([pbh.newOrchestratorStartedEvent()]),
        ),
    );
    await waitFor(() => orchestrationResponses.length > 0);
    expect(observed).toEqual({ message: "hydrated" });
    const result = orchestrationResponses[0].getActionsList()[0].getCompleteorchestration()!.getResult()!.getValue();
    expect(await store.download(result)).toBe('{"message":"hydrated"}');
  });

  it.each<WorkKind>(["activity", "orchestrator", "streamed-orchestrator", "entity-v1", "entity-v2"])(
    "abandons %s on download failure and permits redelivery after storage recovers",
    async (kind) => {
      const invoked = registerPayloadWorker();
      const failure = Object.assign(new Error("download unavailable"), { statusCode: 503 });
      const download = jest.spyOn(store, "download").mockRejectedValueOnce(failure);
      await worker.start();
      await waitFor(() => !!subscription);
      const stream = worker["_responseStream"];
      subscription!.write(workItem(kind, input, "retryable"));
      await waitFor(() => errors.mock.calls.length > 0 && worker["_pendingWorkItems"].size === 0);
      expect(invoked).not.toHaveBeenCalled();
      expect(download).toHaveBeenCalledTimes(1);
      expect(completeCount()).toBe(0);
      expect(abandonments).toEqual([
        {
          kind: kind.startsWith("entity") ? "entity" : kind === "activity" ? "activity" : "orchestrator",
          token: "retryable",
        },
      ]);
      expect(subscription!.cancelled).toBe(false);
      expect(worker["_responseStream"]).toBe(stream);

      subscription!.write(workItem(kind, input, "redelivered"));
      await waitFor(() => completeCount() === 1 && worker["_pendingWorkItems"].size === 0);
      expect(download).toHaveBeenCalledTimes(2);
      expect(invoked).toHaveBeenCalledTimes(1);
      expect(invoked).toHaveBeenCalledWith({ message: "hydrated" });
      expect(abandonments).toHaveLength(1);
    },
  );

  it.each<{ kind: WorkKind; maximum?: number }>([
    { kind: "activity" },
    { kind: "orchestrator" },
    { kind: "entity-v1" },
    { kind: "entity-v2" },
    { kind: "entity-v1", maximum: 64 },
    { kind: "entity-v2", maximum: 64 },
  ])("abandons $kind when output externalization fails (maximum=$maximum)", async ({ kind, maximum }) => {
    const invoked = registerPayloadWorker("x".repeat(128), maximum);
    const upload = jest.spyOn(store, "upload");
    if (!maximum) upload.mockRejectedValueOnce(Object.assign(new Error("upload unavailable"), { statusCode: 503 }));
    await worker.start();
    await waitFor(() => !!subscription);
    const stream = worker["_responseStream"];
    subscription!.write(workItem(kind, '"inline"', "output-failure"));
    await waitFor(() => errors.mock.calls.length > 0 && worker["_pendingWorkItems"].size === 0);
    expect(invoked).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledTimes(maximum ? 0 : 1);
    expect(completeCount()).toBe(0);
    expect(abandonments).toEqual([
      {
        kind: kind.startsWith("entity") ? "entity" : kind === "activity" ? "activity" : "orchestrator",
        token: "output-failure",
      },
    ]);
    expect(subscription!.cancelled).toBe(false);
    expect(worker["_responseStream"]).toBe(stream);
  });

  it.each<WorkKind>(["activity", "orchestrator"])(
    "preserves permanent %s output failure conversion without abandoning",
    async (kind) => {
      registerPayloadWorker("x".repeat(128), 64);
      await worker.start();
      await waitFor(() => !!subscription);
      subscription!.write(workItem(kind, '"inline"', "permanent"));
      await waitFor(() => completeCount() === 1 && worker["_pendingWorkItems"].size === 0);
      const failure =
        kind === "activity"
          ? activityResponses[0].getFailuredetails()
          : orchestrationResponses[0].getActionsList()[0].getCompleteorchestration()?.getFailuredetails();
      expect(failure?.getErrortype()).toBe("PayloadStorageException");
      expect(failure?.getIsnonretriable()).toBe(true);
      expect(abandonments).toEqual([]);
    },
  );

  it("retries a transient completion RPC with the same externalized response and only one upload", async () => {
    const invoked = registerPayloadWorker("output");
    const upload = jest.spyOn(store, "upload");
    onCompleteActivity = (_call, callback) => {
      if (activityResponses.length === 1) callback({ code: grpc.status.UNAVAILABLE, details: "retry completion" });
      else callback(null, new pb.CompleteTaskResponse());
    };
    await worker.start();
    await waitFor(() => !!subscription);
    subscription!.write(workItem("activity", '"inline"', "response-retry"));
    await waitFor(() => activityResponses.length === 2 && worker["_pendingWorkItems"].size === 0);
    expect(invoked).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(activityResponses[0].getResult()?.getValue()).toMatch(/^payload:/);
    expect(activityResponses[1].serializeBinary()).toEqual(activityResponses[0].serializeBinary());
    expect(abandonments).toEqual([]);
  });

  it("collects large history chunks without the JavaScript variadic argument limit", async () => {
    historyEvents = Array.from({ length: 150000 }, () =>
      new pb.HistoryEvent().setGenericevent(new pb.GenericEvent().setData(text("x"))),
    );
    expect(await client.getOrchestrationHistory("instance")).toHaveLength(historyEvents.length);
  }, 20000);
});
