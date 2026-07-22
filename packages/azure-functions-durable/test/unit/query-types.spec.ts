// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationState, OrchestrationStatus } from "@microsoft/durabletask-js";
import { EntityStateResponse } from "../../src/entity-state-response";
import {
  DurableOrchestrationStatus,
  OrchestrationRuntimeStatus,
  toDurableOrchestrationStatus,
  toOrchestrationRuntimeStatus,
} from "../../src/orchestration-status";
import { PurgeHistoryResult } from "../../src/purge-history-result";

describe("toOrchestrationRuntimeStatus", () => {
  it("maps core statuses to the classic v3 runtime status strings", () => {
    expect(toOrchestrationRuntimeStatus(OrchestrationStatus.RUNNING)).toBe(
      OrchestrationRuntimeStatus.Running,
    );
    expect(toOrchestrationRuntimeStatus(OrchestrationStatus.COMPLETED)).toBe(
      OrchestrationRuntimeStatus.Completed,
    );
    expect(toOrchestrationRuntimeStatus(OrchestrationStatus.CONTINUED_AS_NEW)).toBe(
      OrchestrationRuntimeStatus.ContinuedAsNew,
    );
    expect(toOrchestrationRuntimeStatus(OrchestrationStatus.FAILED)).toBe(
      OrchestrationRuntimeStatus.Failed,
    );
    expect(toOrchestrationRuntimeStatus(OrchestrationStatus.TERMINATED)).toBe(
      OrchestrationRuntimeStatus.Terminated,
    );
    expect(toOrchestrationRuntimeStatus(OrchestrationStatus.PENDING)).toBe(
      OrchestrationRuntimeStatus.Pending,
    );
    expect(toOrchestrationRuntimeStatus(OrchestrationStatus.SUSPENDED)).toBe(
      OrchestrationRuntimeStatus.Suspended,
    );
  });
});

describe("toDurableOrchestrationStatus", () => {
  it("maps a core OrchestrationState and deserializes JSON payloads", () => {
    const created = new Date("2026-01-01T00:00:00.000Z");
    const updated = new Date("2026-01-02T00:00:00.000Z");
    const state = new OrchestrationState(
      "instance-1",
      "helloOrchestrator",
      OrchestrationStatus.COMPLETED,
      created,
      updated,
      JSON.stringify({ city: "Tokyo" }),
      JSON.stringify("Hello Tokyo"),
      JSON.stringify({ stage: "done" }),
    );

    const status = toDurableOrchestrationStatus(state);

    expect(status).toBeInstanceOf(DurableOrchestrationStatus);
    expect(status.name).toBe("helloOrchestrator");
    expect(status.instanceId).toBe("instance-1");
    expect(status.createdTime).toBe(created);
    expect(status.lastUpdatedTime).toBe(updated);
    expect(status.input).toEqual({ city: "Tokyo" });
    expect(status.output).toBe("Hello Tokyo");
    expect(status.customStatus).toEqual({ stage: "done" });
    expect(status.runtimeStatus).toBe(OrchestrationRuntimeStatus.Completed);
  });

  it("leaves payloads undefined when the core state omits them", () => {
    const state = new OrchestrationState(
      "instance-2",
      "orch",
      OrchestrationStatus.RUNNING,
      new Date(),
      new Date(),
    );

    const status = toDurableOrchestrationStatus(state);

    expect(status.input).toBeUndefined();
    expect(status.output).toBeUndefined();
    expect(status.customStatus).toBeUndefined();
    expect(status.runtimeStatus).toBe(OrchestrationRuntimeStatus.Running);
  });

  it("treats empty-string payloads as undefined and still parses valid siblings", () => {
    // Regression: empty serialized fields previously threw
    // "SyntaxError: Unexpected end of JSON input" from JSON.parse("").
    const state = new OrchestrationState(
      "instance-3",
      "orch",
      OrchestrationStatus.RUNNING,
      new Date(),
      new Date(),
      JSON.stringify({ a: 1 }), // valid input still round-trips
      "", // empty output -> undefined (previously threw)
      "", // empty custom status -> undefined (previously threw)
    );

    let status!: DurableOrchestrationStatus;
    expect(() => {
      status = toDurableOrchestrationStatus(state);
    }).not.toThrow();

    expect(status.input).toEqual({ a: 1 });
    expect(status.output).toBeUndefined();
    expect(status.customStatus).toBeUndefined();
  });
});

describe("EntityStateResponse / PurgeHistoryResult", () => {
  it("EntityStateResponse carries existence and state", () => {
    const present = new EntityStateResponse<number>(true, 42);
    expect(present.entityExists).toBe(true);
    expect(present.entityState).toBe(42);

    const absent = new EntityStateResponse<number>(false);
    expect(absent.entityExists).toBe(false);
    expect(absent.entityState).toBeUndefined();
  });

  it("PurgeHistoryResult carries the deleted count", () => {
    expect(new PurgeHistoryResult(3).instancesDeleted).toBe(3);
  });
});
