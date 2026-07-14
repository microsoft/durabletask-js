// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Regression tests for issue #299:
// https://github.com/microsoft/durabletask-js/issues/299
//
// A nested orchestration whose `Task.all` fan-out had MORE THAN ONE failed activity fails to
// complete after an Azure Storage server-side rewind. The backend rewrites the failed
// orchestration's history; for each failed activity it removes/morphs the corresponding
// `TaskScheduled` ONLY when a `TaskFailed` event exists for it (DurableTask.Core
// `ProcessRewindOrchestrationDecision`; DurableTask.AzureStorage `RewindHistoryAsync`).
//
// When `Task.all` fails fast, the child orchestration completes-failed after the FIRST sibling
// failure and the SECOND sibling's `TaskFailed` is never committed. After the rewind that
// sibling is left with a BARE `TaskScheduled` (no terminal event). On replay the worker deletes
// its pending action (assuming a completion will arrive) but none ever does -> the child's
// `Task.all` never resolves -> deadlock -> 30s timeout.
//
// These tests reproduce the exact post-rewind history at the executor level and drive it through
// a small harness that models the classic Azure Storage backend (which ALWAYS appends a fresh
// `TaskScheduled` per scheduleTask action -- DurableTask.Core `ProcessScheduleTaskDecision`,
// no dedup).

import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import * as pb from "../src/proto/orchestrator_service_pb";
import {
  newExecutionStartedEvent,
  newOrchestratorStartedEvent,
  newTaskCompletedEvent,
  newTaskFailedEvent,
  newTaskScheduledEvent,
} from "../src/utils/pb-helper.util";
import { OrchestrationExecutor } from "../src/worker/orchestration-executor";
import { Registry } from "../src/worker/registry";
import { NoOpLogger } from "../src/types/logger.type";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { ActivityContext } from "../src/task/context/activity-context";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { whenAll } from "../src/task";

const testLogger = new NoOpLogger();
const INSTANCE_ID = "49a1700c:0002:0003";

/** Build a `GenericEvent` history event. The classic (Azure Storage) rewind morphs the removed
 *  TaskScheduled / TaskFailed / ExecutionCompleted events into GenericEvents whose data starts
 *  with "Rewound:". These are the only signal a plain replay has that a rewind occurred. */
function newGenericEvent(data: string, eventId = -1): pb.HistoryEvent {
  const generic = new pb.GenericEvent();
  const sv = new StringValue();
  sv.setValue(data);
  generic.setData(sv);

  const event = new pb.HistoryEvent();
  event.setEventid(eventId);
  event.setTimestamp(new Timestamp());
  event.setGenericevent(generic);
  return event;
}

interface DriveResult {
  completed: boolean;
  deadlocked: boolean;
  status?: pb.OrchestrationStatus;
  output?: string;
  episodes: number;
}

/**
 * Drives the executor through successive episodes, modelling the classic Azure Storage backend:
 * every scheduleTask action results in a NEW TaskScheduled event appended to history (no dedup),
 * followed by the activity's TaskCompleted/TaskFailed. Stops when the orchestration completes or
 * makes no progress (0 scheduleTask actions while still incomplete = deadlock).
 *
 * The first episode models the rewind revival: its NEW events carry the GenericEvent trigger that
 * DurableTask.AzureStorage sends to wake a rewound instance (`new GenericEvent(-1, reason)`).
 */
