// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExponentialBackoff, sleep, withTimeout, DEFAULT_BACKOFF_OPTIONS } from "../src/utils/backoff.util";

describe("ExponentialBackoff", () => {
  describe("constructor", () => {
    it("should use default options when none provided", () => {
      const backoff = new ExponentialBackoff();
      expect(backoff.attemptCount).toBe(0);
      expect(backoff.currentDelayMs).toBe(DEFAULT_BACKOFF_OPTIONS.initialDelayMs);
    });

    it("should accept custom options", () => {
      const backoff = new ExponentialBackoff({
        initialDelayMs: 500,
        maxDelayMs: 10000,
        multiplier: 3,
        maxAttempts: 5,
      });
      expect(backoff.currentDelayMs).toBe(500);
    });
  });

  describe("canRetry", () => {
    it("should return true when maxAttempts is -1 (unlimited)", () => {
      const backoff = new ExponentialBackoff({ maxAttempts: -1 });
      expect(backoff.canRetry()).toBe(true);
    });

    it("should return true when attempts are less than maxAttempts", () => {
      const backoff = new ExponentialBackoff({ maxAttempts: 3 });
      expect(backoff.canRetry()).toBe(true);
    });

    it("should return false when attempts reach maxAttempts", async () => {
      const backoff = new ExponentialBackoff({
        maxAttempts: 1,
        initialDelayMs: 1,
        jitterFactor: 0,
      });
      await backoff.wait();
      expect(backoff.canRetry()).toBe(false);
    });
  });

  describe("wait", () => {
    it("should increment attempt count after waiting", async () => {
      const backoff = new ExponentialBackoff({
        initialDelayMs: 1,
        jitterFactor: 0,
      });
      expect(backoff.attemptCount).toBe(0);
      await backoff.wait();
      expect(backoff.attemptCount).toBe(1);
    });

    it("should increase delay with multiplier", async () => {
      const backoff = new ExponentialBackoff({
        initialDelayMs: 10,
        multiplier: 2,
        maxDelayMs: 1000,
        jitterFactor: 0,
      });

      expect(backoff.currentDelayMs).toBe(10);
      await backoff.wait();
      expect(backoff.currentDelayMs).toBe(20);
      await backoff.wait();
      expect(backoff.currentDelayMs).toBe(40);
    });

    it("should cap delay at maxDelayMs", async () => {
      const backoff = new ExponentialBackoff({
        initialDelayMs: 50,
        multiplier: 10,
        maxDelayMs: 100,
        jitterFactor: 0,
      });

      await backoff.wait();
      expect(backoff.currentDelayMs).toBe(100); // 50 * 10 = 500, capped at 100
    });
  });

  describe("reset", () => {
    it("should reset delay and attempt count to initial values", async () => {
      const backoff = new ExponentialBackoff({
        initialDelayMs: 10,
        multiplier: 2,
        jitterFactor: 0,
      });

      await backoff.wait();
      await backoff.wait();

      expect(backoff.attemptCount).toBe(2);
      expect(backoff.currentDelayMs).toBe(40);

      backoff.reset();

      expect(backoff.attemptCount).toBe(0);
      expect(backoff.currentDelayMs).toBe(10);
    });
  });

  describe("peekNextDelay", () => {
    it("should return delay without modifying state", () => {
      const backoff = new ExponentialBackoff({
        initialDelayMs: 100,
        jitterFactor: 0,
      });

      const delay1 = backoff.peekNextDelay();
      const delay2 = backoff.peekNextDelay();

      expect(delay1).toBe(100);
      expect(delay2).toBe(100);
      expect(backoff.attemptCount).toBe(0);
    });
  });

  describe("jitter", () => {
    it("should apply jitter within expected range", () => {
      const backoff = new ExponentialBackoff({
        initialDelayMs: 100,
        jitterFactor: 0.5,
      });

      // Run multiple times to statistically verify jitter
      const delays: number[] = [];
      for (let i = 0; i < 20; i++) {
        delays.push(backoff.peekNextDelay());
      }

      // With 0.5 jitter factor on 100ms, delays should be between 50 and 150
      const minExpected = 100 - 100 * 0.5;
      const maxExpected = 100 + 100 * 0.5;

      for (const delay of delays) {
        expect(delay).toBeGreaterThanOrEqual(minExpected);
        expect(delay).toBeLessThanOrEqual(maxExpected);
      }

      // Verify there's some variation (not all the same)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });
});

describe("sleep", () => {
  it("should resolve after specified delay", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some timing variance
    expect(elapsed).toBeLessThan(150);
  });
});

describe("withTimeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should resolve with value when promise completes before timeout", async () => {
    const promise = withTimeout(Promise.resolve("success"), 1000);
    const result = await promise;
    expect(result).toBe("success");
  });

  it("should reject with timeout error when promise takes too long", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve("slow"), 500));
    const promise = withTimeout(slowPromise, 10);
    jest.advanceTimersByTime(10);
    await expect(promise).rejects.toThrow("Operation timed out");
  });

  it("should use custom timeout message", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve("slow"), 500));
    const promise = withTimeout(slowPromise, 10, "Custom timeout");
    jest.advanceTimersByTime(10);
    await expect(promise).rejects.toThrow("Custom timeout");
  });

  it("should propagate promise rejection", async () => {
    const failingPromise = Promise.reject(new Error("Promise failed"));
    await expect(withTimeout(failingPromise, 1000)).rejects.toThrow("Promise failed");
  });
});
