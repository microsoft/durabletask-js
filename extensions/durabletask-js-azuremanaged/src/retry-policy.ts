// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { status as GrpcStatus } from "@grpc/grpc-js";

/**
 * Default maximum number of retry attempts.
 */
export const DEFAULT_MAX_ATTEMPTS = 10;

/**
 * Default initial backoff in milliseconds.
 */
export const DEFAULT_INITIAL_BACKOFF_MS = 50;

/**
 * Default maximum backoff in milliseconds.
 */
export const DEFAULT_MAX_BACKOFF_MS = 250;

/**
 * Default backoff multiplier for exponential backoff.
 */
export const DEFAULT_BACKOFF_MULTIPLIER = 2;

/**
 * Options used to configure retries when making calls to the Scheduler.
 */
export interface ClientRetryOptions {
  /**
   * The maximum number of times a call should be retried.
   */
  maxRetries?: number;

  /**
   * The initial backoff in milliseconds.
   */
  initialBackoffMs?: number;

  /**
   * The maximum backoff in milliseconds.
   */
  maxBackoffMs?: number;

  /**
   * The backoff multiplier for exponential backoff.
   */
  backoffMultiplier?: number;

  /**
   * The list of gRPC status codes that can be retried.
   * Default is [UNAVAILABLE].
   */
  retryableStatusCodes?: GrpcStatus[];
}

/**
 * Converts a gRPC status code to its string name for use in service config.
 * Ref: https://grpc.io/docs/guides/status-codes/
 */
function statusCodeToName(code: GrpcStatus): string {
  const statusNames: Record<number, string> = {
    [GrpcStatus.OK]: "OK",
    [GrpcStatus.CANCELLED]: "CANCELLED",
    [GrpcStatus.UNKNOWN]: "UNKNOWN",
    [GrpcStatus.INVALID_ARGUMENT]: "INVALID_ARGUMENT",
    [GrpcStatus.DEADLINE_EXCEEDED]: "DEADLINE_EXCEEDED",
    [GrpcStatus.NOT_FOUND]: "NOT_FOUND",
    [GrpcStatus.ALREADY_EXISTS]: "ALREADY_EXISTS",
    [GrpcStatus.PERMISSION_DENIED]: "PERMISSION_DENIED",
    [GrpcStatus.RESOURCE_EXHAUSTED]: "RESOURCE_EXHAUSTED",
    [GrpcStatus.FAILED_PRECONDITION]: "FAILED_PRECONDITION",
    [GrpcStatus.ABORTED]: "ABORTED",
    [GrpcStatus.OUT_OF_RANGE]: "OUT_OF_RANGE",
    [GrpcStatus.UNIMPLEMENTED]: "UNIMPLEMENTED",
    [GrpcStatus.INTERNAL]: "INTERNAL",
    [GrpcStatus.UNAVAILABLE]: "UNAVAILABLE",
    [GrpcStatus.DATA_LOSS]: "DATA_LOSS",
    [GrpcStatus.UNAUTHENTICATED]: "UNAUTHENTICATED",
  };
  return statusNames[code] ?? "UNKNOWN";
}

/**
 * Creates a gRPC service config JSON string with retry policy.
 *
 * @param options Optional retry options. If not provided, uses defaults.
 * @returns A JSON string representing the service config.
 */
export function createServiceConfig(options?: ClientRetryOptions): string {
  const maxAttempts = options?.maxRetries ?? DEFAULT_MAX_ATTEMPTS;
  const initialBackoffMs = options?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;
  const maxBackoffMs = options?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  const backoffMultiplier = options?.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER;

  // Default to UNAVAILABLE status code
  const retryableStatusCodes = options?.retryableStatusCodes ?? [GrpcStatus.UNAVAILABLE];

  // Ensure UNAVAILABLE is always included (as per .NET behavior)
  const statusCodes = new Set(retryableStatusCodes);
  statusCodes.add(GrpcStatus.UNAVAILABLE);

  const retryableStatusNames = Array.from(statusCodes).map(statusCodeToName);

  const serviceConfig = {
    methodConfig: [
      {
        name: [{ service: "" }], // Empty service name applies to all methods
        retryPolicy: {
          maxAttempts: maxAttempts,
          initialBackoff: `${initialBackoffMs / 1000}s`,
          maxBackoff: `${maxBackoffMs / 1000}s`,
          backoffMultiplier: backoffMultiplier,
          retryableStatusCodes: retryableStatusNames,
        },
      },
    ],
  };

  return JSON.stringify(serviceConfig);
}

/**
 * The default service config JSON string with retry policy.
 * Applies retry policy to all gRPC methods with:
 * - Max 10 attempts
 * - Initial backoff: 50ms
 * - Max backoff: 250ms
 * - Backoff multiplier: 2
 * - Retries only on UNAVAILABLE status
 */
export const DEFAULT_SERVICE_CONFIG = createServiceConfig();
