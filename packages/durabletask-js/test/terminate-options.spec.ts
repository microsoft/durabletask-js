// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  terminateOptions,
  isTerminateInstanceOptions,
  TERMINATE_OPTIONS_SYMBOL,
} from "../src";

describe("TerminateInstanceOptions", () => {
  describe("terminateOptions factory function", () => {
    it("should create options with recursive flag", () => {
      const options = terminateOptions({ recursive: true });

      expect(options.recursive).toBe(true);
      expect(isTerminateInstanceOptions(options)).toBe(true);
    });

    it("should create options with output", () => {
      const options = terminateOptions({ output: { reason: "cancelled" } });

      expect(options.output).toEqual({ reason: "cancelled" });
      expect(isTerminateInstanceOptions(options)).toBe(true);
    });

    it("should create options with both recursive and output", () => {
      const options = terminateOptions({
        recursive: true,
        output: { reason: "cancelled" },
      });

      expect(options.recursive).toBe(true);
      expect(options.output).toEqual({ reason: "cancelled" });
      expect(isTerminateInstanceOptions(options)).toBe(true);
    });

    it("should create options with empty object", () => {
      const options = terminateOptions({});

      expect(options.recursive).toBeUndefined();
      expect(options.output).toBeUndefined();
      expect(isTerminateInstanceOptions(options)).toBe(true);
    });
  });

  describe("isTerminateInstanceOptions type guard", () => {
    it("should return true for options created with terminateOptions()", () => {
      const options = terminateOptions({ recursive: true });
      expect(isTerminateInstanceOptions(options)).toBe(true);
    });

    it("should return false for plain objects with recursive property", () => {
      // This is the key test - user output that happens to have 'recursive' property
      const userOutput = { recursive: true, data: "some value" };
      expect(isTerminateInstanceOptions(userOutput)).toBe(false);
    });

    it("should return false for plain objects with output property", () => {
      // User output that happens to have 'output' property
      const userOutput = { output: "some value", status: "done" };
      expect(isTerminateInstanceOptions(userOutput)).toBe(false);
    });

    it("should return false for plain objects with both recursive and output properties", () => {
      // User output that coincidentally has both properties
      const userOutput = { recursive: true, output: "some data", extra: "field" };
      expect(isTerminateInstanceOptions(userOutput)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isTerminateInstanceOptions(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isTerminateInstanceOptions(undefined)).toBe(false);
    });

    it("should return false for primitives", () => {
      expect(isTerminateInstanceOptions("string")).toBe(false);
      expect(isTerminateInstanceOptions(123)).toBe(false);
      expect(isTerminateInstanceOptions(true)).toBe(false);
    });

    it("should return false for arrays", () => {
      expect(isTerminateInstanceOptions([1, 2, 3])).toBe(false);
      expect(isTerminateInstanceOptions([{ recursive: true }])).toBe(false);
    });

    it("should return false for arbitrary objects", () => {
      expect(isTerminateInstanceOptions({ foo: "bar" })).toBe(false);
      expect(isTerminateInstanceOptions({ status: "done", data: {} })).toBe(false);
    });

    it("should return false for objects that look like options but lack the symbol", () => {
      // This simulates the old detection bug - objects with matching property names
      const fakeOptions = { recursive: true, output: { reason: "test" } };
      expect(isTerminateInstanceOptions(fakeOptions)).toBe(false);
    });
  });

  describe("TERMINATE_OPTIONS_SYMBOL", () => {
    it("should be a symbol", () => {
      expect(typeof TERMINATE_OPTIONS_SYMBOL).toBe("symbol");
    });

    it("should be consistent across imports (Symbol.for)", () => {
      const symbol1 = Symbol.for("durabletask.TerminateInstanceOptions");
      const symbol2 = Symbol.for("durabletask.TerminateInstanceOptions");
      expect(symbol1).toBe(symbol2);
      expect(symbol1).toBe(TERMINATE_OPTIONS_SYMBOL);
    });

    it("should be present in options created with terminateOptions()", () => {
      const options = terminateOptions({ recursive: true });
      expect(TERMINATE_OPTIONS_SYMBOL in options).toBe(true);
      expect(options[TERMINATE_OPTIONS_SYMBOL]).toBe(true);
    });
  });

  describe("edge cases for user output disambiguation", () => {
    it("should treat plain object with recursive:true as output, not options", () => {
      // This was the original bug - user passing output like {recursive: true, data: {...}}
      const userOutput = { recursive: true, data: { value: 123 } };
      
      // Should NOT be detected as TerminateInstanceOptions
      expect(isTerminateInstanceOptions(userOutput)).toBe(false);
      
      // When used with terminateOptions, it works correctly
      const options = terminateOptions({ output: userOutput, recursive: false });
      expect(isTerminateInstanceOptions(options)).toBe(true);
      expect(options.output).toEqual(userOutput);
    });

    it("should correctly handle nested objects with problematic property names", () => {
      const complexOutput = {
        recursive: true,
        output: "nested",
        metadata: {
          recursive: false,
          output: "deeply nested"
        }
      };
      
      // Plain object should not be detected as options
      expect(isTerminateInstanceOptions(complexOutput)).toBe(false);
      
      // Wrapped in terminateOptions should work
      const options = terminateOptions({ output: complexOutput });
      expect(isTerminateInstanceOptions(options)).toBe(true);
    });
  });
});
