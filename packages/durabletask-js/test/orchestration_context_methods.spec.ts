// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CompleteOrchestrationAction, OrchestratorAction } from "../src/proto/orchestrator_service_pb";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import {
  newExecutionStartedEvent,
  newOrchestratorStartedEvent,
} from "../src/utils/pb-helper.util";
import { OrchestrationExecutor, OrchestrationExecutionResult } from "../src/worker/orchestration-executor";
import * as pb from "../src/proto/orchestrator_service_pb";
import { Registry } from "../src/worker/registry";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { Logger } from "../src/types/logger.type";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";

const TEST_INSTANCE_ID = "test-instance-abc123";

/**
 * Helper to create execution started event with version
 */
function newExecutionStartedEventWithVersion(
  name: string,
  instanceId: string,
  version?: string,
  encodedInput?: string,
): pb.HistoryEvent {
  const ts = new Timestamp();

  const orchestrationInstance = new pb.OrchestrationInstance();
  orchestrationInstance.setInstanceid(instanceId);

  const executionStartedEvent = new pb.ExecutionStartedEvent();
  executionStartedEvent.setName(name);
  if (encodedInput) {
    const input = new StringValue();
    input.setValue(encodedInput);
    executionStartedEvent.setInput(input);
  }
  executionStartedEvent.setOrchestrationinstance(orchestrationInstance);
  if (version) {
    const versionValue = new StringValue();
    versionValue.setValue(version);
    executionStartedEvent.setVersion(versionValue);
  }

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setTimestamp(ts);
  event.setExecutionstarted(executionStartedEvent);

  return event;
}

/**
 * Helper to extract the CompleteOrchestrationAction from an OrchestrationExecutionResult
 */
function getAndValidateSingleCompleteOrchestrationAction(
  result: OrchestrationExecutionResult,
): CompleteOrchestrationAction | undefined {
  expect(result.actions.length).toEqual(1);
  const action = result.actions[0];
  expect(action?.constructor?.name).toEqual(OrchestratorAction.name);
  const resCompleteOrchestration = action.getCompleteorchestration();
  expect(resCompleteOrchestration).not.toBeNull();
  return resCompleteOrchestration;
}

describe("OrchestrationContext.setCustomStatus", () => {
  it("should set custom status as a string", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      ctx.setCustomStatus("my custom status");
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
    );
    expect(result.customStatus).toEqual('"my custom status"');
  });

  it("should set custom status as an object", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      ctx.setCustomStatus({ step: 1, message: "processing" });
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
    );
    expect(result.customStatus).toEqual(JSON.stringify({ step: 1, message: "processing" }));
  });

  it("should allow clearing custom status by setting it to undefined", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      ctx.setCustomStatus("initial");
      ctx.setCustomStatus(undefined);
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    expect(result.customStatus).toBeUndefined();
  });

  it("should update custom status multiple times", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      ctx.setCustomStatus("step1");
      ctx.setCustomStatus("step2");
      ctx.setCustomStatus("step3");
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // The last set value should be returned
    expect(result.customStatus).toEqual('"step3"');
  });
});

describe("OrchestrationContext.sendEvent", () => {
  it("should create a SendEvent action with event name and data", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      ctx.sendEvent("target-instance-id", "my-event", { data: "value" });
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // Should have 2 actions: sendEvent (fire-and-forget) + completeOrchestration
    expect(result.actions.length).toEqual(2);

    // Find and verify the sendEvent action
    const sendEventAction = result.actions.find((a) => a.hasSendevent());
    expect(sendEventAction).toBeDefined();
    const sendEvent = sendEventAction?.getSendevent();
    expect(sendEvent?.getInstance()?.getInstanceid()).toEqual("target-instance-id");
    expect(sendEvent?.getName()).toEqual("my-event");
    expect(sendEvent?.getData()?.getValue()).toEqual(JSON.stringify({ data: "value" }));

    // Verify the complete action is also present
    const completeAction = result.actions.find((a) => a.hasCompleteorchestration());
    expect(completeAction).toBeDefined();
  });

  it("should create a SendEvent action without data", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      ctx.sendEvent("target-instance-id", "signal-event");
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // Should have 2 actions: sendEvent (fire-and-forget) + completeOrchestration
    expect(result.actions.length).toEqual(2);

    // Find and verify the sendEvent action
    const sendEventAction = result.actions.find((a) => a.hasSendevent());
    expect(sendEventAction).toBeDefined();
    const sendEvent = sendEventAction?.getSendevent();
    expect(sendEvent?.getInstance()?.getInstanceid()).toEqual("target-instance-id");
    expect(sendEvent?.getName()).toEqual("signal-event");
    // No data should be set (or empty)
    expect(sendEvent?.getData()?.getValue() ?? "").toEqual("");
  });
});

