// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { Value } from "google-protobuf/google/protobuf/struct_pb";
import { NoOpLogger, RetryPolicy, TaskFailedError, TaskHubGrpcClient, TaskHubGrpcWorker } from "../src";
import type { TaskFailureDetails } from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { withTimeout } from "../src/utils/backoff.util";
import {
  newExecutionStartedEvent,
  newOrchestratorStartedEvent,
  newTaskFailedEvent,
  newTaskScheduledEvent,
} from "../src/utils/pb-helper.util";

it.each(["uncaught", "handler", "policy"] as const)(
  "forwards received wire properties through %s orchestration failure and all client projections",
  async (mode) => {
    // Simulate a foreign worker's failure; no .NET worker or cloud backend runs in this fixture.
    const incoming = new pb.TaskFailureDetails().setErrortype("PaymentFailed").setErrormessage("Declined");
    incoming.getPropertiesMap().set("code", Value.fromJavaScript("CardDeclined"));
    incoming
      .getPropertiesMap()
      .set("context", Value.fromJavaScript({ attempts: 0, retryable: false, tags: ["", null] }));
    const inner = new pb.TaskFailureDetails().setErrortype("GatewayError").setErrormessage("Rejected");
    inner.getPropertiesMap().set("status", Value.fromJavaScript(402));
    incoming.setInnerfailure(inner);
    const expected = {
      errorType: "PaymentFailed",
      message: "Declined",
      properties: { code: "CardDeclined", context: { attempts: 0, retryable: false, tags: ["", null] } },
      innerFailure: { errorType: "GatewayError", message: "Rejected", properties: { status: 402 } },
    };
    const server = new grpc.Server();
    const state = new pb.OrchestrationState().setInstanceid("order").setName("order");
    const response = new pb.GetInstanceResponse().setExists(true).setOrchestrationstate(state);
    const get: grpc.handleUnaryCall<pb.GetInstanceRequest, pb.GetInstanceResponse> = (_call, callback) =>
      callback(null, response);
    let completed!: () => void;
    const completion = new Promise<void>((resolve) => (completed = resolve));
    const failedEvent = newTaskFailedEvent(1, new Error("unused"), incoming);
    server.addService(stubs.TaskHubSidecarServiceService, {
      hello: (_call, callback) => callback(null, new Empty()),
      getWorkItems: (call) => {
        call.once("cancelled", () => call.end());
        call.write(
          new pb.WorkItem().setCompletiontoken("order").setOrchestratorrequest(
            new pb.OrchestratorRequest()
              .setInstanceid("order")
              .setPasteventsList([
                newOrchestratorStartedEvent(),
                newExecutionStartedEvent("order", "order"),
                newTaskScheduledEvent(1, "pay"),
              ])
              .setNeweventsList([newOrchestratorStartedEvent(), failedEvent]),
          ),
        );
      },
      completeOrchestratorTask: (call, callback) => {
        const action = call.request
          .getActionsList()
          .find((item) => item.hasCompleteorchestration())
          ?.getCompleteorchestration();
        state.setFailuredetails(action?.getFailuredetails());
        if (action) state.setOrchestrationstatus(action.getOrchestrationstatus());
        callback(null, new pb.CompleteTaskResponse());
        completed();
      },
      getInstance: get,
      waitForInstanceStart: get,
      waitForInstanceCompletion: get,
      queryInstances: (_call, callback) =>
        callback(null, new pb.QueryInstancesResponse().setOrchestrationstateList([state])),
      streamInstanceHistory: (call) => {
        call.write(new pb.HistoryChunk().setEventsList([failedEvent]));
        call.end();
      },
    } satisfies Partial<stubs.ITaskHubSidecarServiceServer>);
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, boundPort) =>
        error ? reject(error) : resolve(boundPort),
      );
    });
    const options = { hostAddress: `127.0.0.1:${port}`, logger: new NoOpLogger() };
    const worker = new TaskHubGrpcWorker({ ...options, shutdownTimeoutMs: 500 });
    const client = new TaskHubGrpcClient(options);
    const inspected: TaskFailureDetails[] = [];
    const caught: TaskFailureDetails[] = [];
    const inspect = (failure: TaskFailureDetails) => {
      inspected.push(failure);
      return false;
    };
    worker.addNamedOrchestrator("order", async function* (ctx) {
      const retry =
        mode === "policy"
          ? new RetryPolicy({ maxNumberOfAttempts: 3, firstRetryIntervalInMilliseconds: 1, handleFailure: inspect })
          : mode === "handler"
            ? (context: { lastFailure: TaskFailureDetails }) => inspect(context.lastFailure)
            : undefined;
      if (mode === "uncaught") {
        yield ctx.callActivity("pay");
      } else {
        try {
          yield ctx.callActivity("pay", undefined, { retry });
        } catch (error) {
          if (!(error instanceof TaskFailedError)) throw error;
          caught.push(error.details);
          throw error;
        }
      }
    });
    await worker.start();
    try {
      await withTimeout(completion, 5000);
      if (mode !== "uncaught") {
        expect(inspected).toHaveLength(1);
        expect(inspected[0]).toMatchObject(expected);
        expect(caught).toHaveLength(1);
        expect(caught[0]).toMatchObject(expected);
      }
      const terminal = { errorType: "TaskFailedError", innerFailure: expected };
      expect(state.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      for (const method of [
        "getOrchestrationState",
        "waitForOrchestrationStart",
        "waitForOrchestrationCompletion",
      ] as const) {
        expect((await client[method]("order", false))?.failureDetails).toMatchObject(terminal);
      }
      const states = [];
      for await (const instance of client.getAllInstances()) states.push(instance);
      expect(states).toHaveLength(1);
      expect(states[0].failureDetails).toMatchObject(terminal);
      expect(await client.getOrchestrationHistory("order")).toMatchObject([{ failureDetails: expected }]);
    } finally {
      await client.stop();
      await worker.stop();
      server.forceShutdown();
    }
  },
);

