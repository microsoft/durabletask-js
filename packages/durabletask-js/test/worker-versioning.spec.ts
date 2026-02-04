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
  });
});
