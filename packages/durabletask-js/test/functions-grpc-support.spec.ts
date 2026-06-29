// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  EntityBatchRequest,
  EntityBatchResult,
  EntityRequest,
  OrchestrationContext,
  OrchestratorRequest,
  OrchestratorResponse,
  TaskEntity,
  TaskHubGrpcWorker,
  TOrchestrator,
  decodeEntityBatchRequestFromBase64,
  decodeEntityRequestFromBase64,
  decodeOrchestratorRequestFromBase64,
  encodeEntityBatchResultToBase64,
  encodeOrchestratorResponseToBase64,
} from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import {
  newExecutionStartedEvent,
  newOrchestratorStartedEvent,
} from "../src/utils/pb-helper.util";
import { NoOpLogger } from "../src/types/logger.type";

const TEST_INSTANCE_ID = "functions-grpc-instance";
const COMPLETION_TOKEN = "functions-completion-token";

class CounterEntity extends TaskEntity<number> {
  increment(): number {
    this.state++;
    return this.state;
  }

  protected initializeState(): number {
    return 0;
  }
}

describe("Functions gRPC support surface", () => {
  it("round-trips orchestration request and response protobufs through base64 helpers", () => {
    const request = new OrchestratorRequest();
    request.setInstanceid(TEST_INSTANCE_ID);

    const encodedRequest = Buffer.from(request.serializeBinary()).toString("base64");
    const decodedRequest = decodeOrchestratorRequestFromBase64(encodedRequest);

    expect(decodedRequest).toBeInstanceOf(OrchestratorRequest);
    expect(decodedRequest.getInstanceid()).toBe(TEST_INSTANCE_ID);

    const response = new OrchestratorResponse();
    response.setInstanceid(TEST_INSTANCE_ID);
    response.setCompletiontoken(COMPLETION_TOKEN);

    const decodedResponse = OrchestratorResponse.deserializeBinary(
      Buffer.from(encodeOrchestratorResponseToBase64(response), "base64"),
    );

    expect(decodedResponse.getInstanceid()).toBe(TEST_INSTANCE_ID);
    expect(decodedResponse.getCompletiontoken()).toBe(COMPLETION_TOKEN);
  });

  it("round-trips entity request and result protobufs through base64 helpers", () => {
    const request = createEntityBatchRequest("counter", "key1");

    const encodedRequest = Buffer.from(request.serializeBinary()).toString("base64");
    const decodedRequest = decodeEntityBatchRequestFromBase64(encodedRequest);

    expect(decodedRequest).toBeInstanceOf(EntityBatchRequest);
    expect(decodedRequest.getInstanceid()).toBe("@counter@key1");
    expect(decodedRequest.getOperationsList()[0].getOperation()).toBe("increment");

    const result = new EntityBatchResult();
    result.setCompletiontoken(COMPLETION_TOKEN);

    const decodedResult = EntityBatchResult.deserializeBinary(
      Buffer.from(encodeEntityBatchResultToBase64(result), "base64"),
    );

    expect(decodedResult.getCompletiontoken()).toBe(COMPLETION_TOKEN);
  });

  it("executes a single orchestration request without using the gRPC worker loop", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const orchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => "done";
    const name = worker.addOrchestrator(orchestrator);

    const request = new OrchestratorRequest();
    request.setInstanceid(TEST_INSTANCE_ID);
    request.setNeweventsList([
      newOrchestratorStartedEvent(new Date("2026-01-01T00:00:00.000Z")),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ]);

    const response = await worker.executeOrchestratorRequest(request, COMPLETION_TOKEN);

    expect(response.getInstanceid()).toBe(TEST_INSTANCE_ID);
    expect(response.getCompletiontoken()).toBe(COMPLETION_TOKEN);
    expect(response.getActionsList()).toHaveLength(1);
    const completed = response.getActionsList()[0].getCompleteorchestration();
    expect(completed?.getOrchestrationstatus()).toBe(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED,
    );
    expect(completed?.getResult()?.getValue()).toBe('"done"');
  });

  it("processes serialized orchestration request bytes", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const orchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => "done";
    const name = worker.addOrchestrator(orchestrator);

    const request = new OrchestratorRequest();
    request.setInstanceid(TEST_INSTANCE_ID);
    request.setNeweventsList([
      newOrchestratorStartedEvent(new Date("2026-01-01T00:00:00.000Z")),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ]);

    const responseBytes = await worker.processOrchestratorRequest(Buffer.from(request.serializeBinary()));
    const response = OrchestratorResponse.deserializeBinary(responseBytes);

    expect(response.getInstanceid()).toBe(TEST_INSTANCE_ID);
    expect(response.getActionsList()[0].getCompleteorchestration()?.getResult()?.getValue()).toBe('"done"');
  });

  it("executes a single entity batch request without using the gRPC worker loop", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    worker.addNamedEntity("counter", () => new CounterEntity());

    const response = await worker.executeEntityBatchRequest(
      createEntityBatchRequest("counter", "key1"),
      COMPLETION_TOKEN,
    );

    expect(response.getCompletiontoken()).toBe(COMPLETION_TOKEN);
    expect(response.getResultsList()).toHaveLength(1);
    expect(response.getResultsList()[0].getSuccess()?.getResult()?.getValue()).toBe("1");
    expect(response.getEntitystate()?.getValue()).toBe("1");
  });

  it("processes serialized entity batch request bytes", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    worker.addNamedEntity("counter", () => new CounterEntity());

    const request = createEntityBatchRequest("counter", "key1");
    const responseBytes = await worker.processEntityBatchRequest(request.serializeBinary());
    const response = EntityBatchResult.deserializeBinary(responseBytes);

    expect(response.getResultsList()[0].getSuccess()?.getResult()?.getValue()).toBe("1");
    expect(response.getEntitystate()?.getValue()).toBe("1");
  });

  it("decodes and executes a single V2 entity request", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    worker.addNamedEntity("counter", () => new CounterEntity());

    const request = new EntityRequest();
    request.setInstanceid("@counter@key1");
    const operationEvent = new pb.HistoryEvent();
    const operation = new pb.EntityOperationSignaledEvent();
    operation.setOperation("increment");
    operation.setRequestid("req-1");
    operationEvent.setEntityoperationsignaled(operation);
    request.setOperationrequestsList([operationEvent]);

    const decodedRequest = decodeEntityRequestFromBase64(
      Buffer.from(request.serializeBinary()).toString("base64"),
    );
    const response = await worker.executeEntityRequest(decodedRequest, COMPLETION_TOKEN);

    expect(response.getCompletiontoken()).toBe(COMPLETION_TOKEN);
    expect(response.getResultsList()[0].getSuccess()?.getResult()?.getValue()).toBe("1");
    expect(response.getOperationinfosList()[0].getRequestid()).toBe("req-1");
  });
});

function createEntityBatchRequest(entityName: string, entityKey: string): EntityBatchRequest {
  const request = new EntityBatchRequest();
  request.setInstanceid(`@${entityName}@${entityKey}`);

  const operation = new pb.OperationRequest();
  operation.setOperation("increment");
  operation.setRequestid("req-1");
  request.setOperationsList([operation]);

  return request;
}
