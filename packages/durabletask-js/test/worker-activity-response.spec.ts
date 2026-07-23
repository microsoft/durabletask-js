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

  it("should correctly extract and pass input from protobuf StringValue to activity", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    let receivedInput: unknown;
    const inputCapturingActivity = (_ctx: ActivityContext, input: unknown) => {
      receivedInput = input;
      return "done";
    };

    worker.addActivity(inputCapturingActivity);

    const mockStub = createMockStub();
    const testInput = { key: "value", nested: { arr: [1, 2, 3] } };
    const req = createActivityRequest("inputCapturingActivity", JSON.stringify(testInput));

    // Act
    await (worker as any)._executeActivityInternal(req, COMPLETION_TOKEN, mockStub.stub);

    // Assert — the activity must receive the deserialized input object
    expect(receivedInput).toEqual(testInput);
    expect(mockStub.capturedResponse).not.toBeNull();
    expect(mockStub.capturedResponse!.getResult()?.getValue()).toBe(JSON.stringify("done"));
  });

  it("should pass empty string as input when protobuf StringValue is not set", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    let receivedInput: unknown = "sentinel";
    const inputCapturingActivity = (_ctx: ActivityContext, input: unknown) => {
      receivedInput = input;
      return "done";
    };

    worker.addActivity(inputCapturingActivity);

    const mockStub = createMockStub();
    // Create request WITHOUT setting input — simulates no input from sidecar
    const req = createActivityRequest("inputCapturingActivity");

    // Act
    await (worker as any)._executeActivityInternal(req, COMPLETION_TOKEN, mockStub.stub);

    // Assert — no input means the activity receives undefined (empty string is parsed as falsy by executor)
    expect(receivedInput).toBeUndefined();
  });

  it("should correctly set result on ActivityResponse using getValue()", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    const outputObject = { result: "test", count: 42 };
    const objectReturningActivity = (_ctx: ActivityContext) => {
      return outputObject;
    };

    worker.addActivity(objectReturningActivity);

    const mockStub = createMockStub();
    const req = createActivityRequest("objectReturningActivity", JSON.stringify("input"));

    // Act
    await (worker as any)._executeActivityInternal(req, COMPLETION_TOKEN, mockStub.stub);

    // Assert — the result StringValue should contain the JSON-serialized output
    expect(mockStub.capturedResponse).not.toBeNull();
    const resultValue = mockStub.capturedResponse!.getResult();
    expect(resultValue).toBeDefined();
    expect(resultValue!.getValue()).toBe(JSON.stringify(outputObject));
  });

  it("should set empty result on ActivityResponse when activity returns undefined", async () => {
    // Arrange
    const worker = new TaskHubGrpcWorker({
      logger: new NoOpLogger(),
    });

    const voidActivity = (_ctx: ActivityContext) => {
      // returns undefined implicitly
    };

    worker.addActivity(voidActivity);

    const mockStub = createMockStub();
    const req = createActivityRequest("voidActivity");

    // Act
    await (worker as any)._executeActivityInternal(req, COMPLETION_TOKEN, mockStub.stub);

    // Assert — result should be an empty string for undefined return
    expect(mockStub.capturedResponse).not.toBeNull();
    const resultValue = mockStub.capturedResponse!.getResult();
    expect(resultValue).toBeDefined();
    expect(resultValue!.getValue()).toBe("");
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
