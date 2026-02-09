// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This sample demonstrates the query and history inspection APIs:
//   1. getAllInstances — query orchestration instances with filters and pagination
//   2. listInstanceIds — list instance IDs with cursor-based pagination
//   3. getOrchestrationHistory — retrieve detailed history events
//   4. Typed history events — inspect individual event types

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
  OrchestrationStatus,
  HistoryEventType,
} from "@microsoft/durabletask-js";
import type {
  OrchestrationQuery,
  HistoryEvent,
  ExecutionStartedEvent,
  TaskScheduledEvent,
  TaskCompletedEvent,
  TimerCreatedEvent,
} from "@microsoft/durabletask-js";

// ---------------------------------------------------------------------------
// Activities & Orchestrators
// ---------------------------------------------------------------------------

const greet = async (_ctx: ActivityContext, name: string): Promise<string> => {
  return `Hello, ${name}!`;
};

/** Creates a timer and calls an activity — produces rich history. */
const richOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, name: string): any {
  // Create a short timer
  yield ctx.createTimer(500);

  // Call an activity
  const greeting: string = yield ctx.callActivity(greet, name);

  return greeting;
};

/** Simple orchestrator used to create multiple instances for querying. */
const simpleOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext, label: string): any {
  yield ctx.callActivity(greet, label);
  return `Done: ${label}`;
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
    .addOrchestrator(richOrchestrator)
    .addOrchestrator(simpleOrchestrator)
    .addActivity(greet)
    .build();

  try {
    await worker.start();
    await new Promise((r) => setTimeout(r, 2000));

    // Create several orchestration instances for querying
    console.log("Creating orchestration instances...");
    const instanceIds: string[] = [];

    for (let i = 1; i <= 5; i++) {
      const id = await client.scheduleNewOrchestration(simpleOrchestrator, `item-${i}`);
      instanceIds.push(id);
    }

    // Also create the rich orchestrator for history inspection
    const richId = await client.scheduleNewOrchestration(richOrchestrator, "World");

    // Wait for all to complete
    for (const id of [...instanceIds, richId]) {
      await client.waitForOrchestrationCompletion(id, false, 30);
    }
    console.log(`Created ${instanceIds.length + 1} orchestration instances.`);

    // --- 1. getAllInstances with filters ---
    console.log("\n=== 1. getAllInstances (query with filters) ===");

    // Query completed instances
    const query: OrchestrationQuery = {
      statuses: [OrchestrationStatus.COMPLETED],
      fetchInputsAndOutputs: true,
      pageSize: 3, // small page size to demonstrate pagination
    };

    const pageable = client.getAllInstances(query);

    // Iterate page by page
    let pageNum = 0;
    let totalInstances = 0;
    for await (const page of pageable.asPages()) {
      pageNum++;
      console.log(`  Page ${pageNum}: ${page.values.length} instances (hasMore: ${page.hasMoreResults})`);
      for (const instance of page.values) {
        totalInstances++;
        console.log(`    - ${instance.instanceId} [${instance.name}] = ${instance.serializedOutput?.substring(0, 50)}`);
      }
      if (pageNum >= 3) break; // safety limit
    }
    console.log(`Total instances across pages: ${totalInstances}`);

    // Iterate item by item
    console.log("\n  Item-by-item iteration (first 5):");
    const pageable2 = client.getAllInstances({ statuses: [OrchestrationStatus.COMPLETED], pageSize: 10 });
    let itemCount = 0;
    for await (const instance of pageable2) {
      itemCount++;
      console.log(`    ${itemCount}. ${instance.instanceId} [${instance.name}]`);
      if (itemCount >= 5) break;
    }

    // --- 2. listInstanceIds ---
    console.log("\n=== 2. listInstanceIds (cursor pagination) ===");
    const page1 = await client.listInstanceIds({ pageSize: 3 });
    console.log(`  Page 1: ${page1.values.length} IDs (hasMore: ${page1.hasMoreResults})`);
    for (const id of page1.values) {
      console.log(`    - ${id}`);
    }

    if (page1.hasMoreResults && page1.continuationToken) {
      const page2 = await client.listInstanceIds({
        pageSize: 3,
        lastInstanceKey: page1.continuationToken,
      });
      console.log(`  Page 2: ${page2.values.length} IDs (hasMore: ${page2.hasMoreResults})`);
      for (const id of page2.values) {
        console.log(`    - ${id}`);
      }
    }

    // --- 3. getOrchestrationHistory ---
    console.log("\n=== 3. getOrchestrationHistory ===");
    const history: HistoryEvent[] = await client.getOrchestrationHistory(richId);
    console.log(`  History for ${richId}: ${history.length} events`);
    for (const event of history) {
      const eventTypeName = HistoryEventType[event.eventType] || `Unknown(${event.eventType})`;
      console.log(`    [${event.eventId}] ${eventTypeName} @ ${event.timestamp?.toISOString()}`);
    }

    // --- 4. Typed history events ---
    console.log("\n=== 4. Typed History Event Inspection ===");

    const executionStarted = history.find(
      (e) => e.eventType === HistoryEventType.ExecutionStarted,
    ) as ExecutionStartedEvent | undefined;
    if (executionStarted) {
      console.log(`  ExecutionStarted: name=${executionStarted.name}, input=${executionStarted.input}`);
    }

    const taskScheduled = history.filter(
      (e) => e.eventType === HistoryEventType.TaskScheduled,
    ) as TaskScheduledEvent[];
    console.log(`  TaskScheduled events: ${taskScheduled.length}`);
    for (const ts of taskScheduled) {
      console.log(`    - name=${ts.name}, input=${ts.input}`);
    }

    const taskCompleted = history.filter(
      (e) => e.eventType === HistoryEventType.TaskCompleted,
    ) as TaskCompletedEvent[];
    console.log(`  TaskCompleted events: ${taskCompleted.length}`);

    const timerCreated = history.filter(
      (e) => e.eventType === HistoryEventType.TimerCreated,
    ) as TimerCreatedEvent[];
    console.log(`  TimerCreated events: ${timerCreated.length}`);
    for (const tc of timerCreated) {
      console.log(`    - fireAt=${tc.fireAt?.toISOString()}`);
    }

    console.log("\n=== All query/history demos completed successfully! ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await worker.stop();
    await client.stop();
    process.exit(0);
  }
})();
