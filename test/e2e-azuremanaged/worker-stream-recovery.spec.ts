// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E test for worker stream recovery behavior.
 *
 * This test verifies the full recovery flow:
 *   1. Start a worker when the DTS emulator is NOT running
 *   2. Verify initial startup fails within the configured timeout
 *   3. Start the Docker emulator and start the worker successfully
 *   4. Stop and restart the emulator
 *   5. Verify the running worker reconnects and can process orchestrations
 *
 * Environment variables:
 *   - ENDPOINT: The endpoint for the DTS emulator (default: localhost:8080)
 *   - TASKHUB: The task hub name (default: default)
 */

import { execSync } from "child_process";
import {
  ProtoOrchestrationStatus as OrchestrationStatus,
  OrchestrationContext,
  TOrchestrator,
  StructuredLogger,
  LogEvent,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

const EMULATOR_CONTAINER = "dts-emulator-stream-recovery-test";
const EMULATOR_IMAGE = "mcr.microsoft.com/dts/dts-emulator:latest";
const EMULATOR_PORT = endpoint.split(":")[1] || "8080";

/** Structured logger that captures log events for assertion. */
class CapturingLogger implements StructuredLogger {
  readonly events: { level: string; eventId: number; message: string }[] = [];

  logEvent(level: "error" | "warn" | "info" | "debug", event: LogEvent, message: string): void {
    this.events.push({ level, eventId: event.eventId, message });
  }
  error(message: string): void {
    this.events.push({ level: "error", eventId: 0, message });
  }
  warn(message: string): void {
    this.events.push({ level: "warn", eventId: 0, message });
  }
  info(message: string): void {
    this.events.push({ level: "info", eventId: 0, message });
  }
  debug(message: string): void {
    this.events.push({ level: "debug", eventId: 0, message });
  }

  /** Returns events matching a specific event ID. */
  getByEventId(eventId: number): typeof this.events {
    return this.events.filter((e) => e.eventId === eventId);
  }

  clear(): void {
    this.events.length = 0;
  }
}

function isDockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function stopEmulator(): void {
  try {
    execSync(`docker rm -f ${EMULATOR_CONTAINER}`, { stdio: "ignore" });
  } catch {
    // Container didn't exist — fine
  }
}

function startEmulator(): void {
  execSync(`docker run --name ${EMULATOR_CONTAINER} -d --rm -p ${EMULATOR_PORT}:8080 ${EMULATOR_IMAGE}`, {
    stdio: "ignore",
  });
}

/** Poll until a condition is true or timeout. */
async function waitFor(predicate: () => boolean, timeoutMs: number, intervalMs = 500): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return predicate();
}

async function startWorkerWithRetry(worker: { start(): Promise<void> }, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  do {
    try {
      await worker.start();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } while (Date.now() < deadline);

  throw lastError;
}

// Log event IDs from packages/durabletask-js/src/worker/logs.ts
const EVENT_WORKER_CONNECTED = 700;
const EVENT_STREAM_RETRY = 703;

describe("Worker Stream Recovery E2E", () => {
  const skipReason = !isDockerAvailable() ? "Docker not available" : null;

  beforeAll(() => {
    if (skipReason) return;
    // Ensure no leftover container from a previous run
    stopEmulator();
  });

  afterAll(() => {
    if (skipReason) return;
    stopEmulator();
  });

  it("should fail initial startup when the sidecar is down, then recover a post-start disconnection", async () => {
    if (skipReason) {
      console.log(`Skipping stream recovery e2e test: ${skipReason}`);
      return;
    }

    // ── Phase 1: Start worker with NO emulator running ──────────────────
    const logger = new CapturingLogger();

    const worker = new DurableTaskAzureManagedWorkerBuilder()
      .endpoint(endpoint, taskHub, null)
      .logger(logger)
      .startupTimeout(5000)
      .build();

    const orchestrator: TOrchestrator = async function recoveryOrchestrator(_: OrchestrationContext) {
      return "stream-recovery-success";
    };
    worker.addOrchestrator(orchestrator);

    await expect(worker.start()).rejects.toThrow();
    expect(logger.getByEventId(EVENT_WORKER_CONNECTED)).toHaveLength(0);

    // ── Phase 2: Start the emulator and retry startup ───────────────────
    startEmulator();
    await startWorkerWithRetry(worker, 30000);
    expect(logger.getByEventId(EVENT_WORKER_CONNECTED)).toHaveLength(1);

    // ── Phase 3: Disconnect the successfully started worker ─────────────
    logger.clear();
    stopEmulator();

    const sawRetry = await waitFor(() => logger.getByEventId(EVENT_STREAM_RETRY).length > 0, 15000);
    expect(sawRetry).toBe(true);

    // ── Phase 4: Restart the emulator and wait for reconnection ─────────
    startEmulator();
    const sawConnected = await waitFor(() => logger.getByEventId(EVENT_WORKER_CONNECTED).length > 0, 30000);

    expect(sawConnected).toBe(true);

    // ── Phase 5: Run an orchestration to prove recovery is functional ───
    const client = new DurableTaskAzureManagedClientBuilder().endpoint(endpoint, taskHub, null).build();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toContain("stream-recovery-success");

    // ── Cleanup ─────────────────────────────────────────────────────────
    await worker.stop();
    await client.stop();
  }, 120000);
});
