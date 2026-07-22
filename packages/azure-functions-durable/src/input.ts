// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { FunctionInput, input as azFuncInput } from "@azure/functions";
import { addDurableGrpcMetadata } from "./durable-grpc";

// The `durableClient` input binding hands the function the host-provided client configuration
// (task hub name, rpcBaseUrl, required query-string parameters, ...). Like the triggers, it opts
// in to the gRPC protocol via `durableRequiresGrpc: true` so the extension exposes its local
// sidecar; without it `rpcBaseUrl` is never populated and `getClient` cannot connect.

export function durableClient(): FunctionInput {
  return azFuncInput.generic(addDurableGrpcMetadata({ type: "durableClient" }));
}
