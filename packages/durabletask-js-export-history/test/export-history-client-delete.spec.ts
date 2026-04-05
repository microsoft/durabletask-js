// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ExportHistoryJobClient } from "../src/client/export-history-client";
import { ExportHistoryStorageOptions } from "../src/models";
import { ORCHESTRATOR_INSTANCE_ID_PREFIX } from "../src/constants";

/** gRPC status code constants for test readability. */
const GRPC_STATUS = {
  NOT_FOUND: 5,
  UNAVAILABLE: 14,
  UNAUTHENTICATED: 16,
  INTERNAL: 13,
};

/**
 * Creates a mock gRPC error with the specified status code.
 */
function createGrpcError(code: number, message: string): Error & { code: number } {
  const error = new Error(message) as Error & { code: number };
  error.code = code;
  return error;
}

/**
 * Creates a minimal mock of TaskHubGrpcClient for testing the delete() method.
 */
function createMockClient(overrides?: {
  scheduleNewOrchestration?: jest.Mock;
  terminateOrchestration?: jest.Mock;
  waitForOrchestrationCompletion?: jest.Mock;
  purgeOrchestration?: jest.Mock;
}) {
  return {
    scheduleNewOrchestration: overrides?.scheduleNewOrchestration ?? jest.fn().mockResolvedValue("op-instance-123"),
    terminateOrchestration: overrides?.terminateOrchestration ?? jest.fn().mockResolvedValue(undefined),
    waitForOrchestrationCompletion: overrides?.waitForOrchestrationCompletion ?? jest.fn().mockResolvedValue(undefined),
    purgeOrchestration: overrides?.purgeOrchestration ?? jest.fn().mockResolvedValue(undefined),
  } as unknown as ConstructorParameters<typeof ExportHistoryJobClient>[0];
}

const TEST_STORAGE_OPTIONS: ExportHistoryStorageOptions = {
  connectionString: "DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net",
  containerName: "test-container",
};

const TEST_JOB_ID = "test-job-1";

describe("ExportHistoryJobClient.delete()", () => {
  it("should complete successfully when orchestration exists and all cleanup succeeds", async () => {
    const terminateMock = jest.fn().mockResolvedValue(undefined);
    const waitMock = jest.fn().mockResolvedValue(undefined);
    const purgeMock = jest.fn().mockResolvedValue(undefined);

    const client = createMockClient({
      terminateOrchestration: terminateMock,
      waitForOrchestrationCompletion: waitMock,
      purgeOrchestration: purgeMock,
    });

    const jobClient = new ExportHistoryJobClient(client, TEST_JOB_ID, TEST_STORAGE_OPTIONS);
    await expect(jobClient.delete()).resolves.toBeUndefined();

    const expectedOrchId = `${ORCHESTRATOR_INSTANCE_ID_PREFIX}${TEST_JOB_ID}`;
    expect(terminateMock).toHaveBeenCalledWith(expectedOrchId, "Export job deleted");
    expect(waitMock).toHaveBeenCalledWith(expectedOrchId, false, 30);
    expect(purgeMock).toHaveBeenCalledWith(expectedOrchId);
  });

  it("should swallow gRPC NOT_FOUND error from terminateOrchestration", async () => {
    const terminateMock = jest.fn().mockRejectedValue(
      createGrpcError(GRPC_STATUS.NOT_FOUND, "Orchestration not found"),
    );

    const client = createMockClient({ terminateOrchestration: terminateMock });
    const jobClient = new ExportHistoryJobClient(client, TEST_JOB_ID, TEST_STORAGE_OPTIONS);

    await expect(jobClient.delete()).resolves.toBeUndefined();
  });

  it("should swallow gRPC NOT_FOUND error from purgeOrchestration", async () => {
    const purgeMock = jest.fn().mockRejectedValue(
      createGrpcError(GRPC_STATUS.NOT_FOUND, "Instance not found"),
    );

    const client = createMockClient({ purgeOrchestration: purgeMock });
    const jobClient = new ExportHistoryJobClient(client, TEST_JOB_ID, TEST_STORAGE_OPTIONS);

    await expect(jobClient.delete()).resolves.toBeUndefined();
  });

  it("should re-throw gRPC UNAVAILABLE error (network failure)", async () => {
    const terminateMock = jest.fn().mockRejectedValue(
      createGrpcError(GRPC_STATUS.UNAVAILABLE, "Connection refused"),
    );

    const client = createMockClient({ terminateOrchestration: terminateMock });
    const jobClient = new ExportHistoryJobClient(client, TEST_JOB_ID, TEST_STORAGE_OPTIONS);

    await expect(jobClient.delete()).rejects.toThrow("Connection refused");
  });

  it("should re-throw gRPC UNAUTHENTICATED error (auth failure)", async () => {
    const terminateMock = jest.fn().mockRejectedValue(
      createGrpcError(GRPC_STATUS.UNAUTHENTICATED, "Token expired"),
    );

    const client = createMockClient({ terminateOrchestration: terminateMock });
    const jobClient = new ExportHistoryJobClient(client, TEST_JOB_ID, TEST_STORAGE_OPTIONS);

    await expect(jobClient.delete()).rejects.toThrow("Token expired");
  });

  it("should re-throw gRPC INTERNAL error (server failure)", async () => {
    const purgeMock = jest.fn().mockRejectedValue(
      createGrpcError(GRPC_STATUS.INTERNAL, "Internal server error"),
    );

    const client = createMockClient({ purgeOrchestration: purgeMock });
    const jobClient = new ExportHistoryJobClient(client, TEST_JOB_ID, TEST_STORAGE_OPTIONS);

    await expect(jobClient.delete()).rejects.toThrow("Internal server error");
  });

  it("should re-throw timeout errors from waitForOrchestrationCompletion", async () => {
    const waitMock = jest.fn().mockRejectedValue(new Error("Timed out waiting for orchestration"));

    const client = createMockClient({ waitForOrchestrationCompletion: waitMock });
    const jobClient = new ExportHistoryJobClient(client, TEST_JOB_ID, TEST_STORAGE_OPTIONS);

    await expect(jobClient.delete()).rejects.toThrow("Timed out waiting for orchestration");
  });

  it("should re-throw plain errors without a gRPC code property", async () => {
    const terminateMock = jest.fn().mockRejectedValue(new Error("Unexpected error"));

    const client = createMockClient({ terminateOrchestration: terminateMock });
    const jobClient = new ExportHistoryJobClient(client, TEST_JOB_ID, TEST_STORAGE_OPTIONS);

    await expect(jobClient.delete()).rejects.toThrow("Unexpected error");
  });

  it("should still schedule entity deletion before attempting orchestration cleanup", async () => {
    const scheduleMock = jest.fn().mockResolvedValue("op-instance-123");
    const terminateMock = jest.fn().mockRejectedValue(
      createGrpcError(GRPC_STATUS.NOT_FOUND, "Orchestration not found"),
    );

    const client = createMockClient({
      scheduleNewOrchestration: scheduleMock,
      terminateOrchestration: terminateMock,
    });

    const jobClient = new ExportHistoryJobClient(client, TEST_JOB_ID, TEST_STORAGE_OPTIONS);
    await jobClient.delete();

    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });
});
