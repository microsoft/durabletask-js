// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { raceWithTimeout } from "../src/utils/timeout.util";
import { TimeoutError } from "../src/exception/timeout-error";

describe("raceWithTimeout", () => {
  describe("input validation", () => {
    const dummyPromise = new Promise<void>(() => {});
    const dummyMessage = () => "timeout";

    it("throws RangeError for negative timeoutMs", async () => {
      await expect(raceWithTimeout(dummyPromise, -1, dummyMessage)).rejects.toThrow(RangeError);
    });

    it("throws RangeError for NaN timeoutMs", async () => {
      await expect(raceWithTimeout(dummyPromise, NaN, dummyMessage)).rejects.toThrow(RangeError);
    });

    it("throws RangeError for Infinity timeoutMs", async () => {
      await expect(raceWithTimeout(dummyPromise, Infinity, dummyMessage)).rejects.toThrow(RangeError);
    });

    it("throws RangeError for -Infinity timeoutMs", async () => {
      await expect(raceWithTimeout(dummyPromise, -Infinity, dummyMessage)).rejects.toThrow(RangeError);
    });

    it("accepts zero as a valid timeoutMs", async () => {
      await expect(raceWithTimeout(Promise.resolve("ok"), 0, dummyMessage)).resolves.toBe("ok");
    });
  });

  describe("makeErrorMessage guard", () => {
    it("produces a TimeoutError with fallback message when makeErrorMessage throws", async () => {
      const neverResolve = new Promise<void>(() => {});
      const throwingMessage = () => {
        throw new Error("boom");
      };

      await expect(raceWithTimeout(neverResolve, 1, throwingMessage)).rejects.toThrow(TimeoutError);
      await expect(raceWithTimeout(neverResolve, 1, throwingMessage)).rejects.toThrow(
        "Operation timed out after 1ms",
      );
    });
  });

  describe("core behavior", () => {
    it("resolves with the promise value when it settles before timeout", async () => {
      const result = await raceWithTimeout(Promise.resolve(42), 1000, () => "timeout");
      expect(result).toBe(42);
    });

    it("throws TimeoutError when the promise does not settle in time", async () => {
      const neverResolve = new Promise<void>(() => {});
      await expect(raceWithTimeout(neverResolve, 1, () => "too slow")).rejects.toThrow(TimeoutError);
      await expect(raceWithTimeout(neverResolve, 1, () => "too slow")).rejects.toThrow("too slow");
    });
  });
});
