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
