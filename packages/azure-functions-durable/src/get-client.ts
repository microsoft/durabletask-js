// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { FunctionInput, InvocationContext } from "@azure/functions";
import { DurableFunctionsClient, DurableFunctionsClientInput } from "./client";

/**
 * Builds a {@link DurableFunctionsClient} from the `durableClient` input binding that the
 * Azure Functions host provides for the current invocation.
 *
 * Mirrors the Python provider's `_add_rich_client` middleware, which constructs a
 * `DurableFunctionsClient(starter)` from the raw client-binding value. The binding value is the
 * host-provided client configuration (a JSON string or already-parsed object); the client
 * constructor accepts either shape, so it is passed straight through.
 *
 * @param context - The invocation context for the current function call.
 * @returns A rich Durable Functions client bound to the host's local gRPC sidecar.
 * @throws If no `durableClient`/`orchestrationClient` input binding is registered, or its value
 *   is not a valid client configuration.
 */
export function getClient(context: InvocationContext): DurableFunctionsClient {
  const clientInput = context.options.extraInputs.find(isDurableClientInput);
  if (!clientInput) {
    throw new Error(
      "Could not find a registered durable client input binding. Check your extraInputs " +
        "definition when registering your function.",
    );
  }

  const bindingData: unknown = context.extraInputs.get(clientInput);
  return new DurableFunctionsClient(asClientInput(bindingData));
}

/** @hidden */
export function isDurableClientInput(input: FunctionInput): boolean {
  return input.type === "durableClient" || input.type === "orchestrationClient";
}

/** @hidden */
function asClientInput(bindingData: unknown): DurableFunctionsClientInput {
  if (typeof bindingData === "string") {
    return bindingData;
  }
  if (bindingData !== null && typeof bindingData === "object") {
    return bindingData as DurableFunctionsClientInput;
  }

  throw new Error(
    "Received input is not a valid durable client input. Check your extraInputs definition " +
      "when registering your function.",
  );
}