async function driveClassicBackend(
  registry: Registry,
  instanceId: string,
  initialCommitted: pb.HistoryEvent[],
  activityImpls: Record<string, (input: any) => any>,
  maxEpisodes = 25,
): Promise<DriveResult> {
  const committed = [...initialCommitted];

  for (let episode = 0; episode < maxEpisodes; episode++) {
    const newEvents: pb.HistoryEvent[] = [newOrchestratorStartedEvent(new Date())];
    if (episode === 0) {
      // Rewind revival trigger delivered as a NEW event (data is an arbitrary reason string).
      newEvents.push(newGenericEvent("Rewound: RewindParentOrchestration"));
    }

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(instanceId, committed, newEvents);
    const actions = result.actions;

    const completeAction = actions.find((a) => a.hasCompleteorchestration());
    if (completeAction) {
      const co = completeAction.getCompleteorchestration()!;
      return {
        completed: true,
        deadlocked: false,
        status: co.getOrchestrationstatus(),
        output: co.getResult()?.getValue(),
        episodes: episode + 1,
      };
    }

    const scheduleActions = actions.filter((a) => a.hasScheduletask());
    if (scheduleActions.length === 0) {
      // Not complete and nothing scheduled: the orchestration can never make progress.
      return { completed: false, deadlocked: true, episodes: episode + 1 };
    }

    for (const action of scheduleActions) {
      const id = action.getId();
      const scheduleTask = action.getScheduletask()!;
      const name = scheduleTask.getName();
      const encodedInput = scheduleTask.getInput()?.getValue();
      const input = encodedInput !== undefined ? JSON.parse(encodedInput) : undefined;

      // Classic backend ALWAYS appends a fresh TaskScheduled (DurableTask.Core
      // ProcessScheduleTaskDecision -- no dedup), even if a bare TaskScheduled with the same id
      // is already present in history. This is what makes duplicate-tolerance necessary.
      committed.push(newTaskScheduledEvent(id, name, encodedInput));

      const impl = activityImpls[name];
      try {
        const output = impl ? impl(input) : undefined;
        committed.push(newTaskCompletedEvent(id, output !== undefined ? JSON.stringify(output) : undefined));
      } catch (err) {
        committed.push(newTaskFailedEvent(id, err as Error));
      }
    }
  }

  return { completed: false, deadlocked: false, episodes: maxEpisodes };
}

