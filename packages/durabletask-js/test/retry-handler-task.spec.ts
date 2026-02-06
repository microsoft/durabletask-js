// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryHandlerTask } from "../src/task/retry-handler-task";
import { AsyncRetryHandler } from "../src/task/retry/retry-handler";
import * as pb from "../src/proto/orchestrator_service_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";

describe("RetryHandlerTask", () => {
  describe("constructor", () => {
    it("should create a retry handler task with correct initial state", () => {
      // Arrange
      const handler: AsyncRetryHandler = async () => true;
      const action = new pb.OrchestratorAction();
      const startTime = new Date();

      // Act
      const task = new RetryHandlerTask<string>(handler, action, startTime, "activity");

      // Assert
      expect(task.attemptCount).toBe(1);
      expect(task.taskType).toBe("activity");
      expect(task.action).toBe(action);
      expect(task.startTime).toBe(startTime);
      expect(task.handler).toBe(handler);
      expect(task.lastFailure).toBeUndefined();
    });

    it("should create a sub-orchestration retry handler task", () => {
      // Arrange
      const handler: AsyncRetryHandler = async () => false;
      const action = new pb.OrchestratorAction();
      const startTime = new Date();

      // Act
      const task = new RetryHandlerTask<number>(handler, action, startTime, "subOrchestration");

      // Assert
      expect(task.taskType).toBe("subOrchestration");
    });
  });

  describe("recordFailure", () => {
    it("should store failure details", () => {
      // Arrange
      const handler: AsyncRetryHandler = async () => true;
      const action = new pb.OrchestratorAction();
      const task = new RetryHandlerTask<string>(handler, action, new Date(), "activity");

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("TransientError");
      failureDetails.setErrormessage("Connection timeout");

      // Act
      task.recordFailure("Connection timeout", failureDetails);

      // Assert
      expect(task.lastFailure).toBe(failureDetails);
    });

    it("should create default failure details when none provided", () => {
      // Arrange
      const handler: AsyncRetryHandler = async () => true;
      const action = new pb.OrchestratorAction();
      const task = new RetryHandlerTask<string>(handler, action, new Date(), "activity");

      // Act
      task.recordFailure("Something failed");

      // Assert
      expect(task.lastFailure).toBeDefined();
    });
  });

  describe("incrementAttemptCount", () => {
    it("should increment the attempt count", () => {
      // Arrange
      const handler: AsyncRetryHandler = async () => true;
      const action = new pb.OrchestratorAction();
      const task = new RetryHandlerTask<string>(handler, action, new Date(), "activity");

      // Act
      task.incrementAttemptCount();
      task.incrementAttemptCount();

      // Assert
      expect(task.attemptCount).toBe(3);
    });
  });

  describe("complete", () => {
    it("should clear failure state on successful completion", () => {
      // Arrange
      const handler: AsyncRetryHandler = async () => true;
      const action = new pb.OrchestratorAction();
      const task = new RetryHandlerTask<string>(handler, action, new Date(), "activity");

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("TransientError");
      task.recordFailure("Previous failure", failureDetails);

      // Act
      task.complete("success");

      // Assert
      expect(task.isComplete).toBe(true);
      expect(task.isFailed).toBe(false);
      expect(task.lastFailure).toBeUndefined();
      expect(task.getResult()).toBe("success");
    });
  });

  describe("fail", () => {
    it("should mark task as failed", () => {
      // Arrange
      const handler: AsyncRetryHandler = async () => true;
      const action = new pb.OrchestratorAction();
      const task = new RetryHandlerTask<string>(handler, action, new Date(), "activity");

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("PermanentError");
      failureDetails.setErrormessage("Not retryable");

      // Act
      task.fail("Not retryable", failureDetails);

      // Assert
      expect(task.isComplete).toBe(true);
      expect(task.isFailed).toBe(true);
    });

    it("should throw if task is already completed", () => {
      // Arrange
      const handler: AsyncRetryHandler = async () => true;
      const action = new pb.OrchestratorAction();
      const task = new RetryHandlerTask<string>(handler, action, new Date(), "activity");
      task.complete("done");

      // Act & Assert
      expect(() => task.fail("fail")).toThrow("Task is already completed");
    });
  });

  describe("shouldRetry", () => {
    it("should return false when no failure recorded", async () => {
      // Arrange
      const handler: AsyncRetryHandler = async () => true;
      const action = new pb.OrchestratorAction();
      const task = new RetryHandlerTask<string>(handler, action, new Date(), "activity");

      // Act
      const result = await task.shouldRetry(new Date());

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when failure is non-retriable", async () => {
      // Arrange
      const handler: AsyncRetryHandler = async () => true;
      const action = new pb.OrchestratorAction();
      const task = new RetryHandlerTask<string>(handler, action, new Date(), "activity");

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("NotFoundError");
      failureDetails.setErrormessage("Activity not found");
      failureDetails.setIsnonretriable(true);
      task.recordFailure("Activity not found", failureDetails);

      // Act
      const result = await task.shouldRetry(new Date());

      // Assert
      expect(result).toBe(false);
    });

    it("should call handler and return true when handler says retry", async () => {
      // Arrange
      const handler: AsyncRetryHandler = async (ctx) => {
        return ctx.lastAttemptNumber < 3;
      };
      const action = new pb.OrchestratorAction();
      const startTime = new Date(2025, 0, 1);
      const task = new RetryHandlerTask<string>(handler, action, startTime, "activity");

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("TransientError");
      failureDetails.setErrormessage("Connection timeout");
      task.recordFailure("Connection timeout", failureDetails);

      const currentTime = new Date(2025, 0, 1, 0, 0, 1); // 1 second later

      // Act
      const result = await task.shouldRetry(currentTime);

      // Assert
      expect(result).toBe(true);
    });

    it("should call handler and return false when handler says stop", async () => {
      // Arrange
      const handler: AsyncRetryHandler = async (ctx) => {
        return ctx.lastFailure.errorType !== "PermanentError";
      };
      const action = new pb.OrchestratorAction();
      const task = new RetryHandlerTask<string>(handler, action, new Date(), "activity");

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("PermanentError");
      failureDetails.setErrormessage("Permanent failure");
      task.recordFailure("Permanent failure", failureDetails);

      // Act
      const result = await task.shouldRetry(new Date());

      // Assert
      expect(result).toBe(false);
    });

    it("should pass correct retry context to handler", async () => {
      // Arrange
      let capturedContext: any;
      const handler: AsyncRetryHandler = async (ctx) => {
        capturedContext = ctx;
        return true;
      };
      const action = new pb.OrchestratorAction();
      const startTime = new Date(2025, 0, 1, 0, 0, 0);
      const task = new RetryHandlerTask<string>(handler, action, startTime, "activity");

      // Simulate 2 previous failures
      task.incrementAttemptCount(); // attempt count = 2

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("TransientError");
      failureDetails.setErrormessage("Connection timeout");
      const stackTrace = new StringValue();
      stackTrace.setValue("Error: Connection timeout\n    at line 1");
      failureDetails.setStacktrace(stackTrace);
      task.recordFailure("Connection timeout", failureDetails);

      const currentTime = new Date(2025, 0, 1, 0, 0, 5); // 5 seconds later

      // Act
      await task.shouldRetry(currentTime);

      // Assert
      expect(capturedContext).toBeDefined();
      expect(capturedContext.lastAttemptNumber).toBe(2);
      expect(capturedContext.lastFailure.errorType).toBe("TransientError");
      expect(capturedContext.lastFailure.message).toBe("Connection timeout");
      expect(capturedContext.lastFailure.stackTrace).toBe("Error: Connection timeout\n    at line 1");
      expect(capturedContext.totalRetryTimeInMilliseconds).toBe(5000);
      expect(capturedContext.isCancelled).toBe(false);
    });

    it("should allow handler to make decisions based on totalRetryTime", async () => {
      // Arrange - handler that stops after 10 seconds
      const handler: AsyncRetryHandler = async (ctx) => {
        return ctx.totalRetryTimeInMilliseconds < 10000;
      };
      const action = new pb.OrchestratorAction();
      const startTime = new Date(2025, 0, 1, 0, 0, 0);
      const task = new RetryHandlerTask<string>(handler, action, startTime, "activity");

      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("TransientError");
      failureDetails.setErrormessage("Timeout");
      task.recordFailure("Timeout", failureDetails);

      // Act - 5 seconds elapsed (under limit)
      const result1 = await task.shouldRetry(new Date(2025, 0, 1, 0, 0, 5));

      // Assert
      expect(result1).toBe(true);

      // Act - 15 seconds elapsed (over limit)
      const result2 = await task.shouldRetry(new Date(2025, 0, 1, 0, 0, 15));

      // Assert
      expect(result2).toBe(false);
    });
  });
});
