// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { randomUUID } from "crypto";
import * as pb from "../proto/orchestrator_service_pb";
import { getStringValue } from "../utils/pb-helper.util";
import type { OrchestrationExecutionResult } from "./orchestration-executor";

/**
 * Build an {@link OrchestrationExecutionResult} containing a {@link pb.RewindOrchestrationAction}.
 *
 * When the worker detects an `executionRewound` event in the new events (that does not yet
 * appear in the committed history) it rewrites the history by removing failed task results
 * (`taskFailed`) and failed sub-orchestration results (`subOrchestrationInstanceFailed`). The
 * `executionRewound` event is kept so the backend knows why the rewind happened and so it
 * remains in the history for audit purposes.
 *
 * For failed activities, the corresponding `taskScheduled` event is also removed so that the
 * SDK will re-generate a `scheduleTask` action during the next replay, causing the backend to
 * re-dispatch the activity.
 *
 * For failed sub-orchestrations, the `subOrchestrationInstanceCreated` event is kept so the
 * backend can identify which sub-orchestration instances to recursively rewind.
 *
 * Known limitation (shared with the Core/.NET/Python rewind): timer events
 * (`timerCreated` / `timerFired`) emitted between retry attempts of an activity scheduled
 * with a `RetryPolicy` are not removed. On the next replay the regenerated `scheduleTask`
 * action may not line up with those retained timer events, which can surface as a
 * non-determinism mismatch. Rewinding an activity that used a retry policy is therefore not
 * currently supported.
 *
 * WARNING!!!:
 * If any changes are made to how this function modifies the orchestration's history, then
 * corresponding changes *must* be made in the backend implementations that rely on this
 * function for executing a rewind (e.g. the in-memory backend and the DTS backend).
 *
 * @param oldEvents - the committed history events for the instance
 * @param newEvents - the newly received events, which must be exactly
 *   `[orchestratorStarted, executionRewound]`
 * @returns an execution result whose single action is a `rewindOrchestration` action carrying
 *   the cleaned-up history
 */
export function buildRewindResult(
  oldEvents: pb.HistoryEvent[],
  newEvents: pb.HistoryEvent[],
): OrchestrationExecutionResult {
  if (newEvents.length !== 2 || !newEvents[1].hasExecutionrewound()) {
    throw new Error(
      "When rewinding an orchestration, the new events list must contain exactly two events: " +
        "orchestratorStarted and the executionRewound event.",
    );
  }

  const rewindEvent = newEvents[1].getExecutionrewound() as pb.ExecutionRewoundEvent;

  const allEvents = [...oldEvents, ...newEvents];
  // Generate a new execution ID for the rewound execution.
  const newExecutionId = randomUUID().replace(/-/g, "");

  // First pass: collect the task-scheduled IDs that correspond to failed activities so we can
  // remove the matching taskScheduled events in the second pass.
  const failedTaskIds = new Set<number>();
  for (const event of allEvents) {
    if (event.hasTaskfailed()) {
      failedTaskIds.add(event.getTaskfailed()!.getTaskscheduledid());
    }
  }

  const parentExecutionId =
    rewindEvent.hasParentexecutionid() && rewindEvent.getParentexecutionid()!.getValue()
      ? rewindEvent.getParentexecutionid()!.getValue()
      : undefined;

  // Second pass: build the clean history.
  const cleanHistory: pb.HistoryEvent[] = [];
  for (const event of allEvents) {
    if (event.hasTaskfailed()) {
      continue;
    }
    if (event.hasTaskscheduled() && failedTaskIds.has(event.getEventid())) {
      continue;
    }
    if (event.hasSuborchestrationinstancefailed()) {
      continue;
    }
    if (event.hasExecutioncompleted()) {
      continue;
    }

    // Modify the executionStarted event: assign a fresh execution ID and, for
    // sub-orchestrations, update the parent's execution ID so it matches the parent's new run.
    if (event.hasExecutionstarted()) {
      const eventCopy = pb.HistoryEvent.deserializeBinary(event.serializeBinary());
      const startedEvent = eventCopy.getExecutionstarted()!;

      let orchestrationInstance = startedEvent.getOrchestrationinstance();
      if (!orchestrationInstance) {
        orchestrationInstance = new pb.OrchestrationInstance();
        startedEvent.setOrchestrationinstance(orchestrationInstance);
      }
      orchestrationInstance.setExecutionid(getStringValue(newExecutionId));

      // Only update the parent's execution ID when this is actually a sub-orchestration (its
      // executionStarted has a parentInstance). Writing through parentInstance for a top-level
      // orchestration would materialize an empty one.
      if (parentExecutionId && startedEvent.hasParentinstance()) {
        const parentInstance = startedEvent.getParentinstance()!;
        let parentOrchestrationInstance = parentInstance.getOrchestrationinstance();
        if (!parentOrchestrationInstance) {
          parentOrchestrationInstance = new pb.OrchestrationInstance();
          parentInstance.setOrchestrationinstance(parentOrchestrationInstance);
        }
        parentOrchestrationInstance.setExecutionid(getStringValue(parentExecutionId));
      }

      cleanHistory.push(eventCopy);
      continue;
    }

    cleanHistory.push(event);
  }

  const rewindAction = new pb.RewindOrchestrationAction();
  rewindAction.setNewhistoryList(cleanHistory);

  const action = new pb.OrchestratorAction();
  action.setId(-1);
  action.setRewindorchestration(rewindAction);

  return { actions: [action], customStatus: undefined };
}
