// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { FunctionTrigger, trigger as azFuncTrigger } from "@azure/functions";
import { addDurableGrpcMetadata } from "./durable-grpc";

// The `type` strings below are the wire contract expected by the Durable Task extension's
// binding providers; they must not be renamed. Every Durable trigger opts in to the extension's
// local gRPC protocol by carrying `durableRequiresGrpc: true` (see `addDurableGrpcMetadata`),
// which is what makes the extension open its local sidecar and populate `rpcBaseUrl` for the client.

export function orchestration(): FunctionTrigger {
  return azFuncTrigger.generic(addDurableGrpcMetadata({ type: "orchestrationTrigger" }));
}

export function activity(): FunctionTrigger {
  return azFuncTrigger.generic(addDurableGrpcMetadata({ type: "activityTrigger" }));
}

export function entity(): FunctionTrigger {
  return azFuncTrigger.generic(addDurableGrpcMetadata({ type: "entityTrigger" }));
}
