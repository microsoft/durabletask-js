// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createServer, IncomingHttpHeaders, Server } from "node:http";
import { AddressInfo } from "node:net";
import {
  InMemoryOrchestrationBackend,
  NoOpLogger,
  OrchestrationStatus,
  Task,
  TaskFailedError,
  TestOrchestrationClient,
  TestOrchestrationWorker,
} from "@microsoft/durabletask-js";
import * as pb from "../../../durabletask-js/src/proto/orchestrator_service_pb";
import * as ph from "../../../durabletask-js/src/utils/pb-helper.util";
import {
  BUILTIN_HTTP_ACTIVITY_NAME,
  BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME,
  builtinHttpActivity,
  builtinHttpPollOrchestrator,
} from "../../src/http/builtin";
import { DurableHttpRequestPayload, HttpRetryOptions } from "../../src/http/models";
import { ClassicOrchestrationContext, wrapOrchestrator } from "../../src/orchestration-context";
import { DurableFunctionsWorker } from "../../src/worker";

const START = new Date("2026-01-01T00:00:00Z");

// The real Functions worker replays protobuf history; only timer delivery is accelerated.
async function runHttp(request: DurableHttpRequestPayload, activityDurationMs = 0) {
  const worker = new DurableFunctionsWorker({ logger: new NoOpLogger() });
  worker.addNamedOrchestrator(BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME, builtinHttpPollOrchestrator);
  const history: pb.HistoryEvent[] = [];
  const requests: DurableHttpRequestPayload[] = [];
  const delays: number[] = [];
  let now = START;
  let events = [
    ph.newOrchestratorStartedEvent(now),
    ph.newExecutionStartedEvent(BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME, "http", JSON.stringify(request), {
      name: "parent",
      instanceId: "parent",
      taskScheduledId: 1,
    }),
  ];
  const replay = async () => {
    const input = new pb.OrchestratorRequest()
      .setInstanceid("http")
      .setPasteventsList(history)
      .setNeweventsList(events);
    const output = await worker.handleOrchestratorRequest(Buffer.from(input.serializeBinary()).toString("base64"));
    return pb.OrchestratorResponse.deserializeBinary(Buffer.from(output, "base64")).getActionsList();
  };
  for (let turn = 0; turn < 40; turn++) {
    const replays: pb.OrchestratorAction[][] = [];
    for (let pass = 0; pass < 2; pass++) replays.push(await replay());
    const actions = replays[0];
    // Reprocessing the same history must emit identical actions, without doing network I/O.
    expect(replays[1].map((a) => a.toObject())).toEqual(actions.map((a) => a.toObject()));
    expect(actions).toHaveLength(1);
    history.push(...events);
    const action = actions[0];
    const completed = action.getCompleteorchestration();
    if (completed) {
      return { completed, requests, delays, history };
    }
    const scheduled = action.getScheduletask();
    if (scheduled) {
      expect(scheduled.getName()).toBe(BUILTIN_HTTP_ACTIVITY_NAME);
      const input: DurableHttpRequestPayload = JSON.parse(scheduled.getInput()!.getValue());
      requests.push(input);
      history.push(ph.newTaskScheduledEvent(action.getId(), scheduled.getName(), scheduled.getInput()!.getValue()));
      now = new Date(now.getTime() + activityDurationMs);
      let result: pb.HistoryEvent;
      try {
        result = ph.newTaskCompletedEvent(action.getId(), JSON.stringify(await builtinHttpActivity(input)));
      } catch (error) {
        result = ph.newTaskFailedEvent(action.getId(), error instanceof Error ? error : new Error(String(error)));
      }
      events = [ph.newOrchestratorStartedEvent(now), result];
    } else {
      const fireAt = action.getCreatetimer()!.getFireat()!.toDate();
      delays.push(fireAt.getTime() - now.getTime());
      history.push(ph.newTimerCreatedEvent(action.getId(), fireAt));
      now = fireAt;
      events = [ph.newOrchestratorStartedEvent(now), ph.newTimerFiredEvent(action.getId(), now)];
    }
  }
  throw new Error("HTTP test exceeded its bounded replay turns.");
}

