// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { VersionMatchStrategy, VersionFailureStrategy, VersioningOptions } from "../src/worker/versioning-options";

describe("VersioningOptions", () => {
  describe("VersionMatchStrategy enum", () => {
    it("should have None = 0", () => {
      expect(VersionMatchStrategy.None).toBe(0);
    });

    it("should have Strict = 1", () => {
      expect(VersionMatchStrategy.Strict).toBe(1);
    });

    it("should have CurrentOrOlder = 2", () => {
      expect(VersionMatchStrategy.CurrentOrOlder).toBe(2);
    });
  });

  describe("VersionFailureStrategy enum", () => {
    it("should have Reject = 0", () => {
      expect(VersionFailureStrategy.Reject).toBe(0);
    });

    it("should have Fail = 1", () => {
      expect(VersionFailureStrategy.Fail).toBe(1);
    });
  });

  describe("VersioningOptions interface", () => {
    it("should allow creating options with all properties", () => {
      const options: VersioningOptions = {
        version: "1.0.0",
        defaultVersion: "1.0.0",
        matchStrategy: VersionMatchStrategy.Strict,
        failureStrategy: VersionFailureStrategy.Fail,
      };

      expect(options.version).toBe("1.0.0");
      expect(options.defaultVersion).toBe("1.0.0");
      expect(options.matchStrategy).toBe(VersionMatchStrategy.Strict);
      expect(options.failureStrategy).toBe(VersionFailureStrategy.Fail);
    });

    it("should allow creating options with only version", () => {
      const options: VersioningOptions = {
        version: "2.0.0",
      };

      expect(options.version).toBe("2.0.0");
      expect(options.defaultVersion).toBeUndefined();
      expect(options.matchStrategy).toBeUndefined();
      expect(options.failureStrategy).toBeUndefined();
    });

    it("should allow creating empty options", () => {
      const options: VersioningOptions = {};

      expect(options.version).toBeUndefined();
      expect(options.defaultVersion).toBeUndefined();
      expect(options.matchStrategy).toBeUndefined();
      expect(options.failureStrategy).toBeUndefined();
    });

    it("should allow CurrentOrOlder match strategy", () => {
      const options: VersioningOptions = {
        version: "3.0.0",
        matchStrategy: VersionMatchStrategy.CurrentOrOlder,
        failureStrategy: VersionFailureStrategy.Reject,
      };

      expect(options.matchStrategy).toBe(VersionMatchStrategy.CurrentOrOlder);
      expect(options.failureStrategy).toBe(VersionFailureStrategy.Reject);
    });

    it("should allow None match strategy (process all versions)", () => {
      const options: VersioningOptions = {
        version: "1.0.0",
        matchStrategy: VersionMatchStrategy.None,
      };

      expect(options.matchStrategy).toBe(VersionMatchStrategy.None);
    });

    it("should allow defaultVersion for client orchestration scheduling", () => {
      const options: VersioningOptions = {
        version: "2.0.0",
        defaultVersion: "1.5.0",
        matchStrategy: VersionMatchStrategy.CurrentOrOlder,
      };

      expect(options.version).toBe("2.0.0");
      expect(options.defaultVersion).toBe("1.5.0");
    });
  });
});
