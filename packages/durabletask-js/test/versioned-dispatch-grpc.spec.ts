// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { NoOpLogger, TaskHubGrpcWorker, VersionMatchStrategy, VersionFailureStrategy, VersioningOptions } from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import * as ph from "../src/utils/pb-helper.util";
import { withTimeout } from "../src/utils/backoff.util";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => (resolve = complete));
  return { promise, resolve };
}

type Response = pb.OrchestratorResponse | pb.ActivityResponse | "abandoned";

describe("Version dispatch over local gRPC", () => {
  let server: grpc.Server;
  let worker: TaskHubGrpcWorker;
  const responses = new Map<string, ReturnType<typeof deferred<Response>>>();
  let nextToken = 0;

  beforeEach(() => {
    server = new grpc.Server();
    responses.clear();
  });

  afterEach(async () => {
    try {
      if (worker?.["_isRunning"]) await worker.stop();
    } finally {
      server.forceShutdown();
    }
  });

  async function start(register: (worker: TaskHubGrpcWorker) => void, versioning?: VersioningOptions) {
    const connected = deferred<grpc.ServerWritableStream<pb.GetWorkItemsRequest, pb.WorkItem>>();
    const service = {
      hello: (_call, callback) => callback(null, new Empty()),
      getWorkItems: (call) => {
        call.once("cancelled", () => call.end());
        call.write(new pb.WorkItem().setHealthping(new pb.HealthPing()));
        connected.resolve(call);
      },
      completeOrchestratorTask: (call, callback) => {
        responses.get(call.request.getCompletiontoken())!.resolve(call.request);
        callback(null, new pb.CompleteTaskResponse());
      },
      completeActivityTask: (call, callback) => {
        responses.get(call.request.getCompletiontoken())!.resolve(call.request);
        callback(null, new pb.CompleteTaskResponse());
      },
      abandonTaskOrchestratorWorkItem: (call, callback) => {
        responses.get(call.request.getCompletiontoken())!.resolve("abandoned");
        callback(null, new pb.AbandonOrchestrationTaskResponse());
      },
      abandonTaskActivityWorkItem: (call, callback) => {
        responses.get(call.request.getCompletiontoken())!.resolve("abandoned");
        callback(null, new pb.AbandonActivityTaskResponse());
      },
    } satisfies Partial<stubs.ITaskHubSidecarServiceServer>;
    server.addService(stubs.TaskHubSidecarServiceService, service);
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, boundPort) =>
        error ? reject(error) : resolve(boundPort),
      );
    });
    worker = new TaskHubGrpcWorker({
      hostAddress: `127.0.0.1:${port}`,
      logger: new NoOpLogger(),
      shutdownTimeoutMs: 500,
      versioning,
      workItemFilters: "auto",
    });
    register(worker);
    await worker.start();
    return withTimeout(connected.promise, 5000);
  }

  async function send(
    stream: grpc.ServerWritableStream<pb.GetWorkItemsRequest, pb.WorkItem>,
    kind: "orchestrator" | "activity",
    name: string,
    version?: string,
  ): Promise<Response> {
    const token = `token-${++nextToken}`;
    const response = deferred<Response>();
    responses.set(token, response);
    const item = new pb.WorkItem().setCompletiontoken(token);
    if (kind === "activity") {
      item.setActivityrequest(
        new pb.ActivityRequest()
          .setName(name)
          .setTaskid(1)
          .setVersion(version === undefined ? undefined : ph.getStringValue(version))
          .setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("instance")),
      );
    } else {
      item.setOrchestratorrequest(
        new pb.OrchestratorRequest()
          .setInstanceid("instance")
          .setNeweventsList([
            ph.newOrchestratorStartedEvent(new Date("2026-01-01T00:00:00Z")),
            ph.newExecutionStartedEvent(name, "instance", undefined, undefined, undefined, version),
          ]),
      );
    }
    stream.write(item);
    return withTimeout(response.promise, 5000);
  }

  function completion(response: Response) {
    if (response === "abandoned") throw new Error("Unexpected abandon");
    if (response instanceof pb.ActivityResponse) {
      return { result: response.getResult()?.getValue(), failure: response.getFailuredetails() };
    }
    const action = response.getActionsList()[0].getCompleteorchestration();
    return { result: action?.getResult()?.getValue(), failure: action?.getFailuredetails() };
  }

  it("dispatches same-name versions, legacy fallback, and unknown versions without cross-version execution", async () => {
    const calls: string[] = [];
    const stream = await start((worker) => {
      for (const version of ["", "v1", "v2"]) {
        worker.addNamedOrchestrator(
          "Work",
          () => {
            calls.push(`orch-${version}`);
            return version;
          },
          version,
        );
        worker.addNamedActivity(
          "Work",
          () => {
            calls.push(`act-${version}`);
            return version;
          },
          version,
        );
      }
      worker.addNamedOrchestrator("Legacy", () => "legacy");
      worker.addNamedActivity("Legacy", () => "legacy");
    });
    const filters = stream.request.getWorkitemfilters()!;
    expect(filters.getOrchestrationsList().map((f) => [f.getName(), f.getVersionsList()])).toEqual([
      ["Work", ["", "v1", "v2"]],
      ["Legacy", []],
    ]);
    expect(filters.getActivitiesList().map((f) => [f.getName(), f.getVersionsList()])).toEqual([
      ["Work", ["", "v1", "v2"]],
      ["Legacy", []],
    ]);
    for (const kind of ["orchestrator", "activity"] as const) {
      for (const version of ["", "v1", "v2"]) {
        expect(completion(await send(stream, kind, "Work", version)).result).toBe(JSON.stringify(version));
      }
      expect(completion(await send(stream, kind, "Legacy", "unknown")).result).toBe('"legacy"');
      const failure = completion(await send(stream, kind, "Work", "unknown")).failure;
      expect(failure?.getErrortype()).toBe(
        kind === "activity" ? "ActivityNotRegisteredError" : "OrchestratorNotRegisteredError",
      );
      expect(failure?.getErrormessage()).toContain("unknown");
      expect(failure?.getIsnonretriable()).toBe(true);
    }
    expect(calls).toEqual(["orch-", "orch-v1", "orch-v2", "act-", "act-v1", "act-v2"]);
    expect(() => worker.addNamedOrchestrator("Late", () => 1, "v1")).toThrow(/running/);
    expect(() => worker.addNamedActivity("Late", () => 1, "v1")).toThrow(/running/);
  });

  it.each([VersionFailureStrategy.Fail, VersionFailureStrategy.Reject])(
    "enforces worker acceptance before either exact or fallback dispatch with failure strategy %s",
    async (failureStrategy) => {
      const wrong = jest.fn(() => "wrong");
      const stream = await start(
        (worker) => {
          worker.addNamedOrchestrator("Exact", wrong, "v2");
          worker.addNamedActivity("Exact", wrong, "v2");
          worker.addNamedOrchestrator("Legacy", wrong);
          worker.addNamedActivity("Legacy", wrong);
        },
        { version: "v1", matchStrategy: VersionMatchStrategy.Strict, failureStrategy },
      );
      for (const kind of ["orchestrator", "activity"] as const) {
        for (const name of ["Exact", "Legacy"]) {
          const response = await send(stream, kind, name, "v2");
          if (failureStrategy === VersionFailureStrategy.Reject) expect(response).toBe("abandoned");
          else {
            const failure = completion(response).failure;
            expect(failure?.getErrortype()).toBe("VersionMismatch");
            expect(failure?.getIsnonretriable()).toBe(true);
          }
        }
      }
      expect(wrong).not.toHaveBeenCalled();
    },
  );

  it("treats Strict with an omitted worker version as unversioned, not as no filtering", async () => {
    const stream = await start(
      (worker) => {
        worker.addNamedOrchestrator("Work", () => "legacy");
        worker.addNamedActivity("Work", () => "legacy");
      },
      { matchStrategy: VersionMatchStrategy.Strict, failureStrategy: VersionFailureStrategy.Fail },
    );
    expect(stream.request.getWorkitemfilters()?.getActivitiesList()[0].getVersionsList()).toEqual([""]);
    for (const kind of ["orchestrator", "activity"] as const) {
      expect(completion(await send(stream, kind, "Work")).result).toBe('"legacy"');
      expect(completion(await send(stream, kind, "Work", "v1")).failure?.getErrortype()).toBe("VersionMismatch");
    }
  });

  it("keeps CurrentOrOlder acceptance independent of local implementation identity", async () => {
    const stream = await start(
      (worker) => {
        for (const version of ["1", "2"]) {
          worker.addNamedOrchestrator("Work", () => version, version);
          worker.addNamedActivity("Work", () => version, version);
        }
      },
      {
        version: "2",
        matchStrategy: VersionMatchStrategy.CurrentOrOlder,
        failureStrategy: VersionFailureStrategy.Fail,
      },
    );
    for (const kind of ["orchestrator", "activity"] as const) {
      expect(completion(await send(stream, kind, "Work", "1")).result).toBe('"1"');
      expect(completion(await send(stream, kind, "Work", "1.0")).failure?.getErrortype()).toBe(
        kind === "activity" ? "ActivityNotRegisteredError" : "OrchestratorNotRegisteredError",
      );
      expect(completion(await send(stream, kind, "Work", "3")).failure?.getErrortype()).toBe("VersionMismatch");
    }
  });
});
