// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * This example demonstrates using Durable Entities from within an orchestration.
 *
 * Key concepts demonstrated:
 * - Calling entities from orchestrations (request/response)
 * - Signaling entities from orchestrations (fire-and-forget)
 * - Entity locking / Critical sections (atomic operations across multiple entities)
 *
 * Scenario: A bank transfer between two accounts (entities).
 * We use entity locking to ensure the transfer is atomic.
 */

import { TaskHubGrpcClient } from "../../packages/durabletask-js/src/client/client";
import { TaskHubGrpcWorker } from "../../packages/durabletask-js/src/worker/task-hub-grpc-worker";
import { OrchestrationContext } from "../../packages/durabletask-js/src/task/context/orchestration-context";
import { TOrchestrator } from "../../packages/durabletask-js/src/types/orchestrator.type";
import { TaskEntity, EntityInstanceId, LockHandle } from "../../packages/durabletask-js/src/entities";

// ============================================================================
// Step 1: Define the BankAccount entity
// ============================================================================

interface BankAccountState {
  balance: number;
  owner: string;
}

/**
 * A bank account entity that supports deposit, withdraw, and balance queries.
 */
class BankAccountEntity extends TaskEntity<BankAccountState> {
  /**
   * Deposits money into the account.
   * @param amount - The amount to deposit.
   * @returns The new balance.
   */
  deposit(amount: number): number {
    if (amount < 0) {
      throw new Error("Deposit amount must be positive");
    }
    this.state.balance += amount;
    return this.state.balance;
  }

  /**
   * Withdraws money from the account.
   * @param amount - The amount to withdraw.
   * @returns The new balance.
   * @throws If insufficient funds.
   */
  withdraw(amount: number): number {
    if (amount < 0) {
      throw new Error("Withdrawal amount must be positive");
    }
    if (this.state.balance < amount) {
      throw new Error(`Insufficient funds: balance=${this.state.balance}, requested=${amount}`);
    }
    this.state.balance -= amount;
    return this.state.balance;
  }

  /**
   * Gets the current balance.
   */
  getBalance(): number {
    return this.state.balance;
  }

  /**
   * Sets the account owner.
   */
  setOwner(owner: string): void {
    this.state.owner = owner;
  }

  protected initializeState(): BankAccountState {
    return { balance: 0, owner: "Unknown" };
  }
}

// ============================================================================
// Step 2: Define the Transfer orchestration with entity locking
// ============================================================================

interface TransferInput {
  fromAccount: string;
  toAccount: string;
  amount: number;
}

interface TransferResult {
  success: boolean;
  fromBalance: number;
  toBalance: number;
  message: string;
}

/**
 * Orchestration that transfers money between two accounts atomically.
 *
 * Uses entity locking to ensure both accounts are locked during the transfer,
 * preventing race conditions with other concurrent transfers.
 */
const transferOrchestration: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  input: TransferInput,
): any {
  const fromEntity = new EntityInstanceId("BankAccount", input.fromAccount);
  const toEntity = new EntityInstanceId("BankAccount", input.toAccount);

  // ========================================================================
  // Lock both accounts for atomic transfer
  // ========================================================================
  // Entity locking ensures no other orchestration can access these entities
  // until we release the lock. Entities are locked in sorted order to prevent
  // deadlocks when multiple orchestrations try to lock the same entities.

  const lock: LockHandle = yield* ctx.entities.lockEntities(fromEntity, toEntity);

  try {
    // Check the isInCriticalSection status
    const criticalSectionInfo = ctx.entities.isInCriticalSection();
    if (!ctx.isReplaying) {
      console.log(`In critical section: ${criticalSectionInfo.inSection}`);
      console.log(`Locked entities: ${criticalSectionInfo.lockedEntities?.map(e => e.toString()).join(", ")}`);
    }

    // ======================================================================
    // Get current balances (within critical section)
    // ======================================================================

    const fromBalance: number = yield* ctx.entities.callEntity(fromEntity, "getBalance");
    const toBalance: number = yield* ctx.entities.callEntity(toEntity, "getBalance");

    if (!ctx.isReplaying) {
      console.log(`From account balance: ${fromBalance}`);
      console.log(`To account balance: ${toBalance}`);
    }

    // ======================================================================
    // Check if transfer is possible
    // ======================================================================

    if (fromBalance < input.amount) {
      return {
        success: false,
        fromBalance,
        toBalance,
        message: `Insufficient funds: ${input.fromAccount} has ${fromBalance}, need ${input.amount}`,
      } as TransferResult;
    }

    // ======================================================================
    // Perform the transfer (within critical section - atomic!)
    // ======================================================================

    const newFromBalance: number = yield* ctx.entities.callEntity(fromEntity, "withdraw", input.amount);
    const newToBalance: number = yield* ctx.entities.callEntity(toEntity, "deposit", input.amount);

    return {
      success: true,
      fromBalance: newFromBalance,
      toBalance: newToBalance,
      message: `Transferred ${input.amount} from ${input.fromAccount} to ${input.toAccount}`,
    } as TransferResult;

  } finally {
    // ======================================================================
    // Release the locks (always, even on error)
    // ======================================================================
    lock.release();
  }
};

