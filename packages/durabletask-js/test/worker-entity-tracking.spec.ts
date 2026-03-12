// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Tests that entity work items are properly tracked in _pendingWorkItems.
 *
 * This validates the fix for a bug where entity V1 and V2 work items were
 * dispatched as fire-and-forget promises without being tracked. This caused:
 * 1. stop() to not wait for in-flight entity operations during shutdown
 * 2. Unhandled promise rejections from entity execution errors
 */

import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { NoOpLogger } from "../src/types/logger.type";
import { TaskEntity } from "../src/entities/task-entity";
import { ITaskEntity } from "../src/entities/task-entity";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";

const COMPLETION_TOKEN = "test-completion-token";

/**
 * Simple test entity.
 */
class CounterEntity extends TaskEntity<number> {
  increment(): number {
    this.state++;
    return this.state;
  }

  protected initializeState(): number {
    return 0;
  }
}

describe("Worker Entity Work Item Tracking", () => {
  /**
   * Creates a mock gRPC stub that captures the EntityBatchResult.
   */
  function createMockEntityStub(): {
    stub: stubs.TaskHubSidecarServiceClient;
    capturedResult: pb.EntityBatchResult | null;
  } {
    let capturedResult: pb.EntityBatchResult | null = null;

    const stub = {
      completeEntityTask: (
        result: pb.EntityBatchResult,
        metadata: any,
        callback: (err: any, res: any) => void,
      ) => {
        capturedResult = result;
        callback(null, {});
      },
    } as unknown as stubs.TaskHubSidecarServiceClient;

    return {
      stub,
      get capturedResult() {
        return capturedResult;
      },
    };
  }

  /**
   * Creates a minimal EntityBatchRequest for testing.
   */
  function createEntityBatchRequest(
    instanceId: string,
    operationName: string,
    input?: string,
  ): pb.EntityBatchRequest {
    const req = new pb.EntityBatchRequest();
    req.setInstanceid(instanceId);

    const op = new pb.OperationRequest();
    op.setOperation(operationName);
    if (input !== undefined) {
      const inputValue = new StringValue();
      inputValue.setValue(input);
      op.setInput(inputValue);
    }
    req.setOperationsList([op]);

    return req;
  }

  it("should track entity V1 work items in _pendingWorkItems", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    function counter(): ITaskEntity {
      return new CounterEntity();
    }
    worker.addEntity(counter);

    const mockStub = createMockEntityStub();
    const req = createEntityBatchRequest("@counter@key1", "increment");

    // Act - call the private method and track it
    const workPromise = (worker as any)._executeEntity(
      req,
      COMPLETION_TOKEN,
      mockStub.stub,
    );
    (worker as any)._trackEntityWorkItem(workPromise, req.getInstanceid());

    // Assert - work item should be tracked while in-flight
    expect((worker as any)._pendingWorkItems.size).toBeGreaterThanOrEqual(1);

    // Wait for completion
    await workPromise;

    // Allow the .finally() microtask to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert - work item should be removed after completion
    expect((worker as any)._pendingWorkItems.has(workPromise)).toBe(false);
  });

  it("should remove entity work items from _pendingWorkItems after completion", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    function counter(): ITaskEntity {
      return new CounterEntity();
    }
    worker.addEntity(counter);

    const mockStub = createMockEntityStub();
    const req = createEntityBatchRequest("@counter@key1", "increment");

    // Act
    const workPromise = (worker as any)._executeEntity(
      req,
      COMPLETION_TOKEN,
      mockStub.stub,
    );
    (worker as any)._trackEntityWorkItem(workPromise, req.getInstanceid());
    await workPromise;

    // Allow .finally() microtask to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert - work item must be cleaned up
    expect((worker as any)._pendingWorkItems.size).toBe(0);
  });

  it("should catch and log entity execution errors without unhandled rejections", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    // Don't register any entity — this will cause _executeEntity to throw
    // after parsing the instance ID (entity not found is handled, but missing
    // instance ID will throw before the try/catch)
    const req = new pb.EntityBatchRequest();
    // Intentionally leave instanceId empty to trigger early throw

    const mockStub = createMockEntityStub();

    // Act - _executeEntity will reject because instanceId is empty
    const workPromise = (worker as any)._executeEntity(
      req,
      COMPLETION_TOKEN,
      mockStub.stub,
    );
    (worker as any)._trackEntityWorkItem(workPromise, "");

    // Assert - the promise should be tracked
    expect((worker as any)._pendingWorkItems.size).toBeGreaterThanOrEqual(1);

    // Wait for the rejection to be handled by the .catch() handler
    // This should NOT cause an unhandled promise rejection
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert - work item should be cleaned up even after error
    expect((worker as any)._pendingWorkItems.has(workPromise)).toBe(false);
  });

  it("should handle entity not found gracefully and still track work item", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    // Register a different entity — "counter" won't be found for "unknown"
    function counter(): ITaskEntity {
      return new CounterEntity();
    }
    worker.addEntity(counter);

    const mockStub = createMockEntityStub();
    const req = createEntityBatchRequest("@unknown@key1", "increment");

    // Act
    const workPromise = (worker as any)._executeEntity(
      req,
      COMPLETION_TOKEN,
      mockStub.stub,
    );
    (worker as any)._trackEntityWorkItem(workPromise, req.getInstanceid());

    await workPromise;

    // Allow .finally() microtask to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert - should complete (not-found is handled inside _executeEntity)
    // and work item should be cleaned up
    expect((worker as any)._pendingWorkItems.size).toBe(0);
    // The result should have error details for each operation
    expect(mockStub.capturedResult).not.toBeNull();
  });

  it("should track multiple concurrent entity work items", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    function counter(): ITaskEntity {
      return new CounterEntity();
    }
    worker.addEntity(counter);

    const mockStub1 = createMockEntityStub();
    const mockStub2 = createMockEntityStub();
    const req1 = createEntityBatchRequest("@counter@key1", "increment");
    const req2 = createEntityBatchRequest("@counter@key2", "increment");

    // Act - dispatch two entity operations concurrently
    const promise1 = (worker as any)._executeEntity(req1, COMPLETION_TOKEN, mockStub1.stub);
    (worker as any)._trackEntityWorkItem(promise1, req1.getInstanceid());

    const promise2 = (worker as any)._executeEntity(req2, COMPLETION_TOKEN, mockStub2.stub);
    (worker as any)._trackEntityWorkItem(promise2, req2.getInstanceid());

    // Assert - both should be tracked
    expect((worker as any)._pendingWorkItems.size).toBe(2);

    await Promise.all([promise1, promise2]);

    // Allow .finally() microtasks to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert - both should be cleaned up
    expect((worker as any)._pendingWorkItems.size).toBe(0);
  });
});
