// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import {
  ActivityContext,
  InMemoryOrchestrationBackend,
  OrchestrationContext,
  OrchestrationAlreadyExistsError,
  OrchestrationStatus,
  TaskHubGrpcClient,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  TOrchestrator,
  ValidDedupeStatuses,
} from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as pbh from "../src/utils/pb-helper.util";

function deferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function mockStartInstance(
  client: TaskHubGrpcClient,
  captureRequest: (request: pb.CreateInstanceRequest) => void,
  error?: grpc.ServiceError,
): void {
  const stub = (client as unknown as { _stub: Record<string, unknown> })._stub;
  stub.startInstance = (
    request: pb.CreateInstanceRequest,
    _metadata: grpc.Metadata,
    _options: Partial<grpc.CallOptions>,
    callback: (error: grpc.ServiceError | null, response: pb.CreateInstanceResponse) => void,
  ) => {
    captureRequest(request);
    const response = new pb.CreateInstanceResponse();
    response.setInstanceid(request.getInstanceid());
    callback(error ?? null, response);
    return {} as grpc.ClientUnaryCall;
  };
}

describe("TaskHubGrpcClient orchestration ID reuse policy", () => {
  let client: TaskHubGrpcClient;

  beforeEach(() => {
    client = new TaskHubGrpcClient({ hostAddress: "localhost:4001" });
  });

  afterEach(async () => {
    await client.stop();
  });

  it("omits the policy by default to preserve backend duplicate-ID behavior", async () => {
    let request: pb.CreateInstanceRequest | undefined;
    mockStartInstance(client, (value) => {
      request = value;
    });

    await client.scheduleNewOrchestration("workflow", undefined, { instanceId: "instance-1" });

    expect(request?.hasOrchestrationidreusepolicy()).toBe(false);
  });

  it("serializes dedupe statuses as the complement of replaceable statuses", async () => {
    let request: pb.CreateInstanceRequest | undefined;
    mockStartInstance(client, (value) => {
      request = value;
    });
    await client.scheduleNewOrchestration("workflow", undefined, {
      instanceId: "instance-1",
      dedupeStatuses: [OrchestrationStatus.COMPLETED, OrchestrationStatus.FAILED],
    });

    expect(request?.getOrchestrationidreusepolicy()?.getReplaceablestatusList()).toEqual([
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED,
    ]);
  });

  it("serializes an empty dedupe list as all replaceable runtime statuses", async () => {
    let request: pb.CreateInstanceRequest | undefined;
    mockStartInstance(client, (value) => {
      request = value;
    });

    await client.scheduleNewOrchestration("workflow", undefined, {
      instanceId: "instance-1",
      dedupeStatuses: [],
    });

    expect(request?.getOrchestrationidreusepolicy()?.getReplaceablestatusList()).toEqual([
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED,
    ]);
  });

  it("exports the same valid dedupe statuses as the .NET SDK", () => {
    expect(ValidDedupeStatuses).toEqual([
      OrchestrationStatus.COMPLETED,
      OrchestrationStatus.FAILED,
      OrchestrationStatus.TERMINATED,
      OrchestrationStatus.CANCELED,
      OrchestrationStatus.PENDING,
      OrchestrationStatus.RUNNING,
      OrchestrationStatus.SUSPENDED,
    ]);
  });

  it("rejects an invalid dedupe status before calling the sidecar", async () => {
    let called = false;
    mockStartInstance(client, () => {
      called = true;
    });

    await expect(
      client.scheduleNewOrchestration("workflow", undefined, {
        dedupeStatuses: [999 as OrchestrationStatus],
      }),
    ).rejects.toThrow(new TypeError("Invalid orchestration runtime status: '999' for deduplication."));
    expect(called).toBe(false);
  });

  it("forwards terminated dedupe with a reusable running status to the sidecar", async () => {
    let request: pb.CreateInstanceRequest | undefined;
    mockStartInstance(client, (value) => {
      request = value;
    });

    await client.scheduleNewOrchestration("workflow", undefined, {
      dedupeStatuses: [OrchestrationStatus.TERMINATED, OrchestrationStatus.RUNNING, OrchestrationStatus.PENDING],
    });

    expect(request?.getOrchestrationidreusepolicy()?.getReplaceablestatusList()).toEqual([
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED,
    ]);
  });

  it.each([
    [grpc.status.ALREADY_EXISTS, OrchestrationAlreadyExistsError],
    [grpc.status.INVALID_ARGUMENT, TypeError],
  ])("maps gRPC status %s to the public error contract", async (code, expectedError) => {
    const error = Object.assign(new Error("sidecar rejected start"), {
      code,
      details: "sidecar rejected start",
    }) as grpc.ServiceError;
    mockStartInstance(client, () => {}, error);

    await expect(client.scheduleNewOrchestration("workflow")).rejects.toBeInstanceOf(expectedError);
  });

  it("preserves a canceled scheduling ServiceError when no public cancellation error exists", async () => {
    const error = Object.assign(new Error("schedule canceled"), {
      code: grpc.status.CANCELLED,
      details: "schedule canceled",
    }) as grpc.ServiceError;
    mockStartInstance(client, () => {}, error);

    await expect(client.scheduleNewOrchestration("workflow")).rejects.toBe(error);
  });
});

