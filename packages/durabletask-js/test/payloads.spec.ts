// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StringValue, Int32Value } from "google-protobuf/google/protobuf/wrappers_pb";
import * as pb from "../src/proto/orchestrator_service_pb";
import { PayloadProcessor } from "../src/payloads/payload-processor";
import { PayloadStore, PayloadStorageException } from "../src/payloads/payload-store";
import { runBounded } from "../src/payloads/run-bounded";

class MemoryPayloadStore extends PayloadStore {
  readonly values = new Map<string, string>();
  uploads = 0;
  async upload(value: string): Promise<string> {
    const token = `test:${++this.uploads}`;
    this.values.set(token, value);
    return token;
  }
  async download(token: string): Promise<string> {
    const value = this.values.get(token);
    if (value === undefined) throw new Error("Missing payload");
    return value;
  }
  isKnownPayloadToken(value: string): boolean {
    return value.startsWith("test:");
  }
}

const text = (value: string) => new StringValue().setValue(value);

describe("externalized payloads", () => {
  let store: MemoryPayloadStore;
  let processor: PayloadProcessor;
  beforeEach(() => {
    store = new MemoryPayloadStore();
    processor = new PayloadProcessor({ store });
  });

  it.each([
    ["a".repeat(262143), false],
    ["a".repeat(262144), true],
    ["a".repeat(262145), true],
    ["\u00e9".repeat(131072), true],
    ["\ud83d\ude00".repeat(65536), true],
    ["", false],
  ])("uses the inclusive UTF-8 threshold (%#)", async (value, externalized) => {
    const request = new pb.CreateInstanceRequest().setInput(text(value));
    await processor.externalize(request);
    expect(store.uploads).toBe(externalized ? 1 : 0);
    if (externalized) {
      const response = new pb.GetInstanceResponse().setOrchestrationstate(
        new pb.OrchestrationState().setInput(request.getInput()),
      );
      await processor.resolve(response);
      expect(response.getOrchestrationstate()!.getInput()!.getValue()).toBe(value);
    } else {
      expect(request.getInput()!.getValue()).toBe(value);
    }
  });

  it("keeps absent payloads absent", async () => {
    const request = new pb.CreateInstanceRequest();
    await processor.externalize(request);
    expect(request.hasInput()).toBe(false);
    expect(store.uploads).toBe(0);
  });

  it("maps large entity batches without the JavaScript variadic argument limit", async () => {
    const request = new pb.EntityBatchRequest().setOperationsList(
      Array.from({ length: 150000 }, () => new pb.OperationRequest().setInput(text("x"))),
    );
    await expect(processor.resolve(request)).resolves.toBeUndefined();
    await expect(processor.externalize(request)).resolves.toBeUndefined();
    expect(store.uploads).toBe(0);
  });

  it("accepts exactly 10 MiB and rejects larger serialized payloads before storage", async () => {
    const value = "x".repeat(10 * 1024 * 1024);
    await processor.externalize(new pb.CreateInstanceRequest().setInput(text(value)));
    await expect(
      processor.externalize(new pb.CreateInstanceRequest().setInput(text(value + "x"))),
    ).rejects.toBeInstanceOf(PayloadStorageException);
    expect(store.uploads).toBe(1);
  });

  it.each([1048577, NaN, Infinity, -1, 0.5])("rejects invalid thresholds (%s)", (thresholdBytes) => {
    expect(() => new PayloadProcessor({ store, thresholdBytes })).toThrow(RangeError);
  });

  it.each([
    () => new pb.CreateInstanceRequest().setInput(text("large")),
    () => new pb.RaiseEventRequest().setInput(text("large")),
    () => new pb.TerminateRequest().setOutput(text("large")),
    () => new pb.SuspendRequest().setReason(text("large")),
    () => new pb.ResumeRequest().setReason(text("large")),
    () => new pb.RewindInstanceRequest().setReason(text("large")),
    () => new pb.SignalEntityRequest().setInput(text("large")),
    () => new pb.ActivityResponse().setResult(text("large")),
    () => new pb.EntityRequest().setEntitystate(text("large")),
    () => new pb.EntityBatchRequest().setEntitystate(text("large")),
  ])("externalizes every client and worker scalar request (%#)", async (makeRequest) => {
    processor = new PayloadProcessor({ store, thresholdBytes: 1 });
    await processor.externalize(makeRequest());
    expect(store.uploads).toBe(1);
  });

  it("externalizes all orchestration actions, custom status and rewritten history", async () => {
    processor = new PayloadProcessor({ store, thresholdBytes: 1 });
    const response = new pb.OrchestratorResponse()
      .setCustomstatus(text("status"))
      .setActionsList([
        new pb.OrchestratorAction().setScheduletask(new pb.ScheduleTaskAction().setInput(text("activity"))),
        new pb.OrchestratorAction().setCreatesuborchestration(
          new pb.CreateSubOrchestrationAction().setInput(text("child")),
        ),
        new pb.OrchestratorAction().setCompleteorchestration(
          new pb.CompleteOrchestrationAction().setResult(text("result")).setDetails(text("details")),
        ),
        new pb.OrchestratorAction().setTerminateorchestration(
          new pb.TerminateOrchestrationAction().setReason(text("reason")),
        ),
        new pb.OrchestratorAction().setSendevent(new pb.SendEventAction().setData(text("event"))),
        new pb.OrchestratorAction().setSendentitymessage(
          new pb.SendEntityMessageAction().setEntityoperationcalled(
            new pb.EntityOperationCalledEvent().setInput(text("entity")),
          ),
        ),
        new pb.OrchestratorAction().setRewindorchestration(
          new pb.RewindOrchestrationAction().setNewhistoryList([
            new pb.HistoryEvent().setExecutionstarted(new pb.ExecutionStartedEvent().setInput(text("rewritten"))),
          ]),
        ),
      ]);
    await processor.externalize(response);
    expect([...store.values.values()]).toEqual([
      "status",
      "activity",
      "child",
      "result",
      "details",
      "reason",
      "event",
      "entity",
      "rewritten",
    ]);
  });

  it("preserves entity result oneofs and externalizes state, outputs and outgoing operations", async () => {
    processor = new PayloadProcessor({ store, thresholdBytes: 1 });
    const success = new pb.OperationResult().setSuccess(new pb.OperationResultSuccess().setResult(text("result")));
    const failure = new pb.OperationResult().setFailure(new pb.OperationResultFailure());
    const result = new pb.EntityBatchResult()
      .setEntitystate(text("state"))
      .setResultsList([success, failure])
      .setActionsList([
        new pb.OperationAction().setSendsignal(new pb.SendSignalAction().setInput(text("signal"))),
        new pb.OperationAction().setStartneworchestration(new pb.StartNewOrchestrationAction().setInput(text("start"))),
      ]);
    await processor.externalize(result);
    expect(store.uploads).toBe(4);
    expect(success.hasSuccess()).toBe(true);
    expect(failure.hasFailure()).toBe(true);
  });

  it("hydrates nested history state, activity and entity V1/V2 work items", async () => {
    const token = await store.upload("resolved");
    const history = new pb.HistoryEvent().setHistorystate(
      new pb.HistoryStateEvent().setOrchestrationstate(
        new pb.OrchestrationState().setInput(text(token)).setOutput(text(token)).setCustomstatus(text(token)),
      ),
    );
    const messages = [
      new pb.WorkItem().setActivityrequest(new pb.ActivityRequest().setInput(text(token))),
      new pb.WorkItem().setOrchestratorrequest(new pb.OrchestratorRequest().setPasteventsList([history])),
      new pb.WorkItem().setEntityrequest(
        new pb.EntityBatchRequest()
          .setEntitystate(text(token))
          .setOperationsList([new pb.OperationRequest().setInput(text(token))]),
      ),
      new pb.WorkItem().setEntityrequestv2(
        new pb.EntityRequest()
          .setEntitystate(text(token))
          .setOperationrequestsList([
            new pb.HistoryEvent().setEntityoperationcalled(new pb.EntityOperationCalledEvent().setInput(text(token))),
          ]),
      ),
      new pb.GetEntityResponse().setEntity(new pb.EntityMetadata().setSerializedstate(text(token))),
      new pb.QueryEntitiesResponse().setEntitiesList([new pb.EntityMetadata().setSerializedstate(text(token))]),
      new pb.QueryInstancesResponse().setOrchestrationstateList([new pb.OrchestrationState().setInput(text(token))]),
      new pb.HistoryChunk().setEventsList([
        new pb.HistoryEvent().setExecutionrewound(new pb.ExecutionRewoundEvent().setReason(text(token))),
      ]),
    ];
    for (const message of messages) {
      await processor.resolve(message);
      expect(JSON.stringify(message.toObject())).not.toContain(token);
      expect(JSON.stringify(message.toObject())).toContain("resolved");
    }
  });

  it.each([
    (value: StringValue) => new pb.HistoryEvent().setExecutionstarted(new pb.ExecutionStartedEvent().setInput(value)),
    (value: StringValue) =>
      new pb.HistoryEvent().setExecutioncompleted(new pb.ExecutionCompletedEvent().setResult(value)),
    (value: StringValue) =>
      new pb.HistoryEvent().setExecutionterminated(new pb.ExecutionTerminatedEvent().setInput(value)),
    (value: StringValue) => new pb.HistoryEvent().setTaskscheduled(new pb.TaskScheduledEvent().setInput(value)),
    (value: StringValue) => new pb.HistoryEvent().setTaskcompleted(new pb.TaskCompletedEvent().setResult(value)),
    (value: StringValue) =>
      new pb.HistoryEvent().setSuborchestrationinstancecreated(
        new pb.SubOrchestrationInstanceCreatedEvent().setInput(value),
      ),
    (value: StringValue) =>
      new pb.HistoryEvent().setSuborchestrationinstancecompleted(
        new pb.SubOrchestrationInstanceCompletedEvent().setResult(value),
      ),
    (value: StringValue) => new pb.HistoryEvent().setEventsent(new pb.EventSentEvent().setInput(value)),
    (value: StringValue) => new pb.HistoryEvent().setEventraised(new pb.EventRaisedEvent().setInput(value)),
    (value: StringValue) => new pb.HistoryEvent().setGenericevent(new pb.GenericEvent().setData(value)),
    (value: StringValue) => new pb.HistoryEvent().setContinueasnew(new pb.ContinueAsNewEvent().setInput(value)),
    (value: StringValue) =>
      new pb.HistoryEvent().setExecutionsuspended(new pb.ExecutionSuspendedEvent().setInput(value)),
    (value: StringValue) => new pb.HistoryEvent().setExecutionresumed(new pb.ExecutionResumedEvent().setInput(value)),
    (value: StringValue) => new pb.HistoryEvent().setExecutionrewound(new pb.ExecutionRewoundEvent().setReason(value)),
    (value: StringValue) =>
      new pb.HistoryEvent().setEntityoperationsignaled(new pb.EntityOperationSignaledEvent().setInput(value)),
    (value: StringValue) =>
      new pb.HistoryEvent().setEntityoperationcalled(new pb.EntityOperationCalledEvent().setInput(value)),
    (value: StringValue) =>
      new pb.HistoryEvent().setEntityoperationcompleted(new pb.EntityOperationCompletedEvent().setOutput(value)),
  ])("hydrates and rewrites every payload-bearing history oneof (%#)", async (makeEvent) => {
    processor = new PayloadProcessor({ store, thresholdBytes: 1 });
    const event = makeEvent(text(await store.upload("payload")));
    const originalCase = event.getEventtypeCase();
    await processor.resolve(new pb.HistoryChunk().setEventsList([event]));
    expect(JSON.stringify(event.toObject())).toContain("payload");
    const response = new pb.OrchestratorResponse().setActionsList([
      new pb.OrchestratorAction().setRewindorchestration(new pb.RewindOrchestrationAction().setNewhistoryList([event])),
    ]);
    await processor.externalize(response);
    expect([...store.values.values()]).toEqual(["payload", "payload"]);
    expect(event.getEventtypeCase()).toBe(originalCase);
  });

  it("converts permanent activity upload failures without sending the result", async () => {
    store.upload = async () => {
      throw Object.assign(new Error("denied"), { statusCode: 403 });
    };
    processor = new PayloadProcessor({ store, thresholdBytes: 1 });
    const response = new pb.ActivityResponse().setResult(text("large")).setCompletiontoken("completion");
    await processor.externalize(response);
    expect(response.hasResult()).toBe(false);
    expect(response.getFailuredetails()!.getIsnonretriable()).toBe(true);
    expect(response.getCompletiontoken()).toBe("completion");
  });

  it("clears partial orchestration responses before a non-retriable failure", async () => {
    processor = new PayloadProcessor({ store, thresholdBytes: 1, maxPayloadBytes: 2 });
    const response = new pb.OrchestratorResponse()
      .setCustomstatus(text("large"))
      .setIspartial(true)
      .setChunkindex(new Int32Value().setValue(2))
      .setActionsList([new pb.OrchestratorAction().setScheduletask(new pb.ScheduleTaskAction().setInput(text("x")))]);
    await processor.externalize(response);
    expect(response.hasCustomstatus()).toBe(false);
    expect(response.getIspartial()).toBe(false);
    expect(response.hasChunkindex()).toBe(false);
    expect(response.getActionsList()).toHaveLength(1);
    const complete = response.getActionsList()[0].getCompleteorchestration()!;
    expect(complete.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(complete.getFailuredetails()!.getIsnonretriable()).toBe(true);
  });

  it.each([408, 429, 500, 503])("propagates transient upload failure %s", async (statusCode) => {
    const error = Object.assign(new Error("transient"), { statusCode });
    store.upload = async () => {
      throw error;
    };
    processor = new PayloadProcessor({ store, thresholdBytes: 1 });
    await expect(processor.externalize(new pb.ActivityResponse().setResult(text("large")))).rejects.toBe(error);
  });
});

describe("bounded payload I/O", () => {
  it("caps concurrency at eight", async () => {
    let active = 0;
    let maximum = 0;
    await runBounded(
      Array.from({ length: 40 }, () => async () => {
        maximum = Math.max(maximum, ++active);
        await new Promise((resolve) => setImmediate(resolve));
        active--;
      }),
    );
    expect(maximum).toBe(8);
    expect(active).toBe(0);
  });

  it("stops dispatch, drains every started operation and throws the lowest-ordinal failure", async () => {
    const first = new Error("first in message order");
    const later = new Error("first to finish");
    const started: number[] = [];
    const completed: number[] = [];
    await expect(
      runBounded(
        Array.from({ length: 20 }, (_, index) => async () => {
          started.push(index);
          if (index === 1) throw later;
          await new Promise((resolve) => setImmediate(resolve));
          completed.push(index);
          if (index === 0) throw first;
        }),
      ),
    ).rejects.toBe(first);
    expect(started).toHaveLength(2);
    expect(completed).toEqual([0]);
  });

  it("drains on cancellation and does not observe cancellation for no-op messages", async () => {
    const abort = new AbortController();
    let completed = 0;
    await expect(
      runBounded(
        Array.from({ length: 20 }, () => async () => {
          abort.abort();
          await new Promise((resolve) => setImmediate(resolve));
          completed++;
        }),
        abort.signal,
      ),
    ).rejects.toBe(abort.signal.reason);
    expect(completed).toBe(1);
    await expect(runBounded([], abort.signal)).resolves.toBeUndefined();
  });
});
