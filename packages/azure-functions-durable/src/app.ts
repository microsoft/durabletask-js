// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  FunctionHandler,
  FunctionInput,
  FunctionOutput,
  InvocationContext,
  app as azFuncApp,
} from "@azure/functions";
import { EntityFactory, TOrchestrator } from "@microsoft/durabletask-js";
import * as trigger from "./trigger";
import { DurableFunctionsWorker } from "./worker";

// A single worker owns the orchestrator/entity registry for the whole function app. It is never
// started (no gRPC channel, no work-item loop); it only replays one work item per invocation via
// the byte-processor methods. Orchestrators and entities are pre-registered at decoration time so
// the core executor can dispatch by name when the host delivers a work item. This mirrors Python's
// provider intent while avoiding a new worker (and re-registration) per invocation.
const sharedWorker = new DurableFunctionsWorker();

/**
 * Returns the app-wide {@link DurableFunctionsWorker} that holds the orchestrator/entity registry.
 * Exposed for host integration and testing; application code does not normally need it.
 */
export function getSharedWorker(): DurableFunctionsWorker {
  return sharedWorker;
}

/** Secondary bindings that pass straight through to `@azure/functions` `app.generic`. */
interface ExtraRegistrationOptions {
  extraInputs?: FunctionInput[];
  extraOutputs?: FunctionOutput[];
}

export type OrchestrationHandler = TOrchestrator;
export type OrchestrationOptions = ExtraRegistrationOptions & { handler: OrchestrationHandler };

export type EntityHandler = EntityFactory;
export type EntityOptions = ExtraRegistrationOptions & { handler: EntityHandler };

export type ActivityHandler = FunctionHandler;
export type ActivityOptions = ExtraRegistrationOptions & { handler: ActivityHandler };

/**
 * Registers an orchestrator function. The generator is registered on the shared worker under
 * `functionName`, and the Azure Function is wired to the gRPC byte-processing handler so the host's
 * base64 `OrchestratorRequest` is replayed by the core executor.
 */
export function orchestration(
  functionName: string,
  handlerOrOptions: OrchestrationHandler | OrchestrationOptions,
): void {
  const options = normalizeOptions(handlerOrOptions);
  sharedWorker.addNamedOrchestrator(functionName, options.handler);
  azFuncApp.generic(functionName, {
    ...extraBindings(options),
    trigger: trigger.orchestration(),
    handler: createOrchestrationHandler(),
  });
}

/**
 * Registers an entity function. The entity factory is registered on the shared worker under
 * `functionName`, and the Azure Function is wired to the gRPC byte-processing handler so the host's
 * base64 `EntityBatchRequest` is replayed by the core executor.
 */
export function entity(functionName: string, handlerOrOptions: EntityHandler | EntityOptions): void {
  const options = normalizeOptions(handlerOrOptions);
  sharedWorker.addNamedEntity(functionName, options.handler);
  azFuncApp.generic(functionName, {
    ...extraBindings(options),
    trigger: trigger.entity(),
    handler: createEntityHandler(),
  });
}

/**
 * Registers an activity function. Activities are plain Azure Functions: the host delivers the input
 * as the trigger payload and takes the return value directly, so the user handler is registered
 * as-is (no worker round-trip). The `activityTrigger` still carries `durableRequiresGrpc: true` so
 * the extension keeps the gRPC protocol enabled for the app.
 */
export function activity(
  functionName: string,
  handlerOrOptions: ActivityHandler | ActivityOptions,
): void {
  const options = normalizeOptions(handlerOrOptions);
  azFuncApp.generic(functionName, {
    ...extraBindings(options),
    trigger: trigger.activity(),
    handler: options.handler,
  });
}

/** @hidden */
function createOrchestrationHandler(): FunctionHandler {
  return async (triggerInput: unknown, _context: InvocationContext): Promise<string> => {
    return sharedWorker.handleOrchestratorRequest(extractBase64Request(triggerInput));
  };
}

/** @hidden */
function createEntityHandler(): FunctionHandler {
  return async (triggerInput: unknown, _context: InvocationContext): Promise<string> => {
    return sharedWorker.handleEntityBatchRequest(extractBase64Request(triggerInput));
  };
}

/** @hidden */
function normalizeOptions<THandler>(
  handlerOrOptions: THandler | (ExtraRegistrationOptions & { handler: THandler }),
): ExtraRegistrationOptions & { handler: THandler } {
  if (typeof handlerOrOptions === "function") {
    return { handler: handlerOrOptions as THandler };
  }
  return handlerOrOptions as ExtraRegistrationOptions & { handler: THandler };
}

/** @hidden */
function extraBindings(options: ExtraRegistrationOptions): ExtraRegistrationOptions {
  const bindings: ExtraRegistrationOptions = {};
  if (options.extraInputs) {
    bindings.extraInputs = options.extraInputs;
  }
  if (options.extraOutputs) {
    bindings.extraOutputs = options.extraOutputs;
  }
  return bindings;
}

/**
 * Extracts the base64-encoded protobuf request the host delivers to a durable trigger. The value
 * may arrive as the raw base64 string, or wrapped in an object exposing a string `body` (mirrors
 * the Python worker's `getattr(context, "body")` fallback to the context itself).
 *
 * @hidden
 */
function extractBase64Request(triggerInput: unknown): string {
  if (typeof triggerInput === "string") {
    return triggerInput;
  }
  if (triggerInput !== null && typeof triggerInput === "object" && "body" in triggerInput) {
    const body = (triggerInput as { body?: unknown }).body;
    if (typeof body === "string") {
      return body;
    }
  }
  throw new TypeError("Durable trigger did not provide a base64-encoded request body.");
}
