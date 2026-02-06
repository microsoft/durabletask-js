// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryPolicy } from "../src/task/retry/retry-policy";
import { RetryHandler, AsyncRetryHandler, toAsyncRetryHandler } from "../src/task/retry/retry-handler";
import { createRetryContext } from "../src/task/retry/retry-context";
import {
  TaskOptions,
  SubOrchestrationOptions,
  TaskRetryOptions,
  taskOptionsFromRetryPolicy,
  taskOptionsFromRetryHandler,
  taskOptionsFromSyncRetryHandler,
  subOrchestrationOptionsFromRetryPolicy,
  subOrchestrationOptionsFromRetryHandler,
  isRetryPolicy,
  isRetryHandler,
} from "../src/task/options/task-options";

describe("TaskOptions with RetryHandler", () => {
  const mockRetryPolicy = new RetryPolicy({
    maxNumberOfAttempts: 3,
    firstRetryIntervalInMilliseconds: 1000,
  });

  const mockAsyncRetryHandler: AsyncRetryHandler = async (context) => {
    return context.lastAttemptNumber < 3;
  };

  const mockSyncRetryHandler: RetryHandler = (context) => {
    return context.lastAttemptNumber < 3;
  };

  describe("TaskRetryOptions type", () => {
    it("should accept RetryPolicy", () => {
      const options: TaskRetryOptions = mockRetryPolicy;
      expect(options).toBe(mockRetryPolicy);
    });

    it("should accept AsyncRetryHandler", () => {
      const options: TaskRetryOptions = mockAsyncRetryHandler;
      expect(options).toBe(mockAsyncRetryHandler);
    });

    it("should accept synchronous RetryHandler directly", () => {
      const options: TaskRetryOptions = mockSyncRetryHandler;
      expect(options).toBe(mockSyncRetryHandler);
    });
  });

  describe("taskOptionsFromRetryPolicy", () => {
    it("should create TaskOptions with retry policy", () => {
      const options = taskOptionsFromRetryPolicy(mockRetryPolicy);

      expect(options.retry).toBe(mockRetryPolicy);
    });

    it("should not have other properties", () => {
      const options = taskOptionsFromRetryPolicy(mockRetryPolicy);

      expect(options.tags).toBeUndefined();
      expect(options.version).toBeUndefined();
    });
  });

  describe("taskOptionsFromRetryHandler", () => {
    it("should create TaskOptions with async retry handler", () => {
      const options = taskOptionsFromRetryHandler(mockAsyncRetryHandler);

      expect(options.retry).toBe(mockAsyncRetryHandler);
    });

    it("should not have other properties", () => {
      const options = taskOptionsFromRetryHandler(mockAsyncRetryHandler);

      expect(options.tags).toBeUndefined();
      expect(options.version).toBeUndefined();
    });
  });

  describe("taskOptionsFromSyncRetryHandler", () => {
    it("should create TaskOptions with wrapped sync handler", () => {
      const options = taskOptionsFromSyncRetryHandler(mockSyncRetryHandler);

      expect(typeof options.retry).toBe("function");
    });

    it("should wrap sync handler to return Promise", async () => {
      const options = taskOptionsFromSyncRetryHandler(mockSyncRetryHandler);

      const handler = options.retry as AsyncRetryHandler;
      const context = createRetryContext(
        1,
        { errorType: "Error", message: "Error", stackTrace: "" },
        1000,
      );

      const result = handler(context);
      expect(result).toBeInstanceOf(Promise);
      expect(await result).toBe(true);
    });
  });

  describe("subOrchestrationOptionsFromRetryPolicy", () => {
    it("should create SubOrchestrationOptions with retry policy", () => {
      const options = subOrchestrationOptionsFromRetryPolicy(mockRetryPolicy);

      expect(options.retry).toBe(mockRetryPolicy);
      expect(options.instanceId).toBeUndefined();
    });

    it("should include instanceId when provided", () => {
      const options = subOrchestrationOptionsFromRetryPolicy(mockRetryPolicy, "test-instance");

      expect(options.retry).toBe(mockRetryPolicy);
      expect(options.instanceId).toBe("test-instance");
    });
  });

  describe("subOrchestrationOptionsFromRetryHandler", () => {
    it("should create SubOrchestrationOptions with retry handler", () => {
      const options = subOrchestrationOptionsFromRetryHandler(mockAsyncRetryHandler);

      expect(options.retry).toBe(mockAsyncRetryHandler);
      expect(options.instanceId).toBeUndefined();
    });

    it("should include instanceId when provided", () => {
      const options = subOrchestrationOptionsFromRetryHandler(mockAsyncRetryHandler, "test-instance");

      expect(options.retry).toBe(mockAsyncRetryHandler);
      expect(options.instanceId).toBe("test-instance");
    });
  });

  describe("isRetryPolicy type guard", () => {
    it("should return true for RetryPolicy instances", () => {
      expect(isRetryPolicy(mockRetryPolicy)).toBe(true);
    });

    it("should return false for AsyncRetryHandler", () => {
      expect(isRetryPolicy(mockAsyncRetryHandler)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isRetryPolicy(undefined)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isRetryPolicy(null as any)).toBe(false);
    });
  });

  describe("isRetryHandler type guard", () => {
    it("should return true for AsyncRetryHandler", () => {
      expect(isRetryHandler(mockAsyncRetryHandler)).toBe(true);
    });

    it("should return true for sync RetryHandler", () => {
      expect(isRetryHandler(mockSyncRetryHandler)).toBe(true);
    });

    it("should return true for wrapped sync handler", () => {
      const wrapped = toAsyncRetryHandler(mockSyncRetryHandler);
      expect(isRetryHandler(wrapped)).toBe(true);
    });

    it("should return false for RetryPolicy instances", () => {
      expect(isRetryHandler(mockRetryPolicy)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isRetryHandler(undefined)).toBe(false);
    });
  });

  describe("TaskOptions interface", () => {
    it("should allow RetryPolicy as retry option", () => {
      const options: TaskOptions = {
        retry: mockRetryPolicy,
      };

      expect(isRetryPolicy(options.retry)).toBe(true);
    });

    it("should allow AsyncRetryHandler as retry option", () => {
      const options: TaskOptions = {
        retry: mockAsyncRetryHandler,
      };

      expect(isRetryHandler(options.retry)).toBe(true);
    });

    it("should allow synchronous RetryHandler as retry option", () => {
      const options: TaskOptions = {
        retry: mockSyncRetryHandler,
      };

      expect(isRetryHandler(options.retry)).toBe(true);
    });

    it("should allow combination with other options", () => {
      const options: TaskOptions = {
        retry: mockRetryPolicy,
        tags: { env: "test" },
        version: "1.0.0",
      };

      expect(options.retry).toBe(mockRetryPolicy);
      expect(options.tags).toEqual({ env: "test" });
      expect(options.version).toBe("1.0.0");
    });
  });

  describe("SubOrchestrationOptions interface", () => {
    it("should allow RetryPolicy with instanceId", () => {
      const options: SubOrchestrationOptions = {
        retry: mockRetryPolicy,
        instanceId: "sub-orch-1",
      };

      expect(options.retry).toBe(mockRetryPolicy);
      expect(options.instanceId).toBe("sub-orch-1");
    });

    it("should allow AsyncRetryHandler with instanceId", () => {
      const options: SubOrchestrationOptions = {
        retry: mockAsyncRetryHandler,
        instanceId: "sub-orch-2",
      };

      expect(isRetryHandler(options.retry)).toBe(true);
      expect(options.instanceId).toBe("sub-orch-2");
    });

    it("should allow synchronous RetryHandler with instanceId", () => {
      const options: SubOrchestrationOptions = {
        retry: mockSyncRetryHandler,
        instanceId: "sub-orch-3",
      };

      expect(isRetryHandler(options.retry)).toBe(true);
      expect(options.instanceId).toBe("sub-orch-3");
    });
  });
});
