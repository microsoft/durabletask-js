// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Verification sample for PR #180: Use toLowerCase() consistently for event name normalization
//
// Customer scenario: An order processing pipeline uses durable orchestrations to
// coordinate multi-step workflows. External systems raise events (e.g., "ORDER_APPROVED",
// "ITEM_SHIPPED") to advance orchestrations. When the worker runs on a machine with a
// non-English locale (e.g., Turkish), event names containing "I" were normalized
// differently by waitForExternalEvent() (toLocaleLowerCase → "ıtem") vs the executor's
// handleEventRaised() (toLowerCase → "item"), causing the orchestration to hang forever.
//
// Before fix: Orchestrations hang indefinitely when external events use mixed-case names
// on systems with certain locale settings, because event name lookup keys diverge.
// After fix: Both code paths use toLowerCase(), ensuring consistent event name matching
// regardless of system locale.

import {
  OrchestrationContext,
  TOrchestrator,
  ActivityContext,
  TActivity,
} from "@microsoft/durabletask-js";
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

const endpoint = process.env.ENDPOINT || "localhost:8080";
const taskHub = process.env.TASKHUB || "default";

// =============================================================================
// Activity: Processes an order after approval
// =============================================================================

const processOrderActivity: TActivity<string, string> = async (
  _ctx: ActivityContext,
  orderId: string,
): Promise<string> => {
  return `Order ${orderId} processed successfully`;
};

// =============================================================================
// Orchestrator: Waits for external approval event with UPPER_CASE name
// =============================================================================

const orderApprovalOrchestrator: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  orderId: string,
): any {
  // Wait for approval event — uses UPPER_CASE name.
  // Before the fix, if the system locale was Turkish, "ORDER_APPROVED" would
  // normalize to "order_approved" via toLowerCase() but "order_approved" via
  // toLocaleLowerCase() — causing a mismatch when the external event is raised.
  const approvalData: { approver: string; approved: boolean } =
    yield ctx.waitForExternalEvent("ORDER_APPROVED");

  if (!approvalData.approved) {
    return { orderId, status: "rejected", approver: approvalData.approver };
  }

  // Process the order after approval
  const result: string = yield ctx.callActivity(processOrderActivity, orderId);

  return { orderId, status: "completed", approver: approvalData.approver, result };
};

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

  worker.addOrchestrator(orderApprovalOrchestrator);
  worker.addActivity(processOrderActivity);

  await worker.start();
  console.log("Worker started");

  // Test: Raise event with lowercase name while orchestrator waits with UPPER_CASE name.
  // This is the exact scenario that would fail with toLocaleLowerCase() in Turkish locale.
  const orderId = `ORD-${Date.now()}`;
  const instanceId = await client.scheduleNewOrchestration(orderApprovalOrchestrator, orderId);
  console.log(`Orchestration scheduled: ${instanceId} for order ${orderId}`);

  // Wait briefly for the orchestration to start and begin waiting for the event
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Raise the event with lowercase name — the orchestrator waits for "ORDER_APPROVED"
  // The event name must be case-insensitively matched
  console.log('Raising event "order_approved" (lowercase) for orchestrator waiting on "ORDER_APPROVED" (uppercase)');
  await client.raiseOrchestrationEvent(instanceId, "order_approved", {
    approver: "manager@example.com",
    approved: true,
  });

  // Wait for orchestration to complete (timeout 30s)
  const state = await client.waitForOrchestrationCompletion(instanceId, undefined, 30);
  console.log(`Orchestration status: ${state?.runtimeStatus}`);
  console.log(`Orchestration output: ${state?.serializedOutput}`);

  // Parse status — status 1 = COMPLETED in the protobuf enum
  const statusStr = state?.runtimeStatus?.toString() ?? "";
  const isCompleted = statusStr === "1" || statusStr.includes("COMPLETED");

  let outputValid = false;
  try {
    const output = JSON.parse(state?.serializedOutput ?? "null");
    outputValid =
      output !== null &&
      output.orderId === orderId &&
      output.status === "completed" &&
      output.approver === "manager@example.com";
  } catch {
    outputValid = false;
  }

  const passed = isCompleted && outputValid;

  console.log("\n=== VERIFICATION RESULT ===");
  console.log(
    JSON.stringify(
      {
        pr: 180,
        scenario: "External event name matching with mixed case (locale-safe toLowerCase)",
        instanceId,
        orderId,
        orchestrationStatus: statusStr,
        orchestrationOutput: state?.serializedOutput,
        checks: {
          orchestrationCompleted: isCompleted,
          outputValid,
          eventNameMatching: {
            waitedFor: "ORDER_APPROVED",
            raised: "order_approved",
            matched: isCompleted,
          },
        },
        passed,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  await worker.stop();
  await client.stop();
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error("Verification failed with error:", err);
  process.exit(1);
});
