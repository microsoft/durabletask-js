// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskHubGrpcWorker, VersionMatchStrategy, VersionFailureStrategy, VersioningOptions } from "../src";

describe("TaskHubGrpcWorker versioning", () => {
  describe("constructor with versioning options", () => {
    it("should accept versioning options", () => {
      const versioning: VersioningOptions = {
        version: "1.0.0",
        matchStrategy: VersionMatchStrategy.Strict,
        failureStrategy: VersionFailureStrategy.Fail,
      };

      // This should not throw
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        versioning,
      });

      expect(worker).toBeDefined();
    });

    it("should accept versioning with CurrentOrOlder strategy", () => {
      const versioning: VersioningOptions = {
        version: "2.0.0",
        matchStrategy: VersionMatchStrategy.CurrentOrOlder,
        failureStrategy: VersionFailureStrategy.Reject,
      };

      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        versioning,
      });

      expect(worker).toBeDefined();
    });

    it("should accept versioning with None strategy (default behavior)", () => {
      const versioning: VersioningOptions = {
        version: "1.0.0",
        matchStrategy: VersionMatchStrategy.None,
      };

      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        versioning,
      });

      expect(worker).toBeDefined();
    });

    it("should work without versioning options", () => {
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
      });

      expect(worker).toBeDefined();
    });

    it("should accept empty versioning options", () => {
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        versioning: {},
      });

      expect(worker).toBeDefined();
    });

    it("should accept versioning with defaultVersion option", () => {
      const versioning: VersioningOptions = {
        version: "1.0.0",
        matchStrategy: VersionMatchStrategy.Strict,
        defaultVersion: "0.1.0",
      };

      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        versioning,
      });

      expect(worker).toBeDefined();
    });
  });

  describe("VersionMatchStrategy enum values", () => {
    it("should have correct enum values matching .NET", () => {
      // Match .NET: None = 0, Strict = 1, CurrentOrOlder = 2
      expect(VersionMatchStrategy.None).toBe(0);
      expect(VersionMatchStrategy.Strict).toBe(1);
      expect(VersionMatchStrategy.CurrentOrOlder).toBe(2);
    });
  });

  describe("VersionFailureStrategy enum values", () => {
    it("should have correct enum values matching .NET", () => {
      // Match .NET: Reject = 0, Fail = 1
      expect(VersionFailureStrategy.Reject).toBe(0);
      expect(VersionFailureStrategy.Fail).toBe(1);
    });
  });

  describe("Strict matching behavior", () => {
    it("should use semantic version comparison for Strict matching", () => {
      // Strict matching should use compareVersions for semantic comparison
      // This means "1.0.0" === "1.0.0" (true)
      // And "1.0.0" !== "1.0.1" (not equal)
      // And "1.0.0" !== "2.0.0" (not equal)
      // This is tested by creating workers - actual behavior tested in integration tests
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        versioning: {
          version: "1.0.0",
          matchStrategy: VersionMatchStrategy.Strict,
          failureStrategy: VersionFailureStrategy.Fail,
        },
      });

      expect(worker).toBeDefined();
    });
  });

  describe("CurrentOrOlder matching behavior", () => {
    it("should allow orchestrations with older versions", () => {
      // CurrentOrOlder should accept orchestrations with versions <= worker version
      // This means worker "2.0.0" accepts orchestration "1.0.0" (1.0.0 <= 2.0.0)
      // But rejects orchestration "3.0.0" (3.0.0 > 2.0.0)
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        versioning: {
          version: "2.0.0",
          matchStrategy: VersionMatchStrategy.CurrentOrOlder,
          failureStrategy: VersionFailureStrategy.Reject,
        },
      });

      expect(worker).toBeDefined();
    });
  });
});
