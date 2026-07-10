// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import * as pb from "../src/proto/orchestrator_service_pb";
import {
  newExecutionCompletedEvent,
  newFailureDetails,
  newOrchestratorStartedEvent,
  newSubOrchestrationCompletedEvent,
  newSubOrchestrationCreatedEvent,
  newSubOrchestrationFailedEvent,
  newTaskCompletedEvent,
  newTaskFailedEvent,
  newTaskScheduledEvent,
} from "../src/utils/pb-helper.util";
import { buildRewindResult } from "../src/worker/rewind";

const TEST_INSTANCE_ID = "rewind-test-instance";
const ORIGINAL_EXECUTION_ID = "original-exec-id";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an executionStarted event with an explicit execution ID. */
function makeExecutionStarted(
  name: string,
  instanceId: string = TEST_INSTANCE_ID,
  executionId: string = ORIGINAL_EXECUTION_ID,
  parentInstance?: pb.ParentInstanceInfo,
): pb.HistoryEvent {
  const orchestrationInstance = new pb.OrchestrationInstance();
  orchestrationInstance.setInstanceid(instanceId);
  orchestrationInstance.setExecutionid(new StringValue().setValue(executionId));

  const startedEvent = new pb.ExecutionStartedEvent();
  startedEvent.setName(name);
  startedEvent.setOrchestrationinstance(orchestrationInstance);
  if (parentInstance) {
    startedEvent.setParentinstance(parentInstance);
  }

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setExecutionstarted(startedEvent);
  return event;
}

/** Create a parentInstance info with an explicit parent execution ID. */
function makeParentInstance(
  name: string,
  instanceId: string,
  executionId: string,
  taskScheduledId = 5,
): pb.ParentInstanceInfo {
  const parentOrchestrationInstance = new pb.OrchestrationInstance();
  parentOrchestrationInstance.setInstanceid(instanceId);
  parentOrchestrationInstance.setExecutionid(new StringValue().setValue(executionId));

  const parentInstance = new pb.ParentInstanceInfo();
  parentInstance.setTaskscheduledid(taskScheduledId);
  parentInstance.setName(new StringValue().setValue(name));
  parentInstance.setOrchestrationinstance(parentOrchestrationInstance);
  return parentInstance;
}

/** Create an executionRewound history event. */
function makeExecutionRewound(reason = "test rewind", parentExecutionId?: string): pb.HistoryEvent {
  const rewound = new pb.ExecutionRewoundEvent();
  rewound.setReason(new StringValue().setValue(reason));
  if (parentExecutionId !== undefined) {
    rewound.setParentexecutionid(new StringValue().setValue(parentExecutionId));
  }

  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setExecutionrewound(rewound);
  return event;
}

/** Create an orchestratorCompleted history event. */
function makeOrchestratorCompleted(): pb.HistoryEvent {
  const event = new pb.HistoryEvent();
  event.setEventid(-1);
  event.setOrchestratorcompleted(new pb.OrchestratorCompletedEvent());
  return event;
}

/** Extract the clean history from a RewindOrchestrationAction result. */
function getCleanHistory(result: { actions: pb.OrchestratorAction[] }): pb.HistoryEvent[] {
  expect(result.actions).toHaveLength(1);
  const action = result.actions[0];
  expect(action.hasRewindorchestration()).toBe(true);
  return action.getRewindorchestration()!.getNewhistoryList();
}

// ---------------------------------------------------------------------------
// Tests: execution ID changes
// ---------------------------------------------------------------------------

