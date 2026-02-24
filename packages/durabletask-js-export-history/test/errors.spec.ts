// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  ExportJobInvalidTransitionError,
  ExportJobNotFoundError,
  ExportJobClientValidationError,
} from "../src/errors";
import { ExportJobStatus } from "../src/models";

describe("Errors", () => {
  describe("ExportJobInvalidTransitionError", () => {
    it("should include job ID, statuses, and operation in message", () => {
      const error = new ExportJobInvalidTransitionError(
        "job-123",
        ExportJobStatus.Pending,
        ExportJobStatus.Completed,
        "markAsCompleted",
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ExportJobInvalidTransitionError");
      expect(error.message).toContain("job-123");
      expect(error.message).toContain("Pending");
      expect(error.message).toContain("Completed");
      expect(error.message).toContain("markAsCompleted");
      expect(error.jobId).toBe("job-123");
      expect(error.fromStatus).toBe(ExportJobStatus.Pending);
      expect(error.toStatus).toBe(ExportJobStatus.Completed);
      expect(error.operationName).toBe("markAsCompleted");
    });
  });

  describe("ExportJobNotFoundError", () => {
    it("should include job ID in message", () => {
      const error = new ExportJobNotFoundError("job-456");

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ExportJobNotFoundError");
      expect(error.message).toContain("job-456");
      expect(error.jobId).toBe("job-456");
    });
  });

  describe("ExportJobClientValidationError", () => {
    it("should include message and parameter name", () => {
      const error = new ExportJobClientValidationError(
        "CompletedTimeTo is required.",
        "completedTimeTo",
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ExportJobClientValidationError");
      expect(error.message).toContain("CompletedTimeTo is required.");
      expect(error.parameterName).toBe("completedTimeTo");
    });
  });
});
