// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E test for worker stream recovery behavior.
 *
 * These tests verify that a worker reconnects after DTS becomes available and
 * that stopping a worker cancels reconnect work from that worker run.
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
const WATCHDOG_TIMEOUT_MS = 3000;
const WATCHDOG_EVENT_TIMEOUT_MS = 15000;
const DISABLED_WATCHDOG_PAUSE_MS = 6000;
const WORKER_CONNECTION_TIMEOUT_MS = 30000;

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
    unpauseEmulator();
  } catch {
    // Container didn't exist or wasn't paused — fine
  }
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

function pauseEmulator(): void {
  execSync(`docker pause ${EMULATOR_CONTAINER}`, { stdio: "ignore" });
}

function unpauseEmulator(): void {
  execSync(`docker unpause ${EMULATOR_CONTAINER}`, { stdio: "ignore" });
}

function isEmulatorPaused(): boolean {
  return execSync(`docker inspect --format={{.State.Paused}} ${EMULATOR_CONTAINER}`)
    .toString()
    .trim()
    .toLowerCase()
    .startsWith("true");
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
const EVENT_STREAM_ENDED = 702;
const EVENT_STREAM_RETRY = 703;
const EVENT_STREAM_ERROR = 704;
const EVENT_CONNECTION_RETRY = 709;
const EVENT_STREAM_ERROR_INFO = 736;
const EVENT_STREAM_TIMEOUT = 738;
const EVENT_CHANNEL_RECREATED = 740;

describe("Worker Stream Recovery E2E", () => {
  const skipReason = !isDockerAvailable() ? "Docker not available" : null;

  beforeEach(() => {
    if (skipReason) return;
    stopEmulator();
  });

  afterEach(() => {
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

    const worker = new DurableTaskAzureManagedWorkerBuilder().endpoint(endpoint, taskHub, null).logger(logger).build();

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
    const client = new DurableTaskAzureManagedClientBuilder().endpoint(endpoint, taskHub, null).build();

    const id = await client.scheduleNewOrchestration(orchestrator);
    const state = await client.waitForOrchestrationCompletion(id, undefined, 30);

    expect(state).toBeDefined();
    expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
    expect(state?.serializedOutput).toContain("stream-recovery-success");

    // ── Cleanup ─────────────────────────────────────────────────────────
    await worker.stop();
    await client.stop();
  }, 90000);

  it("should cancel a stopped run's reconnect before restarting", async () => {
    if (skipReason) {
      console.log(`Skipping stream recovery e2e test: ${skipReason}`);
      return;
    }

    const logger = new CapturingLogger();
    const worker = new DurableTaskAzureManagedWorkerBuilder().endpoint(endpoint, taskHub, null).logger(logger).build();
    const orchestrator: TOrchestrator = async function restartedWorkerOrchestrator(_: OrchestrationContext) {
      return "worker-restart-success";
    };
    worker.addOrchestrator(orchestrator);

    let workerRunning = false;
    let client: ReturnType<DurableTaskAzureManagedClientBuilder["build"]> | undefined;

    try {
      await worker.start();
      workerRunning = true;

      const enteredSecondBackoff = await waitFor(
        () => logger.getByEventId(EVENT_CONNECTION_RETRY).length >= 2,
        15000,
        100,
      );
      expect(enteredSecondBackoff).toBe(true);

      const stopPromise = worker.stop();
      startEmulator();
      await stopPromise;
      workerRunning = false;

      logger.clear();
      await worker.start();
      workerRunning = true;
      const restartedWorkerConnected = await waitFor(
        () => logger.getByEventId(EVENT_WORKER_CONNECTED).length > 0,
        30000,
      );
      expect(restartedWorkerConnected).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 3000));
      expect(logger.getByEventId(EVENT_WORKER_CONNECTED)).toHaveLength(1);

      client = new DurableTaskAzureManagedClientBuilder().endpoint(endpoint, taskHub, null).build();
      const id = await client.scheduleNewOrchestration(orchestrator);
      const state = await client.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toContain("worker-restart-success");
    } finally {
      if (workerRunning) {
        await worker.stop();
      }
      await client?.stop();
    }
  }, 90000);

  it("recovers a paused established stream through the watchdog and channel recreation", async () => {
    if (skipReason) {
      console.log(`Skipping paused stream watchdog e2e test: ${skipReason}`);
      return;
    }

    const logger = new CapturingLogger();
    const orchestrator: TOrchestrator = async function pausedStreamWatchdogOrchestrator(_: OrchestrationContext) {
      return "paused-stream-watchdog-recovery";
    };
    const worker = new DurableTaskAzureManagedWorkerBuilder()
      .endpoint(endpoint, taskHub, null)
      .logger(logger)
      .silentDisconnectTimeout(WATCHDOG_TIMEOUT_MS)
      .channelRecreateFailureThreshold(1)
      .build();
    worker.addOrchestrator(orchestrator);

    let workerRunning = false;
    let emulatorPaused = false;
    let client: ReturnType<DurableTaskAzureManagedClientBuilder["build"]> | undefined;

    try {
      startEmulator();
      await worker.start();
      workerRunning = true;

      const initiallyConnected = await waitFor(
        () => logger.getByEventId(EVENT_WORKER_CONNECTED).length > 0,
        WORKER_CONNECTION_TIMEOUT_MS,
      );
      expect(initiallyConnected).toBe(true);

      logger.clear();
      pauseEmulator();
      emulatorPaused = true;

      const watchdogRecreatedChannel = await waitFor(
        () =>
          logger.getByEventId(EVENT_STREAM_TIMEOUT).length > 0 &&
          logger.getByEventId(EVENT_CHANNEL_RECREATED).length > 0,
        WATCHDOG_EVENT_TIMEOUT_MS,
        100,
      );
      expect(watchdogRecreatedChannel).toBe(true);
      expect(isEmulatorPaused()).toBe(true);

      const timeoutIndex = logger.events.findIndex((event) => event.eventId === EVENT_STREAM_TIMEOUT);
      const recreationIndex = logger.events.findIndex((event) => event.eventId === EVENT_CHANNEL_RECREATED);
      const precedingEventIds = logger.events.slice(0, timeoutIndex).map((event) => event.eventId);

      expect(timeoutIndex).toBeGreaterThanOrEqual(0);
      expect(recreationIndex).toBeGreaterThan(timeoutIndex);
      expect(precedingEventIds).not.toContain(EVENT_STREAM_ENDED);
      expect(precedingEventIds).not.toContain(EVENT_STREAM_ERROR);
      expect(precedingEventIds).not.toContain(EVENT_STREAM_ERROR_INFO);
      expect(logger.getByEventId(EVENT_WORKER_CONNECTED)).toHaveLength(0);

      unpauseEmulator();
      emulatorPaused = false;

      const replacementConnected = await waitFor(
        () => logger.getByEventId(EVENT_WORKER_CONNECTED).length > 0,
        WORKER_CONNECTION_TIMEOUT_MS,
      );
      expect(replacementConnected).toBe(true);

      client = new DurableTaskAzureManagedClientBuilder().endpoint(endpoint, taskHub, null).build();
      const id = await client.scheduleNewOrchestration(orchestrator);
      const state = await client.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toBe(JSON.stringify("paused-stream-watchdog-recovery"));
    } finally {
      if (emulatorPaused) {
        try {
          unpauseEmulator();
        } catch {
          // Cleanup continues with forced container removal
        }
      }
      try {
        if (workerRunning) {
          await worker.stop();
        }
      } finally {
        try {
          await client?.stop();
        } finally {
          stopEmulator();
        }
      }
    }
  }, 90000);

  it("leaves a paused established stream connected when the watchdog is disabled", async () => {
    if (skipReason) {
      console.log(`Skipping disabled paused stream watchdog e2e test: ${skipReason}`);
      return;
    }

    expect(DISABLED_WATCHDOG_PAUSE_MS).toBeGreaterThan(WATCHDOG_TIMEOUT_MS);

    const logger = new CapturingLogger();
    const orchestrator: TOrchestrator = async function pausedStreamWithoutWatchdogOrchestrator(
      _: OrchestrationContext,
    ) {
      return "paused-stream-without-watchdog";
    };
    const worker = new DurableTaskAzureManagedWorkerBuilder()
      .endpoint(endpoint, taskHub, null)
      .logger(logger)
      .silentDisconnectTimeout(0)
      .channelRecreateFailureThreshold(1)
      .build();
    worker.addOrchestrator(orchestrator);

    let workerRunning = false;
    let emulatorPaused = false;
    let client: ReturnType<DurableTaskAzureManagedClientBuilder["build"]> | undefined;

    try {
      startEmulator();
      await worker.start();
      workerRunning = true;

      const initiallyConnected = await waitFor(
        () => logger.getByEventId(EVENT_WORKER_CONNECTED).length > 0,
        WORKER_CONNECTION_TIMEOUT_MS,
      );
      expect(initiallyConnected).toBe(true);

      logger.clear();
      pauseEmulator();
      emulatorPaused = true;

      await new Promise((resolve) => setTimeout(resolve, DISABLED_WATCHDOG_PAUSE_MS));

      expect(isEmulatorPaused()).toBe(true);
      expect(logger.getByEventId(EVENT_STREAM_TIMEOUT)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_STREAM_RETRY)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_CONNECTION_RETRY)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_CHANNEL_RECREATED)).toHaveLength(0);

      unpauseEmulator();
      emulatorPaused = false;

      client = new DurableTaskAzureManagedClientBuilder().endpoint(endpoint, taskHub, null).build();
      const id = await client.scheduleNewOrchestration(orchestrator);
      const state = await client.waitForOrchestrationCompletion(id, undefined, 30);

      expect(state).toBeDefined();
      expect(state?.runtimeStatus).toBe(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toBe(JSON.stringify("paused-stream-without-watchdog"));
      expect(logger.getByEventId(EVENT_WORKER_CONNECTED)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_STREAM_RETRY)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_CONNECTION_RETRY)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_CHANNEL_RECREATED)).toHaveLength(0);
    } finally {
      if (emulatorPaused) {
        try {
          unpauseEmulator();
        } catch {
          // Cleanup continues with forced container removal
        }
      }
      try {
        if (workerRunning) {
          await worker.stop();
        }
      } finally {
        try {
          await client?.stop();
        } finally {
          stopEmulator();
        }
      }
    }
  }, 90000);
});
