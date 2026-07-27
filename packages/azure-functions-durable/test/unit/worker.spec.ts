// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DurableFunctionsWorker } from "../../src/worker";

describe("DurableFunctionsWorker", () => {
  it("decodes base64, delegates to processOrchestratorRequest, and re-encodes the response", async () => {
    const worker = new DurableFunctionsWorker();
    const responseBytes = Buffer.from("orchestrator response");
    const processOrchestratorRequest = jest
      .spyOn(worker, "processOrchestratorRequest")
      .mockResolvedValue(responseBytes);

    const actual = await worker.handleOrchestratorRequest(
      Buffer.from("orchestrator request").toString("base64"),
    );

    expect(actual).toBe(responseBytes.toString("base64"));
    expect(processOrchestratorRequest).toHaveBeenCalledTimes(1);
    expect(Buffer.from(processOrchestratorRequest.mock.calls[0][0]).toString()).toBe(
      "orchestrator request",
    );
  });

  it("decodes base64, delegates to processEntityBatchRequest, and re-encodes the response", async () => {
    const worker = new DurableFunctionsWorker();
    const responseBytes = Buffer.from("entity batch response");
    const processEntityBatchRequest = jest
      .spyOn(worker, "processEntityBatchRequest")
      .mockResolvedValue(responseBytes);

    const actual = await worker.handleEntityBatchRequest(
      Buffer.from("entity batch request").toString("base64"),
    );

    expect(actual).toBe(responseBytes.toString("base64"));
    expect(processEntityBatchRequest).toHaveBeenCalledTimes(1);
    expect(Buffer.from(processEntityBatchRequest.mock.calls[0][0]).toString()).toBe(
      "entity batch request",
    );
  });

  it("rejects empty base64 requests", async () => {
    const worker = new DurableFunctionsWorker();

    await expect(worker.handleOrchestratorRequest("")).rejects.toThrow(TypeError);
  });
});
