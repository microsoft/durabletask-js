// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "events";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { NoOpLogger } from "../src/types/logger.type";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";

type Deferred = {
  promise: Promise<void>;
  resolve(): void;
};

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function unaryCall(): grpc.ClientUnaryCall {
  return Object.assign(new EventEmitter(), {
    cancel: jest.fn(),
    getPeer: () => "mock-peer",
    getAuthContext: () => null,
  }) as grpc.ClientUnaryCall;
}

function createStub(options?: { holdAbandons?: boolean; failAbandons?: boolean; failFirstCompletion?: boolean }): {
  stub: stubs.TaskHubSidecarServiceClient;
  completeActivityTask: jest.Mock;
  abandonActivity: jest.Mock;
  abandonOrchestrator: jest.Mock;
  abandonEntity: jest.Mock;
  abandonCallbacks: Array<(error: grpc.ServiceError | null, response: unknown) => void>;
} {
  const abandonCallbacks: Array<(error: grpc.ServiceError | null, response: unknown) => void> = [];
  let completionCount = 0;
  const completeActivityTask = jest.fn(
    (
      _request: pb.ActivityResponse,
      _metadata: grpc.Metadata,
      callback: (error: Error | null, response: unknown) => void,
    ) => {
      completionCount++;
      callback(options?.failFirstCompletion && completionCount === 1 ? new Error("completion failed") : null, {});
      return unaryCall();
    },
  );
  const createAbandon = () =>
    jest.fn(
      (
        _request: unknown,
        _metadata: grpc.Metadata,
        callback: (error: grpc.ServiceError | null, response: unknown) => void,
      ) => {
        if (options?.holdAbandons) {
          abandonCallbacks.push(callback);
        } else {
          callback(options?.failAbandons ? (new Error("abandon failed") as grpc.ServiceError) : null, {});
        }
        return unaryCall();
      },
    );
  const abandonActivity = createAbandon();
  const abandonOrchestrator = createAbandon();
  const abandonEntity = createAbandon();
  const stub = {
    completeActivityTask,
    abandonTaskActivityWorkItem: abandonActivity,
    abandonTaskOrchestratorWorkItem: abandonOrchestrator,
    abandonTaskEntityWorkItem: abandonEntity,
  } as unknown as stubs.TaskHubSidecarServiceClient;

  return {
    stub,
    completeActivityTask,
    abandonActivity,
    abandonOrchestrator,
    abandonEntity,
    abandonCallbacks,
  };
}

function activityWorkItem(taskId: number): pb.WorkItem {
  const instance = new pb.OrchestrationInstance();
  instance.setInstanceid(`instance-${taskId}`);
  const request = new pb.ActivityRequest();
  request.setName("activity");
  request.setTaskid(taskId);
  request.setOrchestrationinstance(instance);
  const workItem = new pb.WorkItem();
  workItem.setCompletiontoken(`activity-${taskId}`);
  workItem.setActivityrequest(request);
  return workItem;
}

function orchestrationWorkItem(index: number): pb.WorkItem {
  const request = new pb.OrchestratorRequest();
  request.setInstanceid(`orchestration-${index}`);
  const workItem = new pb.WorkItem();
  workItem.setCompletiontoken(`orchestration-${index}`);
  workItem.setOrchestratorrequest(request);
  return workItem;
}

function entityWorkItem(index: number, useV2: boolean): pb.WorkItem {
  const workItem = new pb.WorkItem();
  workItem.setCompletiontoken(`entity-${index}`);
  if (useV2) {
    const request = new pb.EntityRequest();
    request.setInstanceid(`@counter@${index}`);
    workItem.setEntityrequestv2(request);
  } else {
    const request = new pb.EntityBatchRequest();
    request.setInstanceid(`@counter@${index}`);
    workItem.setEntityrequest(request);
  }
  return workItem;
}

