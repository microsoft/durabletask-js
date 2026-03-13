// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CompleteOrchestrationAction, OrchestratorAction } from "../src/proto/orchestrator_service_pb";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import {
  newEventRaisedEvent,
  newExecutionStartedEvent,
  newOrchestratorStartedEvent,
  newResumeEvent,
  newSubOrchestrationCompletedEvent,
  newSubOrchestrationCreatedEvent,
  newSubOrchestrationFailedEvent,
  newSuspendEvent,
  newTaskCompletedEvent,
  newTaskFailedEvent,
  newTaskScheduledEvent,
  newTerminatedEvent,
  newTimerCreatedEvent,
  newTimerFiredEvent,
} from "../src/utils/pb-helper.util";
import { OrchestrationExecutor, OrchestrationExecutionResult } from "../src/worker/orchestration-executor";
import * as pb from "../src/proto/orchestrator_service_pb";
import { Registry } from "../src/worker/registry";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { NoOpLogger } from "../src/types/logger.type";
import { ActivityContext } from "../src/task/context/activity-context";
import { CompletableTask } from "../src/task/completable-task";
import { Task } from "../src/task/task";
import { getName, whenAll, whenAny } from "../src/task";
import { RuntimeOrchestrationContext } from "../src/worker/runtime-orchestration-context";

// Use NoOpLogger to suppress log output during tests
const testLogger = new NoOpLogger();

const TEST_INSTANCE_ID = "abc123";

