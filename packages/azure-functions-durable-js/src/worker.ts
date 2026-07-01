// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskHubGrpcWorker, TaskHubGrpcWorkerOptions } from "@microsoft/durabletask-js";

export class DurableFunctionsWorker extends TaskHubGrpcWorker {
  constructor(options: TaskHubGrpcWorkerOptions = {}) {
    super(options);
  }

  async handleOrchestratorRequest(encodedRequest: string): Promise<string> {
    const request = decodeBase64Request(encodedRequest, "orchestrator");
    const response = await this.processOrchestratorRequest(request);
    return Buffer.from(response).toString("base64");
  }

  async handleEntityBatchRequest(encodedRequest: string): Promise<string> {
    const request = decodeBase64Request(encodedRequest, "entity batch");
    const response = await this.processEntityBatchRequest(request);
    return Buffer.from(response).toString("base64");
  }
}

function decodeBase64Request(encodedRequest: string, requestType: string): Buffer {
  if (!encodedRequest) {
    throw new TypeError(`${requestType} request must be a non-empty base64 string.`);
  }

  return Buffer.from(encodedRequest, "base64");
}
