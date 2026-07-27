// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { status as GrpcStatus } from "@grpc/grpc-js";
import {
  createServiceConfig,
  DEFAULT_SERVICE_CONFIG,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_INITIAL_BACKOFF_MS,
  DEFAULT_MAX_BACKOFF_MS,
  DEFAULT_BACKOFF_MULTIPLIER,
  ClientRetryOptions,
} from "../../src/retry-policy";

describe("retry-policy", () => {
  describe("DEFAULT_SERVICE_CONFIG", () => {
    it("should be valid JSON", () => {
      expect(() => JSON.parse(DEFAULT_SERVICE_CONFIG)).not.toThrow();
    });

    it("should contain a retry policy", () => {
      const config = JSON.parse(DEFAULT_SERVICE_CONFIG);
      const retryPolicy = config.methodConfig[0].retryPolicy;
      expect(retryPolicy).toBeDefined();
    });

    it("should use default values", () => {
      const config = JSON.parse(DEFAULT_SERVICE_CONFIG);
      const retryPolicy = config.methodConfig[0].retryPolicy;

      expect(retryPolicy.maxAttempts).toBe(DEFAULT_MAX_ATTEMPTS);
      expect(retryPolicy.initialBackoff).toBe(`${DEFAULT_INITIAL_BACKOFF_MS / 1000}s`);
      expect(retryPolicy.maxBackoff).toBe(`${DEFAULT_MAX_BACKOFF_MS / 1000}s`);
      expect(retryPolicy.backoffMultiplier).toBe(DEFAULT_BACKOFF_MULTIPLIER);
    });

    it("should include UNAVAILABLE status code by default", () => {
      const config = JSON.parse(DEFAULT_SERVICE_CONFIG);
      const retryPolicy = config.methodConfig[0].retryPolicy;
      expect(retryPolicy.retryableStatusCodes).toContain("UNAVAILABLE");
    });

    it("should apply to all gRPC methods via empty service name", () => {
      const config = JSON.parse(DEFAULT_SERVICE_CONFIG);
      expect(config.methodConfig[0].name).toEqual([{ service: "" }]);
    });
  });

  describe("createServiceConfig", () => {
    it("should return the same config as DEFAULT_SERVICE_CONFIG when called without options", () => {
      const config = createServiceConfig();
      expect(config).toBe(DEFAULT_SERVICE_CONFIG);
    });

    it("should return the same config as DEFAULT_SERVICE_CONFIG when called with undefined", () => {
      const config = createServiceConfig(undefined);
      expect(JSON.parse(config)).toEqual(JSON.parse(DEFAULT_SERVICE_CONFIG));
    });

    describe("maxRetries to maxAttempts conversion", () => {
      it("should convert maxRetries to maxAttempts by adding 1 (retries + initial attempt)", () => {
        const config = JSON.parse(createServiceConfig({ maxRetries: 3 }));
        // maxRetries: 3 means 3 retries + 1 initial = 4 total attempts
        expect(config.methodConfig[0].retryPolicy.maxAttempts).toBe(4);
      });

      it("should produce maxAttempts: 1 when maxRetries is 0 (no retries, just the initial call)", () => {
        const config = JSON.parse(createServiceConfig({ maxRetries: 0 }));
        // maxRetries: 0 means 0 retries + 1 initial = 1 total attempt
        expect(config.methodConfig[0].retryPolicy.maxAttempts).toBe(1);
      });

      it("should produce maxAttempts: 2 when maxRetries is 1", () => {
        const config = JSON.parse(createServiceConfig({ maxRetries: 1 }));
        expect(config.methodConfig[0].retryPolicy.maxAttempts).toBe(2);
      });

      it("should use DEFAULT_MAX_ATTEMPTS when maxRetries is not specified", () => {
        const config = JSON.parse(createServiceConfig({}));
        expect(config.methodConfig[0].retryPolicy.maxAttempts).toBe(DEFAULT_MAX_ATTEMPTS);
      });
    });

    describe("backoff configuration", () => {
      it("should convert initialBackoffMs to seconds string", () => {
        const config = JSON.parse(createServiceConfig({ initialBackoffMs: 100 }));
        expect(config.methodConfig[0].retryPolicy.initialBackoff).toBe("0.1s");
      });

      it("should convert maxBackoffMs to seconds string", () => {
        const config = JSON.parse(createServiceConfig({ maxBackoffMs: 5000 }));
        expect(config.methodConfig[0].retryPolicy.maxBackoff).toBe("5s");
      });

      it("should apply the specified backoff multiplier", () => {
        const config = JSON.parse(createServiceConfig({ backoffMultiplier: 3 }));
        expect(config.methodConfig[0].retryPolicy.backoffMultiplier).toBe(3);
      });
    });

    describe("retryable status codes", () => {
      it("should always include UNAVAILABLE even when custom codes are specified", () => {
        const config = JSON.parse(
          createServiceConfig({
            retryableStatusCodes: [GrpcStatus.INTERNAL],
          }),
        );
        const statusCodes = config.methodConfig[0].retryPolicy.retryableStatusCodes;
        expect(statusCodes).toContain("UNAVAILABLE");
        expect(statusCodes).toContain("INTERNAL");
      });

      it("should not duplicate UNAVAILABLE when already in custom codes", () => {
        const config = JSON.parse(
          createServiceConfig({
            retryableStatusCodes: [GrpcStatus.UNAVAILABLE, GrpcStatus.INTERNAL],
          }),
        );
        const statusCodes: string[] = config.methodConfig[0].retryPolicy.retryableStatusCodes;
        const unavailableCount = statusCodes.filter((c) => c === "UNAVAILABLE").length;
        expect(unavailableCount).toBe(1);
      });

      it("should map all standard gRPC status codes correctly", () => {
        const allCodes = [
          { code: GrpcStatus.OK, name: "OK" },
          { code: GrpcStatus.CANCELLED, name: "CANCELLED" },
          { code: GrpcStatus.UNKNOWN, name: "UNKNOWN" },
          { code: GrpcStatus.INVALID_ARGUMENT, name: "INVALID_ARGUMENT" },
          { code: GrpcStatus.DEADLINE_EXCEEDED, name: "DEADLINE_EXCEEDED" },
          { code: GrpcStatus.NOT_FOUND, name: "NOT_FOUND" },
          { code: GrpcStatus.ALREADY_EXISTS, name: "ALREADY_EXISTS" },
          { code: GrpcStatus.PERMISSION_DENIED, name: "PERMISSION_DENIED" },
          { code: GrpcStatus.RESOURCE_EXHAUSTED, name: "RESOURCE_EXHAUSTED" },
          { code: GrpcStatus.FAILED_PRECONDITION, name: "FAILED_PRECONDITION" },
          { code: GrpcStatus.ABORTED, name: "ABORTED" },
          { code: GrpcStatus.OUT_OF_RANGE, name: "OUT_OF_RANGE" },
          { code: GrpcStatus.UNIMPLEMENTED, name: "UNIMPLEMENTED" },
          { code: GrpcStatus.INTERNAL, name: "INTERNAL" },
          { code: GrpcStatus.UNAVAILABLE, name: "UNAVAILABLE" },
          { code: GrpcStatus.DATA_LOSS, name: "DATA_LOSS" },
          { code: GrpcStatus.UNAUTHENTICATED, name: "UNAUTHENTICATED" },
        ];

        for (const { code, name } of allCodes) {
          const config = JSON.parse(
            createServiceConfig({ retryableStatusCodes: [code] }),
          );
          const statusCodes: string[] = config.methodConfig[0].retryPolicy.retryableStatusCodes;
          expect(statusCodes).toContain(name);
        }
      });

      it("should fall back to 'UNKNOWN' for unrecognized status codes", () => {
        const config = JSON.parse(
          createServiceConfig({ retryableStatusCodes: [999 as GrpcStatus] }),
        );
        const statusCodes: string[] = config.methodConfig[0].retryPolicy.retryableStatusCodes;
        expect(statusCodes).toContain("UNKNOWN");
      });
    });

    describe("full custom configuration", () => {
      it("should apply all custom options together", () => {
        const options: ClientRetryOptions = {
          maxRetries: 5,
          initialBackoffMs: 200,
          maxBackoffMs: 2000,
          backoffMultiplier: 1.5,
          retryableStatusCodes: [GrpcStatus.UNAVAILABLE, GrpcStatus.DEADLINE_EXCEEDED],
        };

        const config = JSON.parse(createServiceConfig(options));
        const retryPolicy = config.methodConfig[0].retryPolicy;

        expect(retryPolicy.maxAttempts).toBe(6); // 5 retries + 1 initial
        expect(retryPolicy.initialBackoff).toBe("0.2s");
        expect(retryPolicy.maxBackoff).toBe("2s");
        expect(retryPolicy.backoffMultiplier).toBe(1.5);
        expect(retryPolicy.retryableStatusCodes).toContain("UNAVAILABLE");
        expect(retryPolicy.retryableStatusCodes).toContain("DEADLINE_EXCEEDED");
      });
    });
  });
});