describe("Orchestration Executor", () => {
  it("should validate the orchestrator function input population", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext, input: any) => {
      // return all orchestrator inputs back as the output
      return [input, ctx.instanceId, ctx.currentUtcDateTime, ctx.isReplaying];
    };

    const testInput = 42;
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const startTime = new Date();
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, JSON.stringify(testInput)),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()).not.toBeNull();
    const expectedOutput = [testInput, TEST_INSTANCE_ID, startTime.toISOString(), false];
    expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify(expectedOutput));
  });

  it("should test the actions output for a completed orchestration", async () => {
    const emptyOrchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      return "done";
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(emptyOrchestrator);
    const newEvents = [newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()).not.toBeNull();
    expect(completeAction?.getResult()?.getValue()).toEqual('"done"');
  });
  it("should test the effect of scheduling an unregistered orchestrator", async () => {
    const registry = new Registry();
    const name = "Bogus";
    const newEvents = [newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("OrchestratorNotRegisteredError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).not.toBeNull();
  });
  it("should the actions output for the createTimer orchestrator method", async () => {
    const delayOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext) {
      const dueTime = new Date(ctx.currentUtcDateTime.getTime() + 1000);
      yield ctx.createTimer(dueTime);
      return "done";
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(delayOrchestrator);
    // Set start time to 2020-01-01 12:00:00
    const startTime = new Date(2020, 0, 1, 12, 0, 0);
    const expectedFireAt = new Date(startTime.getTime() + 1000);
    const newEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);
    expect(result.actions).not.toBeNull();
    expect(result.actions.length).toEqual(1);
    expect(result.actions[0]?.constructor?.name).toEqual(OrchestratorAction.name);
    expect(result.actions[0]?.getId()).toEqual(1);
    expect(result.actions[0]?.getCreatetimer()?.getFireat()?.toDate()).toEqual(expectedFireAt);
  });
  it("should test the resumption of a task using a timerFired event", async () => {
    const delayOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const dueTime = new Date(ctx.currentUtcDateTime.getTime() + 1000);
      yield ctx.createTimer(dueTime);
      return "done";
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(delayOrchestrator);
    // Set start time to 2020-01-01 12:00:00
    const startTime = new Date(2020, 0, 1, 12, 0, 0);
    const expectedFireAt = new Date(startTime.getTime() + 1000);
    const oldEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTimerCreatedEvent(1, expectedFireAt),
    ];
    const newEvents = [newTimerFiredEvent(1, expectedFireAt)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()).not.toBeNull();
    expect(completeAction?.getResult()?.getValue()).toEqual('"done"');
  });
  it("should test the actions output for the callActivity orchestrator method", async () => {
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any) {
      yield ctx.callActivity(dummyActivity);
      return "done";
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);
    expect(result.actions).not.toBeNull();
    expect(result.actions.length).toEqual(1);
    expect(result.actions[0]?.constructor?.name).toEqual(OrchestratorAction.name);
    expect(result.actions[0]?.getId()).toEqual(1);
    expect(result.actions[0]?.getScheduletask()?.getName()).toEqual("dummyActivity");
  });

  it("should include tags on scheduled activity actions", async () => {
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any) {
      yield ctx.callActivity(dummyActivity, undefined, { tags: { env: "test", owner: "durable" } });
      return "done";
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const newEvents = [newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);
    const scheduleTask = result.actions[0]?.getScheduletask();

    expect(result.actions.length).toEqual(1);
    expect(result.actions[0]?.hasScheduletask()).toBeTruthy();
    expect(scheduleTask?.getTagsMap().get("env")).toEqual("test");
    expect(scheduleTask?.getTagsMap().get("owner")).toEqual("durable");
  });
  it("should test the successful completion of an activity task", async () => {
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const result = yield ctx.callActivity(dummyActivity);
      return result;
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTaskScheduledEvent(1, dummyActivity.name),
    ];
    const encodedOutput = JSON.stringify("done!");
    const newEvents = [newTaskCompletedEvent(1, encodedOutput)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual(encodedOutput);
  });
  it("should test the successful completion of an activity task (additional case)", async () => {
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const result = yield ctx.callActivity(dummyActivity);
      return result;
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTaskScheduledEvent(1, dummyActivity.name),
    ];
    const encodedOutput = JSON.stringify("done!");
    const newEvents = [newTaskCompletedEvent(1, encodedOutput)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);

    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual(encodedOutput);
  });
  it("should test the failure of an activity task", async () => {
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, orchestratorInput: any): any {
      const result = yield ctx.callActivity(dummyActivity, orchestratorInput);
      return result;
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTaskScheduledEvent(1, getName(dummyActivity)),
    ];
    const ex = new Error("Kah-BOOOOM!!!");
    const newEvents = [newTaskFailedEvent(1, ex)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("TaskFailedError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain(ex.message);
    // TODO: In javascript this becomes an Anonymous function call (e.g., Object.<anonymous>)
    // can we do traceback in it?
    // Make sure the line of code where the exception was raised is included in the stack trace
    // const userCodeStatement = "ctx.callActivity(dummyActivity, orchestratorInput)";
    // expect(completeAction?.getFailuredetails()?.getStacktrace()?.getValue()).toContain(userCodeStatement);
  });
  it("should handle a task completion event with an unmatched taskScheduledId without error", async () => {
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const result = yield ctx.callActivity(dummyActivity);
      return result;
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTaskScheduledEvent(1, dummyActivity.name),
    ];
    // Send a completion event with a non-matching taskScheduledId (999)
    const newEvents = [newTaskCompletedEvent(999, JSON.stringify("result"))];
    const executor = new OrchestrationExecutor(registry, testLogger);

    // Should not throw — the unmatched event is logged and the orchestration continues waiting
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    // Orchestration should still be waiting (task at id 1 was not completed)
    expect(result.actions.length).toEqual(0);
  });

  it("should handle a task completion event with taskScheduledId 0 by looking up the task (not skipping due to falsy 0)", async () => {
    // This test validates the fix for issue #148: the old code used `if (taskId)` which
    // treated taskId === 0 as falsy and skipped the lookup entirely. The fix uses
    // `if (taskId !== undefined)` so that 0 is properly looked up.
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    const injectedTask = new CompletableTask<string>();

    // Use an orchestrator that injects a CompletableTask at _pendingTasks[0]
    // to simulate a task with taskScheduledId = 0
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const runtimeCtx = ctx as unknown as RuntimeOrchestrationContext;
      runtimeCtx._pendingTasks[0] = injectedTask;
      const result = yield ctx.callActivity(dummyActivity);
      return result;
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    registry.addActivity(dummyActivity);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTaskScheduledEvent(1, dummyActivity.name),
    ];
    // Send completion for taskId 0 — with the fix, this completes the injected task
    const newEvents = [newTaskCompletedEvent(0, JSON.stringify("result-for-zero"))];
    const executor = new OrchestrationExecutor(registry, testLogger);

    await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    // With the fix (taskId !== undefined): the lookup at _pendingTasks[0] finds the injected
    // task and completes it. With the old code (if (taskId)): 0 is falsy, the lookup is
    // skipped, and the task is never completed.
    expect(injectedTask.isComplete).toBe(true);
    expect(injectedTask.getResult()).toEqual("result-for-zero");
  });

  it("should handle a sub-orchestration completion event with taskScheduledId 0 by looking up the task", async () => {
    // Same regression test as above but for handleSubOrchestrationCompleted
    const subOrchestrator = async (_: OrchestrationContext) => {
      // do nothing
    };
    const injectedTask = new CompletableTask<string>();

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const runtimeCtx = ctx as unknown as RuntimeOrchestrationContext;
      // Inject a CompletableTask at ID 0
      runtimeCtx._pendingTasks[0] = injectedTask;
      const res = yield ctx.callSubOrchestrator(subOrchestrator);
      return res;
    };
    const registry = new Registry();
    const subOrchestratorName = registry.addOrchestrator(subOrchestrator);
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID, undefined),
      newSubOrchestrationCreatedEvent(1, subOrchestratorName, "sub-orch-123"),
    ];
    // Send completion for taskId 0
    const newEvents = [newSubOrchestrationCompletedEvent(0, JSON.stringify("sub-result-zero"))];
    const executor = new OrchestrationExecutor(registry, testLogger);

    await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    // With the fix: the lookup at _pendingTasks[0] finds the injected task and completes it.
    // With the old code: 0 is falsy, lookup is skipped, task never completed.
    expect(injectedTask.isComplete).toBe(true);
    expect(injectedTask.getResult()).toEqual("sub-result-zero");
  });

  it("should test the non-determinism detection logic when callTimer is expected but some other method (callActivity) is called instead", async () => {
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const result = yield ctx.callActivity(dummyActivity);
      return result;
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const fireAt = new Date();
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTimerCreatedEvent(1, fireAt),
    ];
    const newEvents = [newTimerFiredEvent(1, fireAt)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("NonDeterminismError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("1");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("createTimer");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("callActivity");
  });
  it("should test the non-determinism detection logic when invoking activity functions", async () => {
    const orchestrator: TOrchestrator = async function* (_: OrchestrationContext): any {
      const result = yield new CompletableTask(); // dummy task
      return result;
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTaskScheduledEvent(1, "bogusActivity"),
    ];
    const newEvents = [newTaskCompletedEvent(1, "done!")];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("NonDeterminismError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("1");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("callActivity");
  });
  it("should test the non-determinism detection when an activity exists in the history but a non-activity is in the code", async () => {
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      // Create a timer when the history expects an activity call
      yield ctx.createTimer(new Date());
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTaskScheduledEvent(1, getName(dummyActivity)),
    ];
    const newEvents = [newTaskCompletedEvent(1)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("NonDeterminismError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("1");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("callActivity");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("createTimer");
  });
  it("should test the non-determinism detection when calling an activity with a name that differs from the name in the history", async () => {
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      // Create a timer when the history expects an activity call
      yield ctx.callActivity(dummyActivity);
    };
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTaskScheduledEvent(1, "originalActivity"),
    ];
    const newEvents = [newTaskCompletedEvent(1)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("NonDeterminismError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("1");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("callActivity");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("originalActivity");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("dummyActivity");
  });
  it("should test that a sub-orchestration task is completed when the sub-orchestration completes", async () => {
    const subOrchestrator = async (_: OrchestrationContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const res = yield ctx.callSubOrchestrator(subOrchestrator);
      return res;
    };
    const registry = new Registry();
    const subOrchestratorName = registry.addOrchestrator(subOrchestrator);
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID, undefined),
      newSubOrchestrationCreatedEvent(1, subOrchestratorName, "sub-orch-123"),
    ];
    const newEvents = [newSubOrchestrationCompletedEvent(1, "42")];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual("42");
  });

  it("should include tags on scheduled sub-orchestration actions", async () => {
    const subOrchestrator = async (_: OrchestrationContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      yield ctx.callSubOrchestrator(subOrchestrator, undefined, { tags: { env: "test" } });
      return "done";
    };
    const registry = new Registry();
    const subOrchestratorName = registry.addOrchestrator(subOrchestrator);
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const newEvents = [newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID, undefined)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);
    const createSubOrch = result.actions[0]?.getCreatesuborchestration();

    expect(createSubOrch?.getName()).toEqual(subOrchestratorName);
    expect(createSubOrch?.getTagsMap().get("env")).toEqual("test");
  });
  it("should test that a sub-orchestration task is completed when the sub-orchestration fails", async () => {
    const subOrchestrator = async (_: OrchestrationContext) => {
      // do nothing
    };
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const res = yield ctx.callSubOrchestrator(subOrchestrator);
      return res;
    };
    const registry = new Registry();
    const subOrchestratorName = registry.addOrchestrator(subOrchestrator);
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID, undefined),
      newSubOrchestrationCreatedEvent(1, subOrchestratorName, "sub-orch-123"),
    ];
    const ex = new Error("Kah-BOOOOM!!!");
    const newEvents = [newSubOrchestrationFailedEvent(1, ex)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("TaskFailedError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain(ex.message);
    // TODO
    // // Make sure the line of code where the exception was raised is included in the stack trace
    // user_code_statement = "ctx.call_sub_orchestrator(suborchestrator)"
    // assert user_code_statement in complete_action.failureDetails.stackTrace.value
  });
  it("should test the non-determinism detection when a sub-orchestration action is encountered when it shouldn't be-subOrchestrator", async () => {
    const orchestrator: TOrchestrator = async (_: OrchestrationContext) => {
      const res = new CompletableTask(); // dummy task
      return res;
    };
    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID, undefined),
      newSubOrchestrationCreatedEvent(1, "some_sub_orchestration", "sub-orch-123"),
    ];
    const newEvents = [newSubOrchestrationCompletedEvent(1, "42")];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("NonDeterminismError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("1");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("callSubOrchestrator");
    // TODO
    // // Make sure the line of code where the exception was raised is included in the stack trace
    // user_code_statement = "ctx.call_sub_orchestrator(suborchestrator)"
    // assert user_code_statement in complete_action.failureDetails.stackTrace.value
  });
  /**
   * It should test the non-determinism detection when a sub-orchestration action is encounteed when it shouldn't be.
   * This variation tests the case where the expected task type is wrong (e.g. the code schedules a timer task
   * but the history contains a sub-orchestration completed task)
   */
  it("should test the non-determinism detection when a sub-orchestration action is encountered when it shouldn't be-timer", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const res = yield ctx.createTimer(new Date()); // Created timer but history expects sub-orchestration
      return res;
    };
    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID, undefined),
      newSubOrchestrationCreatedEvent(1, "some_sub_orchestration", "sub-orch-123"),
    ];
    const newEvents = [newSubOrchestrationCompletedEvent(1, "42")];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("NonDeterminismError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("1");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("callSubOrchestrator");
    // TODO
    // // Make sure the line of code where the exception was raised is included in the stack trace
    // user_code_statement = "ctx.call_sub_orchestrator(suborchestrator)"
    // assert user_code_statement in complete_action.failureDetails.stackTrace.value
  });

  it("should test that an orchestration can wait for and process an external event sent by a client", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const res = yield ctx.waitForExternalEvent("my_event");
      return res;
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);

    let oldEvents: any[] = [];
    let newEvents = [newOrchestratorStartedEvent(), newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];

    // Execute the orchestration until it is waiting for an external event.
    // The result should be an empty list of actions because the orchestration didn't schedule any work
    let executor = new OrchestrationExecutor(registry, testLogger);
    let result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    expect(result.actions.length).toBe(0);

    // Now send an external event to the orchestration and execute it again.
    // This time the orcehstration should complete
    oldEvents = newEvents;
    newEvents = [newEventRaisedEvent("my_event", "42")];
    executor = new OrchestrationExecutor(registry, testLogger);
    result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual("42");
  });

  it("should test that an orchestration can receive an event that arrives earlier than expected", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      yield ctx.createTimer(new Date(ctx.currentUtcDateTime.getTime() + 24 * 60 * 60 * 1000));
      const res = yield ctx.waitForExternalEvent("my_event");
      return res;
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);

    let oldEvents: any[] = [];
    let newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
      newEventRaisedEvent("my_event", "42"),
    ];

    // Execute the orchestration
    // It should be in a running state waiting for the timer to fire
    let executor = new OrchestrationExecutor(registry, testLogger);
    let result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    expect(result.actions.length).toBe(1);
    expect(result.actions[0].hasCreatetimer()).toBeTruthy();

    // Complete the timer task
    // The orchestration should move to the waitForExternalEvent step now which should
    // then complete immediately because the event was buffered in the old event history
    const timerDueTime = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    newEvents.push(newTimerCreatedEvent(1, timerDueTime));
    oldEvents = newEvents;
    newEvents = [newTimerFiredEvent(1, timerDueTime)];
    executor = new OrchestrationExecutor(registry, testLogger);
    result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual("42");
  });

  it("should test that an orchestration can be suspended and resumed", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const res = yield ctx.waitForExternalEvent("my_event");
      return res;
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);

    const oldEvents = [newOrchestratorStartedEvent(), newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];

    let newEvents = [newSuspendEvent(), newEventRaisedEvent("my_event", "42")];

    // Execute the orchestration
    // It should be in a running state because it was suspended prior
    // to the processing the event raised event
    let executor = new OrchestrationExecutor(registry, testLogger);
    let result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    expect(result.actions.length).toBe(0);

    // Resume the orchestration, it should complete successfully
    oldEvents.push(...newEvents);
    newEvents = [newResumeEvent()];
    executor = new OrchestrationExecutor(registry, testLogger);
    result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual("42");
  });

  it("should test that an orchestration can be terminated before it completes", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      const res = yield ctx.waitForExternalEvent("my_event");
      return res;
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);

    const oldEvents = [newOrchestratorStartedEvent(), newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];

    const newEvents = [newTerminatedEvent(JSON.stringify("terminated!")), newEventRaisedEvent("my_event", "42")];

    // Execute the orchestration
    // It should be in a running state waiting for an external event
    let executor = new OrchestrationExecutor(registry, testLogger);
    let result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    executor = new OrchestrationExecutor(registry, testLogger);
    result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED);
    expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify("terminated!"));
  });

  it("should be able to continue-as-new", async () => {
    for (const saveEvent of [true, false]) {
      const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: number): any {
        yield ctx.createTimer(new Date(ctx.currentUtcDateTime.getTime() + 1 * 24 * 60 * 60 * 1000));
        ctx.continueAsNew(input + 1, saveEvent);
      };

      const registry = new Registry();
      const orchestratorName = registry.addOrchestrator(orchestrator);

      const oldEvents = [
        newOrchestratorStartedEvent(),
        newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID, "1"),
        newEventRaisedEvent("my_event", "42"),
        newEventRaisedEvent("my_event", "43"),
        newEventRaisedEvent("my_event", "44"),
        newTimerCreatedEvent(1, new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)),
      ];

      const newEvents = [newTimerFiredEvent(1, new Date(Date.now() + 1 * 24 * 60 * 60 * 1000))];

      // Execute the orchestration, it should be in a running state waiting for the timer to fire
      const executor = new OrchestrationExecutor(registry, testLogger);
      const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW,
      );
      expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify(2));
      expect(completeAction?.getCarryovereventsList()?.length).toEqual(saveEvent ? 3 : 0);

      for (let i = 0; i < (completeAction?.getCarryovereventsList()?.length ?? 0); i++) {
        const event = completeAction?.getCarryovereventsList()[i];

        // TODO: Should we check this with Typescript? As class typings are harder to detect
        // expect(typeof event).toEqual(pb.HistoryEvent);

        expect(event?.hasEventraised());
        expect(event?.getEventraised()?.getName()?.toLocaleLowerCase()).toEqual("my_event");
        expect(event?.getEventraised()?.getInput()?.getValue()).toEqual(JSON.stringify(42 + i));
      }
    }
  });

  it("should test that a fan-out pattern correctly schedules N tasks", async () => {
    const hello = async (_: any, name: string) => {
      return `Hello ${name}`;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, count: number): any {
      const tasks: Task<any>[] = [];

      for (let i = 0; i < count; i++) {
        tasks.push(ctx.callActivity(hello, i.toString()));
      }

      const results = yield whenAll(tasks);
      return results;
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(hello);

    const oldEvents: any[] = [];
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID, "10"),
    ];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    // The result should be 10 "taskScheduled" actions with inputs from 0 to 9
    expect(result.actions.length).toEqual(10);

    for (let i = 0; i < 10; i++) {
      expect(result.actions[i].hasScheduletask());
      expect(result.actions[i].getScheduletask()?.getName()).toEqual(activityName);
      expect(result.actions[i].getScheduletask()?.getInput()?.getValue()).toEqual(`"${i}"`);
    }
  });

  it("should test that a fan-in pattern works correctly", async () => {
    const printInt = (_: any, value: number) => {
      return value.toString();
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const tasks: Task<string>[] = [];

      for (let i = 0; i < 10; i++) {
        tasks.push(ctx.callActivity(printInt, i));
      }

      const results = yield whenAll(tasks);
      return results;
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(printInt);

    const oldEvents = [newOrchestratorStartedEvent(), newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];

    for (let i = 0; i < 10; i++) {
      oldEvents.push(newTaskScheduledEvent(i + 1, activityName, i.toString()));
    }

    const newEvents: any[] = [];

    for (let i = 0; i < 10; i++) {
      newEvents.push(newTaskCompletedEvent(i + 1, printInt(null, i)));
    }

    // First, test with only the first 5 events
    // we expect the orchestrator to be running
    // it should however return 0 actions, since it is still waiting for the other 5 tasks to complete
    let executor = new OrchestrationExecutor(registry, testLogger);
    let result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents.slice(0, 4));
    expect(result.actions.length).toBe(0);

    // Now test with the full set of new events
    // we expect the orchestration to complete
    executor = new OrchestrationExecutor(registry, testLogger);
    result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual("[0,1,2,3,4,5,6,7,8,9]");
  });

  it("should test that a fan-in works correctly when one of the tasks fails", async () => {
    const printInt = (_: any, value: number) => {
      return value.toString();
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const tasks: Task<string>[] = [];

      for (let i = 0; i < 10; i++) {
        tasks.push(ctx.callActivity(printInt, i));
      }

      const results = yield whenAll(tasks);
      return results;
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(printInt);

    const oldEvents = [newOrchestratorStartedEvent(), newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];

    for (let i = 0; i < 10; i++) {
      oldEvents.push(newTaskScheduledEvent(i + 1, activityName, i.toString()));
    }

    // Chaos test with 5 tasks completing successfully, 1 failing and 4 still running
    // we exect that the orchestration fails immediately now and does not wait for the 4 that are running
    const newEvents: any[] = [];

    for (let i = 0; i < 5; i++) {
      newEvents.push(newTaskCompletedEvent(i + 1, printInt(null, i)));
    }

    const ex = new Error("Kah-BOOOOM!!!");
    newEvents.push(newTaskFailedEvent(6, ex));

    // Now test with the full set of new events
    // We expect the orchestration to complete
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("TaskFailedError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain(ex.message);
  });

  it("should test that a whenAny pattern works correctly", async () => {
    const hello = (_: any, name: string) => {
      return `Hello ${name}!`;
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const t1 = ctx.callActivity(hello, "Tokyo");
      const t2 = ctx.callActivity(hello, "Seattle");

      const winner = yield whenAny([t1, t2]);

      if (winner == t1) {
        return t1.getResult();
      } else {
        return t2.getResult();
      }
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(hello);

    // Test 1: Start the orchestration and let it yield on the whenAny
    // this should return 2 actions: a Tokyo Task Schedule and a Seattle Task Schedule
    let oldEvents: any[] = [];
    let newEvents = [newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];
    let executor = new OrchestrationExecutor(registry, testLogger);
    let result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    expect(result.actions.length).toEqual(2);
    expect(result.actions[0].hasScheduletask()).toBeTruthy();
    expect(result.actions[1].hasScheduletask()).toBeTruthy();

    // The next tests assume that the orchestration has already await at the task.whenAny
    oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
      newTaskScheduledEvent(1, activityName, JSON.stringify("Tokyo")),
      newTaskScheduledEvent(2, activityName, JSON.stringify("Seattle")),
    ];

    // Test 2: Complete the "Tokyo" task.
    // the orchestration should now complete with "Hello Tokyo!"
    let encodedOutput = JSON.stringify(hello(null, "Tokyo"));
    newEvents = [newTaskCompletedEvent(1, encodedOutput)];
    executor = new OrchestrationExecutor(registry, testLogger);
    result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    let completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual(encodedOutput);

    // Test 3: Complete the "Seattle" task.
    // the orchestration should now complete with "Hello Tokyo!"
    encodedOutput = JSON.stringify(hello(null, "Seattle"));
    newEvents = [newTaskCompletedEvent(2, encodedOutput)];
    executor = new OrchestrationExecutor(registry, testLogger);
    result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual(encodedOutput);
  });

  // ==================== Retry Tests (shared helpers) ====================

  /**
   * Helper that registers an orchestrator, starts it, and returns the accumulated
   * event log together with a convenience function for replaying subsequent steps.
   */
  async function startOrchestration(
    orchestrator: TOrchestrator,
    input?: unknown,
    startTime?: Date,
  ) {
    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const allEvents = [
      newOrchestratorStartedEvent(startTime),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, input !== undefined ? JSON.stringify(input) : undefined),
    ];

    const result = await new OrchestrationExecutor(registry, testLogger)
      .execute(TEST_INSTANCE_ID, [], allEvents);

    /** Append old-events, create a fresh executor, and replay with newEvents. */
    const replay = async (...oldAndNew: [old: pb.HistoryEvent[], newEvts: pb.HistoryEvent[]]) => {
      const [old, newEvts] = oldAndNew;
      old.forEach((e) => allEvents.push(e));
      return new OrchestrationExecutor(registry, testLogger)
        .execute(TEST_INSTANCE_ID, allEvents, newEvts);
    };

    return { registry, result, allEvents, replay };
  }

  // ==================== Retry Policy Tests ====================
  describe("Retry Policy", () => {
    it("should schedule retry timer when activity fails with retry policy", async () => {
      const { RetryPolicy } = await import("../src/task/retry/retry-policy");

      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext, input: number): any {
          const retryPolicy = new RetryPolicy({
            maxNumberOfAttempts: 3, firstRetryIntervalInMilliseconds: 1000, backoffCoefficient: 1.0,
          });
          return yield ctx.callActivity("flakyActivity", input, { retry: retryPolicy });
        },
        21,
      );

      expect(startResult.actions.length).toBe(1);
      expect(startResult.actions[0].hasScheduletask()).toBe(true);
      expect(startResult.actions[0].getScheduletask()?.getName()).toBe("flakyActivity");

      // Activity fails → should schedule a retry timer
      const result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Transient failure"))],
      );

      expect(result.actions.length).toBe(1);
      expect(result.actions[0].hasCreatetimer()).toBe(true);
    });

    it("should complete successfully after retry timer fires and activity succeeds", async () => {
      const { RetryPolicy } = await import("../src/task/retry/retry-policy");

      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext, input: number): any {
          const retryPolicy = new RetryPolicy({
            maxNumberOfAttempts: 3, firstRetryIntervalInMilliseconds: 1000, backoffCoefficient: 1.0,
          });
          return yield ctx.callActivity("flakyActivity", input, { retry: retryPolicy, tags: { env: "test" } });
        },
        21,
        new Date(),
      );

      expect(startResult.actions.length).toBe(1);
      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // Activity fails → timer created
      let result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Transient failure"))],
      );
      expect(result.actions[0].hasCreatetimer()).toBe(true);
      const timerFireAt = result.actions[0].getCreatetimer()?.getFireat()?.toDate();
      expect(timerFireAt).toBeDefined();

      // Timer fires → activity rescheduled with new ID + preserved tags
      result = await replay(
        [newTaskFailedEvent(1, new Error("Transient failure")), newTimerCreatedEvent(2, timerFireAt!)],
        [newTimerFiredEvent(2, timerFireAt!)],
      );
      expect(result.actions[0].hasScheduletask()).toBe(true);
      expect(result.actions[0].getScheduletask()?.getName()).toBe("flakyActivity");
      expect(result.actions[0].getScheduletask()?.getTagsMap().get("env")).toBe("test");
      expect(result.actions[0].getId()).toBe(3);

      // Retried activity completes
      result = await replay(
        [newTimerFiredEvent(2, timerFireAt!), newTaskScheduledEvent(3, "flakyActivity")],
        [newTaskCompletedEvent(3, JSON.stringify(42))],
      );
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify(42));
    });

    it("should fail after exhausting all retry attempts", async () => {
      const { RetryPolicy } = await import("../src/task/retry/retry-policy");

      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext, input: number): any {
          const retryPolicy = new RetryPolicy({
            maxNumberOfAttempts: 2, firstRetryIntervalInMilliseconds: 100, backoffCoefficient: 1.0,
          });
          return yield ctx.callActivity("alwaysFailsActivity", input, { retry: retryPolicy });
        },
        21,
        new Date(),
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // First failure → timer
      let result = await replay(
        [newTaskScheduledEvent(1, "alwaysFailsActivity")],
        [newTaskFailedEvent(1, new Error("Failure 1"))],
      );
      expect(result.actions[0].hasCreatetimer()).toBe(true);
      const timerFireAt = result.actions[0].getCreatetimer()?.getFireat()?.toDate();

      // Timer fires → rescheduled
      result = await replay(
        [newTaskFailedEvent(1, new Error("Failure 1")), newTimerCreatedEvent(2, timerFireAt!)],
        [newTimerFiredEvent(2, timerFireAt!)],
      );
      expect(result.actions[0].hasScheduletask()).toBe(true);

      // Second failure → max attempts exhausted → orchestration fails
      result = await replay(
        [newTimerFiredEvent(2, timerFireAt!), newTaskScheduledEvent(3, "alwaysFailsActivity")],
        [newTaskFailedEvent(3, new Error("Failure 2"))],
      );
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    });
  });

  // ==================== Retry Handler Tests ====================
  describe("Retry Handler (AsyncRetryHandler)", () => {
    it("should reschedule activity when retry handler returns true", async () => {
      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext, input: number): any {
          const retryHandler = async (retryCtx: any) => retryCtx.lastAttemptNumber < 3;
          return yield ctx.callActivity("flakyActivity", input, { retry: retryHandler });
        },
        21,
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);
      expect(startResult.actions[0].getScheduletask()?.getName()).toBe("flakyActivity");

      // Activity fails → handler returns true → rescheduled immediately (no timer)
      const result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Transient failure"))],
      );
      expect(result.actions.length).toBe(1);
      expect(result.actions[0].hasScheduletask()).toBe(true);
      expect(result.actions[0].getScheduletask()?.getName()).toBe("flakyActivity");
    });

    it("should complete successfully after retry handler reschedules and activity succeeds", async () => {
      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext, input: number): any {
          const retryHandler = async (retryCtx: any) => retryCtx.lastAttemptNumber < 5;
          return yield ctx.callActivity("flakyActivity", input, { retry: retryHandler, tags: { env: "test" } });
        },
        21,
        new Date(),
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // Activity fails → rescheduled immediately with new ID + preserved tags
      let result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Transient failure"))],
      );
      expect(result.actions[0].hasScheduletask()).toBe(true);
      expect(result.actions[0].getScheduletask()?.getTagsMap().get("env")).toBe("test");
      expect(result.actions[0].getId()).toBe(2);

      // Retried activity completes
      result = await replay(
        [newTaskFailedEvent(1, new Error("Transient failure")), newTaskScheduledEvent(2, "flakyActivity")],
        [newTaskCompletedEvent(2, JSON.stringify(42))],
      );
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify(42));
    });

    it("should fail when retry handler returns false", async () => {
      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext): any {
          const retryHandler = async (retryCtx: any) => retryCtx.lastFailure.errorType !== "PermanentError";
          return yield ctx.callActivity("failingActivity", undefined, { retry: retryHandler });
        },
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // Activity fails with PermanentError → handler returns false → orchestration fails
      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("PermanentError");
      failureDetails.setErrormessage("This is permanent");

      const result = await replay(
        [newTaskScheduledEvent(1, "failingActivity")],
        [newTaskFailedEvent(1, new Error("This is permanent"), failureDetails)],
      );
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    });

    it("should handle sub-orchestration retry with handler", async () => {
      const { registry, result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext, input: number): any {
          const retryHandler = async (retryCtx: any) => retryCtx.lastAttemptNumber < 3;
          return yield ctx.callSubOrchestrator("subOrch", input, { retry: retryHandler });
        },
        21,
      );
      registry.addNamedOrchestrator("subOrch", async function* () { yield; });

      expect(startResult.actions[0].hasCreatesuborchestration()).toBe(true);

      // Sub-orchestration fails → rescheduled immediately
      let result = await replay(
        [newSubOrchestrationCreatedEvent(1, "subOrch", "sub-orch-1")],
        [newSubOrchestrationFailedEvent(1, new Error("Sub-orch failed"))],
      );
      expect(result.actions[0].hasCreatesuborchestration()).toBe(true);

      // Retried sub-orchestration completes
      result = await replay(
        [newSubOrchestrationFailedEvent(1, new Error("Sub-orch failed")), newSubOrchestrationCreatedEvent(2, "subOrch", "sub-orch-2")],
        [newSubOrchestrationCompletedEvent(2, JSON.stringify(42))],
      );
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify(42));
    });

    it("should fail after handler returns false on third attempt", async () => {
      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext): any {
          const retryHandler = async (retryCtx: any) => retryCtx.lastAttemptNumber < 3;
          return yield ctx.callActivity("flakyActivity", undefined, { retry: retryHandler });
        },
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // Failure 1 → rescheduled (attempt 1 < 3)
      let result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Failure 1"))],
      );
      expect(result.actions[0].hasScheduletask()).toBe(true);

      // Failure 2 → rescheduled (attempt 2 < 3)
      result = await replay(
        [newTaskFailedEvent(1, new Error("Failure 1")), newTaskScheduledEvent(2, "flakyActivity")],
        [newTaskFailedEvent(2, new Error("Failure 2"))],
      );
      expect(result.actions[0].hasScheduletask()).toBe(true);

      // Failure 3 → handler returns false (3 < 3 is false) → orchestration fails
      result = await replay(
        [newTaskFailedEvent(2, new Error("Failure 2")), newTaskScheduledEvent(3, "flakyActivity")],
        [newTaskFailedEvent(3, new Error("Failure 3"))],
      );
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    });

    it("should fail the task (not retry) when retry handler returns undefined", async () => {
      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext): any {
          // Cast to bypass TypeScript — simulates a JavaScript consumer or a handler
          // with a code path that omits a return statement
          const retryHandler = (async (_retryCtx: any) => {
            // Intentionally missing return statement
          }) as any;
          return yield ctx.callActivity("flakyActivity", undefined, { retry: retryHandler });
        },
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // Activity fails → handler returns undefined → should NOT retry, task should fail
      const result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Activity error"))],
      );
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    });

    it("should fail the task (not retry) when retry handler returns null", async () => {
      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext): any {
          const retryHandler = async (_retryCtx: any) => {
            return null as any;
          };
          return yield ctx.callActivity("flakyActivity", undefined, { retry: retryHandler });
        },
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // Activity fails → handler returns null → should NOT retry, task should fail
      const result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Activity error"))],
      );
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    });

    it("should create a retry timer when retry handler returns a positive delay", async () => {
      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext): any {
          const retryHandler = async (_retryCtx: any) => {
            return 5000; // Retry after 5 seconds
          };
          return yield ctx.callActivity("flakyActivity", undefined, { retry: retryHandler });
        },
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // Activity fails → handler returns 5000 → should create a timer
      const result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Transient failure"))],
      );
      expect(result.actions.length).toBe(1);
      expect(result.actions[0].hasCreatetimer()).toBe(true);
    });

    it("should retry immediately when retry handler returns 0", async () => {
      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext): any {
          const retryHandler = async (_retryCtx: any) => {
            return 0; // Retry immediately via zero delay
          };
          return yield ctx.callActivity("flakyActivity", undefined, { retry: retryHandler });
        },
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // Activity fails → handler returns 0 → should reschedule immediately (no timer)
      const result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Transient failure"))],
      );
      expect(result.actions.length).toBe(1);
      expect(result.actions[0].hasScheduletask()).toBe(true);
      expect(result.actions[0].getScheduletask()?.getName()).toBe("flakyActivity");
    });

    it("should fail the task when retry handler returns NaN", async () => {
      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext): any {
          const retryHandler = async (_retryCtx: any) => {
            return NaN;
          };
          return yield ctx.callActivity("flakyActivity", undefined, { retry: retryHandler });
        },
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // Activity fails → handler returns NaN → should NOT retry
      const result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Activity error"))],
      );
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    });

    it("should fail the task when retry handler returns Infinity", async () => {
      const { result: startResult, replay } = await startOrchestration(
        async function* (ctx: OrchestrationContext): any {
          const retryHandler = async (_retryCtx: any) => {
            return Infinity;
          };
          return yield ctx.callActivity("flakyActivity", undefined, { retry: retryHandler });
        },
      );

      expect(startResult.actions[0].hasScheduletask()).toBe(true);

      // Activity fails → handler returns Infinity → should NOT retry
      const result = await replay(
        [newTaskScheduledEvent(1, "flakyActivity")],
        [newTaskFailedEvent(1, new Error("Activity error"))],
      );
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    });
  });

  it("should complete immediately when whenAll is called with an empty task array", async () => {
    const orchestrator: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
      const results = yield whenAll([]);
      return results;
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);

    const oldEvents: any[] = [];
    const newEvents = [newOrchestratorStartedEvent(), newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    // The orchestration should complete immediately with an empty array result
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify([]));
  });

  it("should complete when whenAll with empty array is followed by more work", async () => {
    const hello = (_: any, name: string) => `Hello ${name}!`;

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const emptyResults = yield whenAll([]);
      const activityResult = yield ctx.callActivity(hello, "World");
      return { emptyResults, activityResult };
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(hello);

    // First execution: should schedule the activity after completing whenAll([])
    const oldEvents: any[] = [];
    const newEvents = [newOrchestratorStartedEvent(), newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    // The whenAll([]) should complete, then an activity should be scheduled
    expect(result.actions.length).toEqual(1);
    expect(result.actions[0].hasScheduletask()).toBeTruthy();
    expect(result.actions[0].getScheduletask()?.getName()).toEqual(activityName);
  });

  it("should throw when whenAny is called with an empty task array", () => {
    expect(() => whenAny([])).toThrow("whenAny requires at least one task");
  });

  it("should fail whenAll correctly when the failing task is the last to complete", async () => {
    const printInt = (_: any, value: number) => {
      return value.toString();
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const tasks: Task<string>[] = [];

      for (let i = 0; i < 3; i++) {
        tasks.push(ctx.callActivity(printInt, i));
      }

      const results = yield whenAll(tasks);
      return results;
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(printInt);

    const oldEvents = [newOrchestratorStartedEvent(), newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];

    for (let i = 0; i < 3; i++) {
      oldEvents.push(newTaskScheduledEvent(i + 1, activityName, i.toString()));
    }

    // First two tasks succeed, last task fails
    const ex = new Error("Last task failed");
    const newEvents: any[] = [
      newTaskCompletedEvent(1, printInt(null, 0)),
      newTaskCompletedEvent(2, printInt(null, 1)),
      newTaskFailedEvent(3, ex),
    ];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("TaskFailedError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain(ex.message);
  });

  it("should not crash when additional tasks complete after whenAll fails fast", async () => {
    const printInt = (_: any, value: number) => {
      return value.toString();
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const tasks: Task<string>[] = [];

      for (let i = 0; i < 3; i++) {
        tasks.push(ctx.callActivity(printInt, i));
      }

      const results = yield whenAll(tasks);
      return results;
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(printInt);

    const oldEvents = [newOrchestratorStartedEvent(), newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];

    for (let i = 0; i < 3; i++) {
      oldEvents.push(newTaskScheduledEvent(i + 1, activityName, i.toString()));
    }

    // First task fails, then remaining tasks complete in the same batch
    const ex = new Error("First task failed");
    const newEvents: any[] = [
      newTaskFailedEvent(1, ex),
      newTaskCompletedEvent(2, printInt(null, 1)),
      newTaskCompletedEvent(3, printInt(null, 2)),
    ];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrortype()).toEqual("TaskFailedError");
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain(ex.message);
  });

  it("should preserve orchestration result when whenAll failure is caught and other tasks complete", async () => {
    const printInt = (_: any, value: number) => {
      return value.toString();
    };

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const tasks: Task<string>[] = [];

      for (let i = 0; i < 3; i++) {
        tasks.push(ctx.callActivity(printInt, i));
      }

      try {
        yield whenAll(tasks);
      } catch {
        // Intentionally catch the failure and return a fallback result
        return "handled";
      }
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(printInt);

    const oldEvents = [newOrchestratorStartedEvent(), newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID)];

    for (let i = 0; i < 3; i++) {
      oldEvents.push(newTaskScheduledEvent(i + 1, activityName, i.toString()));
    }

    // First task fails, then remaining tasks complete in the same batch
    const ex = new Error("One task failed");
    const newEvents: any[] = [
      newTaskFailedEvent(1, ex),
      newTaskCompletedEvent(2, printInt(null, 1)),
      newTaskCompletedEvent(3, printInt(null, 2)),
    ];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify("handled"));
  });

  it("should complete nested whenAny(whenAll, whenAll) when first inner group finishes", async () => {
    const hello = (_: any, name: string) => {
      return `Hello ${name}!`;
    };

    // Orchestrator: yield whenAny([whenAll([a, b]), whenAll([c, d])])
    // When the first group (a, b) completes, the outer whenAny should resolve
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const group1 = [ctx.callActivity(hello, "a"), ctx.callActivity(hello, "b")];
      const group2 = [ctx.callActivity(hello, "c"), ctx.callActivity(hello, "d")];

      const winner: Task<string[]> = yield whenAny([whenAll(group1), whenAll(group2)]);
      return winner.getResult();
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(hello);

    // First execution: schedules 4 activities
    const oldEvents: any[] = [];
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    let result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    expect(result.actions.length).toEqual(4);

    // Second execution: replay scheduling, then complete tasks 1 and 2 (first group)
    const replayEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
      newTaskScheduledEvent(1, activityName, JSON.stringify("a")),
      newTaskScheduledEvent(2, activityName, JSON.stringify("b")),
      newTaskScheduledEvent(3, activityName, JSON.stringify("c")),
      newTaskScheduledEvent(4, activityName, JSON.stringify("d")),
    ];

    const completionEvents = [
      newTaskCompletedEvent(1, JSON.stringify(hello(null, "a"))),
      newTaskCompletedEvent(2, JSON.stringify(hello(null, "b"))),
    ];

    const executor2 = new OrchestrationExecutor(registry, testLogger);
    result = await executor2.execute(TEST_INSTANCE_ID, replayEvents, completionEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

    const expectedResult = [hello(null, "a"), hello(null, "b")];
    expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify(expectedResult));
  });

  it("should complete nested whenAll(whenAny, whenAny) when both inner tasks finish", async () => {
    const hello = (_: any, name: string) => {
      return `Hello ${name}!`;
    };

    // Orchestrator: yield whenAll([whenAny([a, b]), whenAny([c, d])])
    // Both inner whenAny tasks must complete for the outer whenAll to resolve
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const race1 = [ctx.callActivity(hello, "a"), ctx.callActivity(hello, "b")];
      const race2 = [ctx.callActivity(hello, "c"), ctx.callActivity(hello, "d")];

      const results: Task<any>[] = yield whenAll([whenAny(race1), whenAny(race2)]);
      return results.map((t: Task<any>) => t.getResult());
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(hello);

    // First execution: schedules 4 activities
    const oldEvents: any[] = [];
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    let result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);
    expect(result.actions.length).toEqual(4);

    // Second execution: replay scheduling, then complete one task from each group
    const replayEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
      newTaskScheduledEvent(1, activityName, JSON.stringify("a")),
      newTaskScheduledEvent(2, activityName, JSON.stringify("b")),
      newTaskScheduledEvent(3, activityName, JSON.stringify("c")),
      newTaskScheduledEvent(4, activityName, JSON.stringify("d")),
    ];

    const completionEvents = [
      newTaskCompletedEvent(1, JSON.stringify(hello(null, "a"))),
      newTaskCompletedEvent(3, JSON.stringify(hello(null, "c"))),
    ];

    const executor2 = new OrchestrationExecutor(registry, testLogger);
    result = await executor2.execute(TEST_INSTANCE_ID, replayEvents, completionEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

    const expectedResult = [hello(null, "a"), hello(null, "c")];
    expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify(expectedResult));
  });

  it.each([
    { description: "null", yieldedValue: null as any },
    { description: "undefined", yieldedValue: undefined as any },
  ])(
    "should fail when orchestrator yields $description as its first value",
    async ({ description, yieldedValue }) => {
      // An orchestrator that yields a non-Task value as its first yield should fail with a clear error
      const badOrchestrator: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
        yield yieldedValue;
      };

      const registry = new Registry();
      const name = registry.addOrchestrator(badOrchestrator);
      const newEvents = [
        newOrchestratorStartedEvent(),
        newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      ];
      const executor = new OrchestrationExecutor(registry, testLogger);
      const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);
      const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
      expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
      expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("non-Task");
    }
  );

  it("should fail when orchestrator yields a plain object as its first value", async () => {
    // An orchestrator that yields a non-Task object should fail with a clear error
    const badOrchestrator: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
      yield { someProperty: "not a task" };
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(badOrchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("non-Task");
  });

  it("should fail when orchestrator yields a primitive as its first value", async () => {
    // An orchestrator that yields a primitive (number) instead of a Task should fail
    const badOrchestrator: TOrchestrator = async function* (_ctx: OrchestrationContext): any {
      yield 42;
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(badOrchestrator);
    const newEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, [], newEvents);
    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("non-Task");
  });

  it("should propagate inner whenAll failure to outer whenAny in nested composites", async () => {
    const hello = (_: any, name: string) => {
      return `Hello ${name}!`;
    };

    // Orchestrator: yield whenAny([whenAll([a, b])])
    // If an inner task fails, the whenAll should fail-fast and notify the outer whenAny.
    // WhenAny completes with the failed task — the orchestrator inspects the winner.
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const group = [ctx.callActivity(hello, "a"), ctx.callActivity(hello, "b")];
      const winner: Task<string[]> = yield whenAny([whenAll(group)]);
      return winner.isFailed ? "inner_failed" : "inner_ok";
    };

    const registry = new Registry();
    const orchestratorName = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(hello);

    const replayEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(orchestratorName, TEST_INSTANCE_ID),
      newTaskScheduledEvent(1, activityName, JSON.stringify("a")),
      newTaskScheduledEvent(2, activityName, JSON.stringify("b")),
    ];

    // Task 1 fails — whenAll should fail-fast, and outer whenAny should complete
    const ex = new Error("task a failed");
    const completionEvents = [newTaskFailedEvent(1, ex)];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, replayEvents, completionEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify("inner_failed"));
  });

  it("should fail the orchestration when a generator catches a task failure and yields a non-Task value", async () => {
    const dummyActivity = async (_: ActivityContext) => {
      // do nothing
    };
    // This orchestrator catches the activity failure but then yields a non-Task value (a plain number)
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      try {
        yield ctx.callActivity(dummyActivity);
      } catch {
        yield 42 as any; // Bug: yielding a non-Task value after catching an exception
      }
      return "done";
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const activityName = registry.addActivity(dummyActivity);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTaskScheduledEvent(1, activityName),
    ];
    const ex = new Error("Activity failed");
    const newEvents = [newTaskFailedEvent(1, ex)];
    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(TEST_INSTANCE_ID, oldEvents, newEvents);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED);
    expect(completeAction?.getFailuredetails()?.getErrormessage()).toContain("non-Task");
  });

  it("should succeed when a generator catches a task failure and yields a valid new Task", async () => {
    const failingActivity = async (_: ActivityContext) => {
      // will fail
    };
    const recoveryActivity = async (_: ActivityContext) => {
      // will succeed
    };
    // This orchestrator catches the activity failure and recovers by calling another activity
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, _: any): any {
      try {
        yield ctx.callActivity(failingActivity);
      } catch {
        const result = yield ctx.callActivity(recoveryActivity);
        return result;
      }
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    const failingName = registry.addActivity(failingActivity);
    const recoveryName = registry.addActivity(recoveryActivity);
    const oldEvents = [
      newOrchestratorStartedEvent(),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
      newTaskScheduledEvent(1, failingName),
    ];
    const ex = new Error("Activity failed");
    const executor = new OrchestrationExecutor(registry, testLogger);

    // First execution turn: the failing activity completes with an error,
    // and the orchestrator catches it and yields a call to recoveryActivity.
    const firstResult = await executor.execute(TEST_INSTANCE_ID, oldEvents, [newTaskFailedEvent(1, ex)]);
    expect(firstResult.actions.length).toBeGreaterThan(0);

    // Second execution turn: the sidecar has persisted TaskScheduled(2) for recoveryActivity,
    // and now the recovery activity completes successfully.
    const oldEventsWithFailureAndRecoverySchedule = [
      ...oldEvents,
      newTaskFailedEvent(1, ex),
      newTaskScheduledEvent(2, recoveryName),
    ];
    const result = await executor.execute(TEST_INSTANCE_ID, oldEventsWithFailureAndRecoverySchedule, [
      newTaskCompletedEvent(2, JSON.stringify("recovered")),
    ]);

    const completeAction = getAndValidateSingleCompleteOrchestrationAction(result);
    expect(completeAction?.getOrchestrationstatus()).toEqual(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completeAction?.getResult()?.getValue()).toEqual(JSON.stringify("recovered"));
  });
});

function getAndValidateSingleCompleteOrchestrationAction(
  result: OrchestrationExecutionResult,
): CompleteOrchestrationAction | undefined {
  expect(result.actions.length).toEqual(1);
  const action = result.actions[0];
  expect(action?.constructor?.name).toEqual(CompleteOrchestrationAction.name);

  const resCompleteOrchestration = action.getCompleteorchestration();
  expect(resCompleteOrchestration).not.toBeNull();
  return resCompleteOrchestration;
}
