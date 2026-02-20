// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  ExportJobInvalidTransitionError,
  ExportJobNotFoundError,
} from "../src/errors";
import { ExportJobStatus } from "../src/models";

describe("Errors", () => {
  describe("ExportJobInvalidTransitionError", () => {
    it("should include job ID, statuses, and operation in message", () => {
      const error = new ExportJobInvalidTransitionError(
        "job-123",
        ExportJobStatus.NotStarted,
        ExportJobStatus.Completed,
        "markAsCompleted",
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ExportJobInvalidTransitionError");
      expect(error.message).toContain("job-123");
      expect(error.message).toContain("NotStarted");
      expect(error.message).toContain("Completed");
      expect(error.message).toContain("markAsCompleted");
      expect(error.jobId).toBe("job-123");
      expect(error.fromStatus).toBe(ExportJobStatus.NotStarted);
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
});