describe("durable HTTP failure retries", () => {
  let server: Server;
  let uri: string;
  let responses: (number | "disconnect")[];
  let received: { method?: string; url?: string; headers: IncomingHttpHeaders; body: string }[];

  beforeEach(async () => {
    received = [];
    responses = [200];
    server = createServer((req, res) => {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk: string) => (body += chunk));
      req.on("end", () => {
        received.push({ method: req.method, url: req.url, headers: req.headers, body });
        const status = responses.shift() ?? 200;
        if (status === "disconnect") {
          req.socket.destroy();
          return;
        }
        res.writeHead(status, status === 202 ? { Location: "/status", "Retry-After": "2" } : {});
        res.end(`response ${status}`);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    uri = `http://127.0.0.1:${(server.address() as AddressInfo).port}/start`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  function request(codes?: number[], attempts = 3) {
    return {
      method: "POST",
      uri,
      content: "original body",
      retryOptions: Object.assign(new HttpRetryOptions(1000, attempts), { statusCodesToRetry: codes }),
    };
  }

  it.each([429, 503])(
    "retries configured %s then returns success, without duplicate requests on replay",
    async (code) => {
      responses = [code, 200];
      const { completed, requests, delays, history } = await runHttp(request([code]));
      expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(200);
      expect(received).toHaveLength(2);
      expect(received.map((r) => [r.method, r.body])).toEqual([
        ["POST", "original body"],
        ["POST", "original body"],
      ]);
      expect(requests[1]).toEqual(requests[0]);
      expect(delays).toEqual([1000]);
      expect(history.filter((e) => e.hasTaskfailed())).toHaveLength(1);
    },
  );

  it("fails with the last status when the total attempt budget is exhausted", async () => {
    responses = [503, 503, 503, 200];
    const { completed, delays } = await runHttp(request([503]));
    expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completed.getFailuredetails()?.getErrormessage()).toContain("503");
    expect(received).toHaveLength(3);
    expect(delays).toEqual([1000, 1000]);
  });

  it("does not retry when maxNumberOfAttempts is one", async () => {
    responses = [503, 200];
    const { completed, delays } = await runHttp(request([503], 1));
    expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(received).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it.each([undefined, []])("defaults an omitted/empty status list (%j) to non-success responses", async (codes) => {
    responses = [400, 500, 200];
    const { completed, delays } = await runHttp(request(codes));
    expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(200);
    expect(received).toHaveLength(3);
    expect(delays).toEqual([1000, 1000]);
  });

  it("also retries an unfollowed redirect with the default status list, like .NET EnsureSuccessStatusCode", async () => {
    responses = [302, 200];
    const { completed, delays } = await runHttp(request());
    expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(200);
    expect(received).toHaveLength(2);
    expect(delays).toEqual([1000]);
  });

  it("returns an excluded error response without retrying or failing", async () => {
    responses = [400];
    const { completed, delays } = await runHttp(request([429, 503]));
    expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(400);
    expect(received).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it("preserves error responses when the policy is omitted", async () => {
    responses = [503];
    const { completed, delays } = await runHttp({ method: "GET", uri });
    expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(503);
    expect(received).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it("retries a transport failure using the same durable activity policy", async () => {
    responses = ["disconnect", 200];
    const { completed, delays } = await runHttp(request([503]));
    expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(200);
    expect(received).toHaveLength(2);
    expect(delays).toEqual([1000]);
  });

  it("preserves transport failure without retries when the policy is omitted", async () => {
    responses = ["disconnect", 200];
    const { completed, delays } = await runHttp({ method: "POST", uri });
    expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(received).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it("uses exponential backoff capped by the maximum interval", async () => {
    responses = [503, 503, 503, 200];
    const input = request([503], 4);
    input.retryOptions.backoffCoefficient = 3;
    input.retryOptions.maxRetryIntervalInMilliseconds = 2000;
    const { completed, delays } = await runHttp(input);
    expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(200);
    expect(delays).toEqual([1000, 2000, 2000]);
  });

  it.each([
    [0, 2],
    [1, 1],
    [1000, 1],
  ])("enforces the retry timeout with %s ms spent in each activity (%s attempts)", async (duration, attempts) => {
    responses = [503, 503, 503];
    const input = request([503]);
    input.retryOptions.retryTimeoutInMilliseconds = 1000;
    const { completed, delays } = await runHttp(input, duration);
    expect(completed.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(received).toHaveLength(attempts);
    expect(delays).toEqual(attempts === 2 ? [1000] : []);
  });

  it("keeps 202 polling separate: retries the initial request but not a failed Location poll", async () => {
    responses = [503, 202, 503, 200];
    const input = { ...request([503]), headers: { Authorization: "test-token", "x-functions-key": "test-key" } };
    const { completed, requests, delays } = await runHttp(input);
    expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(503);
    expect(received.map((r) => [r.method, r.url])).toEqual([
      ["POST", "/start"],
      ["POST", "/start"],
      ["GET", "/status"],
    ]);
    expect(requests[2]).not.toHaveProperty("retryOptions");
    expect(received[2].headers.authorization).toBe("test-token");
    expect(received[2].headers["x-functions-key"]).toBeUndefined();
    expect(delays).toEqual([1000, 2000]);
  });

  it("treats an explicitly listed 202 as a failure rather than entering the polling loop", async () => {
    responses = [202, 200];
    const { completed, delays } = await runHttp(request([202]));
    expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(200);
    expect(received.map((r) => r.url)).toEqual(["/start", "/start"]);
    expect(delays).toEqual([1000]);
  });

  it("allows default-policy 202 polling to complete normally", async () => {
    responses = [202, 200];
    const { completed, delays } = await runHttp(request());
    expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(200);
    expect(received.map((r) => r.url)).toEqual(["/start", "/status"]);
    expect(delays).toEqual([2000]);
  });

  it("splits the default six-day HTTP retry cap into durable three-day timer segments", async () => {
    responses = [503, 503, 200];
    const input = request([503]);
    input.retryOptions = Object.assign(new HttpRetryOptions(2 * 24 * 60 * 60 * 1000, 3), {
      backoffCoefficient: 4,
      statusCodesToRetry: [503],
    });
    const { completed, delays } = await runHttp(input);
    expect(JSON.parse(completed.getResult()!.getValue()).statusCode).toBe(200);
    expect(delays).toEqual([2, 3, 3].map((days) => days * 24 * 60 * 60 * 1000));
  });

  it.each([false, true])("runs classic callHttp through the in-memory backend (exhausted: %s)", async (exhausted) => {
    responses = exhausted ? [503, 503] : [503, 200];
    const backend = new InMemoryOrchestrationBackend();
    const worker = new TestOrchestrationWorker(backend);
    const client = new TestOrchestrationClient(backend);
    worker.addNamedActivity(BUILTIN_HTTP_ACTIVITY_NAME, async (_ctx, input: DurableHttpRequestPayload) =>
      builtinHttpActivity(input),
    );
    worker.addNamedOrchestrator(BUILTIN_HTTP_POLL_ORCHESTRATOR_NAME, builtinHttpPollOrchestrator);
    worker.addNamedOrchestrator(
      "parent",
      wrapOrchestrator(function* (context: ClassicOrchestrationContext): Generator<Task<unknown>, unknown, unknown> {
        try {
          return yield context.df.callHttp({
            method: "POST",
            url: uri,
            retryOptions: new HttpRetryOptions(1, 2),
          });
        } catch (error) {
          if (!(error instanceof TaskFailedError)) throw error;
          return { failure: error.details.message };
        }
      }),
    );
    await worker.start();
    try {
      const id = await client.scheduleNewOrchestration("parent");
      const state = await client.waitForOrchestrationCompletion(id, true, 10);
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.COMPLETED);
      const output = JSON.parse(state!.serializedOutput!);
      if (exhausted) {
        expect(output.failure).toContain("503");
      } else {
        expect(output.statusCode).toBe(200);
      }
      expect(received).toHaveLength(2);
    } finally {
      await worker.stop();
      backend.reset();
    }
  });
});
