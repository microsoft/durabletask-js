// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { ListValue, Struct, Value } from "google-protobuf/google/protobuf/struct_pb";
import {
  FailureDetails,
  InMemoryOrchestrationBackend,
  OrchestrationStatus,
  RetryPolicy,
  TaskFailedError,
  TaskFailureDetails,
  TestOrchestrationClient,
  TestOrchestrationWorker,
} from "../src";
import { newOrchestrationState } from "../src/orchestration";
import * as pb from "../src/proto/orchestrator_service_pb";
import { convertProtoHistoryEvent } from "../src/utils/history-event-converter";
import { newFailureDetails } from "../src/utils/pb-helper.util";

const wireProperties = {
  code: "PaymentDeclined",
  count: 0,
  retryable: false,
  reason: "",
  optional: null,
  context: { values: [1.5, true, null, "", { currency: "USD" }] },
  timestamp: "dt:2026-09-28T00:00:00Z",
};

function receivedFailure(): pb.TaskFailureDetails {
  const failure = newFailureDetails(errorChain());
  for (const [key, value] of Object.entries(wireProperties)) {
    failure.getPropertiesMap().set(key, Value.fromJavaScript(value));
  }
  failure.getInnerfailure()!.getPropertiesMap().set("status", Value.fromJavaScript(402));
  return pb.TaskFailureDetails.deserializeBinary(failure.serializeBinary());
}

function errorChain(): Error {
  const inner = new Error("Connection timed out");
  inner.name = "ConnectionTimeout";
  inner.stack = undefined;
  const middle = new Error("Payment failed", { cause: inner });
  middle.name = "PaymentFailed";
  middle.stack = "";
  const outer = new Error("Order failed", { cause: middle });
  outer.name = "OrderFailed";
  outer.stack = "order stack";
  return outer;
}

function addBoundedCycle(tail: TaskFailureDetails, target: TaskFailureDetails) {
  let reads = 0;
  const get = jest.fn(() => {
    // Keep a regressed serializer from hanging the test process.
    if (++reads > 4) throw new Error("Repeatedly traversed a circular innerFailure");
    return target;
  });
  Object.defineProperty(tail, "innerFailure", { get });
  return get;
}

const expectedChain = {
  errorType: "OrderFailed",
  message: "Order failed",
  stackTrace: "order stack",
  innerFailure: {
    errorType: "PaymentFailed",
    message: "Payment failed",
    stackTrace: "",
    innerFailure: {
      errorType: "ConnectionTimeout",
      message: "Connection timed out",
      stackTrace: undefined,
      innerFailure: undefined,
    },
  },
};

const expectedReceivedChain = {
  ...expectedChain,
  properties: wireProperties,
  innerFailure: { ...expectedChain.innerFailure, properties: { status: 402 } },
};

