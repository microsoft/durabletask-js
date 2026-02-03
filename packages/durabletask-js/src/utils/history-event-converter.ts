// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import {
  HistoryEvent,
  HistoryEventType,
  OrchestrationInstance,
  ParentInstanceInfo,
  TraceContext,
} from "../orchestration/history-event";
import { FailureDetails } from "../task/failure-details";

// Map OrchestrationStatus enum values to their string names
const ORCHESTRATION_STATUS_MAP: Record<number, string> = {
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING]: "ORCHESTRATION_STATUS_RUNNING",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED]: "ORCHESTRATION_STATUS_COMPLETED",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_CONTINUED_AS_NEW]: "ORCHESTRATION_STATUS_CONTINUED_AS_NEW",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED]: "ORCHESTRATION_STATUS_FAILED",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_CANCELED]: "ORCHESTRATION_STATUS_CANCELED",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_TERMINATED]: "ORCHESTRATION_STATUS_TERMINATED",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_PENDING]: "ORCHESTRATION_STATUS_PENDING",
  [pb.OrchestrationStatus.ORCHESTRATION_STATUS_SUSPENDED]: "ORCHESTRATION_STATUS_SUSPENDED",
};

function convertOrchestrationStatus(status: number): string {
  return ORCHESTRATION_STATUS_MAP[status] ?? `UNKNOWN_STATUS_${status}`;
}

/**
 * Converts a protobuf HistoryEvent to a TypeScript HistoryEvent.
 * @param protoEvent The protobuf HistoryEvent to convert.
 * @returns The converted HistoryEvent, or undefined if the event type is not recognized.
 */
