// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DurableFunctionsWorker } from "../../src/worker";
import { NoOpLogger } from "@microsoft/durabletask-js";
import { ClassicOrchestrationContext, wrapOrchestrator } from "../../src/orchestration-context";
import * as pb from "../../../durabletask-js/src/proto/orchestrator_service_pb";
import * as ph from "../../../durabletask-js/src/utils/pb-helper.util";
import { TaskCancelledError } from "../../src";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-01-01T00:00:00Z");

async function timerActions(worker: DurableFunctionsWorker) {
  worker.addNamedOrchestrator(
    "long-timer",
    wrapOrchestrator(function* (ctx: ClassicOrchestrationContext) {
      yield ctx.df.createTimer(new Date(ctx.df.currentUtcDateTime.getTime() + 30 * DAY));
      return "done";
    }),
  );
  const request = new pb.OrchestratorRequest();
  request.setInstanceid("instance");
  request.setNeweventsList([
    ph.newOrchestratorStartedEvent(START),
    ph.newExecutionStartedEvent("long-timer", "instance"),
  ]);
  const response = await worker.handleOrchestratorRequest(Buffer.from(request.serializeBinary()).toString("base64"));
  return pb.OrchestratorResponse.deserializeBinary(Buffer.from(response, "base64")).getActionsList();
}

describe("DurableFunctionsWorker", () => {
  it("inherits the core default without a Functions timer configuration surface", async () => {
    const options = { logger: new NoOpLogger(), maximumTimerIntervalMs: null };
    const worker = new DurableFunctionsWorker(options);
    // Extra properties from untyped JavaScript must not override the Functions default.
    expect(worker.maximumTimerIntervalMs).toBe(3 * DAY);
    const actions = await timerActions(worker);
    expect(actions[0].getCreatetimer()?.getFireat()?.toDate()).toEqual(new Date(START.getTime() + 3 * DAY));
  });

  it("exposes Python-style canceled timer results through the classic context", async () => {
    const worker = new DurableFunctionsWorker({ logger: new NoOpLogger() });
    worker.addNamedOrchestrator("cancel", wrapOrchestrator(function* (ctx: ClassicOrchestrationContext) {
      const timer = ctx.df.createTimer(10 * DAY / 1000);
      expect(timer.cancel()).toBe(true);
      expect(timer.cancel()).toBe(false);
      expect(timer.isCompleted).toBe(true);
      expect(timer.isCanceled).toBe(true);
      expect(() => timer.result).toThrow(TaskCancelledError);
      yield ctx.df.Task.any([timer]);
      return "canceled";
    }));
    const request = new pb.OrchestratorRequest().setInstanceid("instance").setNeweventsList([
      ph.newOrchestratorStartedEvent(START),
      ph.newExecutionStartedEvent("cancel", "instance"),
    ]);
    const response = await worker.handleOrchestratorRequest(Buffer.from(request.serializeBinary()).toString("base64"));
    const actions = pb.OrchestratorResponse.deserializeBinary(Buffer.from(response, "base64")).getActionsList();
    expect(actions).toHaveLength(1);
    expect(actions[0].getCompleteorchestration()?.getResult()?.getValue()).toBe('"canceled"');
  });
  it("automatically splits classic-context long timers through the protobuf path", async () => {
    const actions = await timerActions(new DurableFunctionsWorker({ logger: new NoOpLogger() }));
    expect(actions).toHaveLength(1);
    expect(actions[0].getId()).toBe(1);
    expect(actions[0].getCreatetimer()?.getFireat()?.toDate()).toEqual(new Date(START.getTime() + 3 * DAY));
  });

  it.each([10, 30])("replays all fixed segments of a %s-day classic timer", async (days) => {
    const worker = new DurableFunctionsWorker({ logger: new NoOpLogger() });
    worker.addNamedOrchestrator("long-timer", wrapOrchestrator(function* (ctx: ClassicOrchestrationContext) {
      yield ctx.df.createTimer(new Date(ctx.df.currentUtcDateTime.getTime() + days * DAY));
      return "elapsed";
    }));
    const request = new pb.OrchestratorRequest().setInstanceid("instance");
    const history: pb.HistoryEvent[] = [];
    let events = [ph.newOrchestratorStartedEvent(START), ph.newExecutionStartedEvent("long-timer", "instance")];
    const replay = async () => {
      request.setPasteventsList(history).setNeweventsList(events);
      const response = await worker.handleOrchestratorRequest(Buffer.from(request.serializeBinary()).toString("base64"));
      return pb.OrchestratorResponse.deserializeBinary(Buffer.from(response, "base64")).getActionsList();
    };
    let id = 1;
    for (let day = Math.min(3, days); ; day = Math.min(day + 3, days)) {
      const actions = await replay();
      const fireAt = new Date(START.getTime() + day * DAY);
      expect(actions).toHaveLength(1);
      expect(actions[0].getId()).toBe(id);
      expect(actions[0].getCreatetimer()?.getFireat()?.toDate()).toEqual(fireAt);
      history.push(...events, ph.newTimerCreatedEvent(id, fireAt));
      events = [ph.newOrchestratorStartedEvent(fireAt), ph.newTimerFiredEvent(id, fireAt)];
      id++;
      if (day === days) break;
    }
    const actions = await replay();
    expect(actions).toHaveLength(1);
    const completed = actions[0].getCompleteorchestration();
    expect(completed?.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completed?.getResult()?.getValue()).toBe('"elapsed"');
  });

  it("decodes base64, delegates to processOrchestratorRequest, and re-encodes the response", async () => {
    const worker = new DurableFunctionsWorker();
    const responseBytes = Buffer.from("orchestrator response");
    const processOrchestratorRequest = jest
      .spyOn(worker, "processOrchestratorRequest")
      .mockResolvedValue(responseBytes);

    const actual = await worker.handleOrchestratorRequest(
      Buffer.from("orchestrator request").toString("base64"),
    );

    expect(actual).toBe(responseBytes.toString("base64"));
    expect(processOrchestratorRequest).toHaveBeenCalledTimes(1);
    expect(Buffer.from(processOrchestratorRequest.mock.calls[0][0]).toString()).toBe(
      "orchestrator request",
    );
  });

  it("decodes base64, delegates to processEntityBatchRequest, and re-encodes the response", async () => {
    const worker = new DurableFunctionsWorker();
    const responseBytes = Buffer.from("entity batch response");
    const processEntityBatchRequest = jest
      .spyOn(worker, "processEntityBatchRequest")
      .mockResolvedValue(responseBytes);

    const actual = await worker.handleEntityBatchRequest(
      Buffer.from("entity batch request").toString("base64"),
    );

    expect(actual).toBe(responseBytes.toString("base64"));
    expect(processEntityBatchRequest).toHaveBeenCalledTimes(1);
    expect(Buffer.from(processEntityBatchRequest.mock.calls[0][0]).toString()).toBe(
      "entity batch request",
    );
  });

  it("rejects empty base64 requests", async () => {
    const worker = new DurableFunctionsWorker();

    await expect(worker.handleOrchestratorRequest("")).rejects.toThrow(TypeError);
  });
});
