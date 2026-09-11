// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { ExponentialBackoff, withTimeout } from "../src/utils/backoff.util";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => (resolve = complete));
  return { promise, resolve };
}

describe("Worker response retries over gRPC", () => {
  let server: grpc.Server;
  let worker: TaskHubGrpcWorker;
  let activity: jest.Mock;
  let logger: { error: jest.Mock; warn: jest.Mock; info: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    server = new grpc.Server();
    activity = jest.fn(() => 42);
    logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
  });

  afterEach(async () => {
    try {
      if (worker?.["_isRunning"]) await worker.stop();
    } finally {
      server.forceShutdown();
      jest.restoreAllMocks();
    }
  });

  async function start(completeActivityTask: stubs.ITaskHubSidecarServiceServer["completeActivityTask"]) {
    const firstStream = deferred<grpc.ServerWritableStream<pb.GetWorkItemsRequest, pb.WorkItem>>();
    server.addService(stubs.TaskHubSidecarServiceService, {
      hello: (_call: grpc.ServerUnaryCall<Empty, Empty>, callback: grpc.sendUnaryData<Empty>) =>
        callback(null, new Empty()),
      getWorkItems: (call: grpc.ServerWritableStream<pb.GetWorkItemsRequest, pb.WorkItem>) => {
        call.once("cancelled", () => call.end());
        call.write(new pb.WorkItem().setHealthping(new pb.HealthPing()));
        firstStream.resolve(call);
      },
      completeActivityTask,
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, boundPort) =>
        error ? reject(error) : resolve(boundPort),
      );
    });
    worker = new TaskHubGrpcWorker({
      hostAddress: `127.0.0.1:${port}`,
      logger,
      shutdownTimeoutMs: 100,
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
    });
    worker.addNamedActivity("answer", activity);
    await worker.start();
    return withTimeout(firstStream.promise, 5000);
  }

  function workItem() {
    return new pb.WorkItem()
      .setCompletiontoken("answer-token")
      .setActivityrequest(
        new pb.ActivityRequest()
          .setName("answer")
          .setTaskid(42)
          .setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("answer-instance")),
      );
  }

  it("resends a computed result after committed headers prevent a transport retry", async () => {
    const requests: pb.ActivityResponse[] = [];
    const finished = deferred();
    const stream = await start((call, callback) => {
      requests.push(call.request);
      call.sendMetadata(new grpc.Metadata());
      if (requests.length === 1) callback({ code: grpc.status.INTERNAL, message: "transient delivery failure" });
      else {
        callback(null, new pb.CompleteTaskResponse());
        finished.resolve();
      }
    });
    logger.error.mockImplementation(() => finished.resolve());
    const send = jest.spyOn(worker["_stub"]!, "completeActivityTask");
    stream.write(workItem());
    await withTimeout(finished.promise, 5000);
    await Promise.all(worker["_pendingWorkItems"]);

    expect(requests).toHaveLength(2);
    expect(requests[1].serializeBinary()).toEqual(requests[0].serializeBinary());
    expect(requests[1].getCompletiontoken()).toBe("answer-token");
    expect(requests[1].getResult()?.getValue()).toBe("42");
    expect(send).toHaveBeenCalledTimes(2);
    expect(activity).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each(["metadata", "RPC"] as const)("stop cancels the first response during %s", async (phase) => {
    const received = deferred();
    const cancelled = deferred();
    const metadataStarted = deferred();
    const metadata = deferred<grpc.Metadata>();
    const requests: pb.ActivityResponse[] = [];
    let finishResponse = () => {};
    const stream = await start((call, callback) => {
      requests.push(call.request);
      received.resolve();
      if (phase === "RPC") {
        finishResponse = () => callback(null, new pb.CompleteTaskResponse());
        call.once("cancelled", () => cancelled.resolve());
      } else callback(null, new pb.CompleteTaskResponse());
    });
    if (phase === "metadata") {
      worker["_metadataGenerator"] = () => {
        metadataStarted.resolve();
        return metadata.promise;
      };
    }
    const send = jest.spyOn(worker["_stub"]!, "completeActivityTask");
    let cancel: jest.SpyInstance | undefined;
    try {
      stream.write(workItem());
      await withTimeout(phase === "metadata" ? metadataStarted.promise : received.promise, 5000);
      if (phase === "RPC") {
        const call = send.mock.results[0].value as grpc.ClientUnaryCall;
        cancel = jest.spyOn(call, "cancel");
      }
      await worker.stop();
      if (phase === "RPC") expect(cancel).toHaveBeenCalledTimes(1);
    } finally {
      metadata.resolve(new grpc.Metadata());
      finishResponse();
    }
    await withTimeout(Promise.all(worker["_pendingWorkItems"]), 5000);
    if (phase === "RPC") {
      await withTimeout(cancelled.promise, 5000);
    }
    expect(send).toHaveBeenCalledTimes(phase === "RPC" ? 1 : 0);
    expect(requests).toHaveLength(phase === "RPC" ? 1 : 0);
    expect(activity).toHaveBeenCalledTimes(1);
    expect(worker["_pendingWorkItems"].size).toBe(0);
  });

  it("bounds SDK sends to ten without overriding configured transport retries", async () => {
    const wait = ExponentialBackoff.prototype.wait;
    jest.spyOn(ExponentialBackoff.prototype, "wait").mockImplementation(function (
      this: ExponentialBackoff,
      signal,
      onDelay,
    ) {
      // Keep real retry accounting but shorten response backoff for this transport test.
      if (this["_initialDelayMs"] === 200) this["_currentDelayMs"] = 1;
      return wait.call(this, signal, onDelay);
    });
    const attempts: grpc.MetadataValue[][] = [];
    const failed = deferred();
    logger.error.mockImplementation(() => failed.resolve());
    const stream = await start((call, callback) => {
      attempts.push(call.metadata.get("grpc-previous-rpc-attempts"));
      callback({ code: grpc.status.INTERNAL, message: "trailers-only failure" });
    });
    const send = jest.spyOn(worker["_stub"]!, "completeActivityTask");
    stream.write(workItem());
    await withTimeout(failed.promise, 5000);
    await Promise.all(worker["_pendingWorkItems"]);

    expect(send).toHaveBeenCalledTimes(10);
    expect(attempts).toEqual(Array.from({ length: 10 }, () => [[], ["1"], ["2"], ["3"], ["4"]]).flat());
    expect(activity).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
