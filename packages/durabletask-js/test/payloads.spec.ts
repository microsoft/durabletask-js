// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StringValue, Int32Value } from "google-protobuf/google/protobuf/wrappers_pb";
import * as pb from "../src/proto/orchestrator_service_pb";
import { PayloadProcessor } from "../src/payloads/payload-processor";
import { PayloadStore, PayloadStorageException } from "../src/payloads/payload-store";
import { runBounded } from "../src/payloads/run-bounded";
import { NoOpLogger } from "../src/types/logger.type";
import {
  newEventRaisedEvent,
  newExecutionStartedEvent,
  newOrchestratorStartedEvent,
} from "../src/utils/pb-helper.util";
import { OrchestrationExecutor } from "../src/worker/orchestration-executor";
import { Registry } from "../src/worker/registry";

class MemoryPayloadStore extends PayloadStore {
  readonly values = new Map<string, string>();
  uploads = 0;
  async upload(value: string, _signal?: AbortSignal): Promise<string> {
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
const MIB = 1024 * 1024;
const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function continueAsNewResponse(events: pb.HistoryEvent[]): Promise<pb.OrchestratorResponse> {
  const registry = new Registry();
  registry.addNamedOrchestrator("Carryover", async function* (context) {
    yield context.waitForExternalEvent("continue");
    context.continueAsNew("next", true, "next-version");
  });
  const result = await new OrchestrationExecutor(registry, new NoOpLogger()).execute(
    "carryover-instance",
    [],
    [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent("Carryover", "carryover-instance"),
      ...events,
      newEventRaisedEvent("continue", "null"),
    ],
  );
  return new pb.OrchestratorResponse()
    .setInstanceid("carryover-instance")
    .setCompletiontoken("completion")
    .setActionsList(result.actions);
}

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

  describe("recognized payload tokens", () => {
    it("externalizes a message repeatedly without uploading tokens and hydrates it once", async () => {
      processor = new PayloadProcessor({ store, thresholdBytes: 1 });
      const request = new pb.EntityBatchRequest()
        .setEntitystate(text("original state"))
        .setOperationsList([new pb.OperationRequest().setInput(text("original input"))]);
      const original = request.toObject();
      const upload = jest.spyOn(store, "upload");

      await processor.externalize(request);
      const externalized = request.toObject();
      await processor.externalize(request);
      await processor.externalize(request);
      await processor.resolve(request);

      expect(request.toObject()).toEqual(original);
      expect(upload.mock.calls.map(([value]) => value)).toEqual(["original state", "original input"]);
      expect(store.uploads).toBe(2);
      expect(externalized.entitystate!.value).toBe("test:1");
      expect(externalized.operationsList[0].input!.value).toBe("test:2");
    });

    it("retries a partially externalized message without wrapping the successful token", async () => {
      processor = new PayloadProcessor({ store, thresholdBytes: 1 });
      const request = new pb.EntityBatchRequest()
        .setEntitystate(text("original state"))
        .setOperationsList([new pb.OperationRequest().setInput(text("original input"))]);
      const original = request.toObject();
      const failure = Object.assign(new Error("retry input"), { statusCode: 503 });
      const uploadValue = store.upload.bind(store);
      let failInput = true;
      const upload = jest.spyOn(store, "upload").mockImplementation(async (value) => {
        if (value === "original input" && failInput) {
          failInput = false;
          throw failure;
        }
        return uploadValue(value);
      });

      await expect(processor.externalize(request)).rejects.toBe(failure);
      expect(request.getEntitystate()!.getValue()).toBe("test:1");
      expect(request.getOperationsList()[0].getInput()!.getValue()).toBe("original input");
      await processor.externalize(request);
      await processor.resolve(request);

      expect(request.toObject()).toEqual(original);
      expect(upload.mock.calls.map(([value]) => value)).toEqual(["original state", "original input", "original input"]);
      expect([...store.values.values()]).toEqual(["original state", "original input"]);
    });

    it("uses the configured store's recognition rather than a token-prefix assumption", async () => {
      const token = "opaque-owned-reference";
      store.values.set(token, "original state");
      store.isKnownPayloadToken = (value) => store.values.has(value);
      processor = new PayloadProcessor({ store, thresholdBytes: 1 });
      const request = new pb.EntityBatchRequest()
        .setEntitystate(text(token))
        .setOperationsList([new pb.OperationRequest().setInput(text("test:literal input"))]);
      const upload = jest.spyOn(store, "upload");

      await processor.externalize(request);
      await processor.resolve(request);

      expect(request.getEntitystate()!.getValue()).toBe("original state");
      expect(request.getOperationsList()[0].getInput()!.getValue()).toBe("test:literal input");
      expect(upload.mock.calls.map(([value]) => value)).toEqual(["test:literal input"]);
    });

    it("excludes known tokens from maximum validation while externalizing eligible raw fields", async () => {
      const token = "test:reference-longer-than-the-maximum";
      store.values.set(token, "original state");
      processor = new PayloadProcessor({ store, thresholdBytes: 1, maxPayloadBytes: 1 });
      const request = new pb.EntityBatchRequest()
        .setEntitystate(text(token))
        .setOperationsList([new pb.OperationRequest().setInput(text("x"))]);

      await expect(processor.externalize(request)).resolves.toBeUndefined();
      expect(request.getEntitystate()!.getValue()).toBe(token);
      expect([...store.values.values()]).toEqual(["original state", "x"]);
      await processor.resolve(request);
      expect(request.getEntitystate()!.getValue()).toBe("original state");
      expect(request.getOperationsList()[0].getInput()!.getValue()).toBe("x");
    });

    it("still preflights every raw field before uploading when a message already contains tokens", async () => {
      const token = "test:reference-longer-than-the-maximum";
      store.values.set(token, "original state");
      processor = new PayloadProcessor({ store, thresholdBytes: 1, maxPayloadBytes: 1 });
      const request = new pb.EntityBatchRequest()
        .setEntitystate(text(token))
        .setOperationsList([
          new pb.OperationRequest().setInput(text("x")),
          new pb.OperationRequest().setInput(text("xx")),
        ]);
      const original = request.toObject();

      await expect(processor.externalize(request)).rejects.toThrow(
        "Payload size 2 bytes exceeds the configured maximum of 1 bytes.",
      );
      expect(store.uploads).toBe(0);
      expect([...store.values.values()]).toEqual(["original state"]);
      expect(request.toObject()).toEqual(original);
    });

    it("treats an all-token message as a canceled no-op", async () => {
      store.values.set("test:state", "original state");
      store.values.set("test:input", "original input");
      processor = new PayloadProcessor({ store, thresholdBytes: 1 });
      const request = new pb.EntityBatchRequest()
        .setEntitystate(text("test:state"))
        .setOperationsList([new pb.OperationRequest().setInput(text("test:input"))]);
      const original = request.toObject();
      const abort = new AbortController();
      abort.abort();

      await expect(processor.externalize(request, abort.signal)).resolves.toBeUndefined();

      expect(store.uploads).toBe(0);
      expect(request.toObject()).toEqual(original);
    });
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

  describe("continue-as-new carryover", () => {
    it("externalizes five 1 MiB runtime events below the 4 MiB wire limit and preserves hydrated history", async () => {
      const values = Array.from({ length: 5 }, (_, index) => `${index}${"x".repeat(MIB - 3)}`);
      const response = await continueAsNewResponse(
        values.map((value, index) => newEventRaisedEvent(index < 2 ? "FIRST" : "SECOND", JSON.stringify(value))),
      );
      const original = response.toObject();
      const action = response.getActionsList()[0];
      const completion = action.getCompleteorchestration()!;
      const events = completion.getCarryovereventsList();
      expect(action.getId()).toBe(1);
      expect(completion.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW);
      expect(events.map((event) => event.getEventraised()!.getName())).toEqual([
        "first",
        "first",
        "second",
        "second",
        "second",
      ]);
      expect(events.map((event) => Buffer.byteLength(event.getEventraised()!.getInput()!.getValue(), "utf8"))).toEqual(
        Array(5).fill(MIB),
      );
      expect(response.serializeBinary().byteLength).toBeGreaterThan(4 * MIB);

      await processor.externalize(response);

      const binary = response.serializeBinary();
      expect(binary.byteLength).toBeLessThan(4 * MIB);
      expect(store.uploads).toBe(5);
      expect([...store.values.values()]).toEqual(values.map((value) => JSON.stringify(value)));
      const wireResponse = pb.OrchestratorResponse.deserializeBinary(binary);
      const carryover = wireResponse.getActionsList()[0].getCompleteorchestration()!.getCarryovereventsList();
      expect(
        carryover.every((event) => store.isKnownPayloadToken(event.getEventraised()!.getInput()!.getValue())),
      ).toBe(true);

      await processor.resolve(new pb.HistoryChunk().setEventsList(carryover));

      expect(carryover.map((event) => JSON.parse(event.getEventraised()!.getInput()!.getValue()))).toEqual(values);
      expect(wireResponse.toObject()).toEqual(original);
    });

    it.each([
      ["below threshold", "\u00e9".repeat(131070) + "a", 262143, false],
      ["at threshold", "\u00e9".repeat(131071), 262144, true],
      ["above threshold", "\u00e9".repeat(131071) + "a", 262145, true],
      ["below maximum", "\u00e9".repeat(524286) + "a", MIB - 1, true],
      ["at maximum", "\u00e9".repeat(524287), MIB, true],
    ])("applies serialized UTF-8 carryover boundaries %s", async (_label, value, size, externalized) => {
      processor = new PayloadProcessor({ store, maxPayloadBytes: MIB });
      const encoded = JSON.stringify(value);
      expect(Buffer.byteLength(encoded, "utf8")).toBe(size);
      const response = await continueAsNewResponse([newEventRaisedEvent("buffered", encoded)]);

      await processor.externalize(response);

      const completion = response.getActionsList()[0].getCompleteorchestration()!;
      const input = completion.getCarryovereventsList()[0].getEventraised()!.getInput()!.getValue();
      expect(completion.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW);
      expect(store.uploads).toBe(externalized ? 1 : 0);
      expect(store.isKnownPayloadToken(input)).toBe(externalized);
      await processor.resolve(new pb.HistoryChunk().setEventsList(completion.getCarryovereventsList()));
      expect(completion.getCarryovereventsList()[0].getEventraised()!.getInput()!.getValue()).toBe(encoded);
    });

    it.each([
      ["configured maximum", "\u00e9".repeat(524287) + "a", MIB, MIB + 1],
      ["default maximum", "x".repeat(10 * MIB - 1), undefined, 10 * MIB + 1],
    ])("converts carryover above the %s to a non-retriable failure", async (_label, value, maximum, size) => {
      processor = new PayloadProcessor({ store, maxPayloadBytes: maximum });
      const encoded = JSON.stringify(value);
      expect(Buffer.byteLength(encoded, "utf8")).toBe(size);
      const response = await continueAsNewResponse([newEventRaisedEvent("buffered", encoded)]);

      await processor.externalize(response);

      expect(store.uploads).toBe(0);
      expect(store.values.size).toBe(0);
      expect(response.getActionsList()).toHaveLength(1);
      const completion = response.getActionsList()[0].getCompleteorchestration()!;
      expect(completion.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(completion.getCarryovereventsList()).toEqual([]);
      expect(completion.getFailuredetails()!.getErrortype()).toBe("PayloadStorageException");
      expect(completion.getFailuredetails()!.getIsnonretriable()).toBe(true);
      expect(completion.getFailuredetails()!.getErrormessage()).toBe(
        `Payload size ${size} bytes exceeds the configured maximum of ${maximum ?? 10 * MIB} bytes.`,
      );
      expect(response.getInstanceid()).toBe("carryover-instance");
      expect(response.getCompletiontoken()).toBe("completion");
    });
  });

  describe("whole-message size preflight", () => {
    it("fails an oversized action before uploading or mutating a valid custom status", async () => {
      processor = new PayloadProcessor({ store, maxPayloadBytes: MIB });
      const status = text("s".repeat(262144));
      const input = text("x".repeat(MIB + 1));
      const response = new pb.OrchestratorResponse()
        .setInstanceid("instance")
        .setCompletiontoken("completion")
        .setCustomstatus(status)
        .setIspartial(true)
        .setChunkindex(new Int32Value().setValue(7))
        .setActionsList([new pb.OrchestratorAction().setScheduletask(new pb.ScheduleTaskAction().setInput(input))]);

      await processor.externalize(response);

      expect(store.uploads).toBe(0);
      expect(store.values.size).toBe(0);
      expect(status.getValue()).toBe("s".repeat(262144));
      expect(input.getValue()).toBe("x".repeat(MIB + 1));
      expect(response.hasCustomstatus()).toBe(false);
      expect(response.getIspartial()).toBe(false);
      expect(response.hasChunkindex()).toBe(false);
      expect(response.getActionsList()).toHaveLength(1);
      const completion = response.getActionsList()[0].getCompleteorchestration()!;
      expect(completion.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(completion.getFailuredetails()!.getErrortype()).toBe("PayloadStorageException");
      expect(completion.getFailuredetails()!.getIsnonretriable()).toBe(true);
      expect(completion.getFailuredetails()!.getErrormessage()).toBe(
        `Payload size ${MIB + 1} bytes exceeds the configured maximum of ${MIB} bytes.`,
      );
      expect(response.getInstanceid()).toBe("instance");
      expect(response.getCompletiontoken()).toBe("completion");
    });

    it("rejects an oversized entity operation before uploading or mutating valid state", async () => {
      processor = new PayloadProcessor({ store, maxPayloadBytes: MIB });
      const request = new pb.EntityBatchRequest()
        .setEntitystate(text("s".repeat(262144)))
        .setOperationsList([new pb.OperationRequest().setInput(text("x".repeat(MIB + 1)))]);
      const original = request.toObject();

      await expect(processor.externalize(request)).rejects.toBeInstanceOf(PayloadStorageException);

      expect(store.uploads).toBe(0);
      expect(store.values.size).toBe(0);
      expect(request.toObject()).toEqual(original);
    });

    it("rejects oversized client input without storage or field mutations", async () => {
      processor = new PayloadProcessor({ store, maxPayloadBytes: MIB });
      const request = new pb.CreateInstanceRequest().setInput(text("x".repeat(MIB + 1)));
      const original = request.toObject();

      await expect(processor.externalize(request)).rejects.toBeInstanceOf(PayloadStorageException);

      expect(store.uploads).toBe(0);
      expect(store.values.size).toBe(0);
      expect(request.toObject()).toEqual(original);
    });

    it("converts oversized activity output while preserving completion metadata", async () => {
      processor = new PayloadProcessor({ store, maxPayloadBytes: MIB });
      const result = text("x".repeat(MIB + 1));
      const response = new pb.ActivityResponse()
        .setInstanceid("instance")
        .setTaskid(17)
        .setCompletiontoken("completion")
        .setResult(result);

      await processor.externalize(response);

      expect(store.uploads).toBe(0);
      expect(store.values.size).toBe(0);
      expect(result.getValue()).toBe("x".repeat(MIB + 1));
      expect(response.hasResult()).toBe(false);
      expect(response.getFailuredetails()!.getErrortype()).toBe("PayloadStorageException");
      expect(response.getFailuredetails()!.getIsnonretriable()).toBe(true);
      expect(response.getFailuredetails()!.getErrormessage()).toBe(
        `Payload size ${MIB + 1} bytes exceeds the configured maximum of ${MIB} bytes.`,
      );
      expect(response.getInstanceid()).toBe("instance");
      expect(response.getTaskid()).toBe(17);
      expect(response.getCompletiontoken()).toBe("completion");
    });

    it("detects invalid size before a hypothetical earlier transient upload failure", async () => {
      processor = new PayloadProcessor({ store, maxPayloadBytes: MIB });
      const upload = jest
        .spyOn(store, "upload")
        .mockRejectedValue(Object.assign(new Error("offline"), { statusCode: 503 }));
      const response = new pb.OrchestratorResponse()
        .setCustomstatus(text("s".repeat(262144)))
        .setActionsList([
          new pb.OrchestratorAction().setScheduletask(new pb.ScheduleTaskAction().setInput(text("x".repeat(MIB + 1)))),
        ]);

      await expect(processor.externalize(response)).resolves.toBeUndefined();

      expect(upload).not.toHaveBeenCalled();
      expect(store.values.size).toBe(0);
      const completion = response.getActionsList()[0].getCompleteorchestration()!;
      expect(completion.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(completion.getFailuredetails()!.getErrortype()).toBe("PayloadStorageException");
      expect(completion.getFailuredetails()!.getIsnonretriable()).toBe(true);
    });

    it.each([
      () => new pb.CreateInstanceRequest().setInput(text("x".repeat(MIB + 1))),
      () => new pb.ActivityResponse().setResult(text("x".repeat(MIB + 1))),
      () => new pb.EntityBatchRequest().setEntitystate(text("x".repeat(MIB + 1))),
      () =>
        new pb.OrchestratorResponse()
          .setCustomstatus(text("s".repeat(262144)))
          .setIspartial(true)
          .setChunkindex(new Int32Value().setValue(7))
          .setActionsList([
            new pb.OrchestratorAction().setScheduletask(
              new pb.ScheduleTaskAction().setInput(text("x".repeat(MIB + 1))),
            ),
          ]),
    ])("honors precancellation before deterministic size failure (%#)", async (makeMessage) => {
      processor = new PayloadProcessor({ store, maxPayloadBytes: MIB });
      const abort = new AbortController();
      abort.abort();
      const message = makeMessage();
      const original = message.toObject();

      await expect(processor.externalize(message, abort.signal)).rejects.toBe(abort.signal.reason);

      expect(abort.signal.reason.name).toBe("AbortError");
      expect(store.uploads).toBe(0);
      expect(store.values.size).toBe(0);
      expect(message.toObject()).toEqual(original);
    });

    it.each([
      () => new pb.CreateInstanceRequest(),
      () => new pb.CreateInstanceRequest().setInput(text("")),
      () => new pb.CreateInstanceRequest().setInput(text("abc")),
    ])(
      "keeps canceled no-op messages unchanged even when the maximum is below the threshold (%#)",
      async (makeMessage) => {
        processor = new PayloadProcessor({ store, thresholdBytes: 4, maxPayloadBytes: 2 });
        const abort = new AbortController();
        abort.abort();
        const message = makeMessage();
        const original = message.toObject();

        await expect(processor.externalize(message, abort.signal)).resolves.toBeUndefined();

        expect(store.uploads).toBe(0);
        expect(message.toObject()).toEqual(original);
      },
    );

    it("externalizes every eligible valid field and leaves inline, empty, and absent values untouched", async () => {
      processor = new PayloadProcessor({ store, thresholdBytes: 4, maxPayloadBytes: 4 });
      const request = new pb.EntityBatchRequest()
        .setEntitystate(text("1234"))
        .setOperationsList([
          new pb.OperationRequest().setInput(text("\u00e9\u00e9")),
          new pb.OperationRequest().setInput(text("abc")),
          new pb.OperationRequest().setInput(text("")),
          new pb.OperationRequest(),
        ]);
      const original = request.toObject();

      await processor.externalize(request);

      expect([...store.values.values()]).toEqual(["1234", "\u00e9\u00e9"]);
      expect(request.getEntitystate()!.getValue()).toBe("test:1");
      expect(request.getOperationsList()[0].getInput()!.getValue()).toBe("test:2");
      expect(request.getOperationsList()[1].getInput()!.getValue()).toBe("abc");
      expect(request.getOperationsList()[2].getInput()!.getValue()).toBe("");
      expect(request.getOperationsList()[3].hasInput()).toBe(false);
      await processor.resolve(request);
      expect(request.toObject()).toEqual(original);
    });
  });

  describe("worker response cancellation", () => {
    describe.each([
      {
        name: "activity",
        makeResponse: () =>
          new pb.ActivityResponse()
            .setInstanceid("instance")
            .setTaskid(17)
            .setCompletiontoken("completion")
            .setResult(text("result")),
      },
      {
        name: "orchestrator",
        makeResponse: () =>
          new pb.OrchestratorResponse()
            .setInstanceid("instance")
            .setCompletiontoken("completion")
            .setCustomstatus(text("status"))
            .setIspartial(true)
            .setChunkindex(new Int32Value().setValue(2))
            .setActionsList([
              new pb.OrchestratorAction().setScheduletask(new pb.ScheduleTaskAction().setInput(text("input"))),
            ]),
      },
    ])("$name", ({ makeResponse }) => {
      describe.each([
        { name: "storage exception", makeReason: () => new PayloadStorageException("canceled") },
        { name: "HTTP 403", makeReason: () => Object.assign(new Error("canceled"), { statusCode: 403 }) },
      ])("$name", ({ makeReason }) => {
        it.each(["pre-aborted", "in-flight"] as const)(
          "rethrows the original %s reason without converting the response",
          async (stage) => {
            processor = new PayloadProcessor({
              store,
              thresholdBytes: 1,
              maxPayloadBytes: stage === "pre-aborted" ? 1 : 1024,
            });
            const response = makeResponse();
            const original = response.toObject();
            const abort = new AbortController();
            const reason = makeReason();
            const started = gate();
            let active = 0;
            const upload = jest.spyOn(store, "upload").mockImplementation(async (_value, signal) => {
              active++;
              started.release();
              try {
                return await new Promise<string>((_resolve, reject) => {
                  signal!.addEventListener("abort", () => reject(signal!.reason), { once: true });
                });
              } finally {
                active--;
              }
            });
            if (stage === "pre-aborted") abort.abort(reason);

            const pending = expect(processor.externalize(response, abort.signal)).rejects.toBe(reason);
            if (stage === "in-flight") {
              await started.promise;
              abort.abort(reason);
            }
            await pending;

            expect(active).toBe(0);
            if (stage === "pre-aborted") expect(upload).not.toHaveBeenCalled();
            else expect(upload).toHaveBeenCalled();
            expect(store.values.size).toBe(0);
            expect(response.toObject()).toEqual(original);
            await nextTurn();
            expect(response.toObject()).toEqual(original);
          },
        );

        it("still converts a genuine permanent upload failure when the signal is not aborted", async () => {
          processor = new PayloadProcessor({ store, thresholdBytes: 1 });
          const response = makeResponse();
          const error = makeReason();
          jest.spyOn(store, "upload").mockRejectedValue(error);
          const abort = new AbortController();

          await expect(processor.externalize(response, abort.signal)).resolves.toBeUndefined();

          const details =
            response instanceof pb.ActivityResponse
              ? response.getFailuredetails()
              : response.getActionsList()[0].getCompleteorchestration()!.getFailuredetails();
          expect(details!.getIsnonretriable()).toBe(true);
          expect(details!.getErrortype()).toBe(error.name);
          expect(details!.getErrormessage()).toBe(error.message);
          expect(abort.signal.aborted).toBe(false);
        });

        it("leaves canceled no-op responses unchanged", async () => {
          processor = new PayloadProcessor({ store, thresholdBytes: 1024 });
          const response = makeResponse();
          const original = response.toObject();
          const abort = new AbortController();
          abort.abort(makeReason());

          await expect(processor.externalize(response, abort.signal)).resolves.toBeUndefined();

          expect(response.toObject()).toEqual(original);
          expect(store.uploads).toBe(0);
        });
      });
    });

    it.each([403, 503])(
      "rethrows the earlier I/O error %s rather than a later abort reason after drainage",
      async (statusCode) => {
        processor = new PayloadProcessor({ store, thresholdBytes: 1 });
        const response = new pb.OrchestratorResponse()
          .setCustomstatus(text("earlier"))
          .setActionsList([
            new pb.OrchestratorAction().setScheduletask(new pb.ScheduleTaskAction().setInput(text("later"))),
          ]);
        const original = response.toObject();
        const abort = new AbortController();
        const firstError = Object.assign(new Error("independent earlier I/O failure"), { statusCode });
        const laterReason = new PayloadStorageException("later cancellation");
        const hold = gate();
        const laterStarted = gate();
        let active = 0;
        let settled = false;
        const started: string[] = [];
        store.upload = async (value) => {
          started.push(value);
          active++;
          try {
            if (value === "earlier") {
              await hold.promise;
              throw firstError;
            }
            abort.abort(laterReason);
            laterStarted.release();
            throw abort.signal.reason;
          } finally {
            active--;
          }
        };
        const pending = processor.externalize(response, abort.signal).then(
          () => {
            settled = true;
          },
          (error: unknown) => {
            settled = true;
            return error;
          },
        );
        await laterStarted.promise;
        await nextTurn();
        const beforeDrain = { settled, active };
        hold.release();
        const error = await pending;

        expect(beforeDrain).toEqual({ settled: false, active: 1 });
        expect(active).toBe(0);
        expect(started).toEqual(["earlier", "later"]);
        expect(error).toBe(firstError);
        expect(error).not.toBe(laterReason);
        expect(response.toObject()).toEqual(original);
        await nextTurn();
        expect(response.toObject()).toEqual(original);
      },
    );
  });

  describe("in-flight payload I/O", () => {
    it.each([false, true])(
      "classifies the lowest-message-order failure after drainage (permanent: %s)",
      async (permanent) => {
        processor = new PayloadProcessor({ store, thresholdBytes: 1 });
        const earlier = gate();
        const later = gate();
        const bothStarted = gate();
        const laterFinished = gate();
        const firstError = Object.assign(new Error("earlier failure"), { statusCode: permanent ? 403 : 503 });
        const secondError = permanent
          ? Object.assign(new Error("later transient failure"), { statusCode: 503 })
          : new PayloadStorageException("later permanent failure");
        const started: string[] = [];
        const finished: string[] = [];
        let active = 0;
        let settled = false;
        store.upload = async (value) => {
          started.push(value);
          active++;
          if (started.length === 2) bothStarted.release();
          try {
            await (value === "earlier" ? earlier.promise : later.promise);
            throw value === "earlier" ? firstError : secondError;
          } finally {
            finished.push(value);
            active--;
            if (value === "later") laterFinished.release();
          }
        };
        const response = new pb.OrchestratorResponse()
          .setCustomstatus(text("earlier"))
          .setIspartial(true)
          .setChunkindex(new Int32Value().setValue(2))
          .setActionsList([
            new pb.OrchestratorAction().setScheduletask(new pb.ScheduleTaskAction().setInput(text("later"))),
          ]);
        const original = response.toObject();
        const pending = processor.externalize(response).then(
          () => {
            settled = true;
          },
          (error: unknown) => {
            settled = true;
            return error;
          },
        );
        await bothStarted.promise;
        later.release();
        await laterFinished.promise;
        await nextTurn();
        const beforeDrain = { settled, active, finished: [...finished] };
        earlier.release();
        const error = await pending;

        expect(beforeDrain).toEqual({ settled: false, active: 1, finished: ["later"] });
        expect(started).toEqual(["earlier", "later"]);
        expect(finished).toEqual(["later", "earlier"]);
        expect(active).toBe(0);
        if (permanent) {
          expect(error).toBeUndefined();
          expect(response.hasCustomstatus()).toBe(false);
          expect(response.getIspartial()).toBe(false);
          expect(response.hasChunkindex()).toBe(false);
          expect(response.getActionsList()).toHaveLength(1);
          const completion = response.getActionsList()[0].getCompleteorchestration()!;
          expect(completion.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
          expect(completion.getFailuredetails()!.getErrormessage()).toBe("earlier failure");
          expect(completion.getFailuredetails()!.getIsnonretriable()).toBe(true);
        } else {
          expect(error).toBe(firstError);
          expect(response.toObject()).toEqual(original);
        }
        const atSettlement = response.toObject();
        await nextTurn();
        expect(response.toObject()).toEqual(atSettlement);
      },
    );

    it.each(["externalize", "resolve"] as const)(
      "drains started %s mutations before cancellation settles",
      async (mode) => {
        processor = new PayloadProcessor({ store, thresholdBytes: 1 });
        const abort = new AbortController();
        const started = gate();
        const hold = gate();
        const first = mode === "externalize" ? "first" : "test:first";
        const second = mode === "externalize" ? "second" : "test:second";
        store.values.set("test:first", "resolved-first");
        store.values.set("test:second", "resolved-second");
        const upload = store.upload.bind(store);
        const download = store.download.bind(store);
        const calls: string[] = [];
        let active = 0;
        let settled = false;
        const io = async (value: string) => {
          calls.push(value);
          active++;
          abort.abort();
          started.release();
          try {
            await hold.promise;
            return mode === "externalize" ? await upload(value) : await download(value);
          } finally {
            active--;
          }
        };
        if (mode === "externalize") store.upload = io;
        else store.download = io;
        const request = new pb.EntityBatchRequest()
          .setEntitystate(text(first))
          .setOperationsList([new pb.OperationRequest().setInput(text(second))]);
        const pending = processor[mode](request, abort.signal).then(
          () => {
            settled = true;
          },
          (error: unknown) => {
            settled = true;
            return error;
          },
        );
        await started.promise;
        await nextTurn();
        const beforeDrain = { settled, active, state: request.getEntitystate()!.getValue() };
        hold.release();
        const error = await pending;

        expect(beforeDrain).toEqual({ settled: false, active: 1, state: first });
        expect(calls).toEqual([first]);
        expect(error).toBe(abort.signal.reason);
        expect(active).toBe(0);
        expect(request.getEntitystate()!.getValue()).toBe(mode === "externalize" ? "test:1" : "resolved-first");
        expect(request.getOperationsList()[0].getInput()!.getValue()).toBe(second);
        const atSettlement = request.toObject();
        await nextTurn();
        expect(request.toObject()).toEqual(atSettlement);
      },
    );
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
