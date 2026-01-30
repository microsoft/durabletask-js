// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryableTask } from "../src/task/retryable-task";
import { RetryPolicy } from "../src/task/retry/retry-policy";
import * as pb from "../src/proto/orchestrator_service_pb";

describe("RetryableTask", () => {
  describe("constructor", () => {
    it("should create a retryable task with correct initial state", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
      });
      const action = new pb.OrchestratorAction();
      const startTime = new Date();

      // Act
      const task = new RetryableTask<string>(retryPolicy, action, startTime, "activity");

      // Assert
      expect(task.attemptCount).toBe(1);
      expect(task.taskType).toBe("activity");
      expect(task.action).toBe(action);
      expect(task.startTime).toBe(startTime);
    });
  });

  describe("computeNextDelayInMilliseconds", () => {
    it("should return first retry interval on first retry (attempt 1)", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
        backoffCoefficient: 2.0,
      });
      const action = new pb.OrchestratorAction();
      const startTime = new Date();
      const task = new RetryableTask<string>(retryPolicy, action, startTime, "activity");
      const currentTime = new Date(startTime.getTime() + 100); // 100ms after start

      // Act
      const delay = task.computeNextDelayInMilliseconds(currentTime);

      // Assert (delay = 1000 * 2^(1-1) = 1000 * 1 = 1000)
      expect(delay).toBe(1000);
    });

    it("should apply exponential backoff on subsequent retries", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 1000,
        backoffCoefficient: 2.0,
      });
      const action = new pb.OrchestratorAction();
      const startTime = new Date();
      const task = new RetryableTask<string>(retryPolicy, action, startTime, "activity");
      const currentTime = new Date(startTime.getTime() + 1100); // after first retry

      // First attempt already done
      task.incrementAttemptCount(); // Now at attempt 2

      // Act
      const delay = task.computeNextDelayInMilliseconds(currentTime);

      // Assert (delay = 1000 * 2^(2-1) = 1000 * 2 = 2000)
      expect(delay).toBe(2000);
    });

    it("should cap delay at maxRetryInterval", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 10,
        firstRetryIntervalInMilliseconds: 1000,
        backoffCoefficient: 10.0,
        maxRetryIntervalInMilliseconds: 5000,
      });
      const action = new pb.OrchestratorAction();
      const startTime = new Date();
      const task = new RetryableTask<string>(retryPolicy, action, startTime, "activity");
      const currentTime = new Date(startTime.getTime() + 10000);

      // Simulate several attempts to trigger high delay
      task.incrementAttemptCount(); // attempt 2
      task.incrementAttemptCount(); // attempt 3

      // Act
      const delay = task.computeNextDelayInMilliseconds(currentTime);

      // Assert (would be 1000 * 10^2 = 100000, but capped at 5000)
      expect(delay).toBe(5000);
    });

    it("should use constant delay when backoffCoefficient is 1.0", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 2000,
        backoffCoefficient: 1.0,
      });
      const action = new pb.OrchestratorAction();
      const startTime = new Date();
      const task = new RetryableTask<string>(retryPolicy, action, startTime, "activity");
      const currentTime = new Date(startTime.getTime() + 100);

      // Act & Assert - delay should always be 2000
      expect(task.computeNextDelayInMilliseconds(currentTime)).toBe(2000);
      
      task.incrementAttemptCount();
      expect(task.computeNextDelayInMilliseconds(currentTime)).toBe(2000);
      
      task.incrementAttemptCount();
      expect(task.computeNextDelayInMilliseconds(currentTime)).toBe(2000);
    });

    it("should return undefined when max attempts exceeded", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
      });
      const action = new pb.OrchestratorAction();
      const startTime = new Date();
      const task = new RetryableTask<string>(retryPolicy, action, startTime, "activity");
      const currentTime = new Date(startTime.getTime() + 100);

      // Simulate all attempts
      task.incrementAttemptCount(); // attempt 2
      task.incrementAttemptCount(); // attempt 3 (max reached)

      // Act
      const delay = task.computeNextDelayInMilliseconds(currentTime);

      // Assert
      expect(delay).toBeUndefined();
    });

    it("should return undefined when retry timeout exceeded", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 10,
        firstRetryIntervalInMilliseconds: 1000,
        retryTimeoutInMilliseconds: 5000,
      });
      const startTime = new Date(Date.now() - 6000); // Started 6 seconds ago
      const action = new pb.OrchestratorAction();
      const task = new RetryableTask<string>(retryPolicy, action, startTime, "activity");
      const currentTime = new Date(); // Now

      // Act
      const delay = task.computeNextDelayInMilliseconds(currentTime);

      // Assert
      expect(delay).toBeUndefined();
    });

    it("should allow retry when within timeout", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 10,
        firstRetryIntervalInMilliseconds: 1000,
        retryTimeoutInMilliseconds: 60000,
      });
      const startTime = new Date();
      const action = new pb.OrchestratorAction();
      const task = new RetryableTask<string>(retryPolicy, action, startTime, "activity");
      const currentTime = new Date(startTime.getTime() + 5000); // 5 seconds after start

      // Act
      const delay = task.computeNextDelayInMilliseconds(currentTime);

      // Assert
      expect(delay).toBeGreaterThan(0);
    });

    it("should ignore timeout when set to -1 (infinite)", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 10,
        firstRetryIntervalInMilliseconds: 1000,
        retryTimeoutInMilliseconds: -1,
      });
      // Started a long time ago
      const startTime = new Date(Date.now() - 3600000); // 1 hour ago
      const action = new pb.OrchestratorAction();
      const task = new RetryableTask<string>(retryPolicy, action, startTime, "activity");
      const currentTime = new Date(); // Now

      // Act
      const delay = task.computeNextDelayInMilliseconds(currentTime);

      // Assert - should still allow retry (timeout is infinite)
      expect(delay).toBeGreaterThan(0);
    });
  });

  describe("incrementAttemptCount", () => {
    it("should increment attempt count", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 1000,
      });
      const action = new pb.OrchestratorAction();
      const task = new RetryableTask<string>(retryPolicy, action, new Date(), "activity");

      // Act
      task.incrementAttemptCount();
      task.incrementAttemptCount();

      // Assert
      expect(task.attemptCount).toBe(3);
    });
  });

  describe("recordFailure", () => {
    it("should store failure details", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
      });
      const action = new pb.OrchestratorAction();
      const task = new RetryableTask<string>(retryPolicy, action, new Date(), "activity");
      const failureDetails = new pb.TaskFailureDetails();
      failureDetails.setErrortype("TestError");
      failureDetails.setErrormessage("Test failure message");

      // Act
      task.recordFailure("Test failure message", failureDetails);

      // Assert
      const lastFailure = task.lastFailure;
      expect(lastFailure).toBeDefined();
      expect(lastFailure?.getErrortype()).toBe("TestError");
      expect(lastFailure?.getErrormessage()).toBe("Test failure message");
    });
  });

  describe("action property", () => {
    it("should return the original action", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
      });
      const action = new pb.OrchestratorAction();
      action.setId(42);
      const task = new RetryableTask<string>(retryPolicy, action, new Date(), "activity");

      // Act
      const originalAction = task.action;

      // Assert
      expect(originalAction).toBe(action);
      expect(originalAction.getId()).toBe(42);
    });
  });

  describe("task types", () => {
    it("should support activity task type", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
      });
      const action = new pb.OrchestratorAction();
      const task = new RetryableTask<string>(retryPolicy, action, new Date(), "activity");

      // Assert
      expect(task.taskType).toBe("activity");
    });

    it("should support subOrchestration task type", () => {
      // Arrange
      const retryPolicy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
      });
      const action = new pb.OrchestratorAction();
      const task = new RetryableTask<string>(retryPolicy, action, new Date(), "subOrchestration");

      // Assert
      expect(task.taskType).toBe("subOrchestration");
    });
  });
});