it("preserves serialized worker failures through gRPC client get, waits, query and history", async () => {
  const server = new grpc.Server();
  const state = new pb.OrchestrationState()
    .setInstanceid("order")
    .setName("order")
    .setOrchestrationstatus(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
  const response = new pb.GetInstanceResponse().setExists(true).setOrchestrationstate(state);
  const get: grpc.handleUnaryCall<pb.GetInstanceRequest, pb.GetInstanceResponse> = (_call, callback) =>
    callback(null, response);
  let completed!: () => void;
  const activityCompleted = new Promise<void>((resolve) => (completed = resolve));
  server.addService(stubs.TaskHubSidecarServiceService, {
    hello: (_call, callback) => callback(null, new Empty()),
    getWorkItems: (call) => {
      call.once("cancelled", () => call.end());
      call.write(
        new pb.WorkItem()
          .setCompletiontoken("activity")
          .setActivityrequest(
            new pb.ActivityRequest()
              .setName("fail")
              .setTaskid(1)
              .setOrchestrationinstance(new pb.OrchestrationInstance().setInstanceid("order")),
          ),
      );
    },
    completeActivityTask: (call, callback) => {
      state.setFailuredetails(call.request.getFailuredetails());
      callback(null, new pb.CompleteTaskResponse());
      completed();
    },
    getInstance: get,
    waitForInstanceStart: get,
    waitForInstanceCompletion: get,
    queryInstances: (_call, callback) =>
      callback(null, new pb.QueryInstancesResponse().setOrchestrationstateList([state])),
    streamInstanceHistory: (call) => {
      call.write(
        new pb.HistoryChunk().setEventsList([
          new pb.HistoryEvent().setTaskfailed(
            new pb.TaskFailedEvent().setTaskscheduledid(1).setFailuredetails(state.getFailuredetails()),
          ),
        ]),
      );
      call.end();
    },
  } satisfies Partial<stubs.ITaskHubSidecarServiceServer>);
  const port = await new Promise<number>((resolve, reject) => {
    server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, boundPort) =>
      error ? reject(error) : resolve(boundPort),
    );
  });
  const options = { hostAddress: `127.0.0.1:${port}`, logger: new NoOpLogger() };
  const worker = new TaskHubGrpcWorker({ ...options, shutdownTimeoutMs: 500 });
  const client = new TaskHubGrpcClient(options);
  worker.addNamedActivity("fail", () => {
    throw new Error("Order failed", { cause: new TypeError("Payment failed", { cause: new RangeError("Timeout") }) });
  });
  await worker.start();
  try {
    await withTimeout(activityCompleted, 5000);
    const expected = {
      errorType: "Error",
      message: "Order failed",
      innerFailure: {
        errorType: "TypeError",
        message: "Payment failed",
        innerFailure: { errorType: "RangeError", message: "Timeout", innerFailure: undefined },
      },
    };
    for (const method of [
      "getOrchestrationState",
      "waitForOrchestrationStart",
      "waitForOrchestrationCompletion",
    ] as const) {
      expect((await client[method]("order", false))?.failureDetails).toMatchObject(expected);
    }
    const states = [];
    for await (const instance of client.getAllInstances()) states.push(instance);
    expect(states).toHaveLength(1);
    expect(states[0].failureDetails).toMatchObject(expected);
    expect(await client.getOrchestrationHistory("order")).toMatchObject([{ failureDetails: expected }]);
  } finally {
    await client.stop();
    await worker.stop();
    server.forceShutdown();
  }
});