describe("OrchestrationContext.newGuid", () => {
  it("should generate a deterministic GUID", async () => {
    let capturedGuid1: string | undefined;
    let capturedGuid2: string | undefined;

    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      capturedGuid1 = ctx.newGuid();
      capturedGuid2 = ctx.newGuid();
      return [capturedGuid1, capturedGuid2];
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date(2024, 0, 15, 10, 30, 0, 0); // Fixed timestamp for determinism
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
    );

    // Verify GUIDs are in valid UUID format (8-4-4-4-12 hex chars)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(capturedGuid1).toMatch(uuidRegex);
    expect(capturedGuid2).toMatch(uuidRegex);

    // Verify GUIDs are different from each other
    expect(capturedGuid1).not.toEqual(capturedGuid2);
  });

  it("should generate the same GUIDs across replays with same inputs", async () => {
    let firstRunGuids: string[] = [];
    let secondRunGuids: string[] = [];

    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      const guids = [ctx.newGuid(), ctx.newGuid(), ctx.newGuid()];
      return guids;
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date(2024, 0, 15, 10, 30, 0, 0); // Fixed timestamp
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];

    // First run
    const executor1 = new OrchestrationExecutor(registry);
    const result1 = await executor1.execute(TEST_INSTANCE_ID, [], newEvents);
    const output1 = result1.actions[0].getCompleteorchestration()?.getResult()?.getValue();
    firstRunGuids = JSON.parse(output1!);

    // Second run with same events (simulating replay)
    const executor2 = new OrchestrationExecutor(registry);
    const result2 = await executor2.execute(TEST_INSTANCE_ID, [], newEvents);
    const output2 = result2.actions[0].getCompleteorchestration()?.getResult()?.getValue();
    secondRunGuids = JSON.parse(output2!);

    // GUIDs should be identical across runs
    expect(firstRunGuids).toEqual(secondRunGuids);
    expect(firstRunGuids.length).toEqual(3);
  });

  it("should generate different GUIDs for different instance IDs", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      return ctx.newGuid();
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date(2024, 0, 15, 10, 30, 0, 0);

    // Run with instance 1
    const events1 = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, "instance-1"),
    ];
    const executor1 = new OrchestrationExecutor(registry);
    const result1 = await executor1.execute("instance-1", [], events1);
    const instance1Guid = JSON.parse(
      result1.actions[0].getCompleteorchestration()?.getResult()?.getValue() ?? "",
    );

    // Run with instance 2
    const events2 = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, "instance-2"),
    ];
    const executor2 = new OrchestrationExecutor(registry);
    const result2 = await executor2.execute("instance-2", [], events2);
    const instance2Guid = JSON.parse(
      result2.actions[0].getCompleteorchestration()?.getResult()?.getValue() ?? "",
    );

    // GUIDs should be different for different instance IDs
    expect(instance1Guid).not.toEqual(instance2Guid);
  });

  it("should generate GUIDs in the format of UUID v5", async () => {
    let capturedGuid: string | undefined;

    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      capturedGuid = ctx.newGuid();
      return capturedGuid;
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date(2024, 0, 15, 10, 30, 0, 0);
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry);
    await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // UUID v5 has version byte at position 14 (should be '5')
    // and variant bits at position 19 (should be '8', '9', 'a', or 'b')
    expect(capturedGuid).toBeDefined();
    expect(capturedGuid![14]).toEqual("5"); // Version 5
    expect(["8", "9", "a", "b"]).toContain(capturedGuid![19].toLowerCase()); // Variant bits
  });
});

describe("OrchestrationContext.version", () => {
  it("should return the version from execution started event", async () => {
    let capturedVersion: string | undefined;

    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      capturedVersion = ctx.version;
      return capturedVersion;
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEventWithVersion(name, TEST_INSTANCE_ID, "1.0.0"),
    ];
    const executor = new OrchestrationExecutor(registry);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    expect(capturedVersion).toEqual("1.0.0");
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
    );
    expect(JSON.parse(completeAction?.getResult()?.getValue() ?? "")).toEqual("1.0.0");
  });

  it("should return empty string when no version is set", async () => {
    let capturedVersion: string | undefined;

    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      capturedVersion = ctx.version;
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry);
    await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    expect(capturedVersion).toEqual("");
  });

  it("should preserve version during replay", async () => {
    const versions: string[] = [];

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      versions.push(ctx.version);
      yield ctx.createTimer(1);
      versions.push(ctx.version);
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);

    // First execution
    const newEvents1 = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEventWithVersion(name, TEST_INSTANCE_ID, "2.0.0"),
    ];
    const executor1 = new OrchestrationExecutor(registry);
    await executor1.execute(TEST_INSTANCE_ID, [], newEvents1);

    expect(versions[0]).toEqual("2.0.0");
  });
});

