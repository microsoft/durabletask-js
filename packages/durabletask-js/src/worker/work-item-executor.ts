// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { EntityInstanceId } from "../entities/entity-instance-id";
import { EntityFactory } from "../entities/task-entity";
import * as pb from "../proto/orchestrator_service_pb";
import { Logger, ConsoleLogger } from "../types/logger.type";
import * as pbh from "../utils/pb-helper.util";
import { compareVersions } from "../utils/versioning.util";
import {
  DurableTaskAttributes,
  createOrchestrationTraceContextPb,
  endSpan,
  processActionsForTracing,
  processNewEventsForTracing,
  setOrchestrationStatusFromActions,
  setSpanError,
  startSpanForOrchestrationExecution,
} from "../tracing";
import { TaskEntityShim } from "./entity-executor";
import * as WorkerLogs from "./logs";
import { OrchestrationExecutor } from "./orchestration-executor";
import { Registry } from "./registry";
import { VersionFailureStrategy, VersioningOptions, VersionMatchStrategy } from "./versioning-options";

export interface WorkItemExecutorOptions {
  /** Optional logger instance. Defaults to ConsoleLogger. */
  logger?: Logger;
  /** Optional versioning options for filtering orchestration requests. */
  versioning?: VersioningOptions;
}

export interface CompletedOrchestratorWorkItemResult {
  kind: "completed";
  response: pb.OrchestratorResponse;
}

export interface AbandonedOrchestratorWorkItemResult {
  kind: "abandoned";
  abandonRequest: pb.AbandonOrchestrationTaskRequest;
  errorType?: string;
  errorMessage?: string;
}

export type OrchestratorWorkItemResult =
  | CompletedOrchestratorWorkItemResult
  | AbandonedOrchestratorWorkItemResult;

interface VersionCompatibilityResult {
  compatible: boolean;
  shouldFail: boolean;
  orchestrationVersion?: string;
  errorType?: string;
  errorMessage?: string;
}

export interface EntityBatchRequestConversion {
  batchRequest: pb.EntityBatchRequest;
  operationInfos: pb.OperationInfo[];
}

/**
 * Executes one orchestration work item and returns the sidecar response message.
 *
 * @remarks
 * This helper is intended for host integrations, such as Azure Functions, that
 * receive a single TaskHubSidecarService OrchestratorRequest and need to return
 * an OrchestratorResponse without running the long-lived gRPC worker loop. It
 * follows this package's runtime support matrix, which currently requires
 * Node.js 22 or higher.
 */
export async function executeOrchestratorWorkItem(
  registry: Registry,
  req: pb.OrchestratorRequest,
  completionToken: string = "",
  options?: WorkItemExecutorOptions,
): Promise<OrchestratorWorkItemResult> {
  const logger = options?.logger ?? new ConsoleLogger();
  const instanceId = req.getInstanceid();

  if (!instanceId) {
    throw new Error(`Could not execute the orchestrator as the instanceId was not provided (${instanceId})`);
  }

  const versionCheckResult = checkVersionCompatibility(req, options?.versioning);
  if (!versionCheckResult.compatible) {
    if (versionCheckResult.shouldFail) {
      WorkerLogs.versionMismatchFail(
        logger,
        instanceId,
        versionCheckResult.errorType!,
        versionCheckResult.errorMessage!,
      );

      const failureDetails = pbh.newVersionMismatchFailureDetails(
        versionCheckResult.errorType!,
        versionCheckResult.errorMessage!,
      );

      const response = new pb.OrchestratorResponse();
      response.setInstanceid(instanceId);
      response.setCompletiontoken(completionToken);
      response.setActionsList([
        pbh.newCompleteOrchestrationAction(
          -1,
          pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
          undefined,
          failureDetails,
        ),
      ]);

      return { kind: "completed", response };
    }

    WorkerLogs.versionMismatchAbandon(
      logger,
      instanceId,
      versionCheckResult.errorType!,
      versionCheckResult.errorMessage!,
    );

    const abandonRequest = new pb.AbandonOrchestrationTaskRequest();
    abandonRequest.setCompletiontoken(completionToken);

    return {
      kind: "abandoned",
      abandonRequest,
      errorType: versionCheckResult.errorType,
      errorMessage: versionCheckResult.errorMessage,
    };
  }

  const allProtoEvents = [...req.getPasteventsList(), ...req.getNeweventsList()];
  let executionStartedProtoEvent: pb.ExecutionStartedEvent | undefined;
  for (const protoEvent of allProtoEvents) {
    if (protoEvent.hasExecutionstarted()) {
      executionStartedProtoEvent = protoEvent.getExecutionstarted()!;
      break;
    }
  }

  const orchTraceContext = req.getOrchestrationtracecontext();
  const tracingResult = executionStartedProtoEvent
    ? startSpanForOrchestrationExecution(executionStartedProtoEvent, orchTraceContext, instanceId)
    : undefined;

  const orchName = executionStartedProtoEvent?.getName() ?? "";
  if (tracingResult) {
    processNewEventsForTracing(
      tracingResult.span,
      req.getPasteventsList(),
      req.getNeweventsList(),
      instanceId,
      orchName,
    );
  }

  let response: pb.OrchestratorResponse;

  try {
    const executor = new OrchestrationExecutor(registry, logger);
    const result = await executor.execute(instanceId, req.getPasteventsList(), req.getNeweventsList());

    if (tracingResult) {
      const executionId = req.getExecutionid()?.getValue();
      processActionsForTracing(tracingResult.span, result.actions, orchName, instanceId, executionId);
    }

    response = new pb.OrchestratorResponse();
    response.setInstanceid(instanceId);
    response.setCompletiontoken(completionToken);
    response.setActionsList(result.actions);

    if (result.customStatus !== undefined) {
      response.setCustomstatus(pbh.getStringValue(result.customStatus));
    }

    if (tracingResult) {
      response.setOrchestrationtracecontext(createOrchestrationTraceContextPb(tracingResult.spanInfo));
      setOrchestrationStatusFromActions(tracingResult.span, result.actions);
    }
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    WorkerLogs.executionError(logger, instanceId, error);

    if (tracingResult) {
      setSpanError(tracingResult.span, error);
      tracingResult.span.setAttribute(DurableTaskAttributes.TASK_STATUS, "Failed");
    }

    response = new pb.OrchestratorResponse();
    response.setInstanceid(instanceId);
    response.setCompletiontoken(completionToken);
    response.setActionsList([
      pbh.newCompleteOrchestrationAction(
        -1,
        pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
        undefined,
        pbh.newFailureDetails(error),
      ),
    ]);
  } finally {
    endSpan(tracingResult?.span);
  }

  return { kind: "completed", response };
}

