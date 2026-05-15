// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Tests that the TaskHubGrpcWorker properly handles promise rejections from
 * work item execution methods, preventing unhandled promise rejections that
 * would crash the Node.js process.
 *
 * The _executeOrchestrator, _executeActivity, and _executeEntity wrapper methods
 * create fire-and-forget promises tracked in _pendingWorkItems. Without a .catch()
 * handler, any rejection that escapes the internal try/catch (e.g., missing
 * instanceId validation) becomes an unhandled rejection. In Node.js 22+, unhandled
 * rejections terminate the process by default.
 */

import * as pb from "../src/proto/orchestrator_service_pb";
import * as stubs from "../src/proto/orchestrator_service_grpc_pb";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import { Logger } from "../src/types/logger.type";

const COMPLETION_TOKEN = "test-completion-token";

/**
 * Creates a mock gRPC stub that captures calls but does nothing.
 */
function createMockStub(): stubs.TaskHubSidecarServiceClient {
  return {
    completeOrchestratorTask: (
      _response: pb.OrchestratorResponse,
      _metadata: any,
      callback: (err: any, res: any) => void,
    ) => {
      callback(null, {});
    },
    completeActivityTask: (
      _response: pb.ActivityResponse,
      _metadata: any,
      callback: (err: any, res: any) => void,
    ) => {
      callback(null, {});
    },
    completeEntityTask: (
      _result: pb.EntityBatchResult,
      _metadata: any,
      callback: (err: any, res: any) => void,
    ) => {
      callback(null, {});
    },
  } as unknown as stubs.TaskHubSidecarServiceClient;
}

/**
 * A logger that captures error messages.
 */
class CapturingLogger implements Logger {
  errors: string[] = [];
  error(message: string): void {
    this.errors.push(message);
  }
  warn(_message: string): void {}
  info(_message: string): void {}
  debug(_message: string): void {}
}

describe("Worker Unhandled Promise Rejection Prevention", () => {
  let originalListeners: NodeJS.UnhandledRejectionListener[];

  beforeEach(() => {
    // Save and remove any existing unhandledRejection listeners so we can detect leaks
    originalListeners = process.rawListeners("unhandledRejection") as NodeJS.UnhandledRejectionListener[];
    process.removeAllListeners("unhandledRejection");
  });

  afterEach(() => {
    // Restore original listeners
    process.removeAllListeners("unhandledRejection");
    for (const listener of originalListeners) {
      process.on("unhandledRejection", listener);
    }
  });

  describe("_executeOrchestrator", () => {
    it("should not produce unhandled rejection when orchestrator request has no instanceId", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.OrchestratorRequest();
      // Intentionally NOT setting instanceId

      let unhandledRejection = false;
      const rejectionHandler = () => {
        unhandledRejection = true;
      };
      process.on("unhandledRejection", rejectionHandler);

      // Act - call the wrapper method (fire-and-forget)
      (worker as any)._executeOrchestrator(req, COMPLETION_TOKEN, stub);

      // Wait for the promise to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - no unhandled rejection should occur
      expect(unhandledRejection).toBe(false);

      // The error should have been logged
      expect(logger.errors.length).toBeGreaterThan(0);
      expect(logger.errors.some((msg) => msg.includes("instanceId"))).toBe(true);

      process.removeListener("unhandledRejection", rejectionHandler);
    });

    it("should still track and clean up pending work items on rejection", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.OrchestratorRequest();
      // No instanceId → will reject

      // Act
      (worker as any)._executeOrchestrator(req, COMPLETION_TOKEN, stub);

      // The promise should initially be in _pendingWorkItems
      expect((worker as any)._pendingWorkItems.size).toBe(1);

      // Wait for the promise to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - pending work items should be cleaned up via .finally()
      expect((worker as any)._pendingWorkItems.size).toBe(0);
    });
  });

  describe("_executeActivity", () => {
    it("should not produce unhandled rejection when activity request has no instanceId", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.ActivityRequest();
      req.setName("testActivity");
      // Intentionally NOT setting orchestration instance

      let unhandledRejection = false;
      const rejectionHandler = () => {
        unhandledRejection = true;
      };
      process.on("unhandledRejection", rejectionHandler);

      // Act
      (worker as any)._executeActivity(req, COMPLETION_TOKEN, stub);

      // Wait for the promise to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(unhandledRejection).toBe(false);
      expect(logger.errors.length).toBeGreaterThan(0);

      process.removeListener("unhandledRejection", rejectionHandler);
    });

    it("should still track and clean up pending work items on rejection", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.ActivityRequest();
      req.setName("testActivity");
      // No orchestration instance → will reject

      // Act
      (worker as any)._executeActivity(req, COMPLETION_TOKEN, stub);

      expect((worker as any)._pendingWorkItems.size).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect((worker as any)._pendingWorkItems.size).toBe(0);
    });
  });

  describe("_executeEntity", () => {
    it("should not produce unhandled rejection when entity request has no instanceId", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.EntityBatchRequest();
      // Intentionally NOT setting instanceId

      let unhandledRejection = false;
      const rejectionHandler = () => {
        unhandledRejection = true;
      };
      process.on("unhandledRejection", rejectionHandler);

      // Act
      (worker as any)._executeEntity(req, COMPLETION_TOKEN, stub);

      // Wait for the promise to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(unhandledRejection).toBe(false);
      expect(logger.errors.length).toBeGreaterThan(0);

      process.removeListener("unhandledRejection", rejectionHandler);
    });

    it("should still track and clean up pending work items on rejection", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.EntityBatchRequest();
      // No instanceId → will reject

      // Act
      (worker as any)._executeEntity(req, COMPLETION_TOKEN, stub);

      expect((worker as any)._pendingWorkItems.size).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect((worker as any)._pendingWorkItems.size).toBe(0);
    });
  });
});
