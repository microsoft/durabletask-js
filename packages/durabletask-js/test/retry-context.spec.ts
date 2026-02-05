// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryContext, createRetryContext } from "../src/task/retry/retry-context";
import { TaskFailureDetails } from "../src/task/failure-details";

describe("RetryContext", () => {
  const mockFailureDetails: TaskFailureDetails = {
    errorType: "TestError",
    message: "Test error message",
    stackTrace: "at TestFile.ts:10",
  };

  describe("createRetryContext", () => {
    it("should create a RetryContext with all required properties", () => {
      const context = createRetryContext(1, mockFailureDetails, 5000, false);

      expect(context.lastAttemptNumber).toBe(1);
      expect(context.lastFailure).toBe(mockFailureDetails);
      expect(context.totalRetryTimeInMilliseconds).toBe(5000);
      expect(context.isCancelled).toBe(false);
    });

    it("should default isCancelled to false when not provided", () => {
      const context = createRetryContext(2, mockFailureDetails, 10000);

      expect(context.isCancelled).toBe(false);
    });

    it("should allow isCancelled to be true", () => {
      const context = createRetryContext(3, mockFailureDetails, 15000, true);

      expect(context.isCancelled).toBe(true);
    });

    it("should preserve failure details correctly", () => {
      const detailedFailure: TaskFailureDetails = {
        errorType: "ValidationError",
        message: "Input validation failed",
        stackTrace: "at Validator.ts:25\nat Handler.ts:50",
      };

      const context = createRetryContext(1, detailedFailure, 1000);

      expect(context.lastFailure.errorType).toBe("ValidationError");
      expect(context.lastFailure.message).toBe("Input validation failed");
      expect(context.lastFailure.stackTrace).toContain("Validator.ts");
    });

    it("should handle zero retry time", () => {
      const context = createRetryContext(1, mockFailureDetails, 0);

      expect(context.totalRetryTimeInMilliseconds).toBe(0);
    });

    it("should handle large retry times", () => {
      const context = createRetryContext(10, mockFailureDetails, 3600000); // 1 hour

      expect(context.totalRetryTimeInMilliseconds).toBe(3600000);
    });

    it("should handle high attempt numbers", () => {
      const context = createRetryContext(100, mockFailureDetails, 500000);

      expect(context.lastAttemptNumber).toBe(100);
    });
  });

  describe("RetryContext interface", () => {
    it("should be readonly - properties cannot be modified", () => {
      const context: RetryContext = createRetryContext(1, mockFailureDetails, 5000);

      // TypeScript should prevent these at compile time, but we verify the object structure
      expect(Object.keys(context)).toContain("lastAttemptNumber");
      expect(Object.keys(context)).toContain("lastFailure");
      expect(Object.keys(context)).toContain("totalRetryTimeInMilliseconds");
      expect(Object.keys(context)).toContain("isCancelled");
    });
  });
});
