// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E test for worker stream recovery behavior.
 *
 * This test verifies the full recovery flow:
 *   1. Start a worker when the DTS emulator is NOT running
 *   2. Verify the worker retries (via structured log capture)
 *   3. Start the Docker emulator
 *   4. Verify the worker reconnects and can process orchestrations
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
  execSync(
    `docker run --name ${EMULATOR_CONTAINER} -d --rm -p ${EMULATOR_PORT}:8080 ${EMULATOR_IMAGE}`,
    { stdio: "ignore" },
  );
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

// Log event IDs from packages/durabletask-js/src/worker/logs.ts
const EVENT_WORKER_CONNECTED = 700;
const EVENT_STREAM_RETRY = 703;
const EVENT_CONNECTION_RETRY = 705;

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

  it("should retry when sidecar is down, then reconnect and complete an orchestration when sidecar starts", async () => {
    if (skipReason) {
      console.log(`Skipping stream recovery e2e test: ${skipReason}`);
      return;
    }

    // ── Phase 1: Start worker with NO emulator running ──────────────────
    const logger = new CapturingLogger();

    const worker = new DurableTaskAzureManagedWorkerBuilder()
      .endpoint(endpoint, taskHub, null)
      .logger(logger)
      .build();

    const orchestrator: TOrchestrator = async function recoveryOrchestrator(_: OrchestrationContext) {
      return "stream-recovery-success";
    };
    worker.addOrchestrator(orchestrator);

    // start() should not throw even though the sidecar is unreachable
    await worker.start();

    // ── Phase 2: Verify retries are happening ───────────────────────────
    const sawRetries = await waitFor(() => {
      const retryEvents = logger.getByEventId(EVENT_STREAM_RETRY);
      const connRetryEvents = logger.getByEventId(EVENT_CONNECTION_RETRY);
      return retryEvents.length + connRetryEvents.length >= 2;
    }, 15000);

    expect(sawRetries).toBe(true);

    // ── Phase 3: Start the emulator ─────────────────────────────────────
    startEmulator();

    // ── Phase 4: Wait for the worker to reconnect ───────────────────────
    const sawConnected = await waitFor(() => {
      return logger.getByEventId(EVENT_WORKER_CONNECTED).length > 0;
    }, 30000);

    expect(sawConnected).toBe(true);

    // ── Phase 5: Run an orchestration to prove the worker is functional ─
    const client = new DurableTaskAzureManagedClientBuilder()
      .endpoint(endpoint, taskHub, null)
      .build();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toContain("stream-recovery-success");

    // ── Cleanup ─────────────────────────────────────────────────────────
    await worker.stop();
    await client.stop();
  }, 90000);
});
