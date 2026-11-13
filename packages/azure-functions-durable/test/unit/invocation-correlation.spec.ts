// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  FunctionHandler,
  FunctionOptions,
  HttpRequest,
  InvocationContext,
  PreInvocationContext,
  app as azFuncApp,
} from "@azure/functions";
import * as grpc from "@grpc/grpc-js";
import { EntityInstanceId, NoOpLogger, PurgeInstanceCriteria, TaskHubGrpcClient } from "@microsoft/durabletask-js";
import * as pb from "../../../durabletask-js/src/proto/orchestrator_service_pb";
import * as stubs from "../../../durabletask-js/src/proto/orchestrator_service_grpc_pb";
import * as df from "../../src";
import { getUserAgent } from "../../src/user-agent";

// Capture the runtime hook, but leave invocation contexts, clients, and gRPC transport real.
jest.mock("@azure/functions", () => {
  const actual = jest.requireActual<typeof import("@azure/functions")>("@azure/functions");
  return {
    ...actual,
    app: {
      ...actual.app,
      generic: jest.fn(),
      hook: {
        ...actual.app.hook,
        preInvocation: jest.fn(() => ({ dispose: jest.fn() })),
      },
    },
  };
});

const INVOCATION_A = "11111111-1111-4111-8111-111111111111";
const INVOCATION_B = "22222222-2222-4222-8222-222222222222";
const INVOCATION_HEADER = "x-azure-functions-invocationid";
const INSTANCE_ID = "correlated-instance";
const ENTITY_ID = new EntityInstanceId("counter", "one");

type Operation = [string, string[], (client: df.DurableFunctionsClient) => Promise<unknown>];
const operations: Operation[] = [
  ["scheduleNewOrchestration", ["startInstance"], (c) => c.scheduleNewOrchestration("hello", null, INSTANCE_ID)],
  ["startNew", ["startInstance"], (c) => c.startNew("hello", { instanceId: INSTANCE_ID })],
  ["getOrchestrationState", ["getInstance"], (c) => c.getOrchestrationState(INSTANCE_ID)],
  ["getStatus", ["getInstance"], (c) => c.getStatus(INSTANCE_ID)],
  [
    "getStatus with history",
    ["getInstance", "streamInstanceHistory"],
    (c) => c.getStatus(INSTANCE_ID, { showHistory: true }),
  ],
  [
    "getAllInstances",
    ["queryInstances"],
    async (c) => {
      const states = [];
      for await (const state of c.getAllInstances()) {
        states.push(state);
      }
      return states;
    },
  ],
  ["getStatusAll", ["queryInstances"], (c) => c.getStatusAll()],
  ["getStatusBy", ["queryInstances"], (c) => c.getStatusBy({})],
  ["waitForOrchestrationStart", ["waitForInstanceStart"], (c) => c.waitForOrchestrationStart(INSTANCE_ID)],
  [
    "waitForOrchestrationCompletion",
    ["waitForInstanceCompletion"],
    (c) => c.waitForOrchestrationCompletion(INSTANCE_ID),
  ],
  [
    "waitForCompletionOrCreateCheckStatusResponse",
    ["waitForInstanceCompletion"],
    (c) =>
      c.waitForCompletionOrCreateCheckStatusResponse(
        new HttpRequest({ method: "POST", url: "http://localhost/api/start" }),
        INSTANCE_ID,
      ),
  ],
  ["raiseOrchestrationEvent", ["raiseEvent"], (c) => c.raiseOrchestrationEvent(INSTANCE_ID, "event")],
  ["raiseEvent", ["raiseEvent"], (c) => c.raiseEvent(INSTANCE_ID, "event")],
  ["terminateOrchestration", ["terminateInstance"], (c) => c.terminateOrchestration(INSTANCE_ID)],
  ["terminate", ["terminateInstance"], (c) => c.terminate(INSTANCE_ID)],
  ["suspendOrchestration", ["suspendInstance"], (c) => c.suspendOrchestration(INSTANCE_ID)],
  ["suspend", ["suspendInstance"], (c) => c.suspend(INSTANCE_ID)],
  ["resumeOrchestration", ["resumeInstance"], (c) => c.resumeOrchestration(INSTANCE_ID)],
  ["resume", ["resumeInstance"], (c) => c.resume(INSTANCE_ID)],
  ["rewindInstance", ["rewindInstance"], (c) => c.rewindInstance(INSTANCE_ID, "retry")],
  ["rewind", ["rewindInstance"], (c) => c.rewind(INSTANCE_ID)],
  ["restartOrchestration", ["restartInstance"], (c) => c.restartOrchestration(INSTANCE_ID)],
  ["restart", ["restartInstance"], (c) => c.restart(INSTANCE_ID)],
  ["purgeOrchestration", ["purgeInstances"], (c) => c.purgeOrchestration(INSTANCE_ID)],
  ["purgeOrchestration by filter", ["purgeInstances"], (c) => c.purgeOrchestration(new PurgeInstanceCriteria())],
  ["purgeInstanceHistory", ["purgeInstances"], (c) => c.purgeInstanceHistory(INSTANCE_ID)],
  ["purgeInstanceHistoryBy", ["purgeInstances"], (c) => c.purgeInstanceHistoryBy({})],
  ["signalEntity", ["signalEntity"], (c) => c.signalEntity(ENTITY_ID, "add", 1)],
  ["getEntity", ["getEntity"], (c) => c.getEntity(ENTITY_ID)],
  ["readEntityState", ["getEntity"], (c) => c.readEntityState(ENTITY_ID)],
  [
    "getEntities",
    ["queryEntities"],
    async (c) => {
      const entities = [];
      for await (const entity of c.getEntities()) {
        entities.push(entity);
      }
      return entities;
    },
  ],
  ["cleanEntityStorage", ["cleanEntityStorage"], (c) => c.cleanEntityStorage()],
  ["getOrchestrationHistory", ["streamInstanceHistory"], (c) => c.getOrchestrationHistory(INSTANCE_ID)],
];

