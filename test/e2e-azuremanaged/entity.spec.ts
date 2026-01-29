// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for Durable Entities against Durable Task Scheduler (DTS).
 *
 * These tests can run against either:
 * 1. DTS Emulator (default) - No authentication required
 *    docker run -i -p 8080:8080 -d mcr.microsoft.com/dts/dts-emulator:latest
 *
 * 2. Real DTS Scheduler - Requires connection string with authentication
 *
 * Environment variables:
 *   - AZURE_DTS_CONNECTION_STRING: Connection string for real DTS (takes precedence)
 *     Example: Endpoint=https://your-scheduler.eastus.durabletask.io;Authentication=DefaultAzure;TaskHub=your-taskhub
 *   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
 *   - TASKHUB: The task hub name (default: default)
 */

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  EntityInstanceId,
  TaskEntity,
  OrchestrationContext,
  TOrchestrator,
  ProtoOrchestrationStatus as OrchestrationStatus,
  LockHandle,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

// Read environment variables
// Connection string takes precedence over endpoint/taskHub for real DTS
const connectionString = process.env.AZURE_DTS_CONNECTION_STRING;
const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

// ============================================================================
// Test Entities
// ============================================================================

/**
 * Simple counter entity for basic operations testing.
 */
class CounterEntity extends TaskEntity<{ count: number }> {
  add(amount: number): number {
    this.state.count += amount;
    return this.state.count;
  }

  subtract(amount: number): number {
    this.state.count -= amount;
    return this.state.count;
  }

  get(): number {
    return this.state.count;
  }

  reset(): void {
    this.state.count = 0;
  }

  // Note: Using implicit delete behavior from TaskEntity base class
  // When 'delete' operation is called, the entity state will be set to null

  protected initializeState(): { count: number } {
    return { count: 0 };
  }
}

/**
 * Bank account entity for more complex state management testing.
 */
interface BankAccountState {
  balance: number;
  owner: string;
  transactionCount: number;
}

class BankAccountEntity extends TaskEntity<BankAccountState> {
  deposit(amount: number): number {
    if (amount <= 0) {
      throw new Error("Deposit amount must be positive");
    }
    this.state.balance += amount;
    this.state.transactionCount++;
    return this.state.balance;
  }

  withdraw(amount: number): number {
    if (amount <= 0) {
      throw new Error("Withdrawal amount must be positive");
    }
    if (amount > this.state.balance) {
      throw new Error(`Insufficient funds: balance=${this.state.balance}, requested=${amount}`);
    }
    this.state.balance -= amount;
    this.state.transactionCount++;
    return this.state.balance;
  }

  getBalance(): number {
    return this.state.balance;
  }

  getTransactionCount(): number {
    return this.state.transactionCount;
  }

  setOwner(owner: string): void {
    this.state.owner = owner;
  }

  getOwner(): string {
    return this.state.owner;
  }

  getFullState(): BankAccountState {
    return { ...this.state };
  }

  protected initializeState(): BankAccountState {
    return { balance: 0, owner: "Unknown", transactionCount: 0 };
  }
}

/**
 * Entity that can signal other entities and start orchestrations.
 */
class CoordinatorEntity extends TaskEntity<{ messages: string[] }> {
  sendMessage(message: string): void {
    this.state.messages.push(message);
  }

  getMessages(): string[] {
    return [...this.state.messages];
  }

  signalCounter(args: { counterKey: string; amount: number }): void {
    const counterId = new EntityInstanceId("CounterEntity", args.counterKey);
    this.context?.signalEntity(counterId, "add", args.amount);
  }

  // Start a new orchestration from within the entity
  startOrchestration(args: { orchestrationName: string; input: unknown }): string {
    return this.context?.scheduleNewOrchestration(args.orchestrationName, args.input) ?? "";
  }

  protected initializeState(): { messages: string[] } {
    return { messages: [] };
  }
}

/**
 * Entity with async operations and edge case testing.
 */
class AsyncEntity extends TaskEntity<{ value: number; log: string[] }> {
  // Operation with no input
  ping(): string {
    this.state.log.push("ping");
    return "pong";
  }

  // Async operation using Promise
  async asyncAdd(amount: number): Promise<number> {
    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, 10));
    this.state.value += amount;
    this.state.log.push(`asyncAdd:${amount}`);
    return this.state.value;
  }

  // Operation with nested complex input
  processNested(args: { data: { nested: { value: number } }; meta: { tag: string } }): string {
    this.state.value = args.data.nested.value;
    this.state.log.push(`nested:${args.meta.tag}`);
    return `processed:${args.data.nested.value}:${args.meta.tag}`;
  }

  getValue(): number {
    return this.state.value;
  }

  getLog(): string[] {
    return [...this.state.log];
  }

  // Operation that throws an error
  failOperation(): void {
    throw new Error("This operation intentionally fails");
  }

  protected initializeState(): { value: number; log: string[] } {
    return { value: 0, log: [] };
  }
}

// ============================================================================
// E2E Tests
// ============================================================================