// ============================================================================
// Step 3: Example orchestration that signals entities without waiting
// ============================================================================

interface NotifyInput {
  accounts: string[];
  message: string;
}

/**
 * Orchestration that sends notifications to multiple accounts.
 *
 * Uses signalEntity which is fire-and-forget (doesn't wait for response).
 */
const notifyOrchestration: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  input: NotifyInput,
): any {
  // Signal each account (fire-and-forget, doesn't wait)
  for (const account of input.accounts) {
    const entityId = new EntityInstanceId("BankAccount", account);

    // signalEntity is synchronous and doesn't yield
    ctx.entities.signalEntity(entityId, "setOwner", input.message);
  }

  return `Notified ${input.accounts.length} accounts`;
};

// ============================================================================
// Step 4: Main - Set up worker and run the orchestrations
// ============================================================================

(async () => {
  const grpcServerAddress = "localhost:4001";
  const client = new TaskHubGrpcClient(grpcServerAddress);
  const worker = new TaskHubGrpcWorker(grpcServerAddress);

  // Register entity and orchestrations
  worker.addEntity("BankAccount", () => new BankAccountEntity());
  worker.addOrchestrator(transferOrchestration);
  worker.addOrchestrator(notifyOrchestration);

  try {
    await worker.start();
    console.log("Worker started successfully\n");

    const aliceAccount = new EntityInstanceId("BankAccount", "alice");
    const bobAccount = new EntityInstanceId("BankAccount", "bob");

    // ========================================================================
    // Initialize accounts with some balance
    // ========================================================================

    console.log("--- Initializing accounts ---");
    await client.signalEntity(aliceAccount, "deposit", 1000);
    await client.signalEntity(bobAccount, "deposit", 500);
    await new Promise((r) => setTimeout(r, 1000));

    const aliceState = await client.getEntity<BankAccountState>(aliceAccount);
    const bobState = await client.getEntity<BankAccountState>(bobAccount);
    console.log(`Alice balance: ${aliceState.state?.balance}`);
    console.log(`Bob balance: ${bobState.state?.balance}`);

    // ========================================================================
    // Run transfer orchestration with entity locking
    // ========================================================================

    console.log("\n--- Running transfer orchestration ---");
    const transferInput: TransferInput = {
      fromAccount: "alice",
      toAccount: "bob",
      amount: 250,
    };

    const instanceId = await client.scheduleNewOrchestration(transferOrchestration, transferInput);
    console.log(`Transfer orchestration started: ${instanceId}`);

    const result = await client.waitForOrchestrationCompletion(instanceId, undefined, 30);
    console.log(`Transfer completed: ${result.serializedOutput}`);

    // ========================================================================
    // Check final balances
    // ========================================================================

    console.log("\n--- Final balances ---");
    const aliceFinal = await client.getEntity<BankAccountState>(aliceAccount);
    const bobFinal = await client.getEntity<BankAccountState>(bobAccount);
    console.log(`Alice balance: ${aliceFinal.state?.balance}`);
    console.log(`Bob balance: ${bobFinal.state?.balance}`);

    // ========================================================================
    // Clean up
    // ========================================================================

    console.log("\n--- Cleaning up ---");
    await worker.stop();
    console.log("Worker stopped");

  } catch (error) {
    console.error("Error:", error);
    await worker.stop();
  }
})();
