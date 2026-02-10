// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This sample demonstrates event-driven orchestration patterns:
//   1. External events — wait for human approval via waitForExternalEvent
//   2. Timer-based timeout — race approval against a deadline with whenAny
//   3. Custom status — publish orchestration progress via setCustomStatus
//   4. sendEvent — one orchestration sends an event to another
//   5. Multiple external events — wait for several events in sequence

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
  ConsoleLogger,
} from "@microsoft/durabletask-js-azuremanaged";
import {
  OrchestrationContext,
  ActivityContext,
  TOrchestrator,
  whenAny,
} from "@microsoft/durabletask-js";

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

const submitRequest = async (_ctx: ActivityContext, request: { amount: number }): Promise<string> => {
  console.log(`  [submitRequest] Purchase request submitted: $${request.amount}`);
  return `REQ-${Date.now()}`;
};

const processApproval = async (_ctx: ActivityContext, data: { requestId: string; approved: boolean }): Promise<string> => {
  console.log(`  [processApproval] Request ${data.requestId}: ${data.approved ? "APPROVED" : "REJECTED"}`);
  return data.approved ? "Order placed" : "Order cancelled";
};

const notifyTimeout = async (_ctx: ActivityContext, requestId: string): Promise<string> => {
  console.log(`  [notifyTimeout] Request ${requestId} timed out — auto-rejected`);
  return "Timed out — auto-rejected";
};

// ---------------------------------------------------------------------------
// Orchestrators
// ---------------------------------------------------------------------------

/**
 * 1 & 2 & 3. Approval workflow with timeout and custom status.
 *
 * - Submits a purchase request
 * - Sets custom status to "Awaiting approval"
 * - Waits for an external "approval" event OR a 10-second timer
 * - Uses whenAny to race the event against the timer
 * - Updates custom status based on outcome
 */
const approvalOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, amount: number): any {
  // Step 1: Submit the request
  const requestId: string = yield ctx.callActivity(submitRequest, { amount });
  ctx.setCustomStatus({ stage: "Awaiting approval", requestId });

  // Step 2: Race external event vs timer
  const approvalEvent = ctx.waitForExternalEvent<{ approved: boolean }>("approval");
  const timeout = ctx.createTimer(5); // 5 seconds

  const winner = yield whenAny([approvalEvent, timeout]);

  let result: string;
  if (winner === approvalEvent) {
    // Human responded in time
    const decision = approvalEvent.getResult();
    ctx.setCustomStatus({ stage: "Processing", requestId, approved: decision.approved });
    result = yield ctx.callActivity(processApproval, { requestId, approved: decision.approved });
  } else {
    // Timer fired first — timed out
    ctx.setCustomStatus({ stage: "Timed out", requestId });
    result = yield ctx.callActivity(notifyTimeout, requestId);
  }

  ctx.setCustomStatus({ stage: "Completed", requestId });
  return result;
};

/**
 * 4. sendEvent — one orchestration sends an event to another.
 *
 * This "notifier" orchestration sends an approval event to a target
 * orchestration identified by its instance ID (passed as input).
 */
const notifierOrchestrator: TOrchestrator = async function* (
  ctx: OrchestrationContext,
  targetInstanceId: string,
): any {
  // Wait a moment before sending (simulate some processing)
  yield ctx.createTimer(1);

  // Send approval event to the target orchestration
  ctx.sendEvent(targetInstanceId, "approval", { approved: true });

  return `Sent approval to ${targetInstanceId}`;
};

/**
 * 5. Multiple external events — waits for two events in sequence.
 */
const multiEventOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
  ctx.setCustomStatus("Waiting for event 1");
  const event1: string = yield ctx.waitForExternalEvent<string>("event1");

  ctx.setCustomStatus("Waiting for event 2");
  const event2: string = yield ctx.waitForExternalEvent<string>("event2");

  ctx.setCustomStatus("All events received");
  return { event1, event2 };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  const logger = new ConsoleLogger();
  const connectionString =
    process.env.DURABLE_TASK_SCHEDULER_CONNECTION_STRING ||
    "Endpoint=http://localhost:8080;Authentication=None;TaskHub=default";

  const client = new DurableTaskAzureManagedClientBuilder()
    .connectionString(connectionString)
    .logger(logger)
    .build();

  const worker = new DurableTaskAzureManagedWorkerBuilder()
    .connectionString(connectionString)
    .logger(logger)
    .addOrchestrator(approvalOrchestrator)
    .addOrchestrator(notifierOrchestrator)
    .addOrchestrator(multiEventOrchestrator)
    .addActivity(submitRequest)
    .addActivity(processApproval)
    .addActivity(notifyTimeout)
    .build();

  try {
    await worker.start();
    await new Promise((r) => setTimeout(r, 2000));

    // --- 1. Approval with client-raised event (approved) ---
    console.log("\n=== 1. Approval Workflow (client sends approval) ===");
    const approvalId = await client.scheduleNewOrchestration(approvalOrchestrator, 500);
    console.log(`Orchestration started: ${approvalId}`);

    // Wait for it to reach "Awaiting approval", then send approval from client
    await new Promise((r) => setTimeout(r, 3000));
    const midState = await client.getOrchestrationState(approvalId, true);
    console.log(`Custom status: ${midState?.serializedCustomStatus}`);

    await client.raiseOrchestrationEvent(approvalId, "approval", { approved: true });
    console.log("Sent approval event from client");

    const finalState = await client.waitForOrchestrationCompletion(approvalId, true, 60);
    console.log(`Result: ${finalState?.serializedOutput}`);
    console.log(`Final custom status: ${finalState?.serializedCustomStatus}`);

    // --- 2. sendEvent (orchestration-to-orchestration) ---
    console.log("\n=== 2. sendEvent (orchestration → orchestration) ===");
    const targetId = await client.scheduleNewOrchestration(approvalOrchestrator, 250);
    console.log(`Target orchestration: ${targetId}`);

    // Start a notifier that will send the approval event
    const notifierId = await client.scheduleNewOrchestration(notifierOrchestrator, targetId);
    console.log(`Notifier orchestration: ${notifierId}`);

    const targetState = await client.waitForOrchestrationCompletion(targetId, true, 60);
    console.log(`Target result: ${targetState?.serializedOutput}`);

    const notifierState = await client.waitForOrchestrationCompletion(notifierId, true, 60);
    console.log(`Notifier result: ${notifierState?.serializedOutput}`);

    // --- 3. Multiple external events ---
    console.log("\n=== 3. Multiple External Events ===");
    const multiId = await client.scheduleNewOrchestration(multiEventOrchestrator);
    await new Promise((r) => setTimeout(r, 2000));

    await client.raiseOrchestrationEvent(multiId, "event1", "Hello");
    await client.raiseOrchestrationEvent(multiId, "event2", "World");

    const multiState = await client.waitForOrchestrationCompletion(multiId, true, 60);
    console.log(`Result: ${multiState?.serializedOutput}`);

    // --- 4. Approval with timeout (no event sent — timer wins the race) ---
    console.log("\n=== 4. Approval Workflow (timeout — no event sent) ===");
    const timeoutId = await client.scheduleNewOrchestration(approvalOrchestrator, 1000);
    // Don't send any event — let the 5-second timer expire and auto-reject
    const timeoutState = await client.waitForOrchestrationCompletion(timeoutId, true, 60);
    console.log(`Result: ${timeoutState?.serializedOutput}`);

    console.log("\n=== All human-interaction demos completed successfully! ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await worker.stop();
    await client.stop();
    process.exit(0);
  }
})();