export function convertProtoHistoryEvent(protoEvent: pb.HistoryEvent): HistoryEvent | undefined {
  const eventId = protoEvent.getEventid();
  const timestamp = protoEvent.getTimestamp()?.toDate() ?? new Date(0);
  const eventTypeCase = protoEvent.getEventtypeCase();

  switch (eventTypeCase) {
    case pb.HistoryEvent.EventtypeCase.EXECUTIONSTARTED: {
      const event = protoEvent.getExecutionstarted();
      if (!event) return undefined;
      
      const orchInstance = event.getOrchestrationinstance();
      const parentInfo = event.getParentinstance();
      const scheduledTime = event.getScheduledstarttimestamp();
      const tagsMap = event.getTagsMap();
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.ExecutionStarted,
        name: event.getName(),
        version: event.getVersion()?.getValue(),
        input: event.getInput()?.getValue(),
        orchestrationInstance: orchInstance ? convertOrchestrationInstance(orchInstance) : undefined,
        parentInstance: parentInfo ? convertParentInstanceInfo(parentInfo) : undefined,
        scheduledStartTimestamp: scheduledTime ? scheduledTime.toDate() : undefined,
        tags: tagsMap ? convertTagsMap(tagsMap) : undefined,
      };
    }

    case pb.HistoryEvent.EventtypeCase.EXECUTIONCOMPLETED: {
      const event = protoEvent.getExecutioncompleted();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.ExecutionCompleted,
        orchestrationStatus: convertOrchestrationStatus(event.getOrchestrationstatus()),
        result: event.getResult()?.getValue(),
        failureDetails: convertFailureDetails(event.getFailuredetails()),
      };
    }

    case pb.HistoryEvent.EventtypeCase.EXECUTIONTERMINATED: {
      const event = protoEvent.getExecutionterminated();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.ExecutionTerminated,
        input: event.getInput()?.getValue(),
        recurse: event.getRecurse(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.EXECUTIONSUSPENDED: {
      const event = protoEvent.getExecutionsuspended();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.ExecutionSuspended,
        input: event.getInput()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.EXECUTIONRESUMED: {
      const event = protoEvent.getExecutionresumed();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.ExecutionResumed,
        input: event.getInput()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.EXECUTIONREWOUND: {
      const event = protoEvent.getExecutionrewound();
      if (!event) return undefined;
      
      const parentInfo = event.getParentinstance();
      const traceCtx = event.getParenttracecontext();
      const tagsMap = event.getTagsMap();
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.ExecutionRewound,
        reason: event.getReason()?.getValue(),
        parentExecutionId: event.getParentexecutionid()?.getValue(),
        instanceId: event.getInstanceid()?.getValue(),
        parentTraceContext: traceCtx ? convertTraceContext(traceCtx) : undefined,
        name: event.getName()?.getValue(),
        version: event.getVersion()?.getValue(),
        input: event.getInput()?.getValue(),
        parentInstance: parentInfo ? convertParentInstanceInfo(parentInfo) : undefined,
        tags: tagsMap && tagsMap.getLength() > 0 ? convertTagsMap(tagsMap) : undefined,
      };
    }

    case pb.HistoryEvent.EventtypeCase.TASKSCHEDULED: {
      const event = protoEvent.getTaskscheduled();
      if (!event) return undefined;
      
      const tagsMap = event.getTagsMap();
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.TaskScheduled,
        name: event.getName(),
        version: event.getVersion()?.getValue(),
        input: event.getInput()?.getValue(),
        tags: tagsMap ? convertTagsMap(tagsMap) : undefined,
      };
    }

    case pb.HistoryEvent.EventtypeCase.TASKCOMPLETED: {
      const event = protoEvent.getTaskcompleted();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.TaskCompleted,
        taskScheduledId: event.getTaskscheduledid(),
        result: event.getResult()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.TASKFAILED: {
      const event = protoEvent.getTaskfailed();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.TaskFailed,
        taskScheduledId: event.getTaskscheduledid(),
        failureDetails: convertFailureDetails(event.getFailuredetails()),
      };
    }

    case pb.HistoryEvent.EventtypeCase.SUBORCHESTRATIONINSTANCECREATED: {
      const event = protoEvent.getSuborchestrationinstancecreated();
      if (!event) return undefined;
      
      const tagsMap = event.getTagsMap();
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.SubOrchestrationInstanceCreated,
        name: event.getName(),
        version: event.getVersion()?.getValue(),
        instanceId: event.getInstanceid(),
        input: event.getInput()?.getValue(),
        tags: tagsMap ? convertTagsMap(tagsMap) : undefined,
      };
    }

    case pb.HistoryEvent.EventtypeCase.SUBORCHESTRATIONINSTANCECOMPLETED: {
      const event = protoEvent.getSuborchestrationinstancecompleted();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.SubOrchestrationInstanceCompleted,
        taskScheduledId: event.getTaskscheduledid(),
        result: event.getResult()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.SUBORCHESTRATIONINSTANCEFAILED: {
      const event = protoEvent.getSuborchestrationinstancefailed();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.SubOrchestrationInstanceFailed,
        taskScheduledId: event.getTaskscheduledid(),
        failureDetails: convertFailureDetails(event.getFailuredetails()),
      };
    }

    case pb.HistoryEvent.EventtypeCase.TIMERCREATED: {
      const event = protoEvent.getTimercreated();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.TimerCreated,
        fireAt: event.getFireat()?.toDate() ?? new Date(0),
      };
    }

    case pb.HistoryEvent.EventtypeCase.TIMERFIRED: {
      const event = protoEvent.getTimerfired();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.TimerFired,
        fireAt: event.getFireat()?.toDate() ?? new Date(0),
        timerId: event.getTimerid(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.ORCHESTRATORSTARTED: {
      return {
        eventId,
        timestamp,
        type: HistoryEventType.OrchestratorStarted,
      };
    }

    case pb.HistoryEvent.EventtypeCase.ORCHESTRATORCOMPLETED: {
      return {
        eventId,
        timestamp,
        type: HistoryEventType.OrchestratorCompleted,
      };
    }

    case pb.HistoryEvent.EventtypeCase.EVENTSENT: {
      const event = protoEvent.getEventsent();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.EventSent,
        name: event.getName(),
        instanceId: event.getInstanceid(),
        input: event.getInput()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.EVENTRAISED: {
      const event = protoEvent.getEventraised();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.EventRaised,
        name: event.getName(),
        input: event.getInput()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.GENERICEVENT: {
      const event = protoEvent.getGenericevent();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.GenericEvent,
        data: event.getData()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.HISTORYSTATE: {
      return {
        eventId,
        timestamp,
        type: HistoryEventType.HistoryState,
      };
    }

    case pb.HistoryEvent.EventtypeCase.CONTINUEASNEW: {
      const event = protoEvent.getContinueasnew();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.ContinueAsNew,
        input: event.getInput()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONSIGNALED: {
      const event = protoEvent.getEntityoperationsignaled();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.EntityOperationSignaled,
        requestId: event.getRequestid(),
        operation: event.getOperation(),
        targetInstanceId: event.getTargetinstanceid()?.getValue(),
        scheduledTime: event.getScheduledtime()?.toDate(),
        input: event.getInput()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONCALLED: {
      const event = protoEvent.getEntityoperationcalled();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.EntityOperationCalled,
        requestId: event.getRequestid(),
        operation: event.getOperation(),
        targetInstanceId: event.getTargetinstanceid()?.getValue(),
        parentInstanceId: event.getParentinstanceid()?.getValue(),
        scheduledTime: event.getScheduledtime()?.toDate(),
        input: event.getInput()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONCOMPLETED: {
      const event = protoEvent.getEntityoperationcompleted();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.EntityOperationCompleted,
        requestId: event.getRequestid(),
        output: event.getOutput()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONFAILED: {
      const event = protoEvent.getEntityoperationfailed();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.EntityOperationFailed,
        requestId: event.getRequestid(),
        failureDetails: convertFailureDetails(event.getFailuredetails()),
      };
    }

    case pb.HistoryEvent.EventtypeCase.ENTITYLOCKREQUESTED: {
      const event = protoEvent.getEntitylockrequested();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.EntityLockRequested,
        criticalSectionId: event.getCriticalsectionid(),
        lockSet: event.getLocksetList(),
        position: event.getPosition(),
        parentInstanceId: event.getParentinstanceid()?.getValue(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.ENTITYLOCKGRANTED: {
      const event = protoEvent.getEntitylockgranted();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.EntityLockGranted,
        criticalSectionId: event.getCriticalsectionid(),
      };
    }

    case pb.HistoryEvent.EventtypeCase.ENTITYUNLOCKSENT: {
      const event = protoEvent.getEntityunlocksent();
      if (!event) return undefined;
      
      return {
        eventId,
        timestamp,
        type: HistoryEventType.EntityUnlockSent,
        criticalSectionId: event.getCriticalsectionid(),
        parentInstanceId: event.getParentinstanceid()?.getValue(),
        targetInstanceId: event.getTargetinstanceid()?.getValue(),
      };
    }

    default:
      return undefined;
  }
}

function convertOrchestrationInstance(instance: pb.OrchestrationInstance): OrchestrationInstance {
  return {
    instanceId: instance.getInstanceid(),
    executionId: instance.getExecutionid()?.getValue(),
  };
}

function convertParentInstanceInfo(parent: pb.ParentInstanceInfo): ParentInstanceInfo {
  const orchInstance = parent.getOrchestrationinstance();
  return {
    name: parent.getName()?.getValue(),
    version: parent.getVersion()?.getValue(),
    taskScheduledId: parent.getTaskscheduledid(),
    orchestrationInstance: orchInstance ? convertOrchestrationInstance(orchInstance) : undefined,
  };
}

function convertTraceContext(traceContext: pb.TraceContext): TraceContext {
  return {
    traceParent: traceContext.getTraceparent(),
    spanId: traceContext.getSpanid(),
    traceState: traceContext.getTracestate()?.getValue(),
  };
}

function convertFailureDetails(details: pb.TaskFailureDetails | undefined): FailureDetails | undefined {
  if (!details) return undefined;
  
  return new FailureDetails(
    details.getErrormessage(),
    details.getErrortype(),
    details.getStacktrace()?.getValue(),
  );
}

function convertTagsMap(tagsMap: ReturnType<pb.ExecutionStartedEvent["getTagsMap"]>): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  let hasEntries = false;
  
  tagsMap.forEach((value: string, key: string) => {
    result[key] = value;
    hasEntries = true;
  });
  
  return hasEntries ? result : undefined;
}
