// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { OrchestrationState, OrchestrationStatus, FailureDetails } from "../src";
import { OrchestrationFailedError } from "../src/orchestration/exception/orchestration-failed-error";

describe("OrchestrationState", () => {
  const instanceId = "test-instance-001";
  const name = "TestOrchestrator";
  const createdAt = new Date("2026-01-01T00:00:00Z");
  const lastUpdatedAt = new Date("2026-01-01T00:01:00Z");

  function createState(
    runtimeStatus: OrchestrationStatus,
    failureDetails?: FailureDetails,
  ): OrchestrationState {
    return new OrchestrationState(
      instanceId,
      name,
      runtimeStatus,
      createdAt,
      lastUpdatedAt,
      undefined,
      undefined,
      undefined,
      failureDetails,
    );
  }

  describe("raiseIfFailed", () => {
    it("should throw OrchestrationFailedError when failureDetails is present", () => {
      const details = new FailureDetails("Something went wrong", "Error", "at foo.ts:1");
      const state = createState(OrchestrationStatus.FAILED, details);

      expect(() => state.raiseIfFailed()).toThrow(OrchestrationFailedError);
    });

    it("should include the instance ID and error message when failureDetails is present", () => {
      const details = new FailureDetails("Something went wrong", "Error");
      const state = createState(OrchestrationStatus.FAILED, details);

      try {
        state.raiseIfFailed();
        fail("Expected raiseIfFailed to throw");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(OrchestrationFailedError);
        const error = e as OrchestrationFailedError;
        expect(error.message).toContain(instanceId);
        expect(error.message).toContain("Something went wrong");
        expect(error.failureDetails).toBe(details);
      }
    });

    it("should throw when runtimeStatus is FAILED but failureDetails is missing", () => {
      const state = createState(OrchestrationStatus.FAILED);

      expect(() => state.raiseIfFailed()).toThrow(OrchestrationFailedError);
    });

    it("should include the instance ID when runtimeStatus is FAILED without details", () => {
      const state = createState(OrchestrationStatus.FAILED);

      try {
        state.raiseIfFailed();
        fail("Expected raiseIfFailed to throw");
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(OrchestrationFailedError);
        const error = e as OrchestrationFailedError;
        expect(error.message).toContain(instanceId);
        expect(error.failureDetails).toBeDefined();
        expect(error.failureDetails.errorType).toEqual("UnknownError");
      }
    });

    it("should not throw when runtimeStatus is COMPLETED", () => {
      const state = createState(OrchestrationStatus.COMPLETED);

      expect(() => state.raiseIfFailed()).not.toThrow();
    });

    it("should not throw when runtimeStatus is RUNNING", () => {
      const state = createState(OrchestrationStatus.RUNNING);

      expect(() => state.raiseIfFailed()).not.toThrow();
    });

    it("should not throw when runtimeStatus is TERMINATED", () => {
      const state = createState(OrchestrationStatus.TERMINATED);

      expect(() => state.raiseIfFailed()).not.toThrow();
    });

    it("should not throw when runtimeStatus is PENDING", () => {
      const state = createState(OrchestrationStatus.PENDING);

      expect(() => state.raiseIfFailed()).not.toThrow();
    });

    it("should not throw when runtimeStatus is SUSPENDED", () => {
      const state = createState(OrchestrationStatus.SUSPENDED);

      expect(() => state.raiseIfFailed()).not.toThrow();
    });

    it("should prioritize failureDetails over synthetic details when both are available", () => {
      const details = new FailureDetails("Specific error", "CustomError", "stack trace");
      const state = createState(OrchestrationStatus.FAILED, details);

      try {
        state.raiseIfFailed();
        fail("Expected raiseIfFailed to throw");
      } catch (e: unknown) {
        const error = e as OrchestrationFailedError;
        // Should use the real failure details, not synthetic ones
        expect(error.failureDetails.message).toEqual("Specific error");
        expect(error.failureDetails.errorType).toEqual("CustomError");
        expect(error.failureDetails.stackTrace).toEqual("stack trace");
      }
    });
  });
});
