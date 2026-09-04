// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * E2E test for worker stream recovery behavior.
 *
 * These tests verify that a worker reconnects after DTS becomes available and
 * that stopping a worker cancels reconnect work from that worker run.
 *
 * Environment variables:
 *   - ENDPOINT: The endpoint for the DTS emulator (default: http://localhost:8080)
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

const endpoint = (process.env.ENDPOINT || "http://localhost:8080").trim();
const taskHub = process.env.TASKHUB || "default";

const EMULATOR_CONTAINER = "dts-emulator-stream-recovery-test";
const EMULATOR_IMAGE = "mcr.microsoft.com/dts/dts-emulator:latest";
const endpointUrl = new URL(/^https?:\/\//i.test(endpoint) ? endpoint : `https://${endpoint}`);
const EMULATOR_PORT = endpointUrl.port || (endpointUrl.protocol === "http:" ? "80" : "443");
const WATCHDOG_TIMEOUT_MS = 10000;
const WATCHDOG_EVENT_TIMEOUT_MS = 30000;
const DISABLED_WATCHDOG_PAUSE_MS = WATCHDOG_TIMEOUT_MS + 5000;

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
    // Container may not exist or may already be running.
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
  return (
    execSync(`docker inspect --format "{{.State.Paused}}" ${EMULATOR_CONTAINER}`, {
      encoding: "utf8",
    }).trim() === "true"
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
const EVENT_STREAM_ENDED = 702;
const EVENT_STREAM_RETRY = 703;
const EVENT_STREAM_ERROR = 704;
const EVENT_CONNECTION_RETRY = 709;
const EVENT_STREAM_ERROR_INFO = 736;
const EVENT_STREAM_TIMEOUT = 738;
const EVENT_CHANNEL_RECREATING = 739;
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

  it("should reconnect a paused established stream and complete new work", async () => {
    if (skipReason) {
      console.log(`Skipping stream recovery e2e test: ${skipReason}`);
      return;
    }

    startEmulator();
    const logger = new CapturingLogger();
    const worker = new DurableTaskAzureManagedWorkerBuilder()
      .endpoint(endpoint, taskHub, null)
      .logger(logger)
      .silentDisconnectTimeout(WATCHDOG_TIMEOUT_MS)
      .channelRecreateFailureThreshold(1)
      .build();
    const client = new DurableTaskAzureManagedClientBuilder().endpoint(endpoint, taskHub, null).build();
    const orchestrator: TOrchestrator = async function pausedStreamOrchestrator(_: OrchestrationContext) {
      return "paused-stream-recovery-success";
    };
    worker.addOrchestrator(orchestrator);

    let workerRunning = false;
    let emulatorPaused = false;
    let instanceId: string | undefined;
    try {
      await worker.start();
      workerRunning = true;
      expect(await waitFor(() => logger.getByEventId(EVENT_WORKER_CONNECTED).length === 1, 30000, 100)).toBe(true);

      logger.clear();
      pauseEmulator();
      emulatorPaused = true;

      expect(
        await waitFor(() => logger.getByEventId(EVENT_STREAM_TIMEOUT).length === 1, WATCHDOG_EVENT_TIMEOUT_MS, 100),
      ).toBe(true);
      expect(logger.getByEventId(EVENT_CHANNEL_RECREATING)).toHaveLength(1);
      expect(logger.getByEventId(EVENT_CHANNEL_RECREATED)).toHaveLength(1);
      expect(isEmulatorPaused()).toBe(true);

      const timeoutIndex = logger.events.findIndex((event) => event.eventId === EVENT_STREAM_TIMEOUT);
      const recreatingIndex = logger.events.findIndex((event) => event.eventId === EVENT_CHANNEL_RECREATING);
      const recreatedIndex = logger.events.findIndex((event) => event.eventId === EVENT_CHANNEL_RECREATED);
      expect(timeoutIndex).toBeGreaterThanOrEqual(0);
      expect(recreatingIndex).toBeGreaterThan(timeoutIndex);
      expect(recreatedIndex).toBeGreaterThan(recreatingIndex);
      expect(
        logger.events
          .slice(0, timeoutIndex)
          .filter(
            (event) =>
              event.eventId === EVENT_STREAM_ENDED ||
              event.eventId === EVENT_STREAM_ERROR ||
              event.eventId === EVENT_STREAM_ERROR_INFO,
          ),
      ).toHaveLength(0);

      unpauseEmulator();
      emulatorPaused = false;
      expect(await waitFor(() => logger.getByEventId(EVENT_WORKER_CONNECTED).length === 1, 30000, 100)).toBe(true);

      instanceId = await client.scheduleNewOrchestration(orchestrator);
      const state = await client.waitForOrchestrationCompletion(instanceId, undefined, 30);

      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify("paused-stream-recovery-success"));
      expect((await client.purgeOrchestration(instanceId))?.deletedInstanceCount).toBe(1);
      instanceId = undefined;
    } finally {
      if (emulatorPaused) {
        try {
          unpauseEmulator();
        } catch {
          // Best-effort so worker and container cleanup can continue.
        }
      }
      if (instanceId) {
        try {
          await client.terminateOrchestration(instanceId, "test cleanup");
        } catch {
          // The instance may already be terminal.
        }
      }
      if (workerRunning) {
        await worker.stop();
      }
      await client.stop();
      stopEmulator();
    }
  }, 120000);

  it("should leave a paused stream alone when the watchdog is disabled", async () => {
    if (skipReason) {
      console.log(`Skipping stream recovery e2e test: ${skipReason}`);
      return;
    }

    startEmulator();
    const logger = new CapturingLogger();
    const worker = new DurableTaskAzureManagedWorkerBuilder()
      .endpoint(endpoint, taskHub, null)
      .logger(logger)
      .silentDisconnectTimeout(0)
      .channelRecreateFailureThreshold(1)
      .build();
    const client = new DurableTaskAzureManagedClientBuilder().endpoint(endpoint, taskHub, null).build();
    const orchestrator: TOrchestrator = async function disabledWatchdogOrchestrator(_: OrchestrationContext) {
      return "disabled-watchdog-success";
    };
    worker.addOrchestrator(orchestrator);

    let workerRunning = false;
    let emulatorPaused = false;
    let instanceId: string | undefined;
    try {
      await worker.start();
      workerRunning = true;
      expect(await waitFor(() => logger.getByEventId(EVENT_WORKER_CONNECTED).length === 1, 30000, 100)).toBe(true);

      logger.clear();
      pauseEmulator();
      emulatorPaused = true;
      await new Promise((resolve) => setTimeout(resolve, DISABLED_WATCHDOG_PAUSE_MS));

      expect(isEmulatorPaused()).toBe(true);
      expect(logger.getByEventId(EVENT_STREAM_TIMEOUT)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_STREAM_RETRY)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_CONNECTION_RETRY)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_CHANNEL_RECREATING)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_CHANNEL_RECREATED)).toHaveLength(0);
      expect(logger.getByEventId(EVENT_WORKER_CONNECTED)).toHaveLength(0);

      unpauseEmulator();
      emulatorPaused = false;
      instanceId = await client.scheduleNewOrchestration(orchestrator);
      const state = await client.waitForOrchestrationCompletion(instanceId, undefined, 30);

      expect(state?.runtimeStatus).toEqual(OrchestrationStatus.ORCHESTRATION_STATUS_COMPLETED);
      expect(state?.serializedOutput).toEqual(JSON.stringify("disabled-watchdog-success"));
      expect(logger.getByEventId(EVENT_WORKER_CONNECTED)).toHaveLength(0);
      expect((await client.purgeOrchestration(instanceId))?.deletedInstanceCount).toBe(1);
      instanceId = undefined;
    } finally {
      if (emulatorPaused) {
        try {
          unpauseEmulator();
        } catch {
          // Best-effort so worker and container cleanup can continue.
        }
      }
      if (instanceId) {
        try {
          await client.terminateOrchestration(instanceId, "test cleanup");
        } catch {
          // The instance may already be terminal.
        }
      }
      if (workerRunning) {
        await worker.stop();
      }
      await client.stop();
      stopEmulator();
    }
  }, 120000);
});
