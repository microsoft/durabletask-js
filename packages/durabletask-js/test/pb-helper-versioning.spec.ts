// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { newVersionMismatchFailureDetails, newFailureDetails } from "../src/utils/pb-helper.util";

describe("pb-helper.util - Version Mismatch Failure Details", () => {
  describe("newVersionMismatchFailureDetails", () => {
    it("should create failure details with VersionMismatch error type", () => {
      const failure = newVersionMismatchFailureDetails(
        "VersionMismatch",
        "The orchestration version '2.0.0' does not match the worker version '1.0.0'."
      );

      expect(failure.getErrortype()).toBe("VersionMismatch");
      expect(failure.getErrormessage()).toBe("The orchestration version '2.0.0' does not match the worker version '1.0.0'.");
      expect(failure.getIsnonretriable()).toBe(true);
    });

    it("should create failure details with VersionError error type", () => {
      const failure = newVersionMismatchFailureDetails(
        "VersionError",
        "The version match strategy '99' is unknown."
      );

      expect(failure.getErrortype()).toBe("VersionError");
      expect(failure.getErrormessage()).toBe("The version match strategy '99' is unknown.");
      expect(failure.getIsnonretriable()).toBe(true);
    });

    it("should set IsNonRetriable to true for version mismatches", () => {
      const failure = newVersionMismatchFailureDetails("VersionMismatch", "Test message");
      
      // Version mismatches are deterministic and should not be retried
      expect(failure.getIsnonretriable()).toBe(true);
    });

    it("should not set stack trace for version mismatches", () => {
      const failure = newVersionMismatchFailureDetails("VersionMismatch", "Test message");
      
      // Version mismatches don't need stack traces
      expect(failure.getStacktrace()).toBeUndefined();
    });
  });

  describe("newFailureDetails", () => {
    it("should create failure details from Error object", () => {
      const error = new Error("Something went wrong");
      const failure = newFailureDetails(error);

      expect(failure.getErrortype()).toBe("Error");
      expect(failure.getErrormessage()).toBe("Something went wrong");
      expect(failure.getStacktrace()).toBeDefined();
    });

    it("should capture error type from custom errors", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }
      
      const error = new CustomError("Custom error message");
      const failure = newFailureDetails(error);

      expect(failure.getErrortype()).toBe("CustomError");
      expect(failure.getErrormessage()).toBe("Custom error message");
    });

    it("should populate innerFailure from error.cause", () => {
      const innerError = new TypeError("Cannot read property 'x' of undefined");
      const outerError = new Error("Failed to process input", { cause: innerError });
      const failure = newFailureDetails(outerError);

      expect(failure.getErrortype()).toBe("Error");
      expect(failure.getErrormessage()).toBe("Failed to process input");

      const inner = failure.getInnerfailure();
      expect(inner).toBeDefined();
      expect(inner!.getErrortype()).toBe("TypeError");
      expect(inner!.getErrormessage()).toBe("Cannot read property 'x' of undefined");
      expect(inner!.getStacktrace()).toBeDefined();
    });

    it("should handle multi-level error cause chains", () => {
      const rootCause = new RangeError("Index out of bounds");
      const midError = new Error("Data access failed", { cause: rootCause });
      const topError = new Error("Operation failed", { cause: midError });
      const failure = newFailureDetails(topError);

      expect(failure.getErrortype()).toBe("Error");
      expect(failure.getErrormessage()).toBe("Operation failed");

      const mid = failure.getInnerfailure();
      expect(mid).toBeDefined();
      expect(mid!.getErrortype()).toBe("Error");
      expect(mid!.getErrormessage()).toBe("Data access failed");

      const root = mid!.getInnerfailure();
      expect(root).toBeDefined();
      expect(root!.getErrortype()).toBe("RangeError");
      expect(root!.getErrormessage()).toBe("Index out of bounds");
      expect(root!.getInnerfailure()).toBeUndefined();
    });

    it("should handle non-Error cause values", () => {
      const outerError = new Error("Wrapper", { cause: "string cause" });
      const failure = newFailureDetails(outerError);

      const inner = failure.getInnerfailure();
      expect(inner).toBeDefined();
      expect(inner!.getErrortype()).toBe("UnknownError");
      expect(inner!.getErrormessage()).toBe("string cause");
    });

    it("should not set innerFailure when there is no cause", () => {
      const error = new Error("No cause");
      const failure = newFailureDetails(error);

      expect(failure.getInnerfailure()).toBeUndefined();
    });

    it("should not set innerFailure for non-Error values", () => {
      const failure = newFailureDetails("plain string error");

      expect(failure.getErrortype()).toBe("UnknownError");
      expect(failure.getErrormessage()).toBe("plain string error");
      expect(failure.getInnerfailure()).toBeUndefined();
    });

    it("should cap recursion depth to prevent stack overflow from circular causes", () => {
      // Build a cause chain deeper than the limit (10)
      let error: Error = new Error("root");
      for (let i = 0; i < 15; i++) {
        error = new Error(`level-${i}`, { cause: error });
      }

      const failure = newFailureDetails(error);

      // Walk down the chain — should stop at depth 10
      let current = failure;
      let depth = 0;
      while (current.getInnerfailure()) {
        current = current.getInnerfailure()!;
        depth++;
      }
      expect(depth).toBe(10);
    });
  });
});
