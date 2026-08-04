// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
  OrchestrationStatus,
  OrchestrationContext,
  TOrchestrator,
  TaskEntity,
  EntityInstanceId,
} from "../src";
import * as pb from "../src/proto/orchestrator_service_pb";
import * as pbh from "../src/utils/pb-helper.util";
import { buildRewindResult } from "../src/worker/rewind";

class CounterEntity extends TaskEntity<{ count: number }> {
  add(amount: number): number {
    this.state.count += amount;
    return this.state.count;
  }

  get(): number {
    return this.state.count;
  }

  boom(): void {
    throw new Error("Intentional entity failure");
  }

  relay(amount: number): void {
    this.context?.signalEntity(new EntityInstanceId("relaytarget", "k"), "add", amount);
  }

  protected initializeState(): { count: number } {
    return { count: 0 };
  }
}

class RelayTargetEntity extends TaskEntity<{ count: number }> {
  add(amount: number): number {
    this.state.count += amount;
    return this.state.count;
  }

  protected initializeState(): { count: number } {
    return { count: 0 };
  }
}

/** Waits until `predicate` holds or the timeout elapses. Returns whether it held. */
async function waitFor(predicate: () => boolean, timeoutMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return predicate();
}

describe("In-Memory Backend - Entities", () => {
  let backend: InMemoryOrchestrationBackend;
  let client: TestOrchestrationClient;
  let worker: TestOrchestrationWorker;

  const counterId = new EntityInstanceId("counter", "mykey");
  const otherCounterId = new EntityInstanceId("counter", "other");

  beforeEach(() => {
    backend = new InMemoryOrchestrationBackend();
    client = new TestOrchestrationClient(backend);
    worker = new TestOrchestrationWorker(backend);
  });

  afterEach(async () => {
    try {
      await worker.stop();
    } catch {
      // Ignore if not running
    }
    backend.reset();
  });

  it("should deliver a signal from an orchestration to the entity", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext): Promise<any> => {
      ctx.entities.signalEntity(counterId, "add", 5);
      return "signaled";
    };

    worker.addOrchestrator(orchestrator);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 10);
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);

    // The signal is fire-and-forget, so it lands after the orchestration completes.
    const delivered = await waitFor(() => backend.getEntity(counterId.toString())?.serializedState !== undefined);
    expect(delivered).toBe(true);

    const entity = await client.getEntity<{ count: number }>(counterId);
    expect(entity?.state?.count).toEqual(5);
  });

  it("should batch multiple signals to the same entity", async () => {
    const orchestrator: TOrchestrator = async (ctx: OrchestrationContext): Promise<any> => {
      ctx.entities.signalEntity(counterId, "add", 1);
      ctx.entities.signalEntity(counterId, "add", 2);
      ctx.entities.signalEntity(counterId, "add", 3);
      return "done";
    };

    worker.addOrchestrator(orchestrator);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    await client.waitForOrchestrationCompletion(id, true, 10);

    const settled = await waitFor(() => {
      const entity = backend.getEntity(counterId.toString());
      return entity?.serializedState !== undefined && JSON.parse(entity.serializedState).count === 6;
    });
    expect(settled).toBe(true);
  });

  it("should return the result of callEntity to the calling orchestration", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.entities.callEntity<number>(counterId, "add", 7);
      const total = yield ctx.entities.callEntity<number>(counterId, "add", 3);
      return total;
    };

    worker.addOrchestrator(orchestrator);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 30);

    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(10));
  });

  it("should persist entity state across separate callEntity batches", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.entities.callEntity<number>(counterId, "add", 4);
      return yield ctx.entities.callEntity<number>(counterId, "get");
    };

    worker.addOrchestrator(orchestrator);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 30);

    expect(state?.serializedOutput).toEqual(JSON.stringify(4));
  });

  it("should surface an entity operation failure to the calling orchestration", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      try {
        yield ctx.entities.callEntity(counterId, "boom");
        return "no-error";
      } catch (e) {
        return `caught:${(e as Error).message}`;
      }
    };

    worker.addOrchestrator(orchestrator);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 30);

    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toContain("caught:");
    expect(state?.serializedOutput).not.toContain("no-error");
  });

  it("should fail a call to an unregistered entity instead of hanging", async () => {
    const unknownId = new EntityInstanceId("notregistered", "k");

    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      try {
        yield ctx.entities.callEntity(unknownId, "add", 1);
        return "no-error";
      } catch (e) {
        return `caught:${(e as Error).message}`;
      }
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 30);

    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toContain("caught:");
  });

  it("should preserve entity state when the entity factory fails", async () => {
    let failFactory = false;
    const orchestrator: TOrchestrator = async function* (
      ctx: OrchestrationContext,
      input: { operation: string; amount?: number },
    ): any {
      try {
        return yield ctx.entities.callEntity<number>(counterId, input.operation, input.amount);
      } catch (e) {
        return `caught:${(e as Error).message}`;
      }
    };

    worker.addOrchestrator(orchestrator);
    worker.addNamedEntity("counter", () => {
      if (failFactory) {
        throw new Error("Intentional entity factory failure");
      }
      return new CounterEntity();
    });
    await worker.start();

    const seedId = await client.scheduleNewOrchestration(orchestrator, { operation: "add", amount: 4 });
    const seedState = await client.waitForOrchestrationCompletion(seedId, true, 10);
    expect(seedState?.serializedOutput).toEqual(JSON.stringify(4));

    failFactory = true;
    const failureId = await client.scheduleNewOrchestration(orchestrator, { operation: "get" });
    const failureState = await client.waitForOrchestrationCompletion(failureId, true, 10);
    expect(failureState?.serializedOutput).toContain("Intentional entity factory failure");
    expect((await client.getEntity<{ count: number }>(counterId))?.state?.count).toEqual(4);

    failFactory = false;
    const readId = await client.scheduleNewOrchestration(orchestrator, { operation: "get" });
    const readState = await client.waitForOrchestrationCompletion(readId, true, 10);
    expect(readState?.serializedOutput).toEqual(JSON.stringify(4));
  });

  it("should not deliver a stale entity result to a recreated orchestration", async () => {
    let markOperationStarted!: () => void;
    let releaseOperation!: () => void;
    const operationStarted = new Promise<void>((resolve) => {
      markOperationStarted = resolve;
    });
    const operationReleased = new Promise<void>((resolve) => {
      releaseOperation = resolve;
    });

    class BlockingCounterEntity extends CounterEntity {
      async block(): Promise<number> {
        markOperationStarted();
        await operationReleased;
        return 42;
      }
    }

    const staleCaller: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      return yield ctx.entities.callEntity<number>(counterId, "block");
    };
    const recreatedCaller: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.waitForExternalEvent("finish");
      return "done";
    };
    const reusedInstanceId = "recreated-entity-caller";
    const secondWorker = new TestOrchestrationWorker(backend);

    for (const testWorker of [worker, secondWorker]) {
      testWorker.addOrchestrator(staleCaller);
      testWorker.addOrchestrator(recreatedCaller);
      testWorker.addNamedEntity("counter", () => new BlockingCounterEntity());
    }
    await worker.start();

    try {
      await client.scheduleNewOrchestration(staleCaller, undefined, reusedInstanceId);
      await operationStarted;

      const dispatchedCall = backend
        .getEntity(counterId.toString())!
        .dispatchedOperations[0].getEntityoperationcalled()!;
      const staleRequestId = dispatchedCall.getRequestid();
      const staleExecutionId = dispatchedCall.getParentexecutionid()!.getValue();

      await secondWorker.start();
      await client.terminateOrchestration(reusedInstanceId);
      await client.waitForOrchestrationCompletion(reusedInstanceId, false, 10);
      expect((await client.purgeOrchestration(reusedInstanceId)).deletedInstanceCount).toEqual(1);

      await client.scheduleNewOrchestration(recreatedCaller, undefined, reusedInstanceId);
      await client.waitForOrchestrationStart(reusedInstanceId, false, 10);
      expect(backend.getInstance(reusedInstanceId)?.executionId).not.toEqual(staleExecutionId);

      releaseOperation();
      const batchCompleted = await waitFor(
        () => backend.getEntity(counterId.toString())?.dispatchedOperations.length === 0,
      );
      expect(batchCompleted).toBe(true);

      const recreatedInstance = backend.getInstance(reusedInstanceId)!;
      const staleResultDelivered = [...recreatedInstance.history, ...recreatedInstance.pendingEvents].some(
        (event) =>
          event.getEntityoperationcompleted()?.getRequestid() === staleRequestId ||
          event.getEntityoperationfailed()?.getRequestid() === staleRequestId,
      );
      expect(staleResultDelivered).toBe(false);

      await client.raiseOrchestrationEvent(reusedInstanceId, "finish");
      const recreatedState = await client.waitForOrchestrationCompletion(reusedInstanceId, true, 10);
      expect(recreatedState?.serializedOutput).toEqual(JSON.stringify("done"));
    } finally {
      releaseOperation();
      await secondWorker.stop();
    }
  });

  it("should grant and release entity locks", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(counterId);
      const value = yield ctx.entities.callEntity<number>(counterId, "add", 2);
      lock.release();
      return value;
    };

    worker.addOrchestrator(orchestrator);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, true, 30);

    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(state?.serializedOutput).toEqual(JSON.stringify(2));

    const released = await waitFor(() => backend.getEntity(counterId.toString())?.lockedBy === undefined);
    expect(released).toBe(true);
  });

  it("should process already queued operations before granting an entity lock", async () => {
    const lockHolder: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(counterId);
      const value = yield ctx.entities.callEntity<number>(counterId, "get");
      lock.release();
      return value;
    };

    worker.addOrchestrator(lockHolder);
    worker.addNamedEntity("counter", () => new CounterEntity());

    await client.signalEntity(counterId, "add", 3);
    const holderId = await client.scheduleNewOrchestration(lockHolder);
    await worker.start();

    const holderState = await client.waitForOrchestrationCompletion(holderId, true, 10);

    expect(holderState?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(holderState?.serializedOutput).toEqual(JSON.stringify(3));
  });

  it("should defer client signals until an entity lock is released", async () => {
    const lockHolder: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(counterId);
      yield ctx.waitForExternalEvent("release");
      lock.release();
    };

    worker.addOrchestrator(lockHolder);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const holderId = await client.scheduleNewOrchestration(lockHolder);
    const locked = await waitFor(() => backend.getEntity(counterId.toString())?.lockedBy !== undefined);
    expect(locked).toBe(true);

    await client.signalEntity(counterId, "add", 5);
    await client.signalEntity(otherCounterId, "add", 1);

    const otherProcessed = await waitFor(
      () => backend.getEntity(otherCounterId.toString())?.serializedState !== undefined,
    );
    expect(otherProcessed).toBe(true);
    expect(backend.getEntity(counterId.toString())?.serializedState).toBeUndefined();
    expect(backend.getEntity(counterId.toString())?.pendingOperations).toHaveLength(1);

    await client.raiseOrchestrationEvent(holderId, "release");
    await client.waitForOrchestrationCompletion(holderId, true, 10);

    const processedAfterRelease = await waitFor(
      () => backend.getEntity(counterId.toString())?.serializedState !== undefined,
    );
    expect(processedAfterRelease).toBe(true);
    expect((await client.getEntity<{ count: number }>(counterId))?.state?.count).toEqual(5);
  });

  it("should defer calls from other orchestrations until an entity lock is released", async () => {
    const lockHolder: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(counterId);
      yield ctx.waitForExternalEvent("release");
      lock.release();
    };
    const caller: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      return yield ctx.entities.callEntity<number>(counterId, "add", 7);
    };

    worker.addOrchestrator(lockHolder);
    worker.addOrchestrator(caller);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const holderId = await client.scheduleNewOrchestration(lockHolder);
    const locked = await waitFor(() => backend.getEntity(counterId.toString())?.lockedBy !== undefined);
    expect(locked).toBe(true);

    const callerId = await client.scheduleNewOrchestration(caller);
    await client.signalEntity(otherCounterId, "add", 1);

    const otherProcessed = await waitFor(
      () => backend.getEntity(otherCounterId.toString())?.serializedState !== undefined,
    );
    expect(otherProcessed).toBe(true);
    expect(backend.getInstance(callerId)?.output).toBeUndefined();
    expect(backend.getEntity(counterId.toString())?.serializedState).toBeUndefined();
    expect(backend.getEntity(counterId.toString())?.pendingOperations).toHaveLength(1);

    await client.raiseOrchestrationEvent(holderId, "release");
    await client.waitForOrchestrationCompletion(holderId, true, 10);
    const callerState = await client.waitForOrchestrationCompletion(callerId, true, 10);

    expect(callerState?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(callerState?.serializedOutput).toEqual(JSON.stringify(7));
  });

  it("should discard stale pending lock requests when their orchestration is purged", async () => {
    const holder: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(counterId);
      yield ctx.waitForExternalEvent("release");
      lock.release();
    };
    const waiter: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.entities.lockEntities(counterId);
      return "acquired";
    };

    worker.addOrchestrator(holder);
    worker.addOrchestrator(waiter);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const holderId = await client.scheduleNewOrchestration(holder);
    const holderLocked = await waitFor(() => backend.getEntity(counterId.toString())?.lockedBy !== undefined);
    expect(holderLocked).toBe(true);

    const waiterId = await client.scheduleNewOrchestration(waiter);
    await client.waitForOrchestrationStart(waiterId, false, 10);
    await client.terminateOrchestration(waiterId);
    await client.waitForOrchestrationCompletion(waiterId, false, 10);
    expect((await client.purgeOrchestration(waiterId)).deletedInstanceCount).toEqual(1);

    await client.raiseOrchestrationEvent(holderId, "release");
    await client.waitForOrchestrationCompletion(holderId, false, 10);

    await client.signalEntity(counterId, "add", 5);
    await client.signalEntity(otherCounterId, "add", 1);
    const otherProcessed = await waitFor(
      () => backend.getEntity(otherCounterId.toString())?.serializedState !== undefined,
    );
    expect(otherProcessed).toBe(true);

    expect(backend.getEntity(counterId.toString())?.lockedBy).toBeUndefined();
    expect((await client.getEntity<{ count: number }>(counterId))?.state?.count).toEqual(5);
  });

  it("should release entity locks when their orchestration terminates", async () => {
    const holder: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.entities.lockEntities(counterId);
      yield ctx.waitForExternalEvent("never");
    };

    worker.addOrchestrator(holder);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const holderId = await client.scheduleNewOrchestration(holder);
    const locked = await waitFor(() => backend.getEntity(counterId.toString())?.lockedBy !== undefined);
    expect(locked).toBe(true);

    await client.terminateOrchestration(holderId);
    await client.waitForOrchestrationCompletion(holderId, false, 10);

    await client.signalEntity(counterId, "add", 5);
    await client.signalEntity(otherCounterId, "add", 1);
    const otherProcessed = await waitFor(
      () => backend.getEntity(otherCounterId.toString())?.serializedState !== undefined,
    );
    expect(otherProcessed).toBe(true);

    expect(backend.getEntity(counterId.toString())?.lockedBy).toBeUndefined();
    expect((await client.getEntity<{ count: number }>(counterId))?.state?.count).toEqual(5);
  });

  it("should match a lock owner by execution ID when an instance ID is reused", async () => {
    const holder: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.entities.lockEntities(counterId);
      yield ctx.waitForExternalEvent("never");
    };
    const caller: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      return yield ctx.entities.callEntity<number>(counterId, "add", 7);
    };
    const reusedInstanceId = "reused-owner";

    worker.addOrchestrator(holder);
    worker.addOrchestrator(caller);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    await client.scheduleNewOrchestration(holder, undefined, reusedInstanceId);
    const locked = await waitFor(() => backend.getEntity(counterId.toString())?.lockedBy !== undefined);
    expect(locked).toBe(true);
    const oldExecutionId = backend.getInstance(reusedInstanceId)!.executionId;

    await client.terminateOrchestration(reusedInstanceId);
    await client.waitForOrchestrationCompletion(reusedInstanceId, false, 10);
    expect((await client.purgeOrchestration(reusedInstanceId)).deletedInstanceCount).toEqual(1);

    Object.assign(backend.getEntity(counterId.toString())!, {
      lockedBy: reusedInstanceId,
      lockOwnerExecutionId: oldExecutionId,
      lockCriticalSectionId: "stale-lock",
    });

    const callerId = await client.scheduleNewOrchestration(caller, undefined, reusedInstanceId);
    await client.signalEntity(otherCounterId, "add", 1);
    const otherProcessed = await waitFor(
      () => backend.getEntity(otherCounterId.toString())?.serializedState !== undefined,
    );
    expect(otherProcessed).toBe(true);

    expect(backend.getInstance(callerId)?.executionId).not.toEqual(oldExecutionId);
    expect(backend.getInstance(callerId)?.output).toBeUndefined();
    expect(backend.getEntity(counterId.toString())?.serializedState).toBeUndefined();
  });

  it("should grant overlapping lock requests in request order", async () => {
    const entityA = new EntityInstanceId("counter", "a");
    const entityB = new EntityInstanceId("counter", "b");

    const blocker: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(entityB);
      yield ctx.waitForExternalEvent("release");
      lock.release();
    };
    const firstWaiter: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(entityA, entityB);
      yield ctx.waitForExternalEvent("release");
      lock.release();
    };
    const secondWaiter: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(entityA);
      yield ctx.waitForExternalEvent("release");
      lock.release();
    };

    worker.addOrchestrator(blocker);
    worker.addOrchestrator(firstWaiter);
    worker.addOrchestrator(secondWaiter);
    await worker.start();

    const blockerId = await client.scheduleNewOrchestration(blocker);
    const entityBLocked = await waitFor(() => backend.getEntity(entityB.toString())?.lockedBy === blockerId);
    expect(entityBLocked).toBe(true);

    const firstId = await client.scheduleNewOrchestration(firstWaiter);
    await client.waitForOrchestrationStart(firstId, false, 10);
    const secondId = await client.scheduleNewOrchestration(secondWaiter);
    await client.waitForOrchestrationStart(secondId, false, 10);

    expect(backend.getEntity(entityA.toString())?.lockedBy).toBeUndefined();

    await client.raiseOrchestrationEvent(blockerId, "release");
    await client.waitForOrchestrationCompletion(blockerId, false, 10);
    const firstGranted = await waitFor(
      () =>
        backend.getEntity(entityA.toString())?.lockedBy === firstId &&
        backend.getEntity(entityB.toString())?.lockedBy === firstId,
    );
    expect(firstGranted).toBe(true);

    await client.raiseOrchestrationEvent(firstId, "release");
    await client.waitForOrchestrationCompletion(firstId, false, 10);
    const secondGranted = await waitFor(
      () => backend.getEntity(entityA.toString())?.lockedBy === secondId,
    );
    expect(secondGranted).toBe(true);

    await client.raiseOrchestrationEvent(secondId, "release");
    await client.waitForOrchestrationCompletion(secondId, false, 10);
  });

  it("should finish an old owner batch before granting a waiting lock", async () => {
    let markOperationStarted!: () => void;
    let releaseOperation!: () => void;
    const operationStarted = new Promise<void>((resolve) => {
      markOperationStarted = resolve;
    });
    const operationReleased = new Promise<void>((resolve) => {
      releaseOperation = resolve;
    });

    class BlockingCounterEntity extends CounterEntity {
      async block(): Promise<void> {
        markOperationStarted();
        await operationReleased;
      }
    }

    const holder: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(counterId);
      yield ctx.waitForExternalEvent("start");
      yield ctx.entities.callEntity(counterId, "block");
      lock.release();
    };
    const waiter: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(counterId);
      yield ctx.waitForExternalEvent("release");
      lock.release();
    };
    const secondWorker = new TestOrchestrationWorker(backend);

    for (const testWorker of [worker, secondWorker]) {
      testWorker.addOrchestrator(holder);
      testWorker.addOrchestrator(waiter);
      testWorker.addNamedEntity("counter", () => new BlockingCounterEntity());
      await testWorker.start();
    }

    try {
      const holderId = await client.scheduleNewOrchestration(holder);
      const holderLocked = await waitFor(
        () => backend.getEntity(counterId.toString())?.lockedBy === holderId,
      );
      expect(holderLocked).toBe(true);

      const waiterId = await client.scheduleNewOrchestration(waiter);
      await client.waitForOrchestrationStart(waiterId, false, 10);

      await client.raiseOrchestrationEvent(holderId, "start");
      await operationStarted;
      await client.terminateOrchestration(holderId);
      await client.waitForOrchestrationCompletion(holderId, false, 10);

      expect(backend.getEntity(counterId.toString())?.lockedBy).toBeUndefined();

      releaseOperation();
      const waiterGranted = await waitFor(
        () => backend.getEntity(counterId.toString())?.lockedBy === waiterId,
      );
      expect(waiterGranted).toBe(true);

      await client.raiseOrchestrationEvent(waiterId, "release");
      await client.waitForOrchestrationCompletion(waiterId, false, 10);
    } finally {
      releaseOperation();
      await secondWorker.stop();
    }
  });

  it("should synchronize the execution ID before acquiring entity locks after rewind", async () => {
    let shouldFail = true;
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      if (shouldFail) {
        throw new Error("Fail before acquiring the lock");
      }

      const lock = yield ctx.entities.lockEntities(counterId);
      const value = yield ctx.entities.callEntity<number>(counterId, "add", 2);
      lock.release();
      return value;
    };

    worker.addOrchestrator(orchestrator);
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    const instanceId = await client.scheduleNewOrchestration(orchestrator);
    const failedState = await client.waitForOrchestrationCompletion(instanceId, false, 10);
    expect(failedState?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);
    const oldExecutionId = backend.getInstance(instanceId)!.executionId;

    shouldFail = false;
    await client.rewindOrchestration(instanceId);
    const historyRewritten = await waitFor(() => {
      const executionId = backend
        .getInstance(instanceId)
        ?.history.find((event) => event.hasExecutionstarted())
        ?.getExecutionstarted()
        ?.getOrchestrationinstance()
        ?.getExecutionid()
        ?.getValue();
      return executionId !== undefined && executionId !== oldExecutionId;
    });
    expect(historyRewritten).toBe(true);

    const instance = backend.getInstance(instanceId)!;
    const historyExecutionId = instance.history
      .find((event) => event.hasExecutionstarted())!
      .getExecutionstarted()!
      .getOrchestrationinstance()!
      .getExecutionid()!
      .getValue();
    expect(instance.executionId).toEqual(historyExecutionId);

    const completedState = await client.waitForOrchestrationCompletion(instanceId, true, 10);
    expect(completedState?.runtimeStatus).toEqual(OrchestrationStatus.COMPLETED);
    expect(completedState?.serializedOutput).toEqual(JSON.stringify(2));
  });

  it("should reject rewinding an orchestration with an unreleased entity lock", async () => {
    const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.entities.lockEntities(counterId);
      throw new Error("Fail while holding the lock");
    };

    worker.addOrchestrator(orchestrator);
    await worker.start();

    const instanceId = await client.scheduleNewOrchestration(orchestrator);
    const failedState = await client.waitForOrchestrationCompletion(instanceId, false, 10);
    expect(failedState?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);

    await expect(client.rewindOrchestration(instanceId)).rejects.toThrow(
      "Cannot rewind an orchestration with an unreleased entity lock",
    );
  });

  it("should reject rewinding a parent whose failed child has an unreleased entity lock", async () => {
    const child: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.entities.lockEntities(counterId);
      throw new Error("Child failed while holding the lock");
    };
    const parent: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      return yield ctx.callSubOrchestrator(child);
    };

    worker.addOrchestrator(parent);
    worker.addOrchestrator(child);
    await worker.start();

    const parentId = await client.scheduleNewOrchestration(parent);
    const failedState = await client.waitForOrchestrationCompletion(parentId, false, 10);
    expect(failedState?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);

    await expect(client.rewindOrchestration(parentId)).rejects.toThrow(
      "Cannot rewind an orchestration with an unreleased entity lock",
    );
  });

  it("should not rewind a child that fails after recursive rewind validation", async () => {
    const child: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      yield ctx.entities.lockEntities(counterId);
      yield ctx.waitForExternalEvent("never");
    };
    const parent: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      ctx.callSubOrchestrator(child);
      yield ctx.waitForExternalEvent("fail");
      throw new Error("Parent failed while child was running");
    };

    worker.addOrchestrator(parent);
    worker.addOrchestrator(child);
    await worker.start();

    const parentId = await client.scheduleNewOrchestration(parent);
    const childCreated = await waitFor(() =>
      backend.getInstance(parentId)!.history.some((event) => event.hasSuborchestrationinstancecreated()),
    );
    expect(childCreated).toBe(true);
    const childId = backend
      .getInstance(parentId)!
      .history.find((event) => event.hasSuborchestrationinstancecreated())!
      .getSuborchestrationinstancecreated()!
      .getInstanceid();
    const childLocked = await waitFor(() => backend.getEntity(counterId.toString())?.lockedBy === childId);
    expect(childLocked).toBe(true);

    await client.raiseOrchestrationEvent(parentId, "fail");
    const parentState = await client.waitForOrchestrationCompletion(parentId, false, 10);
    expect(parentState?.runtimeStatus).toEqual(OrchestrationStatus.FAILED);
    expect(backend.getInstance(childId)?.status).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_RUNNING,
    );
    await worker.stop();

    backend.rewindInstance(parentId);
    const parentWorkItem = backend.getNextOrchestrationWorkItem()!;
    const rewindResult = buildRewindResult(parentWorkItem.history, parentWorkItem.pendingEvents);

    const childInstance = backend.getInstance(childId)!;
    const failAction = pbh.newCompleteOrchestrationAction(
      -1,
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
      undefined,
      pbh.newFailureDetails(new Error("Child failed after validation")),
    );
    backend.completeOrchestration(childId, childInstance.completionToken, [failAction]);
    backend.completeOrchestration(
      parentId,
      parentWorkItem.completionToken,
      rewindResult.actions,
      rewindResult.customStatus,
    );

    expect(backend.getInstance(childId)?.status).toEqual(
      pb.OrchestrationStatus.ORCHESTRATION_STATUS_FAILED,
    );
  });

  it("should wait for an in-flight entity batch before granting its lock", async () => {
    let markOperationStarted!: () => void;
    let releaseOperation!: () => void;
    const operationStarted = new Promise<void>((resolve) => {
      markOperationStarted = resolve;
    });
    const operationReleased = new Promise<void>((resolve) => {
      releaseOperation = resolve;
    });

    class BlockingCounterEntity extends CounterEntity {
      async block(): Promise<void> {
        markOperationStarted();
        await operationReleased;
      }
    }

    const holder: TOrchestrator = async function* (ctx: OrchestrationContext): any {
      const lock = yield ctx.entities.lockEntities(counterId);
      const value = yield ctx.entities.callEntity<number>(counterId, "get");
      yield ctx.waitForExternalEvent("release");
      lock.release();
      return value;
    };
    const secondWorker = new TestOrchestrationWorker(backend);

    for (const testWorker of [worker, secondWorker]) {
      testWorker.addOrchestrator(holder);
      testWorker.addNamedEntity("counter", () => new BlockingCounterEntity());
      await testWorker.start();
    }

    try {
      await client.signalEntity(counterId, "block");
      await operationStarted;

      const holderId = await client.scheduleNewOrchestration(holder);
      await client.waitForOrchestrationStart(holderId, false, 10);

      expect(backend.getEntity(counterId.toString())?.lockedBy).toBeUndefined();

      await client.signalEntity(counterId, "add", 5);
      releaseOperation();
      const lockGranted = await waitFor(() => backend.getEntity(counterId.toString())?.lockedBy !== undefined);
      expect(lockGranted).toBe(true);

      await client.raiseOrchestrationEvent(holderId, "release");
      const holderState = await client.waitForOrchestrationCompletion(holderId, true, 10);
      expect(holderState?.serializedOutput).toEqual(JSON.stringify(0));

      const signalProcessed = await waitFor(() => {
        const serializedState = backend.getEntity(counterId.toString())?.serializedState;
        return serializedState !== undefined && JSON.parse(serializedState).count === 5;
      });
      expect(signalProcessed).toBe(true);
    } finally {
      releaseOperation();
      await secondWorker.stop();
    }
  });

  it("should deliver a client-initiated signal to the entity", async () => {
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    await client.signalEntity(counterId, "add", 11);

    const delivered = await waitFor(() => {
      const entity = backend.getEntity(counterId.toString());
      return entity?.serializedState !== undefined && JSON.parse(entity.serializedState).count === 11;
    });
    expect(delivered).toBe(true);

    const metadata = await client.getEntity<{ count: number }>(counterId);
    expect(metadata?.id.toString()).toEqual(counterId.toString());
    expect(metadata?.includesState).toBe(true);
    expect(metadata?.state?.count).toEqual(11);
  });

  it("should return undefined metadata for an entity that does not exist", async () => {
    const metadata = await client.getEntity(new EntityInstanceId("counter", "absent"));
    expect(metadata).toBeUndefined();
  });

  it("should apply a signal sent by one entity to another entity", async () => {
    worker.addNamedEntity("counter", () => new CounterEntity());
    worker.addNamedEntity("relaytarget", () => new RelayTargetEntity());
    await worker.start();

    await client.signalEntity(counterId, "relay", 9);

    const relayed = await waitFor(() => {
      const target = backend.getEntity(new EntityInstanceId("relaytarget", "k").toString());
      return target?.serializedState !== undefined && JSON.parse(target.serializedState).count === 9;
    });
    expect(relayed).toBe(true);
  });

  it("should clear entity state on reset", async () => {
    worker.addNamedEntity("counter", () => new CounterEntity());
    await worker.start();

    await client.signalEntity(counterId, "add", 3);
    const delivered = await waitFor(() => backend.getEntity(counterId.toString())?.serializedState !== undefined);
    expect(delivered).toBe(true);

    await worker.stop();
    backend.reset();

    expect(backend.getEntity(counterId.toString())).toBeUndefined();
    expect(backend.hasPendingWork()).toBe(false);
  });
});