describe("TestOrchestrationClient orchestration ID reuse policy", () => {
  let backend: InMemoryOrchestrationBackend;
  let client: TestOrchestrationClient;
  let worker: TestOrchestrationWorker;

  const waitingOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
    return yield ctx.waitForExternalEvent("finish");
  };

  beforeEach(async () => {
    backend = new InMemoryOrchestrationBackend();
    client = new TestOrchestrationClient(backend);
    worker = new TestOrchestrationWorker(backend);
    worker.addOrchestrator(waitingOrchestrator);
    await worker.start();
  });

  afterEach(async () => {
    await worker.stop();
    backend.reset();
  });

  it("treats omitted dedupe statuses as all statuses reusable", async () => {
    await client.scheduleNewOrchestration(waitingOrchestrator, "original", {
      instanceId: "instance-1",
    });
    await client.waitForOrchestrationStart("instance-1", false, 5);
    const originalExecutionId = backend.getInstance("instance-1")?.executionId;

    await client.scheduleNewOrchestration(waitingOrchestrator, "replacement", {
      instanceId: "instance-1",
    });

    const replacement = backend.getInstance("instance-1");
    expect(replacement?.executionId).not.toBe(originalExecutionId);
    expect(replacement?.input).toBe(JSON.stringify("replacement"));
  });

  it("rejects reuse when the existing runtime status is selected for deduplication", async () => {
    await client.scheduleNewOrchestration(waitingOrchestrator, "original", {
      instanceId: "instance-1",
    });
    await client.waitForOrchestrationStart("instance-1", false, 5);

    await expect(
      client.scheduleNewOrchestration(waitingOrchestrator, "replacement", {
        instanceId: "instance-1",
        dedupeStatuses: [OrchestrationStatus.RUNNING],
      }),
    ).rejects.toBeInstanceOf(OrchestrationAlreadyExistsError);
  });

  it("rejects terminated dedupe when a running status remains reusable", async () => {
    await expect(
      client.scheduleNewOrchestration(waitingOrchestrator, undefined, {
        instanceId: "instance-1",
        dedupeStatuses: [OrchestrationStatus.TERMINATED, OrchestrationStatus.RUNNING, OrchestrationStatus.PENDING],
      }),
    ).rejects.toThrow(
      new TypeError(
        "Invalid dedupe statuses: cannot include 'Terminated' while also allowing reuse of running instances, " +
          "because the running instance would be terminated and then immediately conflict with the dedupe check.",
      ),
    );
  });

  it("atomically replaces an existing instance whose runtime status is reusable", async () => {
    await client.scheduleNewOrchestration(waitingOrchestrator, "original", {
      instanceId: "instance-1",
    });
    await client.waitForOrchestrationStart("instance-1", false, 5);
    const originalExecutionId = backend.getInstance("instance-1")?.executionId;

    await client.scheduleNewOrchestration(waitingOrchestrator, "replacement", {
      instanceId: "instance-1",
      dedupeStatuses: [
        OrchestrationStatus.COMPLETED,
        OrchestrationStatus.FAILED,
        OrchestrationStatus.PENDING,
        OrchestrationStatus.SUSPENDED,
      ],
    });

    const replacement = backend.getInstance("instance-1");
    expect(replacement?.executionId).not.toBe(originalExecutionId);
    expect(replacement?.input).toBe(JSON.stringify("replacement"));
    expect(replacement?.status).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING);
  });

  it("terminates the old execution before creating its replacement", async () => {
    await client.scheduleNewOrchestration(waitingOrchestrator, "original", {
      instanceId: "instance-1",
    });
    await client.waitForOrchestrationStart("instance-1", false, 5);
    const originalCompletion = client.waitForOrchestrationCompletion("instance-1", true, 5);

    const replacement = client.scheduleNewOrchestration(waitingOrchestrator, "replacement", {
      instanceId: "instance-1",
      dedupeStatuses: [],
    });

    const originalState = await originalCompletion;
    expect(originalState?.runtimeStatus).toBe(OrchestrationStatus.TERMINATED);
    await replacement;
  });

  it("maps the canceled protobuf status to the public canceled status", () => {
    expect(backend.toClientStatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED)).toBe(
      OrchestrationStatus.CANCELED,
    );
  });

  it("treats canceled instances as terminal when waiting for completion", async () => {
    const instanceId = await client.scheduleNewOrchestration(waitingOrchestrator, undefined, {
      instanceId: "canceled-instance",
    });
    await client.waitForOrchestrationStart(instanceId, false, 5);
    const instance = backend.getInstance(instanceId)!;

    backend.completeOrchestration(instanceId, instance.completionToken, [
      pbh.newCompleteOrchestrationAction(-1, pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED),
    ]);

    const state = await client.waitForOrchestrationCompletion(instanceId, false, 0.1);
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.CANCELED);
  });

  it.each([
    ["tags", { tags: { environment: "test" } }],
    ["version", { version: "v2" }],
  ])("rejects unsupported %s options instead of silently dropping them", async (_name, options) => {
    await expect(
      client.scheduleNewOrchestration(waitingOrchestrator, undefined, {
        instanceId: `unsupported-${_name}`,
        ...options,
      }),
    ).rejects.toThrow(`TestOrchestrationClient does not support the '${_name}' option`);
  });
});

