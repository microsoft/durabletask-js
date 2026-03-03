// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Tests that the TaskHubGrpcWorker correctly sets instanceId on ActivityResponse
 * in both success and failure paths.
 *
 * This validates the fix for a bug where the activity failure path omitted
 * the instanceId field from the ActivityResponse, deviating from the .NET SDK
 * behavior and potentially causing issues with sidecar response routing.
 */

import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { NoOpLogger } from "../src/types/logger.type";
import { ActivityContext } from "../src/task/context/activity-context";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";

const TEST_INSTANCE_ID = "test-instance-123";
const TEST_TASK_ID = 42;
const COMPLETION_TOKEN = "test-completion-token";

describe("Worker Activity Response", () => {
  /**
   * Creates a mock gRPC stub that captures the ActivityResponse passed to
   * completeActivityTask.
   */
  function createMockStub(): {
    stub: stubs.TaskHubSidecarServiceClient;
    capturedResponse: pb.ActivityResponse | null;
  } {
    let capturedResponse: pb.ActivityResponse | null = null;

    const stub = {
      completeActivityTask: (
        response: pb.ActivityResponse,
        metadata: any,
        callback: (err: any, res: any) => void,
      ) => {
        capturedResponse = response;
        callback(null, {});
      },
    } as unknown as stubs.TaskHubSidecarServiceClient;

    return {
      stub,
      get capturedResponse() {
        return capturedResponse;
      },
    };
  }

  /**
   * Creates a minimal ActivityRequest for testing.
   */
  function createActivityRequest(name: string, input?: string): pb.ActivityRequest {
    const req = new pb.ActivityRequest();
    req.setName(name);
    req.setTaskid(TEST_TASK_ID);

    const orchInstance = new pb.OrchestrationInstance();
    orchInstance.setInstanceid(TEST_INSTANCE_ID);
    req.setOrchestrationinstance(orchInstance);

    if (input !== undefined) {
      const inputValue = new StringValue();
      inputValue.setValue(input);
      req.setInput(inputValue);
    }

    return req;
  }

  it("should set instanceId on ActivityResponse when activity succeeds", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    const successActivity = (_ctx: ActivityContext) => {
      return "success result";
    };

    worker.addActivity(successActivity);

    const mockStub = createMockStub();
    const req = createActivityRequest("successActivity", JSON.stringify("test-input"));

    // Act - call the private method directly
    await (worker as any)._executeActivityInternal(req, COMPLETION_TOKEN, mockStub.stub);

    // Assert
    expect(mockStub.capturedResponse).not.toBeNull();
    expect(mockStub.capturedResponse!.getInstanceid()).toBe(TEST_INSTANCE_ID);
    expect(mockStub.capturedResponse!.getTaskid()).toBe(TEST_TASK_ID);
    expect(mockStub.capturedResponse!.getFailuredetails()).toBeUndefined();
  });

  it("should set instanceId on ActivityResponse when activity fails", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    const failingActivity = (_ctx: ActivityContext) => {
      throw new Error("Activity execution failed");
    };

    worker.addActivity(failingActivity);

    const mockStub = createMockStub();
    const req = createActivityRequest("failingActivity");

    // Act - call the private method directly
    await (worker as any)._executeActivityInternal(req, COMPLETION_TOKEN, mockStub.stub);

    // Assert - the key assertion: instanceId MUST be set even on failure
    expect(mockStub.capturedResponse).not.toBeNull();
    expect(mockStub.capturedResponse!.getInstanceid()).toBe(TEST_INSTANCE_ID);
    expect(mockStub.capturedResponse!.getTaskid()).toBe(TEST_TASK_ID);
    expect(mockStub.capturedResponse!.getFailuredetails()).toBeDefined();
    expect(mockStub.capturedResponse!.getFailuredetails()!.getErrormessage()).toContain(
      "Activity execution failed",
    );
  });

  it("should set instanceId on ActivityResponse when activity throws non-Error", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    const throwStringActivity = (_ctx: ActivityContext) => {
      throw "string error";
    };

    worker.addActivity(throwStringActivity);

    const mockStub = createMockStub();
    const req = createActivityRequest("throwStringActivity");

    // Act
    await (worker as any)._executeActivityInternal(req, COMPLETION_TOKEN, mockStub.stub);

    // Assert
    expect(mockStub.capturedResponse).not.toBeNull();
    expect(mockStub.capturedResponse!.getInstanceid()).toBe(TEST_INSTANCE_ID);
    expect(mockStub.capturedResponse!.getFailuredetails()).toBeDefined();
  });
});