describe("Rewind multi-failed-sibling deadlock (issue #299)", () => {
  it("re-dispatches ALL previously-failed Task.all siblings after an Azure Storage rewind and completes", async () => {
    // The child orchestration: Task.all of one succeeding + two failing activities.
    //   id 1 = succeedActivity, id 2 = failActivity("f1"), id 3 = failActivity("f2")
    const succeedActivity = (_: ActivityContext, input: string): string => `ok:${input}`;

    let failInvocations = 0;
    const failInputsSeen: string[] = [];
    const failActivity = (_: ActivityContext, input: string): string => {
      failInvocations += 1;
      failInputsSeen.push(input);
      // Post-rewind the activity has been "fixed" and now succeeds.
      return `fixed:${input}`;
    };

    const childOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      return yield whenAll([
        ctx.callActivity(succeedActivity, input),
        ctx.callActivity(failActivity, "f1"),
        ctx.callActivity(failActivity, "f2"),
      ]);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(childOrchestrator);
    registry.addActivity(succeedActivity);
    registry.addActivity(failActivity);

    // Faithful post-rewind history (mirrors the 16-event child replay in armB-nf1.log, reduced to
    // the essential structure): Succeed retained + completed; Fail_A(2) fully morphed away (its
    // TaskScheduled is gone -> its pending action survives -> re-dispatched cleanly); Fail_B(3)
    // left with a BARE TaskScheduled and NO terminal (its TaskFailed was dropped by fail-fast) ->
    // orphan. Three "Rewound:" GenericEvents mark the rewind.
    const postRewindHistory: pb.HistoryEvent[] = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, INSTANCE_ID, JSON.stringify("input")),
      newTaskScheduledEvent(1, "succeedActivity", JSON.stringify("input")), // Succeed TS (retained)
      newGenericEvent("Rewound: TaskScheduled", 2), // Fail_A(2) TaskScheduled morphed away
      newTaskScheduledEvent(3, "failActivity", JSON.stringify("f2")), // Fail_B(3) TaskScheduled BARE
      newGenericEvent("Rewound: TaskFailed"), // Fail_A(2) TaskFailed morphed
      newTaskCompletedEvent(1, JSON.stringify("ok:input")), // Succeed TaskCompleted
      newGenericEvent("Rewound: TaskFailed"), // child ExecutionCompleted(Failed) morphed
    ];

    const result = await driveClassicBackend(registry, INSTANCE_ID, postRewindHistory, {
      succeedActivity: (input: string) => `ok:${input}`,
      failActivity: (input: string) => {
        failInvocations += 1;
        failInputsSeen.push(input);
        return `fixed:${input}`;
      },
    });

    // Before the fix: the orphaned sibling is never re-dispatched -> deadlock.
    expect(result.deadlocked).toBe(false);
    expect(result.completed).toBe(true);
    expect(result.status).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

    // BOTH previously-failed siblings must be re-dispatched exactly once.
    expect(failInvocations).toBe(2);
    expect(failInputsSeen.sort()).toEqual(["f1", "f2"]);

    // The Task.all resolved with all three results.
    expect(result.output).toBe(JSON.stringify(["ok:input", "fixed:f1", "fixed:f2"]));
  });

  it("re-dispatches N (=3) failed siblings after rewind (generality check)", async () => {
    // One succeeding activity + THREE failing siblings, two of them left as bare TaskScheduled.
    let failInvocations = 0;

    const succeedActivity = (_: ActivityContext, input: string): string => `ok:${input}`;
    const failActivity = (_: ActivityContext, input: string): string => `fixed:${input}`;

    const childOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      return yield whenAll([
        ctx.callActivity(succeedActivity, input),
        ctx.callActivity(failActivity, "f1"),
        ctx.callActivity(failActivity, "f2"),
        ctx.callActivity(failActivity, "f3"),
      ]);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(childOrchestrator);
    registry.addActivity(succeedActivity);
    registry.addActivity(failActivity);

    // Succeed(1) retained+completed; Fail(2) morphed away; Fail(3) and Fail(4) BOTH bare orphans.
    const postRewindHistory: pb.HistoryEvent[] = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, INSTANCE_ID, JSON.stringify("input")),
      newTaskScheduledEvent(1, "succeedActivity", JSON.stringify("input")),
      newGenericEvent("Rewound: TaskScheduled", 2), // Fail(2) morphed away
      newTaskScheduledEvent(3, "failActivity", JSON.stringify("f2")), // Fail(3) BARE orphan
      newTaskScheduledEvent(4, "failActivity", JSON.stringify("f3")), // Fail(4) BARE orphan
      newTaskCompletedEvent(1, JSON.stringify("ok:input")),
      newGenericEvent("Rewound: TaskFailed"),
      newGenericEvent("Rewound: TaskFailed"),
      newGenericEvent("Rewound: TaskFailed"),
    ];

    const result = await driveClassicBackend(registry, INSTANCE_ID, postRewindHistory, {
      succeedActivity: (input: string) => `ok:${input}`,
      failActivity: (_input: string) => {
        failInvocations += 1;
        return `fixed:${_input}`;
      },
    });

    expect(result.deadlocked).toBe(false);
    expect(result.completed).toBe(true);
    expect(result.status).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(failInvocations).toBe(3);
    expect(result.output).toBe(JSON.stringify(["ok:input", "fixed:f1", "fixed:f2", "fixed:f3"]));
  });

  it("does NOT re-dispatch an in-flight bare TaskScheduled during ordinary (non-rewind) replay", async () => {
    // No rewind markers here: task 2 is genuinely in-flight (scheduled, not yet completed). The
    // worker must NOT re-dispatch it (that would double-execute the activity).
    const activityA = (_: ActivityContext, input: string): string => `a:${input}`;
    const activityB = (_: ActivityContext, input: string): string => `b:${input}`;

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, input: string): any {
      return yield whenAll([ctx.callActivity(activityA, input), ctx.callActivity(activityB, input)]);
    };

    const registry = new Registry();
    const name = registry.addOrchestrator(orchestrator);
    registry.addActivity(activityA);
    registry.addActivity(activityB);

    const history: pb.HistoryEvent[] = [
      newOrchestratorStartedEvent(new Date()),
      newExecutionStartedEvent(name, INSTANCE_ID, JSON.stringify("x")),
      newTaskScheduledEvent(1, "activityA", JSON.stringify("x")),
      newTaskScheduledEvent(2, "activityB", JSON.stringify("x")), // in-flight, no completion
      newTaskCompletedEvent(1, JSON.stringify("a:x")),
    ];

    const executor = new OrchestrationExecutor(registry, testLogger);
    const result = await executor.execute(INSTANCE_ID, history, [newOrchestratorStartedEvent(new Date())]);

    // No completion, and NO scheduleTask actions: the in-flight task is left alone.
    expect(result.actions.filter((a) => a.hasScheduletask())).toHaveLength(0);
    expect(result.actions.find((a) => a.hasCompleteorchestration())).toBeUndefined();
  });
});