type Starter = [keyof typeof df.app.client & keyof typeof azFuncApp, (handler: df.DurableClientHandler) => void];
const starters: Starter[] = [
  ["http", (handler) => df.app.client.http("starter", { handler })],
  ["timer", (handler) => df.app.client.timer("starter", { handler, schedule: "0 */5 * * * *" })],
  [
    "storageBlob",
    (handler) =>
      df.app.client.storageBlob("starter", {
        handler,
        path: "input/{name}",
        connection: "Storage",
      }),
  ],
  [
    "storageQueue",
    (handler) =>
      df.app.client.storageQueue("starter", {
        handler,
        queueName: "input",
        connection: "Storage",
      }),
  ],
  [
    "serviceBusQueue",
    (handler) =>
      df.app.client.serviceBusQueue("starter", {
        handler,
        queueName: "input",
        connection: "ServiceBus",
      }),
  ],
  [
    "serviceBusTopic",
    (handler) =>
      df.app.client.serviceBusTopic("starter", {
        handler,
        topicName: "input",
        subscriptionName: "subscription",
        connection: "ServiceBus",
      }),
  ],
  [
    "eventHub",
    (handler) =>
      df.app.client.eventHub("starter", {
        handler,
        connection: "EventHub",
        eventHubName: "input",
      }),
  ],
  ["eventGrid", (handler) => df.app.client.eventGrid("starter", { handler })],
  [
    "cosmosDB",
    (handler) =>
      df.app.client.cosmosDB("starter", {
        handler,
        connection: "Cosmos",
        databaseName: "db",
        containerName: "items",
      }),
  ],
  [
    "generic",
    (handler) =>
      df.app.client.generic("starter", {
        handler,
        trigger: { type: "customTrigger", name: "input" },
      }),
  ],
];