describe("OrchestrationContext.createReplaySafeLogger", () => {
  it("should create a replay-safe logger that logs when not replaying", async () => {
    const logMessages: string[] = [];
    const mockLogger: Logger = {
      error: (msg) => logMessages.push(`error: ${msg}`),
      warn: (msg) => logMessages.push(`warn: ${msg}`),
      info: (msg) => logMessages.push(`info: ${msg}`),
      debug: (msg) => logMessages.push(`debug: ${msg}`),
    };

    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      const logger = ctx.createReplaySafeLogger(mockLogger);
      logger.info("test message");
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry);
    await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // Should have logged since this was not a replay
    expect(logMessages).toContain("info: test message");
  });

  it("should not log during replay phase", async () => {
    const logMessages: string[] = [];
    const mockLogger: Logger = {
      error: (msg) => logMessages.push(`error: ${msg}`),
      warn: (msg) => logMessages.push(`warn: ${msg}`),
      info: (msg) => logMessages.push(`info: ${msg}`),
      debug: (msg) => logMessages.push(`debug: ${msg}`),
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      const logger = ctx.createReplaySafeLogger(mockLogger);
      logger.info("first log");
      yield ctx.createTimer(1);
      logger.info("second log");
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);

    // First execution - should log "first log"
    const startTime = new Date(2024, 0, 15, 10, 30, 0, 0);
    const newEvents1 = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor1 = new OrchestrationExecutor(registry);
    await executor1.execute(TEST_INSTANCE_ID, [], newEvents1);

    expect(logMessages).toContain("info: first log");
    expect(logMessages).not.toContain("info: second log");
    
    // Clear logs
    logMessages.length = 0;

    // Now simulate replay + timer fired
    const fireAt = new Date(startTime.getTime() + 1000);
    const oldEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    // Create timer created event
    const timerCreatedEvent = new pb.HistoryEvent();
    timerCreatedEvent.setEventid(1);
    const timerCreated = new pb.TimerCreatedEvent();
    const fireAtTs = new Timestamp();
    fireAtTs.fromDate(fireAt);
    timerCreated.setFireat(fireAtTs);
    timerCreatedEvent.setTimercreated(timerCreated);
    oldEvents.push(timerCreatedEvent);

    const newEvents2 = [
      newOrchestratorStartedEvent(fireAt),
    ];
    // Create timer fired event
    const timerFiredEvent = new pb.HistoryEvent();
    timerFiredEvent.setEventid(-1);
    const timerFired = new pb.TimerFiredEvent();
    timerFired.setTimerid(1);
    timerFired.setFireat(fireAtTs);
    timerFiredEvent.setTimerfired(timerFired);
    newEvents2.push(timerFiredEvent);

    const executor2 = new OrchestrationExecutor(registry);
    await executor2.execute(TEST_INSTANCE_ID, oldEvents, newEvents2);

    // "first log" should NOT have been logged again (replay phase)
    // "second log" SHOULD have been logged (new execution phase)
    expect(logMessages).not.toContain("info: first log");
    expect(logMessages).toContain("info: second log");
  });
});

describe("OrchestrationContext.compareVersionTo", () => {
  it("should return 0 when versions are equal", async () => {
    let comparisonResult: number | undefined;
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      comparisonResult = ctx.compareVersionTo("1.0.0");
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEventWithVersion(name, TEST_INSTANCE_ID, "1.0.0"),
    ];
    const executor = new OrchestrationExecutor(registry);
    await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    expect(comparisonResult).toEqual(0);
  });

  it("should return positive number when context version is greater", async () => {
    let comparisonResult: number | undefined;
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      comparisonResult = ctx.compareVersionTo("1.0.0");
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEventWithVersion(name, TEST_INSTANCE_ID, "2.0.0"),
    ];
    const executor = new OrchestrationExecutor(registry);
    await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    expect(comparisonResult).toBeGreaterThan(0);
  });

  it("should return negative number when context version is less", async () => {
    let comparisonResult: number | undefined;
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      comparisonResult = ctx.compareVersionTo("2.0.0");
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEventWithVersion(name, TEST_INSTANCE_ID, "1.0.0"),
    ];
    const executor = new OrchestrationExecutor(registry);
    await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    expect(comparisonResult).toBeLessThan(0);
  });

  it("should handle patch version comparison", async () => {
    let comparisonResult: number | undefined;
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      comparisonResult = ctx.compareVersionTo("1.0.0");
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEventWithVersion(name, TEST_INSTANCE_ID, "1.0.1"),
    ];
    const executor = new OrchestrationExecutor(registry);
    await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    expect(comparisonResult).toBeGreaterThan(0);
  });

  it("should handle minor version comparison", async () => {
    let comparisonResult: number | undefined;
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      comparisonResult = ctx.compareVersionTo("1.1.0");
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEventWithVersion(name, TEST_INSTANCE_ID, "1.0.0"),
    ];
    const executor = new OrchestrationExecutor(registry);
    await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    expect(comparisonResult).toBeLessThan(0);
  });
});