/**
 * Executes one entity batch work item and returns the sidecar result message.
 *
 * @remarks
 * This helper is intended for host integrations, such as Azure Functions, that
 * receive a single TaskHubSidecarService EntityBatchRequest and need to return
 * an EntityBatchResult without running the long-lived gRPC worker loop. It
 * follows this package's runtime support matrix, which currently requires
 * Node.js 22 or higher.
 */
export async function executeEntityBatchWorkItem(
  registry: Registry,
  req: pb.EntityBatchRequest,
  completionToken: string = "",
  options?: WorkItemExecutorOptions,
  operationInfos?: pb.OperationInfo[],
): Promise<pb.EntityBatchResult> {
  const logger = options?.logger ?? new ConsoleLogger();
  const instanceIdString = req.getInstanceid();

  if (!instanceIdString) {
    throw new Error("Entity request does not contain an instance id");
  }

  let entityId: EntityInstanceId;
  try {
    entityId = EntityInstanceId.fromString(instanceIdString);
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    WorkerLogs.entityInstanceIdParseError(logger, instanceIdString, error);
    return createEntityNotFoundResult(
      req,
      completionToken,
      `Invalid entity instance id format: '${instanceIdString}'`,
    );
  }

  let batchResult: pb.EntityBatchResult;

  try {
    const factory = registry.getEntity(entityId.name);

    if (factory) {
      batchResult = await executeRegisteredEntity(factory, entityId, req);
      batchResult.setCompletiontoken(completionToken);
    } else {
      WorkerLogs.entityNotFound(logger, entityId.name);
      batchResult = createEntityNotFoundResult(
        req,
        completionToken,
        `No entity task named '${entityId.name}' was found.`,
      );
    }
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    WorkerLogs.entityExecutionFailed(logger, entityId.name, error);

    batchResult = new pb.EntityBatchResult();
    batchResult.setCompletiontoken(completionToken);
    batchResult.setFailuredetails(pbh.newFailureDetails(error));
  }

  if (operationInfos && operationInfos.length > 0) {
    const resultsCount = batchResult.getResultsList().length;
    const infosToInclude = operationInfos.slice(0, resultsCount || operationInfos.length);
    batchResult.setOperationinfosList(infosToInclude);
  }

  return batchResult;
}

/**
 * Converts and executes one V2 entity work item.
 */
export async function executeEntityWorkItem(
  registry: Registry,
  req: pb.EntityRequest,
  completionToken: string = "",
  options?: WorkItemExecutorOptions,
): Promise<pb.EntityBatchResult> {
  const conversion = convertEntityRequestToBatchRequest(req, options?.logger);
  return executeEntityBatchWorkItem(
    registry,
    conversion.batchRequest,
    completionToken,
    options,
    conversion.operationInfos,
  );
}