describe("Functions invocation correlation over real gRPC", () => {
  const server = new grpc.Server();
  const clients = new Set<TaskHubGrpcClient>();
  let hostAddress: string;
  let received: { method: string; metadata: grpc.Metadata; peer: string }[];
  let rpcError: grpc.ServerErrorResponse | null;

  function unary<TRequest, TResponse>(
    method: string,
    response: () => TResponse,
  ): grpc.handleUnaryCall<TRequest, TResponse> {
    return (call, callback) => {
      received.push({ method, metadata: call.metadata, peer: call.getPeer() });
      callback(rpcError, response());
    };
  }

  function instanceResponse(): pb.GetInstanceResponse {
    return new pb.GetInstanceResponse()
      .setExists(true)
      .setOrchestrationstate(
        new pb.OrchestrationState()
          .setInstanceid(INSTANCE_ID)
          .setName("hello")
          .setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED),
      );
  }

  beforeAll(async () => {
    server.addService(stubs.TaskHubSidecarServiceService, {
      startInstance: unary("startInstance", () => new pb.CreateInstanceResponse().setInstanceid(INSTANCE_ID)),
      getInstance: unary("getInstance", instanceResponse),
      queryInstances: unary("queryInstances", () => new pb.QueryInstancesResponse()),
      waitForInstanceStart: unary("waitForInstanceStart", instanceResponse),
      waitForInstanceCompletion: unary("waitForInstanceCompletion", instanceResponse),
      raiseEvent: unary("raiseEvent", () => new pb.RaiseEventResponse()),
      terminateInstance: unary("terminateInstance", () => new pb.TerminateResponse()),
      suspendInstance: unary("suspendInstance", () => new pb.SuspendResponse()),
      resumeInstance: unary("resumeInstance", () => new pb.ResumeResponse()),
      rewindInstance: unary("rewindInstance", () => new pb.RewindInstanceResponse()),
      restartInstance: unary("restartInstance", () => new pb.RestartInstanceResponse().setInstanceid(INSTANCE_ID)),
      purgeInstances: unary("purgeInstances", () => new pb.PurgeInstancesResponse()),
      signalEntity: unary("signalEntity", () => new pb.SignalEntityResponse()),
      getEntity: unary("getEntity", () => new pb.GetEntityResponse()),
      queryEntities: unary("queryEntities", () => new pb.QueryEntitiesResponse()),
      cleanEntityStorage: unary("cleanEntityStorage", () => new pb.CleanEntityStorageResponse()),
      streamInstanceHistory: (call) => {
        received.push({ method: "streamInstanceHistory", metadata: call.metadata, peer: call.getPeer() });
        call.end();
      },
    } satisfies Partial<stubs.ITaskHubSidecarServiceServer>);
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
        if (error) reject(error);
        else resolve(boundPort);
      });
    });
    hostAddress = `127.0.0.1:${port}`;
  });

  beforeEach(() => {
    received = [];
    rpcError = null;
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    try {
      await Promise.all([...clients].map((client) => client.stop()));
    } finally {
      server.forceShutdown();
    }
  });

  function config() {
    return { taskHubName: "invocation-hub", rpcBaseUrl: `http://${hostAddress}/rpc` };
  }

  function createContext(invocationId = INVOCATION_A, inputType = "durableClient"): InvocationContext {
    const binding = { ...df.input.durableClient(), type: inputType };
    const context = new InvocationContext({ invocationId, options: { extraInputs: [binding] } });
    context.extraInputs.set(binding, JSON.stringify(config()));
    return context;
  }

  function getClient(context: InvocationContext): df.DurableFunctionsClient {
    const client = df.getClient(context);
    clients.add(client);
    return client;
  }

  async function invoke(context: InvocationContext, handler: FunctionHandler, ...inputs: unknown[]): Promise<unknown> {
    const hookContext = new PreInvocationContext({
      invocationContext: context,
      functionCallback: handler,
      inputs,
    });
    for (const [hook] of jest.mocked(azFuncApp.hook.preInvocation).mock.calls) {
      await hook(hookContext);
    }
    return hookContext.functionHandler(hookContext.inputs[0], context);
  }

  function expectMetadata(invocationId: string | undefined): void {
    expect(received.length).toBeGreaterThan(0);
    for (const { metadata } of received) {
      expect(metadata.get(INVOCATION_HEADER)).toEqual(invocationId ? [invocationId] : []);
      expect(metadata.get("taskhub")).toEqual(["invocation-hub"]);
      expect(metadata.get("x-user-agent")).toEqual([getUserAgent()]);
    }
  }

  it.each(operations)("%s sends the active invocation ID over gRPC", async (_name, methods, operation) => {
    const context = createContext();
    await invoke(context, async () => {
      const client = getClient(context);
      await new Promise<void>((resolve) => setImmediate(resolve));
      await operation(client);
    });

    expect(received.map((call) => call.method)).toEqual(methods);
    expectMetadata(INVOCATION_A);
  });

  it.each(starters)("app.client.%s propagates the invocation after an async continuation", async (method, register) => {
    const registration = jest.spyOn(azFuncApp, method).mockImplementation(() => undefined);
    registration.mockClear();
    register(async (_trigger, client, context) => {
      clients.add(client);
      expect(client).toBe(getClient(context));
      await new Promise<void>((resolve) => setImmediate(resolve));
      await client.startNew("hello", { instanceId: INSTANCE_ID });
      return { status: 202 };
    });
    const options = registration.mock.calls[0][1] as FunctionOptions;
    const context = new InvocationContext({ invocationId: INVOCATION_B, options });
    const binding = options.extraInputs?.find(df.isDurableClientInput);
    expect(binding).toBeDefined();
    context.extraInputs.set(binding!, JSON.stringify(config()));

    await expect(invoke(context, options.handler, "trigger")).resolves.toEqual({ status: 202 });
    expectMetadata(INVOCATION_B);
  });

  it("isolates overlapping invocations and unscoped calls on the same cached channel", async () => {
    const contextA = createContext(INVOCATION_A);
    const contextB = createContext(INVOCATION_B);
    const client = getClient(contextA);
    let firstReady!: () => void;
    const ready = new Promise<void>((resolve) => (firstReady = resolve));
    let releaseFirst!: () => void;
    const resume = new Promise<void>((resolve) => (releaseFirst = resolve));

    const first = invoke(contextA, async () => {
      expect(getClient(contextA)).toBe(client);
      await client.raiseEvent(INSTANCE_ID, "a-before");
      firstReady();
      await resume;
      await new Promise<void>((resolve) => setImmediate(resolve));
      await client.raiseEvent(INSTANCE_ID, "a-after");
    });
    try {
      await Promise.race([ready, first]);
      await invoke(contextB, async () => {
        expect(getClient(contextB)).toBe(client);
        await client.raiseEvent(INSTANCE_ID, "b-before");
        await Promise.resolve();
        await client.raiseEvent(INSTANCE_ID, "b-after");
      });
      await client.raiseEvent(INSTANCE_ID, "outside");
    } finally {
      releaseFirst();
      await first;
    }

    expect(received.map((call) => call.metadata.get(INVOCATION_HEADER))).toEqual([
      [INVOCATION_A],
      [INVOCATION_B],
      [INVOCATION_B],
      [],
      [INVOCATION_A],
    ]);
    expect(new Set(received.map((call) => call.peer)).size).toBe(1);
  });

  it("uses the current invocation for sequential cached clients and the orchestrationClient binding alias", async () => {
    const contextA = createContext(INVOCATION_A);
    const contextB = createContext(INVOCATION_B, "orchestrationClient");
    const first = getClient(contextA);
    const second = getClient(contextB);
    expect(second).toBe(first);

    await invoke(contextA, () => first.raiseEvent(INSTANCE_ID, "first"));
    await invoke(contextB, () => second.raiseEvent(INSTANCE_ID, "second"));

    expect(received.map((call) => call.metadata.get(INVOCATION_HEADER))).toEqual([[INVOCATION_A], [INVOCATION_B]]);
  });

  it("does not retain an invocation on a directly constructed compatibility client", async () => {
    const client = new df.DurableOrchestrationClient(config());
    clients.add(client);
    await invoke(createContext(), () => client.raiseEvent(INSTANCE_ID, "inside"));
    await client.raiseEvent(INSTANCE_ID, "outside");

    expect(received.map((call) => call.metadata.get(INVOCATION_HEADER))).toEqual([[INVOCATION_A], []]);
  });

  it("omits the invocation header outside a function invocation", async () => {
    await getClient(createContext()).raiseEvent(INSTANCE_ID, "outside");
    expectMetadata(undefined);
  });

  it("omits the invocation header when the runtime context has no invocation ID", async () => {
    const context = createContext();
    context.invocationId = "";
    await invoke(context, () => getClient(context).raiseEvent(INSTANCE_ID, "missing-id"));
    expectMetadata(undefined);
  });

  it.each(["synchronous throw", "async rejection", "RPC failure"])(
    "restores the outer context after %s",
    async (failure) => {
      const context = createContext();
      const client = getClient(context);
      const error = new Error("invocation failed");
      if (failure === "RPC failure") {
        rpcError = Object.assign(error, { code: grpc.status.PERMISSION_DENIED });
      }
      const handler: FunctionHandler =
        failure === "synchronous throw"
          ? () => {
              throw error;
            }
          : async () => {
              await client.raiseOrchestrationEvent(INSTANCE_ID, "before-failure");
              throw error;
            };

      await expect(invoke(context, handler)).rejects.toThrow("invocation failed");
      if (failure !== "synchronous throw") expectMetadata(INVOCATION_A);
      received = [];
      rpcError = null;
      await client.raiseEvent(INSTANCE_ID, "after-failure");
      expectMetadata(undefined);
    },
  );

  it("preserves a surrounding invocation when a nested invocation fails", async () => {
    const client = getClient(createContext());
    await invoke(createContext(INVOCATION_A), async () => {
      await expect(
        invoke(createContext(INVOCATION_B), async () => {
          await client.raiseEvent(INSTANCE_ID, "nested");
          throw new Error("nested failure");
        }),
      ).rejects.toThrow("nested failure");
      await client.raiseEvent(INSTANCE_ID, "outer");
    });

    expect(received.map((call) => call.metadata.get(INVOCATION_HEADER))).toEqual([[INVOCATION_B], [INVOCATION_A]]);
  });

  it("does not add Functions metadata to a standalone core client, even during an invocation", async () => {
    const client = new TaskHubGrpcClient({ hostAddress, logger: new NoOpLogger() });
    clients.add(client);
    await invoke(createContext(), () => client.raiseOrchestrationEvent(INSTANCE_ID, "core"));

    expect(received).toHaveLength(1);
    expect(received[0].metadata.get(INVOCATION_HEADER)).toEqual([]);
    expect(received[0].metadata.get("taskhub")).toEqual([]);
    expect(received[0].metadata.get("x-user-agent")).toEqual([]);
  });

  it("closes and evicts a cached channel without retaining its originating invocation", async () => {
    const first = getClient(createContext(INVOCATION_A));
    const channel = first["_stub"].getChannel();
    await invoke(createContext(INVOCATION_A), () => first.raiseEvent(INSTANCE_ID, "first"));
    await first.stop();
    clients.delete(first);
    expect(channel.getConnectivityState(false)).toBe(grpc.connectivityState.SHUTDOWN);

    const contextB = createContext(INVOCATION_B);
    const second = getClient(contextB);
    expect(second).not.toBe(first);
    expect(second["_stub"].getChannel()).not.toBe(channel);
    await invoke(contextB, () => second.raiseEvent(INSTANCE_ID, "replacement"));
    await second.raiseEvent(INSTANCE_ID, "outside");

    expect(received.map((call) => call.metadata.get(INVOCATION_HEADER))).toEqual([[INVOCATION_A], [INVOCATION_B], []]);
    expect(azFuncApp.hook.preInvocation).toHaveBeenCalledTimes(1);
  });
});
