// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryContext, createRetryContext } from "../src/task/retry/retry-context";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { TaskFailureDetails } from "../src/task/failure-details";

describe("RetryContext", () => {
  const mockOrchCtx = {} as OrchestrationContext;
  const mockFailureDetails: TaskFailureDetails = {
    errorType: "TestError",
    message: "Test error message",
    stackTrace: "at TestFile.ts:10",
  };

  describe("createRetryContext", () => {
    it("should create a RetryContext with all required properties", () => {
      const context = createRetryContext(mockOrchCtx, 1, mockFailureDetails, 5000);

      expect(context.orchestrationContext).toBe(mockOrchCtx);
      expect(context.lastAttemptNumber).toBe(1);
      expect(context.lastFailure).toBe(mockFailureDetails);
      expect(context.totalRetryTimeInMilliseconds).toBe(5000);
    });

    it("should preserve failure details correctly", () => {
      const detailedFailure: TaskFailureDetails = {
        errorType: "ValidationError",
        message: "Input validation failed",
        stackTrace: "at Validator.ts:25\nat Handler.ts:50",
      };

      const context = createRetryContext(mockOrchCtx, 1, detailedFailure, 1000);

      expect(context.lastFailure.errorType).toBe("ValidationError");
      expect(context.lastFailure.message).toBe("Input validation failed");
      expect(context.lastFailure.stackTrace).toContain("Validator.ts");
    });

    it("should handle zero retry time", () => {
      const context = createRetryContext(mockOrchCtx, 1, mockFailureDetails, 0);

      expect(context.totalRetryTimeInMilliseconds).toBe(0);
    });

    it("should handle large retry times", () => {
      const context = createRetryContext(mockOrchCtx, 10, mockFailureDetails, 3600000); // 1 hour

      expect(context.totalRetryTimeInMilliseconds).toBe(3600000);
    });

    it("should handle high attempt numbers", () => {
      const context = createRetryContext(mockOrchCtx, 100, mockFailureDetails, 500000);

      expect(context.lastAttemptNumber).toBe(100);
    });
  });

  describe("RetryContext interface", () => {
    it("should be readonly - properties cannot be modified", () => {
      const context: RetryContext = createRetryContext(mockOrchCtx, 1, mockFailureDetails, 5000);

      // TypeScript should prevent these at compile time, but we verify the object structure
      expect(Object.keys(context)).toContain("orchestrationContext");
      expect(Object.keys(context)).toContain("lastAttemptNumber");
      expect(Object.keys(context)).toContain("lastFailure");
      expect(Object.keys(context)).toContain("totalRetryTimeInMilliseconds");
    });
  });
});
