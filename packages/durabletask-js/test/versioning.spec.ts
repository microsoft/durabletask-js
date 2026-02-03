// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { compareVersions } from "../src/utils/versioning.util";

describe("compareVersions", () => {
  describe("empty/undefined versions", () => {
    it("should return 0 when both versions are undefined", () => {
      expect(compareVersions(undefined, undefined)).toBe(0);
    });

    it("should return 0 when both versions are empty strings", () => {
      expect(compareVersions("", "")).toBe(0);
    });

    it("should return 0 when both versions are whitespace", () => {
      expect(compareVersions("  ", "  ")).toBe(0);
    });

    it("should return 0 when one is undefined and other is empty", () => {
      expect(compareVersions(undefined, "")).toBe(0);
      expect(compareVersions("", undefined)).toBe(0);
    });

    it("should return negative when source is empty and other is defined", () => {
      expect(compareVersions("", "1.0.0")).toBeLessThan(0);
      expect(compareVersions(undefined, "1.0.0")).toBeLessThan(0);
      expect(compareVersions("  ", "1.0.0")).toBeLessThan(0);
    });

    it("should return positive when source is defined and other is empty", () => {
      expect(compareVersions("1.0.0", "")).toBeGreaterThan(0);
      expect(compareVersions("1.0.0", undefined)).toBeGreaterThan(0);
      expect(compareVersions("1.0.0", "  ")).toBeGreaterThan(0);
    });
  });

  describe("semantic version comparison", () => {
    it("should compare major versions correctly", () => {
      expect(compareVersions("1.0.0", "2.0.0")).toBeLessThan(0);
      expect(compareVersions("2.0.0", "1.0.0")).toBeGreaterThan(0);
      expect(compareVersions("10.0.0", "2.0.0")).toBeGreaterThan(0);
    });

    it("should compare minor versions correctly", () => {
      expect(compareVersions("1.1.0", "1.2.0")).toBeLessThan(0);
      expect(compareVersions("1.2.0", "1.1.0")).toBeGreaterThan(0);
      expect(compareVersions("1.10.0", "1.2.0")).toBeGreaterThan(0);
    });

    it("should compare patch versions correctly", () => {
      expect(compareVersions("1.0.1", "1.0.2")).toBeLessThan(0);
      expect(compareVersions("1.0.2", "1.0.1")).toBeGreaterThan(0);
      expect(compareVersions("1.0.10", "1.0.2")).toBeGreaterThan(0);
    });

    it("should return 0 for equal versions", () => {
      expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
      expect(compareVersions("2.5.3", "2.5.3")).toBe(0);
    });

    it("should handle versions with different component counts", () => {
      expect(compareVersions("1", "1.0")).toBe(0);
      expect(compareVersions("1.0", "1.0.0")).toBe(0);
      expect(compareVersions("1", "1.0.0")).toBe(0);
      expect(compareVersions("1", "2")).toBeLessThan(0);
      expect(compareVersions("1.0", "1.1")).toBeLessThan(0);
    });

    it("should handle 4-component versions", () => {
      expect(compareVersions("1.0.0.0", "1.0.0.1")).toBeLessThan(0);
      expect(compareVersions("1.0.0.1", "1.0.0.0")).toBeGreaterThan(0);
      expect(compareVersions("1.0.0.0", "1.0.0.0")).toBe(0);
    });
  });

  describe("non-semantic version comparison (lexicographic)", () => {
    it("should compare non-semver strings lexicographically", () => {
      expect(compareVersions("alpha", "beta")).toBeLessThan(0);
      expect(compareVersions("beta", "alpha")).toBeGreaterThan(0);
      expect(compareVersions("alpha", "alpha")).toBe(0);
    });

    it("should be case-insensitive for lexicographic comparison", () => {
      expect(compareVersions("Alpha", "alpha")).toBe(0);
      expect(compareVersions("BETA", "beta")).toBe(0);
      expect(compareVersions("Alpha", "BETA")).toBeLessThan(0);
    });

    it("should compare version strings with prefixes", () => {
      expect(compareVersions("v1.0", "v2.0")).toBeLessThan(0);
      expect(compareVersions("release-1", "release-2")).toBeLessThan(0);
    });
  });

  describe("mixed scenarios", () => {
    it("should handle pre-release style versions", () => {
      // These will fall back to lexicographic since they contain non-numeric chars
      expect(compareVersions("1.0.0-alpha", "1.0.0-beta")).toBeLessThan(0);
      expect(compareVersions("1.0.0-rc1", "1.0.0-rc2")).toBeLessThan(0);
    });

    it("should compare simple numeric versions", () => {
      expect(compareVersions("1", "2")).toBeLessThan(0);
      expect(compareVersions("10", "2")).toBeGreaterThan(0);
      expect(compareVersions("1", "1")).toBe(0);
    });
  });
});