function dispatch(worker: TaskHubGrpcWorker, workItem: pb.WorkItem, stub: stubs.TaskHubSidecarServiceClient): void {
  (worker as any)._dispatchWorkItem(workItem, stub);
}

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await Promise.resolve();
}

async function waitFor(assertion: () => void): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await flush();
    }
  }
  throw lastError;
}

describe("TaskHubGrpcWorker local concurrency", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("enforces independent caps while entity V1 and V2 share one cap and work kinds overlap", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      concurrency: {
        maximumConcurrentActivityWorkItems: 2,
        maximumConcurrentOrchestrationWorkItems: 2,
        maximumConcurrentEntityWorkItems: 2,
      },
    });
    const { stub } = createStub();
    const gate = deferred();
    const active = { activity: 0, orchestration: 0, entity: 0 };
    const peak = { activity: 0, orchestration: 0, entity: 0 };
    let allKindsOverlapped = false;

    const execute = async (kind: keyof typeof active) => {
      active[kind]++;
      peak[kind] = Math.max(peak[kind], active[kind]);
      allKindsOverlapped ||= Object.values(active).every((count) => count > 0);
      try {
        await gate.promise;
      } finally {
        active[kind]--;
      }
    };
    const activity = jest
      .spyOn(worker as any, "_executeActivityInternal")
      .mockImplementation(() => execute("activity"));
    const orchestration = jest
      .spyOn(worker as any, "_executeOrchestratorInternal")
      .mockImplementation(() => execute("orchestration"));
    const entityV1 = jest.spyOn(worker as any, "_executeEntityInternal").mockImplementation(() => execute("entity"));
    const entityV2 = jest.spyOn(worker as any, "_executeEntityV2Internal").mockImplementation(() => execute("entity"));

    for (let index = 0; index < 4; index++) {
      dispatch(worker, activityWorkItem(index), stub);
      dispatch(worker, orchestrationWorkItem(index), stub);
      dispatch(worker, entityWorkItem(index, index % 2 === 1), stub);
    }
    await flush();

    expect(activity).toHaveBeenCalledTimes(2);
    expect(orchestration).toHaveBeenCalledTimes(2);
    expect(entityV1.mock.calls.length + entityV2.mock.calls.length).toBe(2);
    expect(peak).toEqual({ activity: 2, orchestration: 2, entity: 2 });
    expect(allKindsOverlapped).toBe(true);

    gate.resolve();
    await waitFor(() => {
      expect(activity).toHaveBeenCalledTimes(4);
      expect(orchestration).toHaveBeenCalledTimes(4);
      expect(entityV1.mock.calls.length + entityV2.mock.calls.length).toBe(4);
      expect((worker as any)._pendingWorkItems.size).toBe(0);
    });
    expect(peak).toEqual({ activity: 2, orchestration: 2, entity: 2 });
  });

  it("bounds a flooded kind to one running item and one waiting item", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      concurrency: { maximumConcurrentActivityWorkItems: 1 },
    });
    const { stub, abandonActivity } = createStub();
    const gate = deferred();
    const execute = jest.spyOn(worker as any, "_executeActivityInternal").mockImplementation(() => gate.promise);

    for (let index = 0; index < 10; index++) {
      dispatch(worker, activityWorkItem(index), stub);
    }
    await flush();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(abandonActivity).toHaveBeenCalledTimes(8);

    gate.resolve();
    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(2);
      expect((worker as any)._pendingWorkItems.size).toBe(0);
    });
  });

  it.each(["success", "async handler rejection", "synchronous handler throw", "completion failure"] as const)(
    "releases an activity permit after %s",
    async (outcome) => {
      const worker = new TaskHubGrpcWorker({
        logger: new NoOpLogger(),
        concurrency: { maximumConcurrentActivityWorkItems: 1 },
      });
      let calls = 0;
      worker.addNamedActivity("activity", () => {
        calls++;
        if (outcome === "async handler rejection" && calls === 1) {
          return Promise.reject(new Error("async handler failed"));
        }
        if (outcome === "synchronous handler throw" && calls === 1) {
          throw new Error("sync handler failed");
        }
        return "done";
      });
      const { stub, completeActivityTask } = createStub({
        failFirstCompletion: outcome === "completion failure",
      });

      dispatch(worker, activityWorkItem(1), stub);
      dispatch(worker, activityWorkItem(2), stub);

      await waitFor(() => {
        expect(calls).toBe(2);
        expect(completeActivityTask).toHaveBeenCalledTimes(2);
        expect((worker as any)._pendingWorkItems.size).toBe(0);
      });
    },
  );

  it("releases capacity when overflow abandonment fails", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      concurrency: { maximumConcurrentActivityWorkItems: 1 },
    });
    const { stub, abandonActivity } = createStub({ failAbandons: true });
    const gate = deferred();
    const execute = jest.spyOn(worker as any, "_executeActivityInternal").mockImplementation(() => gate.promise);

    dispatch(worker, activityWorkItem(1), stub);
    dispatch(worker, activityWorkItem(2), stub);
    dispatch(worker, activityWorkItem(3), stub);
    await flush();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(abandonActivity).toHaveBeenCalledTimes(1);

    gate.resolve();
    await waitFor(() => {
      expect(execute).toHaveBeenCalledTimes(2);
      expect((worker as any)._pendingWorkItems.size).toBe(0);
    });
  });

  it("does not execute or retain a disabled flooded kind while another kind progresses", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      concurrency: {
        maximumConcurrentActivityWorkItems: 0,
        maximumConcurrentOrchestrationWorkItems: 1,
      },
    });
    const { stub, abandonActivity, abandonCallbacks } = createStub({ holdAbandons: true });
    const activity = jest.spyOn(worker as any, "_executeActivityInternal").mockResolvedValue(undefined);
    const orchestration = jest.spyOn(worker as any, "_executeOrchestratorInternal").mockResolvedValue(undefined);

    for (let index = 0; index < 1_000; index++) {
      dispatch(worker, activityWorkItem(index), stub);
    }
    dispatch(worker, orchestrationWorkItem(1), stub);
    await flush();

    expect(activity).not.toHaveBeenCalled();
    expect(orchestration).toHaveBeenCalledTimes(1);
    expect(abandonActivity.mock.calls.length).toBeGreaterThan(0);
    expect(abandonActivity.mock.calls.length).toBeLessThan(1_000);
    expect((worker as any)._pendingWorkItems.size).toBe(abandonCallbacks.length);

    for (const callback of abandonCallbacks) {
      callback(null, {});
    }
    await waitFor(() => expect((worker as any)._pendingWorkItems.size).toBe(0));
  });

  it("uses each type-specific abandon RPC for unexpected disabled work", async () => {
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
      concurrency: {
        maximumConcurrentActivityWorkItems: 0,
        maximumConcurrentOrchestrationWorkItems: 0,
        maximumConcurrentEntityWorkItems: 0,
      },
    });
    const { stub, abandonActivity, abandonOrchestrator, abandonEntity } = createStub();

    dispatch(worker, activityWorkItem(1), stub);
    dispatch(worker, orchestrationWorkItem(1), stub);
    dispatch(worker, entityWorkItem(1, false), stub);
    dispatch(worker, entityWorkItem(2, true), stub);

    await waitFor(() => expect((worker as any)._pendingWorkItems.size).toBe(0));
    expect(abandonActivity).toHaveBeenCalledTimes(1);
    expect(abandonOrchestrator).toHaveBeenCalledTimes(1);
    expect(abandonEntity).toHaveBeenCalledTimes(2);
    expect(abandonActivity.mock.calls[0][0].getCompletiontoken()).toBe("activity-1");
    expect(abandonOrchestrator.mock.calls[0][0].getCompletiontoken()).toBe("orchestration-1");
    expect(abandonEntity.mock.calls.map(([request]) => request.getCompletiontoken())).toEqual(["entity-1", "entity-2"]);
  });
});
