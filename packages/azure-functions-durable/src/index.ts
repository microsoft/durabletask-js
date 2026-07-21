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
  TaskHubOptions,
  getGrpcHostAddress,
} from "./client";
export { getClient, isDurableClientInput } from "./get-client";
export { HttpManagementPayload } from "./http-management-payload";
export { createAzureFunctionsMetadataGenerator } from "./metadata";
export { DurableFunctionsWorker } from "./worker";
export { DurableBindingMetadata, addDurableGrpcMetadata } from "./durable-grpc";
export { RetryOptions } from "./retry-options";
// Re-exported core error so callers can `instanceof`-guard caught orchestration failures, matching
// the classic durable-functions v3 top-level `TaskFailedError` export. (`DurableError` /
// `AggregatedError` were never v3 top-level exports; the core engine surfaces `TaskFailedError` and
// aggregate failures as JS-native `AggregateError`.) See the package README/CHANGELOG migration notes.
export { TaskFailedError } from "@microsoft/durabletask-js";
export {
  DurableOrchestrationContext,
  ClassicOrchestrationContext,
  ClassicOrchestrator,
  wrapOrchestrator,
} from "./orchestration-context";
export { DurableEntityContext, ClassicEntityContext, ClassicEntity, wrapEntity } from "./entity-context";
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
// Durable-client starter option/handler types, surfaced at the top level like v3 so consumers can
// annotate their `app.client.*` handlers. The registration functions live under `app.client.*`.
export type {
  DurableClientHandler,
  DurableClientOptions,
  HttpDurableClientHandler,
  HttpDurableClientOptions,
  TimerDurableClientHandler,
  TimerDurableClientOptions,
  StorageBlobDurableClientHandler,
  StorageBlobDurableClientOptions,
  StorageQueueDurableClientHandler,
  StorageQueueDurableClientOptions,
  ServiceBusQueueDurableClientHandler,
  ServiceBusQueueDurableClientOptions,
  ServiceBusTopicDurableClientHandler,
  ServiceBusTopicDurableClientOptions,
  EventHubDurableClientHandler,
  EventHubDurableClientOptions,
  EventGridDurableClientHandler,
  EventGridDurableClientOptions,
  CosmosDBDurableClientHandler,
  CosmosDBDurableClientOptions,
  CosmosDBv3DurableClientOptions,
  CosmosDBv4DurableClientOptions,
} from "./app-client";
export type {
  ClassicOrchestrator as OrchestrationHandler,
  ClassicOrchestrationContext as OrchestrationContext,
} from "./orchestration-context";

/** v3-compat: client returned by {@link getClient}. */
export type DurableClient = DurableFunctionsClient;
/**
 * v3-compat: entity context. When typed `EntityContext<TState>`, a bare `context.df.getState()`
 * returns `TState | undefined` (matching the v3 generic entity context). The per-call generics on
 * `df.getState<T>()`/`df.getInput<T>()` still allow overriding the type at the call site.
 */
export type EntityContext<TState = unknown> = ClassicEntityContext<TState>;
/** v3-compat: entity handler. `TState` threads through to `context.df` (see {@link EntityContext}). */
export type EntityHandler<TState = unknown> = ClassicEntity<TState>;