describe("Public failure details", () => {
  it("receives and forwards structured wire properties at each failure level", () => {
    const proto = receivedFailure();
    const error = new TaskFailedError("Activity task failed", proto);
    expect(error.details.properties).toEqual(wireProperties);
    expect(error.details.innerFailure?.properties).toEqual({ status: 402 });
    expect(newFailureDetails(error).getInnerfailure()?.serializeBinary()).toEqual(proto.serializeBinary());
  });

  it("keeps delivered property keys as data at the root and inside lists and structs", () => {
    const fields = new Struct();
    fields.getFieldsMap().set("constructor", Value.fromJavaScript("also data"));
    fields.getFieldsMap().set("toString", Value.fromJavaScript({ marker: "data" }));
    const value = new Value().setStructValue(fields);
    const proto = new pb.TaskFailureDetails();
    proto.getPropertiesMap().set("nested", value);
    proto.getPropertiesMap().set("constructor", Value.fromJavaScript(false));
    proto.getPropertiesMap().set("list", new Value().setListValue(new ListValue().setValuesList([value])));
    const decoded = pb.TaskFailureDetails.deserializeBinary(proto.serializeBinary());
    const error = new TaskFailedError("failed", decoded);
    const nested = { constructor: "also data", toString: { marker: "data" } };
    const expected = { nested, constructor: false, list: [nested] };
    expect(Reflect.get(error.details, "properties")).toEqual(expected);
    expect(Object.prototype).not.toHaveProperty("marker");
    expect(newFailureDetails(error).getInnerfailure()?.serializeBinary()).toEqual(decoded.serializeBinary());
  });

  it.each([undefined, 1n, () => 1, new Date(0), { nested: undefined }, Object.fromEntries([["__proto__", "data"]])])(
    "rejects unsupported values added to received properties (%p)",
    (value) => {
      const error = new TaskFailedError("failed", receivedFailure());
      Object.defineProperty(error.details, "properties", { value: { invalid: value } });
      expect(() => newFailureDetails(error)).toThrow();
    },
  );

  it("rejects a cyclic property graph rather than returning a truncated success", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const error = new TaskFailedError("failed", receivedFailure());
    Object.defineProperty(error.details, "properties", { value: cyclic });
    expect(() => newFailureDetails(error)).toThrow();
  });

  it("forwards deeply nested property values without an arbitrary depth limit", () => {
    let value: unknown = { leaf: false };
    for (let i = 0; i < 15; i++) value = { child: value };
    const error = new TaskFailedError("failed", receivedFailure());
    Object.defineProperty(error.details, "properties", { value: { deep: value } });
    expect(newFailureDetails(error).getInnerfailure()?.getPropertiesMap().get("deep")?.toJavaScript()).toEqual(value);
  });

  it("does not collect arbitrary properties from ordinary JavaScript errors", () => {
    const error = Object.assign(new Error("local"), { properties: wireProperties, code: "local" });
    expect(newFailureDetails(error).getPropertiesMap().getLength()).toBe(0);
  });

  it("preserves a three-level wire chain in TaskFailedError without changing its message or cause", () => {
    const error = new TaskFailedError("Activity task failed", newFailureDetails(errorChain()));
    expect(error.details).toMatchObject(expectedChain);
    expect(error.name).toBe("TaskFailedError");
    expect(error.message).toBe("Activity task failed");
    expect(error.cause).toBeUndefined();
  });

  it("keeps existing constructors and missing or empty wire fields compatible", () => {
    expect(new FailureDetails("message", "Error", "stack")).toMatchObject({
      message: "message",
      errorType: "Error",
      stackTrace: "stack",
      innerFailure: undefined,
      properties: undefined,
    });
    expect(new FailureDetails("message", "Error").stackTrace).toBeUndefined();
    const proto = new pb.TaskFailureDetails();
    expect(new TaskFailedError("failed", proto).details).toMatchObject({
      message: "",
      errorType: "",
      stackTrace: undefined,
      innerFailure: undefined,
      properties: undefined,
    });
    proto.setStacktrace(new StringValue().setValue(""));
    expect(new TaskFailedError("failed", proto).details.stackTrace).toBe("");
    const inner = new FailureDetails("inner", "InnerError");
    expect(new FailureDetails("outer", "OuterError", undefined, inner).innerFailure).toBe(inner);
    const properties = { code: "RemoteCode" };
    const details = new FailureDetails("outer", "OuterError", undefined, inner, properties);
    expect(details.properties).toBe(properties);
    expect(Reflect.set(details, "properties", {})).toBe(false);
  });

  it("does not apply the outbound Error.cause depth limit to an incoming wire chain", () => {
    let proto = new pb.TaskFailureDetails().setErrortype("").setErrormessage("");
    let expected: object = { errorType: "", message: "", innerFailure: undefined };
    for (let i = 0; i < 15; i++) {
      proto = new pb.TaskFailureDetails().setErrortype("Error").setErrormessage(String(i)).setInnerfailure(proto);
      expected = { errorType: "Error", message: String(i), innerFailure: expected };
    }
    const decoded = pb.TaskFailureDetails.deserializeBinary(proto.serializeBinary());
    const error = new TaskFailedError("failed", decoded);
    expect(error.details).toMatchObject(expected);
    const forwarded = newFailureDetails(error);
    expect(forwarded.getErrortype()).toBe("TaskFailedError");
    expect(forwarded.getErrormessage()).toBe(error.message);
    expect(forwarded.getStacktrace()?.getValue()).toBe(error.stack);
    expect(forwarded.getInnerfailure()?.serializeBinary()).toEqual(proto.serializeBinary());
  });

  it("retains explicitly assigned JavaScript causes on task errors", () => {
    const error = new TaskFailedError("failed", newFailureDetails(errorChain()));
    const getInnerFailure = addBoundedCycle(error.details, error.details);
    error.cause = new Error("explicit cause");
    expect(newFailureDetails(error).getInnerfailure()?.getErrormessage()).toBe("explicit cause");
    expect(getInnerFailure).not.toHaveBeenCalled();
  });

  it.each([1, 3])("marks a %i-node cycle after preserving each unique failure and the task wrapper", (length) => {
    const proto = receivedFailure();
    const error = new TaskFailedError("Activity task failed", proto);
    let tail: TaskFailureDetails = error.details;
    for (let i = 1; i < length; i++) tail = tail.innerFailure!;
    const getInnerFailure = addBoundedCycle(tail, error.details);

    const forwarded = newFailureDetails(error);
    expect(forwarded.getErrortype()).toBe("TaskFailedError");
    expect(forwarded.getErrormessage()).toBe(error.message);
    expect(forwarded.getStacktrace()?.getValue()).toBe(error.stack);
    let actual = forwarded.getInnerfailure();
    let expected: pb.TaskFailureDetails | undefined = proto;
    for (let i = 0; i < length; i++) {
      expect(actual?.getErrortype()).toBe(expected?.getErrortype());
      expect(actual?.getErrormessage()).toBe(expected?.getErrormessage());
      expect(actual?.getStacktrace()?.getValue()).toBe(expected?.getStacktrace()?.getValue());
      expect(actual?.getPropertiesMap().toArray()).toEqual(expected?.getPropertiesMap().toArray());
      actual = actual?.getInnerfailure();
      expected = expected?.getInnerfailure();
    }
    expect(actual?.getErrortype()).toBe("CircularFailureDetails");
    expect(actual?.getErrormessage()).toBe("A circular innerFailure reference was detected.");
    expect(actual?.getStacktrace()).toBeUndefined();
    expect(actual?.getInnerfailure()).toBeUndefined();
    expect(getInnerFailure).toHaveBeenCalledTimes(1);
  });

  it("does not treat distinct failure objects with identical fields as a cycle", () => {
    const proto = new pb.TaskFailureDetails()
      .setErrortype("Error")
      .setErrormessage("same")
      .setInnerfailure(new pb.TaskFailureDetails().setErrortype("Error").setErrormessage("same"));
    const error = new TaskFailedError("failed", proto);
    expect(error.details.innerFailure).not.toBe(error.details);
    expect(newFailureDetails(error).getInnerfailure()?.serializeBinary()).toEqual(proto.serializeBinary());
  });

  it("preserves the chain in orchestration state and raiseIfFailed", () => {
    const proto = new pb.OrchestrationState().setFailuredetails(receivedFailure());
    const state = newOrchestrationState(
      "order",
      new pb.GetInstanceResponse().setExists(true).setOrchestrationstate(proto),
    );
    expect(state?.failureDetails).toMatchObject(expectedReceivedChain);
    let thrown: unknown;
    try {
      state?.raiseIfFailed();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      name: "OrchestrationFailedError",
      message: "Orchestration 'order' failed: Order failed",
      failureDetails: expectedReceivedChain,
    });
  });

  it.each(["execution", "activity", "subOrchestration", "entity"] as const)(
    "preserves the chain in %s history events",
    (kind) => {
      const details = receivedFailure();
      const event = new pb.HistoryEvent();
      if (kind === "execution")
        event.setExecutioncompleted(new pb.ExecutionCompletedEvent().setFailuredetails(details));
      if (kind === "activity") event.setTaskfailed(new pb.TaskFailedEvent().setFailuredetails(details));
      if (kind === "subOrchestration") {
        event.setSuborchestrationinstancefailed(
          new pb.SubOrchestrationInstanceFailedEvent().setFailuredetails(details),
        );
      }
      if (kind === "entity")
        event.setEntityoperationfailed(new pb.EntityOperationFailedEvent().setFailuredetails(details));
      expect(convertProtoHistoryEvent(event)).toMatchObject({
        failureDetails: expectedReceivedChain,
      });
    },
  );
});

