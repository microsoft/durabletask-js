// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { app as azFuncApp } from "@azure/functions";
import * as grpc from "@grpc/grpc-js";
import { MetadataGenerator } from "@microsoft/durabletask-js";
import { AsyncLocalStorage } from "node:async_hooks";
import { getUserAgent } from "./user-agent";

const invocationIds = new AsyncLocalStorage<string>();

azFuncApp.hook.preInvocation((context) => {
  const invocationId = context.invocationContext.invocationId;
  const handler = context.functionHandler;
  // Scope the handler, not the hook: the runtime invokes the handler after pre-invocation hooks.
  context.functionHandler = (...args) => invocationIds.run(invocationId, handler, ...args);
});

export function createAzureFunctionsMetadataGenerator(taskHubName: string): MetadataGenerator {
  const userAgent = getUserAgent();

  return async (): Promise<grpc.Metadata> => {
    const metadata = new grpc.Metadata();
    metadata.set("taskhub", taskHubName);
    metadata.set("x-user-agent", userAgent);
    const invocationId = invocationIds.getStore();
    if (invocationId) {
      metadata.set("x-azure-functions-invocationid", invocationId);
    }
    return metadata;
  };
}
