// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryHandler, AsyncRetryHandler, toAsyncRetryHandler } from "../src/task/retry/retry-handler";
import { RetryContext, createRetryContext } from "../src/task/retry/retry-context";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { TaskFailureDetails } from "../src/task/failure-details";

describe("RetryHandler", () => {
  const mockOrchCtx = {} as OrchestrationContext;
  const mockFailureDetails: TaskFailureDetails = {
    errorType: "TestError",
    message: "Test error message",
    stackTrace: "at TestFile.ts:10",
  };

  const createTestContext = (attemptNumber: number, errorType: string = "TestError"): RetryContext => {
    return createRetryContext(
      mockOrchCtx,
      attemptNumber,
      { ...mockFailureDetails, errorType },
      attemptNumber * 1000,
    );
  };

  describe("RetryHandler type", () => {
    it("should return true to continue retrying", () => {
      const handler: RetryHandler = () => true;

      const result = handler(createTestContext(1));

      expect(result).toBe(true);
    });

    it("should return false to stop retrying", () => {
      const handler: RetryHandler = () => false;

      const result = handler(createTestContext(1));

      expect(result).toBe(false);
    });

    it("should be able to check attempt number", () => {
      const handler: RetryHandler = (context) => context.lastAttemptNumber < 3;

      expect(handler(createTestContext(1))).toBe(true);
      expect(handler(createTestContext(2))).toBe(true);
      expect(handler(createTestContext(3))).toBe(false);
      expect(handler(createTestContext(4))).toBe(false);
    });

    it("should be able to check error type", () => {
      const handler: RetryHandler = (context) => {
        return context.lastFailure.errorType !== "ValidationError";
      };

      expect(handler(createTestContext(1, "TransientError"))).toBe(true);
      expect(handler(createTestContext(1, "ValidationError"))).toBe(false);
    });

    it("should be able to check total retry time", () => {
      const handler: RetryHandler = (context) => {
        // Stop retrying after 5 seconds total
        return context.totalRetryTimeInMilliseconds < 5000;
      };

      expect(handler(createRetryContext(mockOrchCtx, 1, mockFailureDetails, 1000))).toBe(true);
      expect(handler(createRetryContext(mockOrchCtx, 3, mockFailureDetails, 4999))).toBe(true);
      expect(handler(createRetryContext(mockOrchCtx, 5, mockFailureDetails, 5000))).toBe(false);
    });

    it("should support complex retry logic", () => {
      const handler: RetryHandler = (context) => {
        // Don't retry validation errors
        if (context.lastFailure.errorType === "ValidationError") return false;

        // Don't retry after 5 attempts
        if (context.lastAttemptNumber >= 5) return false;

        // Don't retry after 30 seconds
        if (context.totalRetryTimeInMilliseconds > 30000) return false;

        return true;
      };

      // Should retry for normal errors under limits
      expect(handler(createRetryContext(mockOrchCtx, 1, mockFailureDetails, 1000))).toBe(true);

      // Should not retry validation errors
      expect(
        handler(
          createRetryContext(
            mockOrchCtx,
            1,
            { ...mockFailureDetails, errorType: "ValidationError" },
            1000,
          ),
        ),
      ).toBe(false);

      // Should not retry after 5 attempts
      expect(handler(createRetryContext(mockOrchCtx, 5, mockFailureDetails, 5000))).toBe(false);

      // Should not retry after 30 seconds
      expect(handler(createRetryContext(mockOrchCtx, 3, mockFailureDetails, 31000))).toBe(false);
    });
  });

  describe("AsyncRetryHandler type", () => {
    it("should return Promise that resolves to true", async () => {
      const handler: AsyncRetryHandler = async () => true;

      const result = await handler(createTestContext(1));

      expect(result).toBe(true);
    });

    it("should return Promise that resolves to false", async () => {
      const handler: AsyncRetryHandler = async () => false;

      const result = await handler(createTestContext(1));

      expect(result).toBe(false);
    });

    it("should support async logic", async () => {
      const handler: AsyncRetryHandler = async (context) => {
        // Simulate some async operation (in practice this would be deterministic)
        await Promise.resolve();
        return context.lastAttemptNumber < 3;
      };

      expect(await handler(createTestContext(1))).toBe(true);
      expect(await handler(createTestContext(2))).toBe(true);
      expect(await handler(createTestContext(3))).toBe(false);
    });
  });

  describe("toAsyncRetryHandler", () => {
    it("should wrap a sync handler in a Promise", async () => {
      const syncHandler: RetryHandler = (context) => context.lastAttemptNumber < 3;
      const asyncHandler = toAsyncRetryHandler(syncHandler);

      expect(await asyncHandler(createTestContext(1))).toBe(true);
      expect(await asyncHandler(createTestContext(2))).toBe(true);
      expect(await asyncHandler(createTestContext(3))).toBe(false);
    });

    it("should preserve the logic of the original handler", async () => {
      const syncHandler: RetryHandler = (context) => {
        return context.lastFailure.errorType !== "FatalError" && context.lastAttemptNumber < 5;
      };

      const asyncHandler = toAsyncRetryHandler(syncHandler);

      expect(await asyncHandler(createTestContext(1, "TransientError"))).toBe(true);
      expect(await asyncHandler(createTestContext(1, "FatalError"))).toBe(false);
      expect(await asyncHandler(createTestContext(5, "TransientError"))).toBe(false);
    });

    it("should return a function", () => {
      const syncHandler: RetryHandler = () => true;
      const asyncHandler = toAsyncRetryHandler(syncHandler);

      expect(typeof asyncHandler).toBe("function");
    });

    it("should return a Promise", () => {
      const syncHandler: RetryHandler = () => true;
      const asyncHandler = toAsyncRetryHandler(syncHandler);

      const result = asyncHandler(createTestContext(1));

      expect(result).toBeInstanceOf(Promise);
    });
  });
});
