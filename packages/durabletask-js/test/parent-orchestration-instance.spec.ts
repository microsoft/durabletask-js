// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { ParentOrchestrationInstance } from "../src/types/parent-orchestration-instance.type";
import {
  newExecutionStartedEvent,
  newOrchestratorStartedEvent,
} from "../src/utils/pb-helper.util";
import { OrchestrationExecutor } from "../src/worker/orchestration-executor";
import * as pb from "../src/proto/orchestrator_service_pb";
import { Registry } from "../src/worker/registry";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { NoOpLogger } from "../src/types/logger.type";

// Use NoOpLogger to suppress log output during tests
const testLogger = new NoOpLogger();

const TEST_INSTANCE_ID = "child-instance-123";
const PARENT_INSTANCE_ID = "parent-instance-456";
const PARENT_ORCHESTRATOR_NAME = "ParentOrchestrator";
const PARENT_TASK_SCHEDULED_ID = 5;

describe("Parent Orchestration Instance", () => {
  it("should return undefined for parent when orchestration is not a sub-orchestration", async () => {
    let capturedParent: ParentOrchestrationInstance | undefined;

    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      capturedParent = ctx.parent;
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date();
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // Verify the orchestration completed successfully
    expect(result.actions).not.toBeNull();
    expect(result.actions.length).toEqual(1);
    expect(result.actions[0]?.getCompleteorchestration()?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED
    );

    // Verify parent is undefined for top-level orchestration
    expect(capturedParent).toBeUndefined();
  });

  it("should return parent instance info when orchestration is a sub-orchestration", async () => {
    let capturedParent: ParentOrchestrationInstance | undefined;

    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      capturedParent = ctx.parent;
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date();
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined, {
        name: PARENT_ORCHESTRATOR_NAME,
        instanceId: PARENT_INSTANCE_ID,
        taskScheduledId: PARENT_TASK_SCHEDULED_ID,
      }),
    ];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // Verify the orchestration completed successfully
    expect(result.actions).not.toBeNull();
    expect(result.actions.length).toEqual(1);
    expect(result.actions[0]?.getCompleteorchestration()?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED
    );

    // Verify parent instance info
    expect(capturedParent).toBeDefined();
    expect(capturedParent!.name).toEqual(PARENT_ORCHESTRATOR_NAME);
    expect(capturedParent!.instanceId).toEqual(PARENT_INSTANCE_ID);
    expect(capturedParent!.taskScheduledId).toEqual(PARENT_TASK_SCHEDULED_ID);
  });

  it("should preserve parent info during replay", async () => {
    let capturedParentDuringReplay: ParentOrchestrationInstance | undefined;
    let capturedParentAfterReplay: ParentOrchestrationInstance | undefined;
    let replayState = true;

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      if (ctx.isReplaying) {
        capturedParentDuringReplay = ctx.parent;
        replayState = ctx.isReplaying;
      }

      // Create a timer to force replay
      yield ctx.createTimer(new Date(ctx.currentUtcDateTime.getTime() + 1000));

      capturedParentAfterReplay = ctx.parent;
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date(2020, 0, 1, 12, 0, 0);
    const fireAt = new Date(startTime.getTime() + 1000);

    // First execution - create timer
    const newEvents1 = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined, {
        name: PARENT_ORCHESTRATOR_NAME,
        instanceId: PARENT_INSTANCE_ID,
        taskScheduledId: PARENT_TASK_SCHEDULED_ID,
      }),
    ];

    const executor = new OrchestrationExecutor(registry, testLogger);
    await executor.execute(TEST_INSTANCE_ID, [], newEvents1);

    // Second execution - replay with timer fired
    const oldEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined, {
        name: PARENT_ORCHESTRATOR_NAME,
        instanceId: PARENT_INSTANCE_ID,
        taskScheduledId: PARENT_TASK_SCHEDULED_ID,
      }),
    ];

    // Import timer events
    const { newTimerCreatedEvent, newTimerFiredEvent } = require("../src/utils/pb-helper.util");

    const oldEventsWithTimer = [
      ...oldEvents,
      newTimerCreatedEvent(1, fireAt),
    ];
    const newEventsWithFired = [
      newTimerFiredEvent(1, fireAt),
    ];

    const executor2 = new OrchestrationExecutor(registry, testLogger);
    const result = await executor2.execute(TEST_INSTANCE_ID, oldEventsWithTimer, newEventsWithFired);

    // Verify the orchestration completed successfully
    expect(result.actions.length).toEqual(1);
    expect(result.actions[0]?.getCompleteorchestration()?.getOrchestrationstatus()).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED
    );

    // Verify parent info was preserved during replay
    expect(capturedParentDuringReplay).toBeDefined();
    expect(capturedParentDuringReplay!.name).toEqual(PARENT_ORCHESTRATOR_NAME);
    expect(capturedParentDuringReplay!.instanceId).toEqual(PARENT_INSTANCE_ID);

    // Verify parent info is still available after replay
    expect(capturedParentAfterReplay).toBeDefined();
    expect(capturedParentAfterReplay!.name).toEqual(PARENT_ORCHESTRATOR_NAME);
    expect(capturedParentAfterReplay!.instanceId).toEqual(PARENT_INSTANCE_ID);
  });

  it("should make parent info available in generator orchestrations", async () => {
    let capturedParent: ParentOrchestrationInstance | undefined;

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      capturedParent = ctx.parent;
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date();
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined, {
        name: PARENT_ORCHESTRATOR_NAME,
        instanceId: PARENT_INSTANCE_ID,
        taskScheduledId: PARENT_TASK_SCHEDULED_ID,
      }),
    ];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);

    // Verify parent instance info is accessible in generator functions
    expect(capturedParent).toBeDefined();
    expect(capturedParent!.name).toEqual(PARENT_ORCHESTRATOR_NAME);
    expect(capturedParent!.instanceId).toEqual(PARENT_INSTANCE_ID);
    expect(capturedParent!.taskScheduledId).toEqual(PARENT_TASK_SCHEDULED_ID);
  });

  it("should return parent info that can be used for debugging/logging", async () => {
    let logMessage = "";

    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext) => {
      if (ctx.parent) {
        logMessage = `Sub-orchestration of ${ctx.parent.name} (${ctx.parent.instanceId})`;
      } else {
        logMessage = "Top-level orchestration";
      }
      return logMessage;
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);

    // Test with parent
    const executor1 = new OrchestrationExecutor(registry, testLogger);
    const result1 = await executor1.execute(
      TEST_INSTANCE_ID,
      [],
      [
        newOrchestratorStartedEvent(),
        newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined, {
          name: PARENT_ORCHESTRATOR_NAME,
          instanceId: PARENT_INSTANCE_ID,
          taskScheduledId: 1,
        }),
      ]
    );

    expect(result1.actions[0]?.getCompleteorchestration()?.getResult()?.getValue()).toEqual(
      `"Sub-orchestration of ${PARENT_ORCHESTRATOR_NAME} (${PARENT_INSTANCE_ID})"`
    );

    // Test without parent
    logMessage = ""; // Reset
    const executor2 = new OrchestrationExecutor(registry, testLogger);
    const result2 = await executor2.execute(
      TEST_INSTANCE_ID,
      [],
      [
        newOrchestratorStartedEvent(),
        newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      ]
    );

    expect(result2.actions[0]?.getCompleteorchestration()?.getResult()?.getValue()).toEqual(
      '"Top-level orchestration"'
    );
  });
});
