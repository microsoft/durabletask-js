// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as grpc from "@grpc/grpc-js";
import { MetadataGenerator } from "@microsoft/durabletask-js";
import { getUserAgent } from "./user-agent";

export function createAzureFunctionsMetadataGenerator(
  taskHubName: string,
  _requiredQueryStringParameters: string = "",
): MetadataGenerator {
  const userAgent = getUserAgent();

  return async (): Promise<grpc.Metadata> => {
    const metadata = new grpc.Metadata();
    metadata.set("taskhub", taskHubName);
    metadata.set("x-user-agent", userAgent);
    return metadata;
  };
}
