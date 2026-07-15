// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  CosmosDBv3FunctionOptions,
  CosmosDBv4FunctionOptions,
  EventGridEvent,
  EventGridFunctionOptions,
  EventHubFunctionOptions,
  FunctionHandler,
  FunctionOptions,
  FunctionResult,
  HttpFunctionOptions,
  HttpRequest,
  HttpResponse,
  HttpResponseInit,
  InvocationContext,
  ServiceBusQueueFunctionOptions,
  ServiceBusTopicFunctionOptions,
  StorageBlobFunctionOptions,
  StorageQueueFunctionOptions,
  Timer,
  TimerFunctionOptions,
  app as azFuncApp,
} from "@azure/functions";
import { DurableFunctionsClient } from "./client";
import { getClient, isDurableClientInput } from "./get-client";
import * as input from "./input";

// The `app.client.*` helpers register an ordinary Azure Functions trigger and inject a
// DurableFunctionsClient as the handler's second argument, restoring the classic durable-functions
// v3 client-starter signature `(trigger, client, context)`. Each helper is a thin wrapper over the
// matching `@azure/functions` `app.*` method: it adds the `durableClient` input binding (so the
// host populates the client configuration) and wraps the handler to build the client via
// `getClient(context)` before delegating. `getClient` is synchronous, so no async is introduced.

/**
 * A handler triggered by some Azure Functions trigger that additionally receives a
 * {@link DurableFunctionsClient} as its second argument.
 */
export type DurableClientHandler = (
  triggerInput: any,
  client: DurableFunctionsClient,
  context: InvocationContext,
) => FunctionResult<any>;

/** Configures the inputs, outputs, and handler for a generic Durable Client function. */
export interface DurableClientOptions extends Omit<FunctionOptions, "handler"> {
  handler: DurableClientHandler;
}

export type HttpDurableClientHandler = (
  request: HttpRequest,
  client: DurableFunctionsClient,
  context: InvocationContext,
) => FunctionResult<HttpResponseInit | HttpResponse>;

/** Configures options for an HTTP-triggered Durable Client function. */
export interface HttpDurableClientOptions extends Omit<HttpFunctionOptions, "handler"> {
  handler: HttpDurableClientHandler;
}

export type TimerDurableClientHandler = (
  myTimer: Timer,
  client: DurableFunctionsClient,
  context: InvocationContext,
) => FunctionResult;

/** Configures options for a timer-triggered Durable Client function. */
export interface TimerDurableClientOptions extends Omit<TimerFunctionOptions, "handler"> {
  handler: TimerDurableClientHandler;
}

export type StorageBlobDurableClientHandler = (
  blob: unknown,
  client: DurableFunctionsClient,
  context: InvocationContext,
) => FunctionResult;

/** Configures options for a storage-blob-triggered Durable Client function. */
export interface StorageBlobDurableClientOptions extends Omit<StorageBlobFunctionOptions, "handler"> {
  handler: StorageBlobDurableClientHandler;
}

export type StorageQueueDurableClientHandler = (
  queueEntry: unknown,
  client: DurableFunctionsClient,
  context: InvocationContext,
) => FunctionResult;

/** Configures options for a storage-queue-triggered Durable Client function. */
export interface StorageQueueDurableClientOptions extends Omit<StorageQueueFunctionOptions, "handler"> {
  handler: StorageQueueDurableClientHandler;
}

export type ServiceBusQueueDurableClientHandler = (
  message: unknown,
  client: DurableFunctionsClient,
  context: InvocationContext,
) => FunctionResult;

/** Configures options for a service-bus-queue-triggered Durable Client function. */
export interface ServiceBusQueueDurableClientOptions extends Omit<ServiceBusQueueFunctionOptions, "handler"> {
  handler: ServiceBusQueueDurableClientHandler;
}

export type ServiceBusTopicDurableClientHandler = (
  message: unknown,
  client: DurableFunctionsClient,
  context: InvocationContext,
) => FunctionResult;

/** Configures options for a service-bus-topic-triggered Durable Client function. */
export interface ServiceBusTopicDurableClientOptions extends Omit<ServiceBusTopicFunctionOptions, "handler"> {
  handler: ServiceBusTopicDurableClientHandler;
}

export type EventHubDurableClientHandler = (
  messages: unknown,
  client: DurableFunctionsClient,
  context: InvocationContext,
) => FunctionResult;

/** Configures options for an Event Hub-triggered Durable Client function. */
export interface EventHubDurableClientOptions extends Omit<EventHubFunctionOptions, "handler"> {
  handler: EventHubDurableClientHandler;
}

export type EventGridDurableClientHandler = (
  event: EventGridEvent,
  client: DurableFunctionsClient,
  context: InvocationContext,
) => FunctionResult;