describe("TestOrchestrationClient replacement generation fences", () => {
  let backend: InMemoryOrchestrationBackend;
  let client: TestOrchestrationClient;
  let worker: TestOrchestrationWorker;

  beforeEach(() => {
    backend = new InMemoryOrchestrationBackend();
    client = new TestOrchestrationClient(backend);
    worker = new TestOrchestrationWorker(backend);
  });

  afterEach(async () => {
    await worker.stop();
    backend.reset();
  });

  it("does not deliver a running activity's stale completion to the replacement execution", async () => {
    const originalActivityStarted = deferred();
    const releaseOriginalActivity = deferred();
    const activity = async (_ctx: ActivityContext, input: string): Promise<string> => {
      if (input === "original") {
        originalActivityStarted.resolve();
        await releaseOriginalActivity.promise;
      }
      return input;
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      return yield ctx.callActivity(activity, input);
    };

    worker.addOrchestrator(orchestrator);
    worker.addActivity(activity);
    await worker.start();

    await client.scheduleNewOrchestration(orchestrator, "original", { instanceId: "activity-race" });
    await originalActivityStarted.promise;

    const replacement = client.scheduleNewOrchestration(orchestrator, "replacement", {
      instanceId: "activity-race",
      dedupeStatuses: [],
    });

    const replacementProgress = await Promise.race([
      replacement.then(() => "replaced"),
      new Promise<string>((resolve) => setTimeout(() => resolve("blocked"), 100)),
    ]);
    releaseOriginalActivity.resolve();

    expect(replacementProgress).toBe("replaced");
    await replacement;

    const state = await client.waitForOrchestrationCompletion("activity-race", true, 5);
    expect(state?.serializedOutput).toBe(JSON.stringify("replacement"));
  });

  it("does not deliver a stale sub-orchestration completion to the replacement execution", async () => {
    const originalChildStarted = deferred<string>();
    const replacementChildStarted = deferred<string>();
    const child: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      if (!ctx.isReplaying) {
        (input === "original" ? originalChildStarted : replacementChildStarted).resolve(ctx.instanceId);
      }
      return yield ctx.waitForExternalEvent("finish");
    };
    const parent: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      return yield ctx.callSubOrchestrator(child, input);
    };

    worker.addOrchestrator(parent);
    worker.addOrchestrator(child);
    await worker.start();

    await client.scheduleNewOrchestration(parent, "original", { instanceId: "parent-race" });
    const originalChildId = await originalChildStarted.promise;

    await client.scheduleNewOrchestration(parent, "replacement", {
      instanceId: "parent-race",
      dedupeStatuses: [],
    });
    const replacementChildId = await replacementChildStarted.promise;

    await client.raiseOrchestrationEvent(originalChildId, "finish", "stale");
    await expect(client.waitForOrchestrationCompletion("parent-race", true, 0.1)).rejects.toThrow(
      "Timeout waiting for orchestration 'parent-race'",
    );

    await client.raiseOrchestrationEvent(replacementChildId, "finish", "replacement");
    const state = await client.waitForOrchestrationCompletion("parent-race", true, 5);
    expect(state?.serializedOutput).toBe(JSON.stringify("replacement"));
  });

  it("fails a current parent when its running child is replaced", async () => {
    const childStarted = deferred();
    const child: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      if (!ctx.isReplaying) {
        childStarted.resolve();
      }
      return yield ctx.waitForExternalEvent("finish");
    };
    const parent: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      try {
        return yield ctx.callSubOrchestrator(child, undefined, { instanceId: "replaced-child" });
      } catch (error: any) {
        return `caught: ${error.message}`;
      }
    };

    worker.addOrchestrator(parent);
    worker.addOrchestrator(child);
    await worker.start();

    await client.scheduleNewOrchestration(parent, undefined, { instanceId: "current-parent" });
    await childStarted.promise;

    await client.scheduleNewOrchestration(child, undefined, {
      instanceId: "replaced-child",
      dedupeStatuses: [],
    });

    const state = await client.waitForOrchestrationCompletion("current-parent", true, 5);
    expect(JSON.parse(state?.serializedOutput ?? "")).toContain("Sub-orchestration failed");
  });

  it("removes child watchers owned by a replaced parent execution", async () => {
    const childStarted = deferred();
    const child: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      if (!ctx.isReplaying) {
        childStarted.resolve();
      }
      return yield ctx.waitForExternalEvent("finish");
    };
    const parent: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      if (input === "replacement") {
        return yield ctx.waitForExternalEvent("finish");
      }
      return yield ctx.callSubOrchestrator(child, undefined, { instanceId: "orphaned-child" });
    };

    worker.addOrchestrator(parent);
    worker.addOrchestrator(child);
    await worker.start();

    await client.scheduleNewOrchestration(parent, "original", { instanceId: "replaced-parent" });
    await childStarted.promise;

    const stateWaiters = (backend as any).stateWaiters as Map<string, any[]>;
    expect(stateWaiters.get("orphaned-child")).toHaveLength(1);

    await client.scheduleNewOrchestration(parent, "replacement", {
      instanceId: "replaced-parent",
      dedupeStatuses: [],
    });

    expect(stateWaiters.has("orphaned-child")).toBe(false);
  });
});
