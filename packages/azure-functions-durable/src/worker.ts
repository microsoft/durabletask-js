// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DurableTimerOptions, TaskHubGrpcWorker, TaskHubGrpcWorkerOptions } from "@microsoft/durabletask-js";

/** @internal Shared by the Functions worker and its in-memory testing helper. */
export function getDurableTimerOptions(options: DurableTimerOptions): DurableTimerOptions {
  return {
    maximumTimerIntervalMs:
      options.maximumTimerIntervalMs === undefined ? 3 * 24 * 60 * 60 * 1000 : options.maximumTimerIntervalMs,
  };
}

export class DurableFunctionsWorker extends TaskHubGrpcWorker {
  constructor(options: TaskHubGrpcWorkerOptions = {}) {
    super({ ...options, ...getDurableTimerOptions(options) });
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