describe.each(["activity", "subOrchestration"] as const)("In-memory %s received failure chains", (kind) => {
  it.each(["handler", "policy"] as const)(
    "reaches %s retry inspection, catch, history and client state",
    async (mode) => {
      const backend = new InMemoryOrchestrationBackend();
      const client = new TestOrchestrationClient(backend);
      const worker = new TestOrchestrationWorker(backend);
      const inspected: TaskFailureDetails[] = [];
      const caught: FailureDetails[] = [];
      const inspectFailure = (failure: TaskFailureDetails) => {
        inspected.push(failure);
        return false;
      };
      const retry =
        mode === "policy"
          ? new RetryPolicy({
              firstRetryIntervalInMilliseconds: 1,
              maxNumberOfAttempts: 3,
              handleFailure: inspectFailure,
            })
          : (context: { lastFailure: TaskFailureDetails }) => inspectFailure(context.lastFailure);
      const fail = () => {
        // Simulate an error already received from a foreign worker, not local Error field collection.
        throw new TaskFailedError("Foreign task failed", receivedFailure());
      };
      const expected = { errorType: "TaskFailedError", innerFailure: expectedReceivedChain };
      worker.addNamedActivity("fail", fail);
      worker.addNamedOrchestrator("fail", fail);
      worker.addNamedOrchestrator("order", async function* (ctx) {
        try {
          if (kind === "activity") yield ctx.callActivity("fail", undefined, { retry });
          else yield ctx.callSubOrchestrator("fail", undefined, { retry, instanceId: "child" });
        } catch (error) {
          if (!(error instanceof TaskFailedError)) throw error;
          caught.push(error.details);
          throw error;
        }
      });
      await worker.start();
      try {
        const id = await client.scheduleNewOrchestration("order");
        const state = await client.waitForOrchestrationCompletion(id, true, 5);
        expect(inspected).toHaveLength(1);
        expect(inspected[0]).toMatchObject(expected);
        expect(caught).toHaveLength(1);
        expect(caught[0]).toMatchObject(expected);
        expect(state?.runtimeStatus).toBe(OrchestrationStatus.FAILED);
        const terminalFailure = {
          errorType: "TaskFailedError",
          innerFailure: expected,
        };
        expect(state?.failureDetails).toMatchObject(terminalFailure);
        expect((await client.getOrchestrationState(id, false))?.failureDetails).toMatchObject(terminalFailure);
        const history = backend.getInstance(id)!.history.map(convertProtoHistoryEvent);
        const failedEvent = history.find(
          (event) => event && "failureDetails" in event && event.failureDetails?.errorType === "TaskFailedError",
        );
        expect(failedEvent).toMatchObject({ failureDetails: expected });
        if (kind === "subOrchestration") {
          expect((await client.getOrchestrationState("child"))?.failureDetails).toMatchObject(expected);
        }
      } finally {
        await worker.stop();
        backend.reset();
      }
    },
  );
});

