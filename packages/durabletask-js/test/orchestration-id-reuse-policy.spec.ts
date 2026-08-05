// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import {
  InMemoryOrchestrationBackend,
  OrchestrationContext,
  OrchestrationIdReusePolicy,
  OrchestrationStatus,
  TaskHubGrpcClient,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  TOrchestrator,
} from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";

function mockStartInstance(
  client: TaskHubGrpcClient,
  captureRequest: (request: pb.CreateInstanceRequest) => void,
): void {
  const stub = (client as unknown as { _stub: Record<string, unknown> })._stub;
  stub.startInstance = (
    request: pb.CreateInstanceRequest,
    _metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: pb.CreateInstanceResponse) => void,
  ) => {
    captureRequest(request);
    const response = new pb.CreateInstanceResponse();
    response.setInstanceid(request.getInstanceid());
    callback(null, response);
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
    const reusePolicy: OrchestrationIdReusePolicy = {
      dedupeStatuses: [OrchestrationStatus.COMPLETED, OrchestrationStatus.FAILED],
    };

    await client.scheduleNewOrchestration("workflow", undefined, {
      instanceId: "instance-1",
      orchestrationIdReusePolicy: reusePolicy,
    });

    expect(request?.getOrchestrationidreusepolicy()?.getReplaceablestatusList()).toEqual([
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING,
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
      orchestrationIdReusePolicy: { dedupeStatuses: [] },
    });

    expect(request?.getOrchestrationidreusepolicy()?.getReplaceablestatusList()).toEqual([
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED,
    ]);
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

  it("preserves the default duplicate-ID error behavior", async () => {
    await client.scheduleNewOrchestration(waitingOrchestrator, "original", {
      instanceId: "instance-1",
    });

    await expect(
      client.scheduleNewOrchestration(waitingOrchestrator, "replacement", {
        instanceId: "instance-1",
      }),
    ).rejects.toThrow("already exists");
  });

  it("rejects reuse when the existing runtime status is selected for deduplication", async () => {
    await client.scheduleNewOrchestration(waitingOrchestrator, "original", {
      instanceId: "instance-1",
    });
    await client.waitForOrchestrationStart("instance-1", false, 5);

    await expect(
      client.scheduleNewOrchestration(waitingOrchestrator, "replacement", {
        instanceId: "instance-1",
        orchestrationIdReusePolicy: {
          dedupeStatuses: [OrchestrationStatus.RUNNING],
        },
      }),
    ).rejects.toThrow("already exists");
  });

  it("atomically replaces an existing instance whose runtime status is reusable", async () => {
    await client.scheduleNewOrchestration(waitingOrchestrator, "original", {
      instanceId: "instance-1",
    });
    await client.waitForOrchestrationStart("instance-1", false, 5);
    const originalExecutionId = backend.getInstance("instance-1")?.executionId;

    await client.scheduleNewOrchestration(waitingOrchestrator, "replacement", {
      instanceId: "instance-1",
      orchestrationIdReusePolicy: {
        dedupeStatuses: [
          OrchestrationStatus.COMPLETED,
          OrchestrationStatus.FAILED,
          OrchestrationStatus.TERMINATED,
          OrchestrationStatus.PENDING,
          OrchestrationStatus.SUSPENDED,
        ],
      },
    });

    const replacement = backend.getInstance("instance-1");
    expect(replacement?.executionId).not.toBe(originalExecutionId);
    expect(replacement?.input).toBe(JSON.stringify("replacement"));
    expect(replacement?.status).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING);
  });

  it("rejects waiters that were registered for the replaced execution", async () => {
    await client.scheduleNewOrchestration(waitingOrchestrator, "original", {
      instanceId: "instance-1",
    });
    await client.waitForOrchestrationStart("instance-1", false, 5);
    const originalCompletion = client.waitForOrchestrationCompletion("instance-1", true, 5);
    const originalCompletionAssertion = expect(originalCompletion).rejects.toThrow("was replaced by a new execution");

    await client.scheduleNewOrchestration(waitingOrchestrator, "replacement", {
      instanceId: "instance-1",
      orchestrationIdReusePolicy: { dedupeStatuses: [] },
    });

    await originalCompletionAssertion;
  });

  it("maps the canceled protobuf status to the public canceled status", () => {
    expect(backend.toClientStatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED)).toBe(
      OrchestrationStatus.CANCELED,
    );
  });
});
