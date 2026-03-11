// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationContext, TOrchestrator, EntityInstanceId } from "@microsoft/durabletask-js";
import { ExportJobOperationRequest } from "../models";

/**
 * A simple orchestrator that routes an operation to the export job entity.
 * This orchestrator is used to ensure entity operations are executed
 * transactionally through the orchestration system.
 */
export const executeExportJobOperationOrchestrator: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  input: ExportJobOperationRequest,
): any {
  if (!input || !input.entityId || !input.operationName) {
    throw new Error("ExportJobOperationRequest with entityId and operationName is required.");
  }

  // Reconstruct EntityInstanceId from its string representation
  const entityId = EntityInstanceId.fromString(input.entityId);

  // Route the operation to the entity
  const result: unknown = yield ctx.entities.callEntity(
    entityId,
    input.operationName,
    input.input,
  );

  return result;
};
