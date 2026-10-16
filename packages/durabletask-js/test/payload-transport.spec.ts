// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { TaskHubGrpcClient, TaskHubGrpcWorker, PayloadStore, NoOpLogger } from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import * as pbh from "../src/utils/pb-helper.util";

const text = (value: string) => new StringValue().setValue(value);
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
  let historyEvents: pb.HistoryEvent[];

  beforeEach(async () => {
    store = new MemoryStore();
    input = await store.upload(JSON.stringify({ message: "hydrated" }));
    subscription = undefined;
    activityResponse = undefined;
    activityCalls = 0;
    requestedInput = undefined;
    orchestrationResponses = [];
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
        requestedInput = call.request.getInput()?.getValue();
        callback(null, new pb.CreateInstanceResponse().setInstanceid(call.request.getInstanceid()));
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
        callback(null, new pb.CompleteTaskResponse());
      },
      completeOrchestratorTask: (call, callback) => {
        orchestrationResponses.push(call.request);
        callback(null, new pb.CompleteTaskResponse());
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
    await client.stop();
    server.forceShutdown();
  });

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

  it("leaves a streamed payload download failure retryable instead of failing the orchestration", async () => {
    const errors = jest.fn();
    worker = new TaskHubGrpcWorker({
      hostAddress,
      payloads: { store },
      logger: {
        error: errors,
        warn: () => {},
        info: () => {},
        debug: () => {},
      },
    });
    const flow = jest.fn(async () => "should not run");
    worker.addNamedOrchestrator("flow", flow);
    store.values.clear();
    await worker.start();
    await waitFor(() => !!subscription);
    subscription!.write(
      new pb.WorkItem()
        .setCompletiontoken("retryable")
        .setOrchestratorrequest(
          new pb.OrchestratorRequest()
            .setInstanceid("instance")
            .setRequireshistorystreaming(true)
            .setNeweventsList([pbh.newOrchestratorStartedEvent()]),
        ),
    );
    await waitFor(() => errors.mock.calls.length > 0);
    await waitFor(() => worker["_pendingWorkItems"].size === 0);
    expect(flow).not.toHaveBeenCalled();
    expect(orchestrationResponses).toEqual([]);
  });

  it("collects large history chunks without the JavaScript variadic argument limit", async () => {
    historyEvents = Array.from({ length: 150000 }, () =>
      new pb.HistoryEvent().setGenericevent(new pb.GenericEvent().setData(text("x"))),
    );
    expect(await client.getOrchestrationHistory("instance")).toHaveLength(historyEvents.length);
  }, 20000);
});
