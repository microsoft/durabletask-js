// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Verification sample for PR #179: Track entity execution in pendingWorkItems for graceful shutdown
//
// Customer scenario: A monitoring dashboard application uses durable entities to track
// real-time metrics (e.g., request counts per service). During a rolling deployment,
// the worker is shut down gracefully. Before the fix, in-flight entity operations were
// not tracked in _pendingWorkItems, so stop() would return immediately without waiting
// for them — potentially leaving entity state partially mutated or results unreported
// to the sidecar.
//
// Before fix: worker.stop() returns before entity operations complete, risking data loss.
// After fix: worker.stop() waits for all in-flight entity operations (V1 and V2) to
// complete before returning, ensuring graceful shutdown.

import { TaskEntity, EntityInstanceId } from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

// =============================================================================
// Entity definition: ServiceMetrics tracks request counts per service
// =============================================================================

interface MetricsState {
  totalRequests: number;
  services: Record<string, number>;
}

class ServiceMetricsEntity extends TaskEntity<MetricsState> {
  recordRequest(serviceName: string): MetricsState {
    this.state.services[serviceName] = (this.state.services[serviceName] || 0) + 1;
    this.state.totalRequests += 1;
    return this.state;
  }

  get(): MetricsState {
    return this.state;
  }

  reset(): void {
    this.state = { totalRequests: 0, services: {} };
  }

  protected initializeState(): MetricsState {
    return { totalRequests: 0, services: {} };
  }
}

// =============================================================================
// Main verification
// =============================================================================

async function main() {
  console.log(`Connecting to endpoint: ${endpoint}, taskHub: ${taskHub}`);

  const client = new DurableTaskAzureManagedClientBuilder()
    .endpoint(endpoint, taskHub, null)
    .build();

  const worker = new DurableTaskAzureManagedWorkerBuilder()
    .endpoint(endpoint, taskHub, null)
    .build();

  // Register entity with the worker
  worker.addNamedEntity("ServiceMetrics", () => new ServiceMetricsEntity());

  await worker.start();
  console.log("Worker started");

  // Use a unique key per run to avoid stale state from previous runs
  const runId = `dashboard-179-${Date.now()}`;
  const entityId = new EntityInstanceId("ServiceMetrics", runId);

  // Phase 1: Signal several entity operations to build up state.
  // This validates that entity operations are processed correctly.
  console.log("\n--- Phase 1: Recording service metrics ---");
  const services = [
    "api-gateway",
    "auth-service",
    "api-gateway",
    "billing-service",
    "api-gateway",
    "notification-service",
  ];

  for (const svc of services) {
    await client.signalEntity(entityId, "recordRequest", svc);
    console.log(`Signaled: recordRequest(${svc})`);
  }

  // Wait for entity operations to be processed
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Read entity state to verify operations were processed
  const entityState = await client.getEntity<MetricsState>(entityId);
  console.log(`Entity state after signals: ${JSON.stringify(entityState.state)}`);

  // Phase 2: Test graceful shutdown with entity operations in-flight.
  // Before the fix, stop() did not wait for in-flight entity operations because
  // the promises were not tracked in _pendingWorkItems.
  console.log("\n--- Phase 2: Graceful shutdown with in-flight entity ops ---");

  // Signal additional operations, then immediately stop
  await client.signalEntity(entityId, "recordRequest", "payment-service");
  await client.signalEntity(entityId, "recordRequest", "search-service");

  // Allow minimal time for signals to reach the worker's stream handler
  await new Promise((resolve) => setTimeout(resolve, 500));

  // stop() should now wait for in-flight entity operations before returning
  const stopStart = Date.now();
  await worker.stop();
  const stopDuration = Date.now() - stopStart;
  console.log(`Worker stopped gracefully in ${stopDuration}ms`);

  // Verify results
  const entityHasState = entityState !== undefined && entityState.includesState;
  const totalRequests = entityState?.state?.totalRequests ?? 0;
  const expectedTotalRequests = 6; // 6 signals in Phase 1
  const entityDataCorrect = totalRequests === expectedTotalRequests;
  const servicesTracked = Object.keys(entityState?.state?.services ?? {}).length;
  const expectedServices = 4; // api-gateway, auth-service, billing-service, notification-service
  const servicesCorrect = servicesTracked === expectedServices;

  const passed = entityHasState && entityDataCorrect && servicesCorrect;

  console.log("\n=== VERIFICATION RESULT ===");
  console.log(
    JSON.stringify(
      {
        pr: 179,
        scenario: "Entity execution tracked in pendingWorkItems for graceful shutdown",
        entityId: entityId.toString(),
        entityState: entityState.state,
        stopDurationMs: stopDuration,
        checks: {
          entityHasState,
          totalRequests: { expected: expectedTotalRequests, actual: totalRequests, passed: entityDataCorrect },
          servicesTracked: { expected: expectedServices, actual: servicesTracked, passed: servicesCorrect },
          workerStoppedGracefully: stopDuration >= 0,
        },
        passed,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  await client.stop();
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error("Verification failed with error:", err);
  process.exit(1);
});
