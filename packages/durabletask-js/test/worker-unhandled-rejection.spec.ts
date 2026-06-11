// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Tests that the TaskHubGrpcWorker properly handles promise rejections from
 * work item execution methods, preventing unhandled promise rejections that
 * would crash the Node.js process.
 *
 * The _executeOrchestrator, _executeActivity, _executeEntity, and _executeEntityV2 wrapper methods
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
const PROMISE_SETTLE_DELAY_MS = 50;

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

function getPendingWorkItems(worker: TaskHubGrpcWorker): Set<Promise<void>> {
  return (worker as any)._pendingWorkItems;
}

async function waitForPromisesToSettle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, PROMISE_SETTLE_DELAY_MS));
}

async function expectNoUnhandledRejection(run: () => void): Promise<void> {
  let unhandledRejection = false;
  const rejectionHandler = () => {
    unhandledRejection = true;
  };

  process.on("unhandledRejection", rejectionHandler);
  try {
    run();
    await waitForPromisesToSettle();
  } finally {
    process.removeListener("unhandledRejection", rejectionHandler);
  }

  expect(unhandledRejection).toBe(false);
}

async function expectTrackedWorkItemsResolve(worker: TaskHubGrpcWorker): Promise<void> {
  const pendingWorkItems = Array.from(getPendingWorkItems(worker));
  expect(pendingWorkItems).toHaveLength(1);

  await expect(Promise.all(pendingWorkItems)).resolves.toHaveLength(1);
  expect(getPendingWorkItems(worker).size).toBe(0);
}

describe("Worker Unhandled Promise Rejection Prevention", () => {
  describe("_executeOrchestrator", () => {
    it("should not produce unhandled rejection when orchestrator request has no instanceId", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.OrchestratorRequest();
      // Intentionally NOT setting instanceId

      // Act - call the wrapper method (fire-and-forget)
      await expectNoUnhandledRejection(() => {
        (worker as any)._executeOrchestrator(req, COMPLETION_TOKEN, stub);
      });

      // The error should have been logged
      expect(logger.errors.length).toBeGreaterThan(0);
      expect(logger.errors.some((msg) => msg.includes("instanceId"))).toBe(true);
      expect(logger.errors.some((msg) => msg.includes("(unknown)"))).toBe(true);
    });

    it("should track a handled promise and clean up pending work items on rejection", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.OrchestratorRequest();
      // No instanceId → will reject

      // Act
      (worker as any)._executeOrchestrator(req, COMPLETION_TOKEN, stub);

      // Assert - pending work items should resolve and be cleaned up via .finally()
      await expectTrackedWorkItemsResolve(worker);
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

      // Act
      await expectNoUnhandledRejection(() => {
        (worker as any)._executeActivity(req, COMPLETION_TOKEN, stub);
      });

      // Assert
      expect(logger.errors.length).toBeGreaterThan(0);
    });

    it("should track a handled promise and clean up pending work items on rejection", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.ActivityRequest();
      req.setName("testActivity");
      // No orchestration instance → will reject

      // Act
      (worker as any)._executeActivity(req, COMPLETION_TOKEN, stub);

      // Assert
      await expectTrackedWorkItemsResolve(worker);
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

      // Act
      await expectNoUnhandledRejection(() => {
        (worker as any)._executeEntity(req, COMPLETION_TOKEN, stub);
      });

      // Assert
      expect(logger.errors.length).toBeGreaterThan(0);
    });

    it("should track a handled promise and clean up pending work items on rejection", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.EntityBatchRequest();
      // No instanceId → will reject

      // Act
      (worker as any)._executeEntity(req, COMPLETION_TOKEN, stub);

      // Assert
      await expectTrackedWorkItemsResolve(worker);
    });
  });

  describe("_executeEntityV2", () => {
    it("should not produce unhandled rejection when entity request has no instanceId", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.EntityRequest();
      // Intentionally NOT setting instanceId

      // Act
      await expectNoUnhandledRejection(() => {
        (worker as any)._executeEntityV2(req, COMPLETION_TOKEN, stub);
      });

      // Assert
      expect(logger.errors.length).toBeGreaterThan(0);
    });

    it("should track a handled promise and clean up pending work items on rejection", async () => {
      // Arrange
      const logger = new CapturingLogger();
      const worker = new TaskHubGrpcWorker({ logger });
      const stub = createMockStub();

      const req = new pb.EntityRequest();
      // No instanceId → will reject

      // Act
      (worker as any)._executeEntityV2(req, COMPLETION_TOKEN, stub);

      // Assert
      await expectTrackedWorkItemsResolve(worker);
    });
  });
});