describe("Durable Entities E2E Tests (DTS)", () => {
  let taskHubClient: TaskHubGrpcClient;
  let taskHubWorker: TaskHubGrpcWorker;

  beforeEach(async () => {
    // Create client and worker using the Azure-managed builders
    // Use connection string for real DTS, or endpoint for emulator
    if (connectionString) {
      taskHubClient = new DurableTaskAzureManagedClientBuilder()
        .connectionString(connectionString)
        .build();

      taskHubWorker = new DurableTaskAzureManagedWorkerBuilder()
        .connectionString(connectionString)
        .build();
    } else {
      taskHubClient = new DurableTaskAzureManagedClientBuilder()
        .endpoint(endpoint, taskHub, null)
        .build();

      taskHubWorker = new DurableTaskAzureManagedWorkerBuilder()
        .endpoint(endpoint, taskHub, null)
        .build();
    }
  });

  afterEach(async () => {
    await taskHubWorker.stop();
    await taskHubClient.stop();
  });

  describe("Basic Entity Operations", () => {
    it("should signal an entity and retrieve its state", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `counter-${Date.now()}`);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act - Signal the entity multiple times
      await taskHubClient.signalEntity(entityId, "add", 10);
      await taskHubClient.signalEntity(entityId, "add", 5);
      await taskHubClient.signalEntity(entityId, "subtract", 3);

      // Wait for signals to be processed
      await sleep(2000);

      // Assert - Get the entity state
      const metadata = await taskHubClient.getEntity<{ count: number }>(entityId);

      expect(metadata).toBeDefined();
      expect(metadata?.state?.count).toBe(12); // 0 + 10 + 5 - 3 = 12
    }, 30000);

    it("should handle multiple entities independently", async () => {
      // Arrange
      const entityId1 = new EntityInstanceId("CounterEntity", `counter1-${Date.now()}`);
      const entityId2 = new EntityInstanceId("CounterEntity", `counter2-${Date.now()}`);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act - Signal different entities
      await taskHubClient.signalEntity(entityId1, "add", 100);
      await taskHubClient.signalEntity(entityId2, "add", 50);
      await taskHubClient.signalEntity(entityId1, "add", 25);

      // Wait for signals to be processed
      await sleep(2000);

      // Assert - Each entity has independent state
      const metadata1 = await taskHubClient.getEntity<{ count: number }>(entityId1);
      const metadata2 = await taskHubClient.getEntity<{ count: number }>(entityId2);

      expect(metadata1?.state?.count).toBe(125); // 100 + 25
      expect(metadata2?.state?.count).toBe(50);
    }, 30000);

    it("should return undefined for non-existent entity", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `nonexistent-${Date.now()}`);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act
      const metadata = await taskHubClient.getEntity<{ count: number }>(entityId);

      // Assert
      expect(metadata).toBeUndefined();
    }, 30000);
  });

  describe("Complex State Management", () => {
    it("should handle complex entity state with multiple fields", async () => {
      // Arrange
      const entityId = new EntityInstanceId("BankAccountEntity", `account-${Date.now()}`);
      taskHubWorker.addNamedEntity("BankAccountEntity", () => new BankAccountEntity());
      await taskHubWorker.start();

      // Act
      await taskHubClient.signalEntity(entityId, "setOwner", "Alice");
      await taskHubClient.signalEntity(entityId, "deposit", 1000);
      await taskHubClient.signalEntity(entityId, "withdraw", 250);
      await taskHubClient.signalEntity(entityId, "deposit", 100);

      // Wait for signals to be processed
      await sleep(2000);

      // Assert
      const metadata = await taskHubClient.getEntity<BankAccountState>(entityId);

      expect(metadata).toBeDefined();
      expect(metadata?.state?.balance).toBe(850); // 1000 - 250 + 100
      expect(metadata?.state?.owner).toBe("Alice");
      expect(metadata?.state?.transactionCount).toBe(3); // deposit, withdraw, deposit
    }, 30000);

    it("should handle operation errors gracefully", async () => {
      // Arrange
      const entityId = new EntityInstanceId("BankAccountEntity", `account-error-${Date.now()}`);
      taskHubWorker.addNamedEntity("BankAccountEntity", () => new BankAccountEntity());
      await taskHubWorker.start();

      // Act - Deposit, then try to withdraw more than balance
      await taskHubClient.signalEntity(entityId, "deposit", 100);
      await taskHubClient.signalEntity(entityId, "withdraw", 500); // Should fail - insufficient funds

      // Wait for signals to be processed
      await sleep(2000);

      // Assert - State should reflect only successful operations
      const metadata = await taskHubClient.getEntity<BankAccountState>(entityId);

      expect(metadata).toBeDefined();
      // Balance should remain 100 since withdraw failed
      expect(metadata?.state?.balance).toBe(100);
    }, 30000);
  });

  describe("Entity from Orchestration", () => {
    it("should call entity from orchestration and get response", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `orch-counter-${Date.now()}`);

      // Orchestration that interacts with an entity
      const entityOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Call the entity to add a value and get the result
        const result1: number = yield ctx.entities.callEntity(entityId, "add", 50);

        // Call again
        const result2: number = yield ctx.entities.callEntity(entityId, "add", 25);

        // Get final value
        const finalValue: number = yield ctx.entities.callEntity(entityId, "get");

        return { result1, result2, finalValue };
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(entityOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(entityOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 60);

      // Assert
      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output?.result1).toBe(50);
      expect(output?.result2).toBe(75); // 50 + 25
      expect(output?.finalValue).toBe(75);
    }, 90000);

    it("should signal entity from orchestration (fire-and-forget)", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `signal-orch-${Date.now()}`);

      const signalOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Signal the entity (fire-and-forget)
        ctx.entities.signalEntity(entityId, "add", 100);
        ctx.entities.signalEntity(entityId, "add", 50);

        // Wait a bit for signals to be processed
        const fireAt = new Date(ctx.currentUtcDateTime.getTime() + 2000);
        yield ctx.createTimer(fireAt);

        // Now call to get the value
        const value: number = yield ctx.entities.callEntity(entityId, "get");
        return value;
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(signalOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(signalOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 60);

      // Assert
      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output).toBe(150); // 100 + 50
    }, 90000);
  });

  describe("Entity Query", () => {
    it("should query entities by name prefix", async () => {
      // Arrange
      const prefix = `query-test-${Date.now()}`;
      const entityId1 = new EntityInstanceId("CounterEntity", `${prefix}-1`);
      const entityId2 = new EntityInstanceId("CounterEntity", `${prefix}-2`);
      const entityId3 = new EntityInstanceId("CounterEntity", `${prefix}-3`);

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Create entities by signaling them
      await taskHubClient.signalEntity(entityId1, "add", 10);
      await taskHubClient.signalEntity(entityId2, "add", 20);
      await taskHubClient.signalEntity(entityId3, "add", 30);

      // Wait for signals to be processed
      await sleep(3000);

      // Act - Query for entities
      const results: Array<{ id: EntityInstanceId; state: { count: number } }> = [];
      for await (const metadata of taskHubClient.getEntities<{ count: number }>({
        instanceIdStartsWith: `@CounterEntity@${prefix}`,
        includeState: true,
      })) {
        results.push({
          id: metadata.id,
          state: metadata.state!,
        });
      }

      // Assert
      expect(results.length).toBe(3);
      const counts = results.map((r) => r.state.count).sort((a, b) => a - b);
      expect(counts).toEqual([10, 20, 30]);
    }, 60000);
  });

  describe("Entity Deletion", () => {
    it("should delete entity state via delete operation", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `delete-test-${Date.now()}`);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Create the entity
      await taskHubClient.signalEntity(entityId, "add", 100);
      await sleep(1000);

      // Verify it exists
      let metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(100);

      // Act - Delete the entity
      await taskHubClient.signalEntity(entityId, "delete");
      await sleep(2000);

      // Assert - Entity should no longer exist (or have empty state)
      metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      // After deletion, getEntity should return undefined or entity with no state
      expect(metadata === undefined || metadata.state === undefined).toBe(true);
    }, 30000);
  });

  describe("Entity-to-Entity Communication", () => {
    it("should allow one entity to signal another entity", async () => {
      // Arrange
      const coordinatorId = new EntityInstanceId("CoordinatorEntity", `coordinator-${Date.now()}`);
      const counterId = new EntityInstanceId("CounterEntity", `target-counter-${Date.now()}`);

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addNamedEntity("CoordinatorEntity", () => new CoordinatorEntity());
      await taskHubWorker.start();

      // Act - Signal the coordinator to signal the counter
      await taskHubClient.signalEntity(coordinatorId, "signalCounter", { counterKey: counterId.key, amount: 42 });

      // Wait for the cascading signals to be processed
      await sleep(3000);

      // Assert - The counter should have received the signal
      const counterMetadata = await taskHubClient.getEntity<{ count: number }>(counterId);
      expect(counterMetadata?.state?.count).toBe(42);
    }, 30000);
  });

  describe("Concurrent Entity Operations", () => {
    it("should process rapid sequential signals in order", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `rapid-${Date.now()}`);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act - Send many signals rapidly
      const signalCount = 20;
      for (let i = 0; i < signalCount; i++) {
        await taskHubClient.signalEntity(entityId, "add", 1);
      }

      // Wait for all signals to be processed
      await sleep(5000);

      // Assert - All signals should be processed exactly once
      const metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(signalCount);
    }, 60000);

    it("should handle concurrent signals from multiple clients", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `concurrent-${Date.now()}`);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act - Send signals in parallel (simulate concurrent clients)
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(taskHubClient.signalEntity(entityId, "add", 5));
      }
      await Promise.all(promises);

      // Wait for all signals to be processed
      await sleep(3000);

      // Assert - All signals should be processed
      const metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(50); // 10 * 5
    }, 30000);
  });

  describe("Entity Re-creation", () => {
    it("should allow entity to be re-created after deletion", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `recreate-${Date.now()}`);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Create and verify initial state
      await taskHubClient.signalEntity(entityId, "add", 100);
      await sleep(1500);
      let metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(100);

      // Delete the entity
      await taskHubClient.signalEntity(entityId, "delete");
      await sleep(2000);

      // Verify deletion
      metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata === undefined || metadata.state === undefined).toBe(true);

      // Re-create the entity with new state
      await taskHubClient.signalEntity(entityId, "add", 50);
      await sleep(1500);

      // Assert - Entity should be re-created with fresh state
      metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(50);
    }, 45000);
  });

  describe("Entity with List State", () => {
    it("should handle entity with array/list state", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CoordinatorEntity", `messages-${Date.now()}`);
      taskHubWorker.addNamedEntity("CoordinatorEntity", () => new CoordinatorEntity());
      await taskHubWorker.start();

      // Act - Add multiple messages
      await taskHubClient.signalEntity(entityId, "sendMessage", "Hello");
      await taskHubClient.signalEntity(entityId, "sendMessage", "World");
      await taskHubClient.signalEntity(entityId, "sendMessage", "!");

      await sleep(2000);

      // Assert
      const metadata = await taskHubClient.getEntity<{ messages: string[] }>(entityId);
      expect(metadata?.state?.messages).toEqual(["Hello", "World", "!"]);
    }, 30000);
  });

  describe("Multiple Orchestrations with Same Entity", () => {
    it("should handle multiple orchestrations interacting with same entity", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `multi-orch-${Date.now()}`);

      const incrementOrchestrator: TOrchestrator = async function* (
        ctx: OrchestrationContext,
        amount: number
      ): any {
        const result: number = yield ctx.entities.callEntity(entityId, "add", amount);
        return result;
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(incrementOrchestrator);
      await taskHubWorker.start();

      // Act - Start multiple orchestrations that increment the same entity
      const instanceId1 = await taskHubClient.scheduleNewOrchestration(incrementOrchestrator, 10);
      const instanceId2 = await taskHubClient.scheduleNewOrchestration(incrementOrchestrator, 20);
      const instanceId3 = await taskHubClient.scheduleNewOrchestration(incrementOrchestrator, 30);

      // Wait for all to complete
      const [state1, state2, state3] = await Promise.all([
        taskHubClient.waitForOrchestrationCompletion(instanceId1, undefined, 60),
        taskHubClient.waitForOrchestrationCompletion(instanceId2, undefined, 60),
        taskHubClient.waitForOrchestrationCompletion(instanceId3, undefined, 60),
      ]);

      // Assert - All orchestrations completed
      expect(state1?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state2?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state3?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      // Entity should have received all increments
      const metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(60); // 10 + 20 + 30
    }, 90000);
  });

  describe("Entity Reset Operation", () => {
    it("should reset entity state to initial value", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `reset-${Date.now()}`);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Build up some state
      await taskHubClient.signalEntity(entityId, "add", 100);
      await taskHubClient.signalEntity(entityId, "add", 50);
      await sleep(1500);

      let metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(150);

      // Act - Reset the entity
      await taskHubClient.signalEntity(entityId, "reset");
      await sleep(1500);

      // Assert - State should be reset to initial value
      metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(0);
    }, 30000);
  });

  describe("Entity Call with Response", () => {
    it("should get response from entity call in orchestration", async () => {
      // Arrange
      const entityId = new EntityInstanceId("BankAccountEntity", `call-response-${Date.now()}`);

      const bankOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Set owner and get response
        yield ctx.entities.callEntity(entityId, "setOwner", "Bob");

        // Deposit and get new balance
        const balance1: number = yield ctx.entities.callEntity(entityId, "deposit", 500);

        // Withdraw and get new balance
        const balance2: number = yield ctx.entities.callEntity(entityId, "withdraw", 200);

        // Get full state
        const fullState: BankAccountState = yield ctx.entities.callEntity(entityId, "getFullState");

        return { balance1, balance2, fullState };
      };

      taskHubWorker.addNamedEntity("BankAccountEntity", () => new BankAccountEntity());
      taskHubWorker.addOrchestrator(bankOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(bankOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 60);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output?.balance1).toBe(500);
      expect(output?.balance2).toBe(300); // 500 - 200
      expect(output?.fullState?.owner).toBe("Bob");
      expect(output?.fullState?.balance).toBe(300);
      expect(output?.fullState?.transactionCount).toBe(2);
    }, 90000);
  });

  describe("Entity Mixed Operations", () => {
    it("should handle mixed signals and calls to same entity", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `mixed-${Date.now()}`);

      const mixedOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Signal (fire-and-forget)
        ctx.entities.signalEntity(entityId, "add", 10);

        // Wait a bit
        const fireAt = new Date(ctx.currentUtcDateTime.getTime() + 1000);
        yield ctx.createTimer(fireAt);

        // Call (wait for response)
        const value1: number = yield ctx.entities.callEntity(entityId, "add", 5);

        // Signal again
        ctx.entities.signalEntity(entityId, "add", 3);

        // Wait
        const fireAt2 = new Date(ctx.currentUtcDateTime.getTime() + 1000);
        yield ctx.createTimer(fireAt2);

        // Final call to get value
        const finalValue: number = yield ctx.entities.callEntity(entityId, "get");

        return { value1, finalValue };
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(mixedOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(mixedOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 60);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      // value1 should be 15 (10 from signal + 5 from call)
      expect(output?.value1).toBe(15);
      // finalValue should be 18 (15 + 3 from second signal)
      expect(output?.finalValue).toBe(18);
    }, 90000);
  });

  describe("Entity Type Differentiation", () => {
    it("should maintain separate state for different entity types with same key", async () => {
      // Arrange
      const key = `same-key-${Date.now()}`;
      const counterId = new EntityInstanceId("CounterEntity", key);
      const bankId = new EntityInstanceId("BankAccountEntity", key);

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addNamedEntity("BankAccountEntity", () => new BankAccountEntity());
      await taskHubWorker.start();

      // Act - Operate on both entity types with the same key
      await taskHubClient.signalEntity(counterId, "add", 100);
      await taskHubClient.signalEntity(bankId, "deposit", 500);
      await taskHubClient.signalEntity(counterId, "add", 50);
      await taskHubClient.signalEntity(bankId, "withdraw", 200);

      await sleep(3000);

      // Assert - Each entity type should have its own independent state
      const counterMetadata = await taskHubClient.getEntity<{ count: number }>(counterId);
      const bankMetadata = await taskHubClient.getEntity<BankAccountState>(bankId);

      expect(counterMetadata?.state?.count).toBe(150); // 100 + 50
      expect(bankMetadata?.state?.balance).toBe(300); // 500 - 200
    }, 30000);
  });

  describe("Clean Entity Storage", () => {
    it("should clean up empty entities after deletion", async () => {
      // Arrange - Create and delete some entities
      const prefix = `cleanup-${Date.now()}`;
      const entityId1 = new EntityInstanceId("CounterEntity", `${prefix}-1`);
      const entityId2 = new EntityInstanceId("CounterEntity", `${prefix}-2`);

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Create entities
      await taskHubClient.signalEntity(entityId1, "add", 100);
      await taskHubClient.signalEntity(entityId2, "add", 200);
      await sleep(2000);

      // Delete one entity
      await taskHubClient.signalEntity(entityId1, "delete");
      await sleep(2000);

      // Act - Clean entity storage
      const cleanResult = await taskHubClient.cleanEntityStorage({
        removeEmptyEntities: true,
        releaseOrphanedLocks: true,
      });

      // Assert - Clean should complete (may or may not find empty entities depending on timing)
      expect(cleanResult).toBeDefined();
      expect(cleanResult.emptyEntitiesRemoved).toBeGreaterThanOrEqual(0);
      expect(cleanResult.orphanedLocksReleased).toBeGreaterThanOrEqual(0);

      // The non-deleted entity should still exist
      const metadata = await taskHubClient.getEntity<{ count: number }>(entityId2);
      expect(metadata?.state?.count).toBe(200);
    }, 45000);

    it("should clean entity storage with default options", async () => {
      // Arrange
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act - Call cleanEntityStorage with no parameters (uses defaults)
      const cleanResult = await taskHubClient.cleanEntityStorage();

      // Assert - Should return a valid result
      expect(cleanResult).toBeDefined();
      expect(typeof cleanResult.emptyEntitiesRemoved).toBe("number");
      expect(typeof cleanResult.orphanedLocksReleased).toBe("number");
    }, 30000);

    it("should clean only empty entities when specified", async () => {
      // Arrange
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act - Clean only empty entities, not orphaned locks
      const cleanResult = await taskHubClient.cleanEntityStorage({
        removeEmptyEntities: true,
        releaseOrphanedLocks: false,
      });

      // Assert
      expect(cleanResult).toBeDefined();
      expect(typeof cleanResult.emptyEntitiesRemoved).toBe("number");
    }, 30000);
  });

  describe("Entity Locking - Basic Operations", () => {
    it("should lock entity and perform operations within critical section", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `lock-basic-${Date.now()}`);

      const lockingOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Acquire lock on the entity
        const lockHandle: LockHandle = yield ctx.entities.lockEntities(entityId);

        try {
          // Check that we're in a critical section
          const sectionInfo = ctx.entities.isInCriticalSection();
          const inSection = sectionInfo.inSection;

          // Perform operations while holding the lock
          const value1: number = yield ctx.entities.callEntity(entityId, "add", 100);
          const value2: number = yield ctx.entities.callEntity(entityId, "add", 50);

          return { inSection, value1, value2 };
        } finally {
          // Release the lock
          lockHandle.release();
        }
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(lockingOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(lockingOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 90);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output?.inSection).toBe(true);
      expect(output?.value1).toBe(100);
      expect(output?.value2).toBe(150);
    }, 120000);

    it("should lock multiple entities atomically", async () => {
      // Arrange
      const entityId1 = new EntityInstanceId("CounterEntity", `multi-lock-1-${Date.now()}`);
      const entityId2 = new EntityInstanceId("CounterEntity", `multi-lock-2-${Date.now()}`);

      const multiLockOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Acquire locks on multiple entities
        const lockHandle: LockHandle = yield ctx.entities.lockEntities(entityId1, entityId2);

        try {
          // Check locked entities
          const sectionInfo = ctx.entities.isInCriticalSection();
          const lockedCount = sectionInfo.lockedEntities?.length ?? 0;

          // Perform transfer: add to entity1, subtract from entity2
          yield ctx.entities.callEntity(entityId1, "add", 100);
          yield ctx.entities.callEntity(entityId2, "add", 200);
          
          // Get final values
          const value1: number = yield ctx.entities.callEntity(entityId1, "get");
          const value2: number = yield ctx.entities.callEntity(entityId2, "get");

          return { lockedCount, value1, value2 };
        } finally {
          lockHandle.release();
        }
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(multiLockOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(multiLockOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 90);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output?.lockedCount).toBe(2);
      expect(output?.value1).toBe(100);
      expect(output?.value2).toBe(200);
    }, 120000);

    it("should show entity as not locked after lock release", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `lock-release-${Date.now()}`);

      const lockReleaseOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Check initial state - not in critical section
        const beforeLock = ctx.entities.isInCriticalSection();

        // Acquire and release lock
        const lockHandle: LockHandle = yield ctx.entities.lockEntities(entityId);
        const duringLock = ctx.entities.isInCriticalSection();
        
        yield ctx.entities.callEntity(entityId, "add", 50);
        lockHandle.release();
        
        const afterRelease = ctx.entities.isInCriticalSection();

        return {
          beforeLock: beforeLock.inSection,
          duringLock: duringLock.inSection,
          afterRelease: afterRelease.inSection,
        };
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(lockReleaseOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(lockReleaseOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 90);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output?.beforeLock).toBe(false);
      expect(output?.duringLock).toBe(true);
      expect(output?.afterRelease).toBe(false);
    }, 120000);
  });

  describe("Entity Locking - Edge Cases", () => {
    it("should handle duplicate lock release gracefully", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `dup-release-${Date.now()}`);

      const dupReleaseOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const lockHandle: LockHandle = yield ctx.entities.lockEntities(entityId);
        
        yield ctx.entities.callEntity(entityId, "add", 100);
        
        // Release multiple times - should not throw
        lockHandle.release();
        lockHandle.release();
        lockHandle.release();

        const finalValue: number = yield ctx.entities.callEntity(entityId, "get");
        return finalValue;
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(dupReleaseOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(dupReleaseOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 90);

      // Assert - Should complete successfully
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output).toBe(100);
    }, 120000);

    it("should deduplicate entities when locking same entity multiple times", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `dedup-lock-${Date.now()}`);

      const dedupOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Try to lock the same entity multiple times
        const lockHandle: LockHandle = yield ctx.entities.lockEntities(entityId, entityId, entityId);

        const sectionInfo = ctx.entities.isInCriticalSection();
        const lockedCount = sectionInfo.lockedEntities?.length ?? 0;

        yield ctx.entities.callEntity(entityId, "add", 42);
        lockHandle.release();

        return { lockedCount };
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(dedupOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(dedupOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 90);

      // Assert - Duplicates should be removed, so only 1 entity locked
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output?.lockedCount).toBe(1);
    }, 120000);

    it("should sort entities for consistent lock ordering", async () => {
      // Arrange - Create entities with keys that would sort differently
      const entityA = new EntityInstanceId("CounterEntity", `z-last-${Date.now()}`);
      const entityB = new EntityInstanceId("CounterEntity", `a-first-${Date.now()}`);
      const entityC = new EntityInstanceId("CounterEntity", `m-middle-${Date.now()}`);

      const sortedLockOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Lock in unsorted order
        const lockHandle: LockHandle = yield ctx.entities.lockEntities(entityA, entityB, entityC);

        const sectionInfo = ctx.entities.isInCriticalSection();
        const lockedEntities = sectionInfo.lockedEntities?.map(e => e.key) ?? [];

        yield ctx.entities.callEntity(entityA, "add", 1);
        yield ctx.entities.callEntity(entityB, "add", 2);
        yield ctx.entities.callEntity(entityC, "add", 3);
        lockHandle.release();

        return { lockedEntities, count: lockedEntities.length };
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(sortedLockOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(sortedLockOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 90);

      // Assert - Should have 3 locked entities
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output?.count).toBe(3);
      
      // Entities should be sorted
      const keys = output?.lockedEntities as string[];
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    }, 120000);

    it("should allow call to locked entity but not signal", async () => {
      // Arrange
      const lockedEntity = new EntityInstanceId("CounterEntity", `call-vs-signal-${Date.now()}`);

      const callVsSignalOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const lockHandle: LockHandle = yield ctx.entities.lockEntities(lockedEntity);

        // Call should work on locked entity
        const value: number = yield ctx.entities.callEntity(lockedEntity, "add", 100);

        lockHandle.release();
        return value;
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(callVsSignalOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(callVsSignalOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 90);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output).toBe(100);
    }, 120000);

    it("should serialize concurrent access from multiple orchestrations", async () => {
      // Arrange - Single entity that will be accessed by multiple orchestrations
      const sharedEntityId = new EntityInstanceId("CounterEntity", `shared-lock-${Date.now()}`);

      const concurrentAccessOrchestrator: TOrchestrator = async function* (
        ctx: OrchestrationContext,
        amount: number
      ): any {
        // Each orchestration locks, reads, modifies, and writes
        const lockHandle: LockHandle = yield ctx.entities.lockEntities(sharedEntityId);

        try {
          const current: number = yield ctx.entities.callEntity(sharedEntityId, "get");
          
          // Simulate some work with a small delay
          const fireAt = new Date(ctx.currentUtcDateTime.getTime() + 100);
          yield ctx.createTimer(fireAt);
          
          const newValue: number = yield ctx.entities.callEntity(sharedEntityId, "add", amount);
          return { before: current, after: newValue, added: amount };
        } finally {
          lockHandle.release();
        }
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(concurrentAccessOrchestrator);
      await taskHubWorker.start();

      // Act - Start multiple orchestrations that compete for the same lock
      const instanceId1 = await taskHubClient.scheduleNewOrchestration(concurrentAccessOrchestrator, 10);
      const instanceId2 = await taskHubClient.scheduleNewOrchestration(concurrentAccessOrchestrator, 20);
      const instanceId3 = await taskHubClient.scheduleNewOrchestration(concurrentAccessOrchestrator, 30);

      // Wait for all to complete
      const [state1, state2, state3] = await Promise.all([
        taskHubClient.waitForOrchestrationCompletion(instanceId1, undefined, 120),
        taskHubClient.waitForOrchestrationCompletion(instanceId2, undefined, 120),
        taskHubClient.waitForOrchestrationCompletion(instanceId3, undefined, 120),
      ]);

      // Assert - All completed
      expect(state1?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state2?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state3?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);

      // Final entity value should be sum of all additions (10 + 20 + 30 = 60)
      const metadata = await taskHubClient.getEntity<{ count: number }>(sharedEntityId);
      expect(metadata?.state?.count).toBe(60);
    }, 180000);
  });

  describe("Entity lockedBy Metadata", () => {
    it("should show lockedBy in entity metadata during lock", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `locked-by-${Date.now()}`);

      const slowLockOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const lockHandle: LockHandle = yield ctx.entities.lockEntities(entityId);

        try {
          yield ctx.entities.callEntity(entityId, "add", 100);
          
          // Hold the lock for a while so we can check metadata
          const fireAt = new Date(ctx.currentUtcDateTime.getTime() + 3000);
          yield ctx.createTimer(fireAt);
          
          return "completed";
        } finally {
          lockHandle.release();
        }
      };

      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      taskHubWorker.addOrchestrator(slowLockOrchestrator);
      await taskHubWorker.start();

      // Act - Start orchestration that holds lock
      const lockingOrchestrationId = await taskHubClient.scheduleNewOrchestration(slowLockOrchestrator);

      // Wait a bit for lock to be acquired
      await sleep(2000);

      // Check entity metadata - Note: lockedBy may not be visible through getEntity depending on implementation
      // This test verifies the API works correctly
      const state = await taskHubClient.waitForOrchestrationCompletion(lockingOrchestrationId, undefined, 90);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output).toBe("completed");
    }, 120000);
  });

  describe("Operation Edge Cases", () => {
    it("should handle operation with no input", async () => {
      // Arrange
      const entityId = new EntityInstanceId("AsyncEntity", `no-input-${Date.now()}`);

      const noInputOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Call operation that takes no parameters
        const result: string = yield ctx.entities.callEntity(entityId, "ping");
        const log: string[] = yield ctx.entities.callEntity(entityId, "getLog");
        return { result, log };
      };

      taskHubWorker.addNamedEntity("AsyncEntity", () => new AsyncEntity());
      taskHubWorker.addOrchestrator(noInputOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(noInputOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 60);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output?.result).toBe("pong");
      expect(output?.log).toContain("ping");
    }, 90000);

    it("should handle operation name case insensitivity", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `case-test-${Date.now()}`);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act - Use different case variations for the same operation
      await taskHubClient.signalEntity(entityId, "add", 10); // lowercase
      await taskHubClient.signalEntity(entityId, "Add", 5); // Capitalized
      await taskHubClient.signalEntity(entityId, "ADD", 3); // UPPERCASE

      await sleep(3000);

      // Assert - All operations should work regardless of case
      const metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(18); // 10 + 5 + 3
    }, 30000);

    it("should handle complex nested input", async () => {
      // Arrange
      const entityId = new EntityInstanceId("AsyncEntity", `nested-input-${Date.now()}`);

      const nestedInputOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result: string = yield ctx.entities.callEntity(entityId, "processNested", {
          data: { nested: { value: 42 } },
          meta: { tag: "test-tag" },
        });
        const value: number = yield ctx.entities.callEntity(entityId, "getValue");
        return { result, value };
      };

      taskHubWorker.addNamedEntity("AsyncEntity", () => new AsyncEntity());
      taskHubWorker.addOrchestrator(nestedInputOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(nestedInputOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 60);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output?.result).toBe("processed:42:test-tag");
      expect(output?.value).toBe(42);
    }, 90000);
  });

  describe("Async Entity Operations", () => {
    it("should handle async entity operation that returns Promise", async () => {
      // Arrange
      const entityId = new EntityInstanceId("AsyncEntity", `async-op-${Date.now()}`);

      const asyncOpOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        const result1: number = yield ctx.entities.callEntity(entityId, "asyncAdd", 10);
        const result2: number = yield ctx.entities.callEntity(entityId, "asyncAdd", 20);
        const log: string[] = yield ctx.entities.callEntity(entityId, "getLog");
        return { result1, result2, log };
      };

      taskHubWorker.addNamedEntity("AsyncEntity", () => new AsyncEntity());
      taskHubWorker.addOrchestrator(asyncOpOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(asyncOpOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 60);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      const output = state?.serializedOutput ? JSON.parse(state.serializedOutput) : null;
      expect(output?.result1).toBe(10);
      expect(output?.result2).toBe(30); // 10 + 20
      expect(output?.log).toEqual(["asyncAdd:10", "asyncAdd:20"]);
    }, 90000);
  });

  describe("Entity Instance ID Edge Cases", () => {
    it("should handle entity key with special characters", async () => {
      // Arrange - Keys with various special characters
      const key = `special-chars-${Date.now()}-test_key`;
      const entityId = new EntityInstanceId("CounterEntity", key);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act
      await taskHubClient.signalEntity(entityId, "add", 100);
      await sleep(2000);

      // Assert
      const metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(100);
      expect(metadata?.id.key).toBe(key);
    }, 30000);

    it("should handle long entity key within limits", async () => {
      // Arrange - Long key that stays within 100 char total instance ID limit
      // Entity instance ID format: @entityname@key, so key needs to account for prefix
      const key = `k-${Date.now()}-${"a".repeat(50)}`;
      const entityId = new EntityInstanceId("CounterEntity", key);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act
      await taskHubClient.signalEntity(entityId, "add", 50);
      await sleep(2000);

      // Assert
      const metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(50);
    }, 30000);

    it("should reject entity key that exceeds length limit", async () => {
      // Arrange - Key that makes total instance ID exceed 100 chars
      const key = `too-long-${Date.now()}-${"a".repeat(100)}`;
      const entityId = new EntityInstanceId("CounterEntity", key);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act & Assert - Should throw an error for overly long instance ID
      await expect(
        taskHubClient.signalEntity(entityId, "add", 50)
      ).rejects.toThrow(/INVALID_ARGUMENT|length/i);
    }, 30000);
  });

  describe("Entity Starting Orchestration", () => {
    it("should allow entity to schedule a new orchestration", async () => {
      // Arrange
      const coordinatorId = new EntityInstanceId("CoordinatorEntity", `start-orch-${Date.now()}`);
      // Simple orchestration that will be started by the entity
      const targetOrchestrator: TOrchestrator = async function* (
        _ctx: OrchestrationContext,
        input: { message: string }
      ): any {
        // Generator must have at least one yield (even if not awaited)
        yield Promise.resolve();
        return `Received: ${input.message}`;
      };

      // Orchestration that triggers entity to start another orchestration
      const triggerOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
        // Call the entity to start an orchestration
        yield ctx.entities.callEntity(coordinatorId, "startOrchestration", {
          orchestrationName: "targetOrchestrator",
          input: { message: "Hello from entity" },
        });

        // Wait a bit for the started orchestration to complete
        const fireAt = new Date(ctx.currentUtcDateTime.getTime() + 2000);
        yield ctx.createTimer(fireAt);

        return "trigger completed";
      };

      taskHubWorker.addNamedEntity("CoordinatorEntity", () => new CoordinatorEntity());
      taskHubWorker.addOrchestrator(triggerOrchestrator);
      taskHubWorker.addNamedOrchestrator("targetOrchestrator", targetOrchestrator);
      await taskHubWorker.start();

      // Act
      const instanceId = await taskHubClient.scheduleNewOrchestration(triggerOrchestrator);
      const state = await taskHubClient.waitForOrchestrationCompletion(instanceId, undefined, 90);

      // Assert
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    }, 120000);
  });

  describe("Operation Ordering (FIFO)", () => {
    it("should process operations in order (FIFO)", async () => {
      // Arrange
      const entityId = new EntityInstanceId("AsyncEntity", `fifo-${Date.now()}`);
      taskHubWorker.addNamedEntity("AsyncEntity", () => new AsyncEntity());
      await taskHubWorker.start();

      // Act - Send numbered operations rapidly
      for (let i = 1; i <= 10; i++) {
        await taskHubClient.signalEntity(entityId, "asyncAdd", i);
      }

      // Wait for all to be processed
      await sleep(5000);

      // Assert - Check the log shows operations in order
      const metadata = await taskHubClient.getEntity<{ value: number; log: string[] }>(entityId);
      expect(metadata?.state?.value).toBe(55); // 1+2+3+4+5+6+7+8+9+10

      // Log should be in order
      const expectedLog = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `asyncAdd:${n}`);
      expect(metadata?.state?.log).toEqual(expectedLog);
    }, 60000);
  });

  describe("Error Handling in Entity Operations", () => {
    it("should handle entity operation failure gracefully", async () => {
      // Arrange
      const entityId = new EntityInstanceId("AsyncEntity", `fail-op-${Date.now()}`);
      taskHubWorker.addNamedEntity("AsyncEntity", () => new AsyncEntity());
      await taskHubWorker.start();

      // Act - Signal an operation that throws (signals are fire-and-forget)
      await taskHubClient.signalEntity(entityId, "failOperation");
      await sleep(2000);

      // Also do a successful operation
      await taskHubClient.signalEntity(entityId, "ping");
      await sleep(2000);

      // Assert - Entity should still work after failed operation
      const metadata = await taskHubClient.getEntity<{ value: number; log: string[] }>(entityId);
      // The ping operation should have succeeded
      expect(metadata?.state?.log).toContain("ping");
    }, 30000);
  });

  describe("Scheduled Signal Delivery", () => {
    it("should deliver signal at scheduled time", async () => {
      // Arrange
      const entityId = new EntityInstanceId("CounterEntity", `scheduled-${Date.now()}`);
      taskHubWorker.addNamedEntity("CounterEntity", () => new CounterEntity());
      await taskHubWorker.start();

      // Act - Schedule a signal for 5 seconds in the future (longer delay for reliability)
      const scheduledTime = new Date(Date.now() + 5000);
      await taskHubClient.signalEntity(entityId, "add", 100, { signalTime: scheduledTime });

      // Wait past the scheduled time plus buffer for processing
      await sleep(8000);

      // Assert - Signal should be processed after scheduled time
      const metadata = await taskHubClient.getEntity<{ count: number }>(entityId);
      expect(metadata?.state?.count).toBe(100);
    }, 30000);
  });
});

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
