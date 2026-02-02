// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * This example demonstrates a simple Counter entity using Durable Entities.
 *
 * Durable Entities are stateful objects that can be addressed by a unique ID.
 * They process operations one at a time, ensuring consistency without explicit locks.
 *
 * Key concepts demonstrated:
 * - Defining an entity with TaskEntity<TState>
 * - Entity operations (add, get, reset)
 * - Signaling entities from a client (fire-and-forget)
 * - Getting entity state from a client
 *
 * This example can run against:
 * 1. DTS Emulator (default with npm run start:emulator)
 *    docker run -i -p 8080:8080 -d mcr.microsoft.com/dts/dts-emulator:latest
 * 2. Local sidecar (npm run start with localhost:4001)
 */

import { TaskEntity, EntityInstanceId } from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

// Read environment variables for DTS emulator or local sidecar
const endpoint = process.env.ENDPOINT || "localhost:4001";
const taskHub = process.env.TASKHUB || "default";

// ============================================================================
// Step 1: Define the entity state type
// ============================================================================

/**
 * The state type for our Counter entity.
 */
interface CounterState {
  value: number;
}

// ============================================================================
// Step 2: Define the Counter entity class
// ============================================================================

/**
 * A simple counter entity that can be incremented, decremented, and reset.
 *
 * Operations are defined as public methods on the class.
 * The operation name is the method name (case-insensitive).
 */
class CounterEntity extends TaskEntity<CounterState> {
  /**
   * Adds a value to the counter.
   * @param amount - The amount to add (can be negative to subtract).
   * @returns The new counter value.
   */
  add(amount: number): number {
    this.state.value += amount;
    return this.state.value;
  }

  /**
   * Gets the current counter value.
   * @returns The current value.
   */
  get(): number {
    return this.state.value;
  }

  /**
   * Resets the counter to zero.
   */
  reset(): void {
    this.state.value = 0;
  }

  /**
   * Initializes the entity state when it's first created.
   * @returns The initial state with value = 0.
   */
  protected initializeState(): CounterState {
    return { value: 0 };
  }
}

// ============================================================================
// Step 3: Main - Set up worker and client, then interact with the entity
// ============================================================================

(async () => {
  console.log(`Connecting to endpoint: ${endpoint}, taskHub: ${taskHub}`);

  // Build client and worker for the DTS emulator or local sidecar
  const client = new DurableTaskAzureManagedClientBuilder()
    .endpoint(endpoint)
    .taskHubName(taskHub)
    .useGrpc()
    .build();

  const worker = new DurableTaskAzureManagedWorkerBuilder()
    .endpoint(endpoint)
    .taskHubName(taskHub)
    .useGrpc()
    .build();

  // Register the entity with the worker
  worker.addNamedEntity("Counter", () => new CounterEntity());

  try {
    await worker.start();
    console.log("Worker started successfully");

    // Create an entity ID - this identifies a specific counter instance
    const counterId = new EntityInstanceId("Counter", "my-counter");

    // ========================================================================
    // Signal the entity (fire-and-forget operations)
    // ========================================================================

    console.log("\n--- Signaling entity operations ---");

    // Signal the counter to add 5 (doesn't wait for result)
    await client.signalEntity(counterId, "add", 5);
    console.log("Signaled: add(5)");

    // Signal the counter to add 3
    await client.signalEntity(counterId, "add", 3);
    console.log("Signaled: add(3)");

    // Signal the counter to add -2 (subtract)
    await client.signalEntity(counterId, "add", -2);
    console.log("Signaled: add(-2)");

    // Wait a moment for signals to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // ========================================================================
    // Get the entity state
    // ========================================================================

    console.log("\n--- Getting entity state ---");

    const metadata = await client.getEntity<CounterState>(counterId);
    if (metadata.exists) {
      console.log(`Counter value: ${metadata.state?.value}`);
      console.log(`Last modified: ${metadata.lastModifiedTime}`);
    } else {
      console.log("Entity does not exist yet");
    }

    // ========================================================================
    // Reset and verify
    // ========================================================================

    console.log("\n--- Resetting counter ---");

    await client.signalEntity(counterId, "reset");
    console.log("Signaled: reset()");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const afterReset = await client.getEntity<CounterState>(counterId);
    console.log(`Counter value after reset: ${afterReset.state?.value}`);

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
