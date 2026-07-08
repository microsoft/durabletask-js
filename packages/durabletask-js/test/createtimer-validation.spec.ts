// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationContext } from "../src/task/context/orchestration-context";
import {
  newExecutionStartedEvent,
  newOrchestratorStartedEvent,
} from "../src/utils/pb-helper.util";
import { OrchestrationExecutor, OrchestrationExecutionResult } from "../src/worker/orchestration-executor";
import * as pb from "../src/proto/orchestrator_service_pb";
import { Registry } from "../src/worker/registry";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { NoOpLogger } from "../src/types/logger.type";

const testLogger = new NoOpLogger();
const TEST_INSTANCE_ID = "test-createtimer-validation";

/**
 * Helper to extract the CompleteOrchestrationAction from an OrchestrationExecutionResult
 */
function getCompleteAction(
  result: OrchestrationExecutionResult,
): pb.CompleteOrchestrationAction | undefined {
  const completeActions = result.actions.filter((a) => a.hasCompleteorchestration());
  expect(completeActions.length).toEqual(1);
  return completeActions[0].getCompleteorchestration() ?? undefined;
}

describe("createTimer input validation", () => {
  it("should reject NaN as fireAt value", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer(NaN);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date("2025-01-01T00:00:00Z");
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    const completeAction = getCompleteAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
    );
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("createTimer");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("NaN");
  });

  it("should reject Infinity as fireAt value", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer(Infinity);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date("2025-01-01T00:00:00Z");
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    const completeAction = getCompleteAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
    );
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("createTimer");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("Infinity");
  });

  it("should reject negative Infinity as fireAt value", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer(-Infinity);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date("2025-01-01T00:00:00Z");
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    const completeAction = getCompleteAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
    );
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("createTimer");
  });

  it("should reject an invalid Date object", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer(new Date("not a date"));
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date("2025-01-01T00:00:00Z");
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    const completeAction = getCompleteAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
    );
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("createTimer");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("invalid Date");
  });

  it("should reject a finite number that produces an invalid Date", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer(Number.MAX_VALUE);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date("2025-01-01T00:00:00Z");
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    const completeAction = getCompleteAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
    );
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("createTimer");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("invalid Date");
  });

  it("should accept a valid positive number (seconds)", async () => {
    const delaySeconds = 30;
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer(delaySeconds);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date("2025-01-01T00:00:00Z");
    const expectedFireAt = new Date(startTime.getTime() + delaySeconds * 1000);
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // Should have a createTimer action (not failed)
    const timerActions = result.actions.filter((a) => a.hasCreatetimer());
    expect(timerActions.length).toEqual(1);
    const fireAt = timerActions[0].getCreatetimer()?.getFireat()?.toDate();
    expect(fireAt?.getTime()).toEqual(expectedFireAt.getTime());
  });

  it("should accept zero as a valid delay (fires immediately)", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer(0);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date("2025-01-01T00:00:00Z");
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // Zero is a valid delay — timer fires at the current orchestration time
    const timerActions = result.actions.filter((a) => a.hasCreatetimer());
    expect(timerActions.length).toEqual(1);
    const fireAt = timerActions[0].getCreatetimer()?.getFireat()?.toDate();
    expect(fireAt?.getTime()).toEqual(startTime.getTime());
  });

  it("should accept a valid Date object", async () => {
    const futureDate = new Date("2025-06-15T12:00:00Z");
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer(futureDate);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date("2025-01-01T00:00:00Z");
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    const timerActions = result.actions.filter((a) => a.hasCreatetimer());
    expect(timerActions.length).toEqual(1);
    const fireAt = timerActions[0].getCreatetimer()?.getFireat()?.toDate();
    expect(fireAt?.getTime()).toEqual(futureDate.getTime());
  });

  it("should accept a negative number (timer fires in the past, which the sidecar handles)", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer(-5);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date("2025-01-01T00:00:00Z");
    const expectedFireAt = new Date(startTime.getTime() - 5000);
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // Negative delays create a timer in the past — sidecar fires it immediately.
    // This is valid behavior for scenarios like conditional timer creation.
    const timerActions = result.actions.filter((a) => a.hasCreatetimer());
    expect(timerActions.length).toEqual(1);
    const fireAt = timerActions[0].getCreatetimer()?.getFireat()?.toDate();
    expect(fireAt?.getTime()).toEqual(expectedFireAt.getTime());
  });

  it("should accept fractional seconds", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      yield ctx.createTimer(1.5);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date("2025-01-01T00:00:00Z");
    const expectedFireAt = new Date(startTime.getTime() + 1500);
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    const timerActions = result.actions.filter((a) => a.hasCreatetimer());
    expect(timerActions.length).toEqual(1);
    const fireAt = timerActions[0].getCreatetimer()?.getFireat()?.toDate();
    expect(fireAt?.getTime()).toEqual(expectedFireAt.getTime());
  });
});
