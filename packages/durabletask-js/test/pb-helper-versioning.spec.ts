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
  });
});
