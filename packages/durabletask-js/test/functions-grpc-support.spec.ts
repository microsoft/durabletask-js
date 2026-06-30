// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationContext, TaskEntity, TaskHubGrpcWorker, TOrchestrator } from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import { newExecutionStartedEvent, newOrchestratorStartedEvent } from "../src/utils/pb-helper.util";
import { NoOpLogger } from "../src/types/logger.type";

const TEST_INSTANCE_ID = "functions-grpc-instance";

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
  it("processes a single serialized orchestration request without the gRPC worker loop", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    const orchestrator: TOrchestrator = async (_ctx: OrchestrationContext) => "done";
    const name = worker.addOrchestrator(orchestrator);

    const request = new pb.OrchestratorRequest();
    request.setInstanceid(TEST_INSTANCE_ID);
    request.setNeweventsList([
      newOrchestratorStartedEvent(new Date("2026-01-01T00:00:00.000Z")),
      newExecutionStartedEvent(name, TEST_INSTANCE_ID, undefined),
    ]);

    const responseBytes = await worker.processOrchestratorRequest(request.serializeBinary());
    const response = pb.OrchestratorResponse.deserializeBinary(responseBytes);

    expect(response.getInstanceid()).toBe(TEST_INSTANCE_ID);
    const completed = response.getActionsList()[0].getCompleteorchestration();
    expect(completed?.getOrchestrationstatus()).toBe(pb.OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(completed?.getResult()?.getValue()).toBe('"done"');
  });

  it("processes a single serialized entity batch request without the gRPC worker loop", async () => {
    const worker = new TaskHubGrpcWorker({ logger: new NoOpLogger() });
    worker.addNamedEntity("counter", () => new CounterEntity());

    const request = createEntityBatchRequest("counter", "key1");
    const responseBytes = await worker.processEntityBatchRequest(request.serializeBinary());
    const response = pb.EntityBatchResult.deserializeBinary(responseBytes);

    expect(response.getResultsList()).toHaveLength(1);
    expect(response.getResultsList()[0].getSuccess()?.getResult()?.getValue()).toBe("1");
    expect(response.getEntitystate()?.getValue()).toBe("1");
  });
});

function createEntityBatchRequest(entityName: string, entityKey: string): pb.EntityBatchRequest {
  const request = new pb.EntityBatchRequest();
  request.setInstanceid(`@${entityName}@${entityKey}`);

  const operation = new pb.OperationRequest();
  operation.setOperation("increment");
  operation.setRequestid("req-1");
  request.setOperationsList([operation]);

  return request;
}