/** Configures options for an Event Grid-triggered Durable Client function. */
export interface EventGridDurableClientOptions extends Omit<EventGridFunctionOptions, "handler"> {
  handler: EventGridDurableClientHandler;
}

export type CosmosDBDurableClientHandler = (
  documents: unknown[],
  client: DurableFunctionsClient,
  context: InvocationContext,
) => FunctionResult;

/** Configures options for a CosmosDB-triggered Durable Client function (extension v3). */
export interface CosmosDBv3DurableClientOptions extends Omit<CosmosDBv3FunctionOptions, "handler"> {
  handler: CosmosDBDurableClientHandler;
}

/** Configures options for a CosmosDB-triggered Durable Client function (extension v4). */
export interface CosmosDBv4DurableClientOptions extends Omit<CosmosDBv4FunctionOptions, "handler"> {
  handler: CosmosDBDurableClientHandler;
}

export type CosmosDBDurableClientOptions = CosmosDBv3DurableClientOptions | CosmosDBv4DurableClientOptions;

/**
 * Registers an HTTP-triggered Durable Client function. Triggered like a normal HTTP function, but
 * the handler receives a {@link DurableFunctionsClient} as its second argument.
 */
export function http(functionName: string, options: HttpDurableClientOptions): void {
  addClientInput(options);
  azFuncApp.http(functionName, {
    ...options,
    handler: convertToFunctionHandler(options.handler),
  });
}

/** Registers a timer-triggered Durable Client function. */
export function timer(functionName: string, options: TimerDurableClientOptions): void {
  addClientInput(options);
  azFuncApp.timer(functionName, {
    ...options,
    handler: convertToFunctionHandler(options.handler),
  });
}

/** Registers a storage-blob-triggered Durable Client function. */
export function storageBlob(functionName: string, options: StorageBlobDurableClientOptions): void {
  addClientInput(options);
  azFuncApp.storageBlob(functionName, {
    ...options,
    handler: convertToFunctionHandler(options.handler),
  });
}

/** Registers a storage-queue-triggered Durable Client function. */
export function storageQueue(functionName: string, options: StorageQueueDurableClientOptions): void {
  addClientInput(options);
  azFuncApp.storageQueue(functionName, {
    ...options,
    handler: convertToFunctionHandler(options.handler),
  });
}

/** Registers a service-bus-queue-triggered Durable Client function. */
export function serviceBusQueue(functionName: string, options: ServiceBusQueueDurableClientOptions): void {
  addClientInput(options);
  azFuncApp.serviceBusQueue(functionName, {
    ...options,
    handler: convertToFunctionHandler(options.handler),
  });
}

/** Registers a service-bus-topic-triggered Durable Client function. */
export function serviceBusTopic(functionName: string, options: ServiceBusTopicDurableClientOptions): void {
  addClientInput(options);
  azFuncApp.serviceBusTopic(functionName, {
    ...options,
    handler: convertToFunctionHandler(options.handler),
  });
}

/** Registers an Event Hub-triggered Durable Client function. */
export function eventHub(functionName: string, options: EventHubDurableClientOptions): void {
  addClientInput(options);
  azFuncApp.eventHub(functionName, {
    ...options,
    handler: convertToFunctionHandler(options.handler),
  });
}

/** Registers an Event Grid-triggered Durable Client function. */
export function eventGrid(functionName: string, options: EventGridDurableClientOptions): void {
  addClientInput(options);
  azFuncApp.eventGrid(functionName, {
    ...options,
    handler: convertToFunctionHandler(options.handler),
  });
}

/** Registers a CosmosDB-triggered Durable Client function. */
export function cosmosDB(functionName: string, options: CosmosDBDurableClientOptions): void {
  addClientInput(options);
  azFuncApp.cosmosDB(functionName, {
    ...options,
    handler: convertToFunctionHandler(options.handler),
  });
}

/** Registers a generic-triggered Durable Client function. */
export function generic(functionName: string, options: DurableClientOptions): void {
  addClientInput(options);
  azFuncApp.generic(functionName, {
    ...options,
    handler: convertToFunctionHandler(options.handler),
  });
}

/** @hidden Adds the `durableClient` input binding unless one is already present. */
function addClientInput(options: Partial<DurableClientOptions>): void {
  options.extraInputs = options.extraInputs ?? [];
  if (!options.extraInputs.find(isDurableClientInput)) {
    options.extraInputs.push(input.durableClient());
  }
}

/** @hidden Wraps a client handler so the DurableFunctionsClient is injected as the 2nd argument. */
function convertToFunctionHandler(clientHandler: DurableClientHandler): FunctionHandler {
  return (triggerInput: unknown, context: InvocationContext): FunctionResult<any> => {
    const client = getClient(context);
    return clientHandler(triggerInput, client, context);
  };
}