it.each([false, true])("preserves terminal activity failure details with a cyclic rethrow: %s", async (cyclic) => {
  const backend = new InMemoryOrchestrationBackend();
  const client = new TestOrchestrationClient(backend);
  const worker = new TestOrchestrationWorker(backend);
  worker.addNamedActivity("fail", () => {
    throw errorChain();
  });
  worker.addNamedOrchestrator("order", async function* (ctx) {
    if (!cyclic) {
      yield ctx.callActivity("fail");
    } else {
      try {
        yield ctx.callActivity("fail");
      } catch (error) {
        if (!(error instanceof TaskFailedError)) throw error;
        addBoundedCycle(error.details, error.details);
        throw error;
      }
    }
  });
  await worker.start();
  try {
    const id = await client.scheduleNewOrchestration("order");
    const state = await client.waitForOrchestrationCompletion(id, true, 5);
    expect(state?.runtimeStatus).toBe(OrchestrationStatus.FAILED);
    expect(state?.failureDetails).toMatchObject({
      errorType: "TaskFailedError",
      message: "Activity task #1 failed: Order failed",
      innerFailure: cyclic
        ? {
            ...expectedChain,
            innerFailure: {
              errorType: "CircularFailureDetails",
              message: "A circular innerFailure reference was detected.",
              innerFailure: undefined,
            },
          }
        : expectedChain,
    });
  } finally {
    await worker.stop();
    backend.reset();
  }
});
