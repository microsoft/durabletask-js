// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { toErrorMessage } from "../src/utils/error.util";

describe("toErrorMessage", () => {
  it("should extract message from Error instance", () => {
    const error = new Error("something went wrong");
    expect(toErrorMessage(error)).toBe("something went wrong");
  });

  it("should extract message from Error subclass", () => {
    const error = new TypeError("invalid type");
    expect(toErrorMessage(error)).toBe("invalid type");
  });

  it("should return string errors as-is", () => {
    expect(toErrorMessage("raw error string")).toBe("raw error string");
  });

  it("should return empty string for empty string error", () => {
    expect(toErrorMessage("")).toBe("");
  });

  it("should JSON-stringify plain objects", () => {
    const obj = { code: 404, reason: "not found" };
    expect(toErrorMessage(obj)).toBe(JSON.stringify(obj));
  });

  it("should JSON-stringify arrays", () => {
    const arr = ["error1", "error2"];
    expect(toErrorMessage(arr)).toBe(JSON.stringify(arr));
  });

  it("should handle objects with circular references gracefully", () => {
    const obj: Record<string, unknown> = { name: "circular" };
    obj.self = obj;
    // JSON.stringify will throw, so it should fall through to String()
    expect(toErrorMessage(obj)).toBe("[object Object]");
  });

  it("should convert null to string", () => {
    expect(toErrorMessage(null)).toBe("null");
  });

  it("should convert undefined to string", () => {
    expect(toErrorMessage(undefined)).toBe("undefined");
  });

  it("should convert number to string", () => {
    expect(toErrorMessage(42)).toBe("42");
  });

  it("should convert boolean to string", () => {
    expect(toErrorMessage(false)).toBe("false");
  });

  it("should convert symbol to string", () => {
    expect(toErrorMessage(Symbol("test"))).toBe("Symbol(test)");
  });

  it("should handle BigInt", () => {
    expect(toErrorMessage(BigInt(123))).toBe("123");
  });
});
