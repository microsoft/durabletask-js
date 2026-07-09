// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import type { ClassicEntityContext, ClassicEntity } from "./entity-context";
import type { DurableFunctionsClient } from "./client";

export * as app from "./app";
export * as trigger from "./trigger";
export * as input from "./input";

export {
  DurableFunctionsClient,
  DurableFunctionsClientConfig,
  DurableFunctionsClientInput,
  DurableOrchestrationClient,
  getGrpcHostAddress,
} from "./client";
export { getClient, isDurableClientInput } from "./get-client";
export { HttpManagementPayload } from "./http-management-payload";
export { createAzureFunctionsMetadataGenerator } from "./metadata";
export { DurableFunctionsWorker } from "./worker";
export { DurableBindingMetadata, addDurableGrpcMetadata } from "./durable-grpc";
export { RetryOptions } from "./retry-options";
export {
  DurableOrchestrationContext,
  ClassicOrchestrationContext,
  ClassicOrchestrator,
  wrapOrchestrator,
} from "./orchestration-context";
export {
  DurableEntityContext,
  ClassicEntityContext,
  ClassicEntity,
  wrapEntity,
} from "./entity-context";
export {
  DurableOrchestrationStatus,
  DurableOrchestrationStatusInit,
  OrchestrationRuntimeStatus,
  fromOrchestrationRuntimeStatus,
  toDurableOrchestrationStatus,
  toOrchestrationRuntimeStatus,
} from "./orchestration-status";
export { EntityId } from "./entity-id";
export { EntityStateResponse } from "./entity-state-response";
export { PurgeHistoryResult } from "./purge-history-result";
export { OrchestrationFilter } from "./orchestration-filter";

// Legacy durable-functions v3 API compatibility aliases (types only). These let orchestrator/
// activity code written against the classic `durable-functions` v3 API type-check unchanged.
export type { ActivityHandler } from "./app";
export type {
  ClassicOrchestrator as OrchestrationHandler,
  ClassicOrchestrationContext as OrchestrationContext,
} from "./orchestration-context";

/** v3-compat: client returned by {@link getClient}. */
export type DurableClient = DurableFunctionsClient;
/**
 * v3-compat: entity context. `TState` is accepted for source compatibility with the legacy generic
 * API; the underlying `df.getState<T>()`/`getInput<T>()` are per-call generic, so the type param is
 * intentionally ignored here.
 */
export type EntityContext<_TState = unknown> = ClassicEntityContext;
/** v3-compat: entity handler. `TState` accepted for source compatibility (see {@link EntityContext}). */
export type EntityHandler<_TState = unknown> = ClassicEntity;