export function convertEntityRequestToBatchRequest(
  req: pb.EntityRequest,
  logger?: Logger,
): EntityBatchRequestConversion {
  const batchRequest = new pb.EntityBatchRequest();
  batchRequest.setInstanceid(req.getInstanceid());

  const entityState = req.getEntitystate();
  if (entityState) {
    batchRequest.setEntitystate(entityState);
  }

  const operations: pb.OperationRequest[] = [];
  const operationInfos: pb.OperationInfo[] = [];

  for (const event of req.getOperationrequestsList()) {
    const eventType = event.getEventtypeCase();

    if (eventType === pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONSIGNALED) {
      const signaled = event.getEntityoperationsignaled();
      if (signaled) {
        const opRequest = new pb.OperationRequest();
        opRequest.setOperation(signaled.getOperation());
        opRequest.setRequestid(signaled.getRequestid());
        const input = signaled.getInput();
        if (input) {
          opRequest.setInput(input);
        }
        operations.push(opRequest);

        const opInfo = new pb.OperationInfo();
        opInfo.setRequestid(signaled.getRequestid());
        operationInfos.push(opInfo);
      }
    } else if (eventType === pb.HistoryEvent.EventtypeCase.ENTITYOPERATIONCALLED) {
      const called = event.getEntityoperationcalled();
      if (called) {
        const opRequest = new pb.OperationRequest();
        opRequest.setOperation(called.getOperation());
        opRequest.setRequestid(called.getRequestid());
        const input = called.getInput();
        if (input) {
          opRequest.setInput(input);
        }
        operations.push(opRequest);

        const opInfo = new pb.OperationInfo();
        opInfo.setRequestid(called.getRequestid());

        const parentInstanceId = called.getParentinstanceid();
        const parentExecutionId = called.getParentexecutionid();
        if (parentInstanceId || parentExecutionId) {
          const responseDestination = new pb.OrchestrationInstance();
          if (parentInstanceId) {
            responseDestination.setInstanceid(parentInstanceId.getValue());
          }
          if (parentExecutionId) {
            const execIdValue = new StringValue();
            execIdValue.setValue(parentExecutionId.getValue());
            responseDestination.setExecutionid(execIdValue);
          }
          opInfo.setResponsedestination(responseDestination);
        }
        operationInfos.push(opInfo);
      }
    } else {
      WorkerLogs.entityUnknownOperationEventType(logger ?? new ConsoleLogger(), eventType.toString());
    }
  }

  batchRequest.setOperationsList(operations);
  return { batchRequest, operationInfos };
}

function checkVersionCompatibility(
  req: pb.OrchestratorRequest,
  versioning?: VersioningOptions,
): VersionCompatibilityResult {
  if (!versioning || versioning.matchStrategy === VersionMatchStrategy.None) {
    return { compatible: true, shouldFail: false };
  }

  const orchestrationVersion = getOrchestrationVersion(req);
  const workerVersion = versioning.version;

  if (!workerVersion) {
    return { compatible: true, shouldFail: false };
  }

  let compatible = false;
  let errorType = "VersionMismatch";
  let errorMessage = "";

  switch (versioning.matchStrategy) {
    case VersionMatchStrategy.Strict:
      compatible = compareVersions(orchestrationVersion, workerVersion) === 0;
      if (!compatible) {
        errorMessage = `The orchestration version '${orchestrationVersion ?? ""}' does not match the worker version '${workerVersion}'.`;
      }
      break;

    case VersionMatchStrategy.CurrentOrOlder:
      if (!orchestrationVersion) {
        compatible = true;
      } else {
        compatible = compareVersions(orchestrationVersion, workerVersion) <= 0;
        if (!compatible) {
          errorMessage = `The orchestration version '${orchestrationVersion}' is greater than the worker version '${workerVersion}'.`;
        }
      }
      break;

    default:
      compatible = false;
      errorType = "VersionError";
      errorMessage = `The version match strategy '${versioning.matchStrategy}' is unknown.`;
      break;
  }

  if (!compatible) {
    const shouldFail = versioning.failureStrategy === VersionFailureStrategy.Fail;
    return { compatible: false, shouldFail, orchestrationVersion, errorType, errorMessage };
  }

  return { compatible: true, shouldFail: false };
}

function getOrchestrationVersion(req: pb.OrchestratorRequest): string | undefined {
  const allEvents = [...req.getPasteventsList(), ...req.getNeweventsList()];

  for (const event of allEvents) {
    if (event.hasExecutionstarted()) {
      return event.getExecutionstarted()?.getVersion()?.getValue();
    }
  }

  return undefined;
}

function createEntityNotFoundResult(
  req: pb.EntityBatchRequest,
  completionToken: string,
  errorMessage: string,
): pb.EntityBatchResult {
  const batchResult = new pb.EntityBatchResult();
  batchResult.setCompletiontoken(completionToken);

  const originalState = req.getEntitystate();
  if (originalState) {
    batchResult.setEntitystate(originalState);
  }

  const results: pb.OperationResult[] = [];
  for (let i = 0; i < req.getOperationsList().length; i++) {
    const result = new pb.OperationResult();
    const failure = new pb.OperationResultFailure();
    const failureDetails = new pb.TaskFailureDetails();

    failureDetails.setErrortype("EntityTaskNotFound");
    failureDetails.setErrormessage(errorMessage);
    failureDetails.setIsnonretriable(true);

    failure.setFailuredetails(failureDetails);
    result.setFailure(failure);
    results.push(result);
  }

  batchResult.setResultsList(results);
  batchResult.setActionsList([]);

  return batchResult;
}

async function executeRegisteredEntity(
  factory: EntityFactory,
  entityId: EntityInstanceId,
  req: pb.EntityBatchRequest,
): Promise<pb.EntityBatchResult> {
  const entity = factory();
  const shim = new TaskEntityShim(entity, entityId);
  return shim.executeAsync(req);
}
