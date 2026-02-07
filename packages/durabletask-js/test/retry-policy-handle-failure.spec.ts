// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryPolicy, FailureHandlerPredicate } from "../src/task/retry/retry-policy";
import { TaskFailureDetails } from "../src/task/failure-details";

describe("RetryPolicy handleFailure", () => {
  const defaultOptions = {
    maxNumberOfAttempts: 3,
    firstRetryIntervalInMilliseconds: 1000,
  };

  const createFailure = (errorType: string, message: string = "Error"): TaskFailureDetails => ({
    errorType,
    message,
    stackTrace: "at test.ts:1",
  });

  describe("default handleFailure behavior", () => {
    it("should default to always returning true (retry all failures)", () => {
      const policy = new RetryPolicy(defaultOptions);

      expect(policy.shouldRetry(createFailure("TestError"))).toBe(true);
      expect(policy.shouldRetry(createFailure("ValidationError"))).toBe(true);
      expect(policy.shouldRetry(createFailure("NetworkError"))).toBe(true);
    });

    it("should expose handleFailure getter", () => {
      const policy = new RetryPolicy(defaultOptions);

      expect(typeof policy.handleFailure).toBe("function");
    });
  });

  describe("custom handleFailure predicate", () => {
    it("should use custom predicate when provided", () => {
      const handleFailure: FailureHandlerPredicate = (failure) => {
        return failure.errorType !== "ValidationError";
      };

      const policy = new RetryPolicy({
        ...defaultOptions,
        handleFailure,
      });

      expect(policy.shouldRetry(createFailure("TransientError"))).toBe(true);
      expect(policy.shouldRetry(createFailure("ValidationError"))).toBe(false);
    });

    it("should support filtering by error message", () => {
      const policy = new RetryPolicy({
        ...defaultOptions,
        handleFailure: (failure) => !failure.message.includes("permanent"),
      });

      expect(policy.shouldRetry(createFailure("Error", "Temporary issue"))).toBe(true);
      expect(policy.shouldRetry(createFailure("Error", "This is a permanent failure"))).toBe(false);
    });

    it("should support filtering by stack trace", () => {
      const policy = new RetryPolicy({
        ...defaultOptions,
        handleFailure: (failure) => {
          return !failure.stackTrace?.includes("CriticalService");
        },
      });

      const normalFailure = createFailure("Error");
      const criticalFailure: TaskFailureDetails = {
        errorType: "Error",
        message: "Error",
        stackTrace: "at CriticalService.ts:100",
      };

      expect(policy.shouldRetry(normalFailure)).toBe(true);
      expect(policy.shouldRetry(criticalFailure)).toBe(false);
    });

    it("should support multiple error types to exclude", () => {
      const nonRetryableErrors = ["ValidationError", "AuthenticationError", "AuthorizationError"];

      const policy = new RetryPolicy({
        ...defaultOptions,
        handleFailure: (failure) => !nonRetryableErrors.includes(failure.errorType),
      });

      expect(policy.shouldRetry(createFailure("TransientError"))).toBe(true);
      expect(policy.shouldRetry(createFailure("NetworkError"))).toBe(true);
      expect(policy.shouldRetry(createFailure("ValidationError"))).toBe(false);
      expect(policy.shouldRetry(createFailure("AuthenticationError"))).toBe(false);
      expect(policy.shouldRetry(createFailure("AuthorizationError"))).toBe(false);
    });

    it("should support multiple error types to include (whitelist)", () => {
      const retryableErrors = ["TransientError", "NetworkError", "TimeoutError"];

      const policy = new RetryPolicy({
        ...defaultOptions,
        handleFailure: (failure) => retryableErrors.includes(failure.errorType),
      });

      expect(policy.shouldRetry(createFailure("TransientError"))).toBe(true);
      expect(policy.shouldRetry(createFailure("NetworkError"))).toBe(true);
      expect(policy.shouldRetry(createFailure("TimeoutError"))).toBe(true);
      expect(policy.shouldRetry(createFailure("ValidationError"))).toBe(false);
      expect(policy.shouldRetry(createFailure("UnknownError"))).toBe(false);
    });

    it("should handle undefined stack trace gracefully", () => {
      const policy = new RetryPolicy({
        ...defaultOptions,
        handleFailure: (failure) => {
          // Safe check for stack trace
          return failure.stackTrace?.includes("retry") ?? true;
        },
      });

      const failureWithStack: TaskFailureDetails = {
        errorType: "Error",
        message: "Error",
        stackTrace: "at retry.ts:10",
      };

      const failureWithoutStack: TaskFailureDetails = {
        errorType: "Error",
        message: "Error",
        stackTrace: undefined,
      };

      expect(policy.shouldRetry(failureWithStack)).toBe(true);
      expect(policy.shouldRetry(failureWithoutStack)).toBe(true);
    });
  });

  describe("handleFailure getter vs shouldRetry method", () => {
    it("handleFailure returns the predicate function", () => {
      const predicate: FailureHandlerPredicate = (failure) => failure.errorType === "RetryableError";

      const policy = new RetryPolicy({
        ...defaultOptions,
        handleFailure: predicate,
      });

      // The getter returns the function itself
      expect(policy.handleFailure).toBe(predicate);
    });

    it("shouldRetry is a convenience method that calls the predicate", () => {
      const calls: TaskFailureDetails[] = [];
      const predicate: FailureHandlerPredicate = (failure) => {
        calls.push(failure);
        return true;
      };

      const policy = new RetryPolicy({
        ...defaultOptions,
        handleFailure: predicate,
      });

      const failure = createFailure("TestError");
      policy.shouldRetry(failure);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toBe(failure);
    });
  });

  describe("integration with other RetryPolicy options", () => {
    it("should work with all retry options together", () => {
      const policy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 1000,
        backoffCoefficient: 2.0,
        maxRetryIntervalInMilliseconds: 30000,
        retryTimeoutInMilliseconds: 300000,
        handleFailure: (failure) => failure.errorType !== "PermanentError",
      });

      expect(policy.maxNumberOfAttempts).toBe(5);
      expect(policy.firstRetryIntervalInMilliseconds).toBe(1000);
      expect(policy.backoffCoefficient).toBe(2.0);
      expect(policy.maxRetryIntervalInMilliseconds).toBe(30000);
      expect(policy.retryTimeoutInMilliseconds).toBe(300000);
      expect(policy.shouldRetry(createFailure("TransientError"))).toBe(true);
      expect(policy.shouldRetry(createFailure("PermanentError"))).toBe(false);
    });
  });
});
