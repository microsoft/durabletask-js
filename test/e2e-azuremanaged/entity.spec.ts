// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E tests for Durable Entities against Durable Task Scheduler (DTS) emulator.
 *
 * NOTE: These tests assume the DTS emulator is running. Example command:
 *       docker run -i -p 8080:8080 -d mcr.microsoft.com/dts/dts-emulator:latest
 *
 * Environment variables:
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
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

// Read environment variables
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

  protected initializeState(): { messages: string[] } {
    return { messages: [] };
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
    taskHubClient = new DurableTaskAzureManagedClientBuilder()
      .endpoint(endpoint, taskHub, null)
      .build();

    taskHubWorker = new DurableTaskAzureManagedWorkerBuilder()
      .endpoint(endpoint, taskHub, null)
      .build();
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
});

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
