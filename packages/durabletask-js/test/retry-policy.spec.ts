// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { RetryPolicy } from "../src/task/retry/retry-policy";

describe("RetryPolicy", () => {
  describe("constructor validation", () => {
    it("should create a valid retry policy with minimum options", () => {
      // Arrange & Act
      const policy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
      });

      // Assert
      expect(policy.maxNumberOfAttempts).toBe(3);
      expect(policy.firstRetryIntervalInMilliseconds).toBe(1000);
      expect(policy.backoffCoefficient).toBe(1.0);
      expect(policy.maxRetryIntervalInMilliseconds).toBe(3600000); // 1 hour default
      expect(policy.retryTimeoutInMilliseconds).toBe(-1); // infinite default
    });

    it("should create a valid retry policy with all options", () => {
      // Arrange & Act
      const policy = new RetryPolicy({
        maxNumberOfAttempts: 5,
        firstRetryIntervalInMilliseconds: 500,
        backoffCoefficient: 2.0,
        maxRetryIntervalInMilliseconds: 30000,
        retryTimeoutInMilliseconds: 120000,
      });

      // Assert
      expect(policy.maxNumberOfAttempts).toBe(5);
      expect(policy.firstRetryIntervalInMilliseconds).toBe(500);
      expect(policy.backoffCoefficient).toBe(2.0);
      expect(policy.maxRetryIntervalInMilliseconds).toBe(30000);
      expect(policy.retryTimeoutInMilliseconds).toBe(120000);
    });

    it("should throw error when maxNumberOfAttempts is less than 1", () => {
      // Arrange & Act & Assert
      expect(() => {
        new RetryPolicy({
          maxNumberOfAttempts: 0,
          firstRetryIntervalInMilliseconds: 1000,
        });
      }).toThrow("maxNumberOfAttempts must be greater than zero");
    });

    it("should throw error when firstRetryIntervalInMilliseconds is zero", () => {
      // Arrange & Act & Assert
      expect(() => {
        new RetryPolicy({
          maxNumberOfAttempts: 3,
          firstRetryIntervalInMilliseconds: 0,
        });
      }).toThrow("firstRetryIntervalInMilliseconds must be greater than zero");
    });

    it("should throw error when firstRetryIntervalInMilliseconds is negative", () => {
      // Arrange & Act & Assert
      expect(() => {
        new RetryPolicy({
          maxNumberOfAttempts: 3,
          firstRetryIntervalInMilliseconds: -100,
        });
      }).toThrow("firstRetryIntervalInMilliseconds must be greater than zero");
    });

    it("should throw error when backoffCoefficient is less than 1.0", () => {
      // Arrange & Act & Assert
      expect(() => {
        new RetryPolicy({
          maxNumberOfAttempts: 3,
          firstRetryIntervalInMilliseconds: 1000,
          backoffCoefficient: 0.5,
        });
      }).toThrow("backoffCoefficient must be greater than or equal to 1.0");
    });

    it("should throw error when maxRetryIntervalInMilliseconds is less than firstRetryInterval", () => {
      // Arrange & Act & Assert
      expect(() => {
        new RetryPolicy({
          maxNumberOfAttempts: 3,
          firstRetryIntervalInMilliseconds: 1000,
          maxRetryIntervalInMilliseconds: 500,
        });
      }).toThrow("maxRetryIntervalInMilliseconds must be greater than or equal to firstRetryIntervalInMilliseconds");
    });

    it("should throw error when retryTimeoutInMilliseconds is less than firstRetryInterval", () => {
      // Arrange & Act & Assert
      expect(() => {
        new RetryPolicy({
          maxNumberOfAttempts: 3,
          firstRetryIntervalInMilliseconds: 1000,
          retryTimeoutInMilliseconds: 500,
        });
      }).toThrow("retryTimeoutInMilliseconds must be greater than or equal to firstRetryIntervalInMilliseconds");
    });

    it("should accept exactly 1.0 as backoffCoefficient", () => {
      // Arrange & Act
      const policy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
        backoffCoefficient: 1.0,
      });

      // Assert
      expect(policy.backoffCoefficient).toBe(1.0);
    });

    it("should accept exactly 1 as maxNumberOfAttempts", () => {
      // Arrange & Act
      const policy = new RetryPolicy({
        maxNumberOfAttempts: 1,
        firstRetryIntervalInMilliseconds: 1000,
      });

      // Assert
      expect(policy.maxNumberOfAttempts).toBe(1);
    });

    it("should accept -1 as maxRetryIntervalInMilliseconds (infinite)", () => {
      // Arrange & Act
      const policy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
        maxRetryIntervalInMilliseconds: -1,
      });

      // Assert - infinite is valid
      expect(policy.maxRetryIntervalInMilliseconds).toBe(-1);
    });

    it("should accept -1 as retryTimeoutInMilliseconds (infinite)", () => {
      // Arrange & Act
      const policy = new RetryPolicy({
        maxNumberOfAttempts: 3,
        firstRetryIntervalInMilliseconds: 1000,
        retryTimeoutInMilliseconds: -1,
      });

      // Assert - infinite is valid
      expect(policy.retryTimeoutInMilliseconds).toBe(-1);
    });
  });
});