describe("buildRewindResult", () => {
  it("assignsNewExecutionId: the executionStarted event gets a new, different execution ID", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("my_orch"),
      newTaskScheduledEvent(1, "my_activity"),
      newTaskFailedEvent(1, new Error("boom")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("boom")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("retry")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    const started = clean.filter((e) => e.hasExecutionstarted());
    expect(started).toHaveLength(1);

    const newExecId = started[0].getExecutionstarted()!.getOrchestrationinstance()!.getExecutionid()!.getValue();
    expect(newExecId).not.toEqual(ORIGINAL_EXECUTION_ID);
    expect(newExecId.length).toBeGreaterThan(0);
  });

  it("preservesExecutionStartedFields: name and instanceId are preserved, only execution ID changes", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("preserve_me"),
      newTaskScheduledEvent(1, "act"),
      newTaskFailedEvent(1, new Error("fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("fail")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("retry")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    const started = clean.filter((e) => e.hasExecutionstarted())[0].getExecutionstarted()!;
    expect(started.getName()).toEqual("preserve_me");
    expect(started.getOrchestrationinstance()!.getInstanceid()).toEqual(TEST_INSTANCE_ID);
  });

  it("updatesParentExecutionId: parent execution ID is updated when the rewind event carries one", () => {
    const parentNewExecId = "parent-new-exec-id";
    const parentInfo = makeParentInstance("parent_orch", "parent-instance", "parent-old-exec-id");

    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("child_orch", TEST_INSTANCE_ID, ORIGINAL_EXECUTION_ID, parentInfo),
      newTaskScheduledEvent(1, "child_act"),
      newTaskFailedEvent(1, new Error("child fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("child fail")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("parent rewind", parentNewExecId)];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    const started = clean.filter((e) => e.hasExecutionstarted())[0].getExecutionstarted()!;
    const actualParentExecId = started.getParentinstance()!.getOrchestrationinstance()!.getExecutionid()!.getValue();
    expect(actualParentExecId).toEqual(parentNewExecId);
  });

  it("noParentExecutionIdLeavesParentUnchanged: parent is untouched when the rewind event has no parentExecutionId", () => {
    const parentExecId = "parent-exec-id-unchanged";
    const parentInfo = makeParentInstance("parent_orch", "parent-instance", parentExecId);

    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("child_orch", TEST_INSTANCE_ID, ORIGINAL_EXECUTION_ID, parentInfo),
      newTaskScheduledEvent(1, "child_act"),
      newTaskFailedEvent(1, new Error("fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("fail")),
      ),
    ];
    // No parentExecutionId on the rewind event.
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("top-level rewind")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    const started = clean.filter((e) => e.hasExecutionstarted())[0].getExecutionstarted()!;
    const actualParentExecId = started.getParentinstance()!.getOrchestrationinstance()!.getExecutionid()!.getValue();
    expect(actualParentExecId).toEqual(parentExecId);
  });

  // -------------------------------------------------------------------------
  // Tests: failed activity cleanup
  // -------------------------------------------------------------------------

  it("removesFailedActivityEvents: taskFailed and its taskScheduled are removed", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("orch"),
      newTaskScheduledEvent(1, "my_act"),
      newTaskFailedEvent(1, new Error("boom")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("boom")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("retry")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    expect(clean.some((e) => e.hasTaskfailed())).toBe(false);
    expect(clean.some((e) => e.hasTaskscheduled() && e.getEventid() === 1)).toBe(false);
  });

  it("preservesSuccessfulActivity: successful taskScheduled + taskCompleted remain", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("orch"),
      // Activity 1 succeeds
      newTaskScheduledEvent(1, "good_act"),
      newTaskCompletedEvent(1, JSON.stringify("ok")),
      makeOrchestratorCompleted(),
      // Activity 2 fails
      newOrchestratorStartedEvent(),
      newTaskScheduledEvent(2, "bad_act"),
      newTaskFailedEvent(2, new Error("fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("fail")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("retry")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    // Activity 1's taskScheduled and taskCompleted should still be present.
    expect(clean.some((e) => e.hasTaskscheduled() && e.getEventid() === 1)).toBe(true);
    expect(clean.some((e) => e.hasTaskcompleted() && e.getTaskcompleted()!.getTaskscheduledid() === 1)).toBe(true);
    // Activity 2's taskScheduled and taskFailed should be removed.
    expect(clean.some((e) => e.hasTaskscheduled() && e.getEventid() === 2)).toBe(false);
    expect(clean.some((e) => e.hasTaskfailed())).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Tests: failed sub-orchestration cleanup
  // -------------------------------------------------------------------------

  it("removesFailedSubOrchEvents: subOrchestrationInstanceFailed removed, created kept", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("parent_orch"),
      newSubOrchestrationCreatedEvent(1, "child_orch", "child-id"),
      makeOrchestratorCompleted(),
      newOrchestratorStartedEvent(),
      newSubOrchestrationFailedEvent(1, new Error("child exploded")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("child exploded")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("rewind child")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    expect(clean.some((e) => e.hasSuborchestrationinstancefailed())).toBe(false);
    // Sub-orchestrations use subOrchestrationInstanceCreated, not taskScheduled.
    expect(clean.some((e) => e.hasTaskscheduled())).toBe(false);
    // The created event is preserved so the backend can identify which sub-orch to rewind.
    expect(clean.some((e) => e.hasSuborchestrationinstancecreated())).toBe(true);
  });

  it("preservesSuccessfulSubOrchestration: successful sub-orch events preserved", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("parent_orch"),
      // Sub-orch 1 succeeds
      newSubOrchestrationCreatedEvent(1, "child_ok", "child-ok-id"),
      makeOrchestratorCompleted(),
      newOrchestratorStartedEvent(),
      newSubOrchestrationCompletedEvent(1, JSON.stringify("child result")),
      // Sub-orch 2 fails
      newSubOrchestrationCreatedEvent(2, "child_fail", "child-fail-id"),
      makeOrchestratorCompleted(),
      newOrchestratorStartedEvent(),
      newSubOrchestrationFailedEvent(2, new Error("fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("fail")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("retry")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    const createdIds = clean
      .filter((e) => e.hasSuborchestrationinstancecreated())
      .map((e) => e.getSuborchestrationinstancecreated()!.getInstanceid());
    expect(createdIds).toContain("child-ok-id");
    const completedSubIds = clean
      .filter((e) => e.hasSuborchestrationinstancecompleted())
      .map((e) => e.getSuborchestrationinstancecompleted()!.getTaskscheduledid());
    expect(completedSubIds).toContain(1);
    // Sub-orch 2's failed event should be removed.
    expect(clean.some((e) => e.hasSuborchestrationinstancefailed())).toBe(false);
    // Sub-orch 2's created event should be kept (for backend recursive rewind).
    expect(createdIds).toContain("child-fail-id");
  });

  // -------------------------------------------------------------------------
  // Tests: executionCompleted removal
  // -------------------------------------------------------------------------

  it("removesExecutionCompleted: executionCompleted events are stripped", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("orch"),
      newTaskScheduledEvent(1, "act"),
      newTaskFailedEvent(1, new Error("fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("fail")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("retry")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    expect(clean.some((e) => e.hasExecutioncompleted())).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Tests: orchestratorStarted/Completed preservation
  // -------------------------------------------------------------------------

  it("keepsOrchestratorStartedAndCompleted: bookend events are preserved", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("orch"),
      newTaskScheduledEvent(1, "act"),
      makeOrchestratorCompleted(),
      newOrchestratorStartedEvent(),
      newTaskFailedEvent(1, new Error("fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("fail")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("retry")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    const startedCount = clean.filter((e) => e.hasOrchestratorstarted()).length;
    const completedCount = clean.filter((e) => e.hasOrchestratorcompleted()).length;
    // old_events has 2 orchestratorStarted + 2 orchestratorCompleted,
    // new_events adds 1 orchestratorStarted. All should be kept.
    expect(startedCount).toBeGreaterThanOrEqual(2);
    expect(completedCount).toBeGreaterThanOrEqual(2);
  });

  // -------------------------------------------------------------------------
  // Tests: executionRewound event preserved
  // -------------------------------------------------------------------------

  it("keepsExecutionRewoundEvent: the executionRewound event itself remains", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("orch"),
      newTaskScheduledEvent(1, "act"),
      newTaskFailedEvent(1, new Error("fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("fail")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("rewind reason")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    const rewoundEvents = clean.filter((e) => e.hasExecutionrewound());
    expect(rewoundEvents).toHaveLength(1);
    expect(rewoundEvents[0].getExecutionrewound()!.getReason()!.getValue()).toEqual("rewind reason");
  });

  // -------------------------------------------------------------------------
  // Tests: mixed scenario
  // -------------------------------------------------------------------------

  it("mixedActivitiesAndSubOrchestrations: only failed items cleaned, execution ID updated", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("complex_orch"),
      // Activity 1 succeeds (eventId=1)
      newTaskScheduledEvent(1, "good_activity"),
      newTaskCompletedEvent(1, JSON.stringify("good")),
      // Sub-orch A succeeds (eventId=2)
      newSubOrchestrationCreatedEvent(2, "child_ok", "child-ok-id"),
      makeOrchestratorCompleted(),
      newOrchestratorStartedEvent(),
      newSubOrchestrationCompletedEvent(2, JSON.stringify("child ok result")),
      // Activity 3 fails (eventId=3)
      newTaskScheduledEvent(3, "bad_activity"),
      newTaskFailedEvent(3, new Error("act fail")),
      makeOrchestratorCompleted(),
      // Sub-orch B fails (eventId=4)
      newOrchestratorStartedEvent(),
      newSubOrchestrationCreatedEvent(4, "child_fail", "child-fail-id"),
      makeOrchestratorCompleted(),
      newOrchestratorStartedEvent(),
      newSubOrchestrationFailedEvent(4, new Error("sub orch fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("overall fail")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("fix everything")];

    const result = buildRewindResult(oldEvents, newEvents);
    const clean = getCleanHistory(result);

    // --- Execution ID changed ---
    const started = clean.filter((e) => e.hasExecutionstarted());
    expect(started).toHaveLength(1);
    expect(started[0].getExecutionstarted()!.getOrchestrationinstance()!.getExecutionid()!.getValue()).not.toEqual(
      ORIGINAL_EXECUTION_ID,
    );

    // --- Successful activity 1 preserved ---
    expect(clean.some((e) => e.hasTaskscheduled() && e.getEventid() === 1)).toBe(true);
    expect(clean.some((e) => e.hasTaskcompleted() && e.getTaskcompleted()!.getTaskscheduledid() === 1)).toBe(true);

    // --- Failed activity 3 removed ---
    expect(clean.some((e) => e.hasTaskscheduled() && e.getEventid() === 3)).toBe(false);
    expect(clean.some((e) => e.hasTaskfailed())).toBe(false);

    // --- Successful sub-orch A preserved ---
    const createdIds = clean
      .filter((e) => e.hasSuborchestrationinstancecreated())
      .map((e) => e.getSuborchestrationinstancecreated()!.getInstanceid());
    expect(createdIds).toContain("child-ok-id");
    const completedSubIds = clean
      .filter((e) => e.hasSuborchestrationinstancecompleted())
      .map((e) => e.getSuborchestrationinstancecompleted()!.getTaskscheduledid());
    expect(completedSubIds).toContain(2);

    // --- Failed sub-orch B: failed event removed, created kept ---
    expect(clean.some((e) => e.hasSuborchestrationinstancefailed())).toBe(false);
    expect(createdIds).toContain("child-fail-id");

    // --- executionCompleted removed ---
    expect(clean.some((e) => e.hasExecutioncompleted())).toBe(false);

    // --- executionRewound preserved ---
    expect(clean.some((e) => e.hasExecutionrewound())).toBe(true);
  });

  it("doesNotMutateOriginalEvents: original history events are not modified in place", () => {
    const esEvent = makeExecutionStarted("orch");
    const originalExecId = esEvent.getExecutionstarted()!.getOrchestrationinstance()!.getExecutionid()!.getValue();

    const oldEvents = [
      newOrchestratorStartedEvent(),
      esEvent,
      newTaskScheduledEvent(1, "act"),
      newTaskFailedEvent(1, new Error("fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("fail")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("retry")];

    buildRewindResult(oldEvents, newEvents);

    // The original executionStarted event should NOT be mutated.
    const actual = esEvent.getExecutionstarted()!.getOrchestrationinstance()!.getExecutionid()!.getValue();
    expect(actual).toEqual(originalExecId);
  });

  it("resultActionStructure: exactly one action with id=-1 and a rewindOrchestration field", () => {
    const oldEvents = [
      newOrchestratorStartedEvent(),
      makeExecutionStarted("orch"),
      newTaskScheduledEvent(1, "act"),
      newTaskFailedEvent(1, new Error("fail")),
      makeOrchestratorCompleted(),
      newExecutionCompletedEvent(
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        newFailureDetails(new Error("fail")),
      ),
    ];
    const newEvents = [newOrchestratorStartedEvent(), makeExecutionRewound("retry")];

    const result = buildRewindResult(oldEvents, newEvents);

    expect(result.actions).toHaveLength(1);
    const action = result.actions[0];
    expect(action.getId()).toEqual(-1);
    expect(action.hasRewindorchestration()).toBe(true);
    expect(result.customStatus).toBeUndefined();
  });
});
