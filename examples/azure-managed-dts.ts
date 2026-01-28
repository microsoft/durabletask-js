// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This sample demonstrates how to use the Azure Managed Durable Task Scheduler (DTS)
// with the portable Durable Task JavaScript SDK. Azure Managed DTS provides a fully
// managed, serverless backend for running durable orchestrations in the cloud.

// Load environment variables from .env file (recommended for local development)
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, ".env") });

import { DefaultAzureCredential } from "@azure/identity";
import {
  createAzureManagedClient,
  createAzureManagedWorkerBuilder,
} from "../extensions/durabletask-js-azuremanaged/build";
import { ActivityContext } from "../src/task/context/activity-context";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { whenAll } from "../src/task";
import { Task } from "../src/task/task";

// Wrap the entire code in an immediately-invoked async function
(async () => {
  // Configuration for Azure Managed DTS
  // These values should be set as environment variables
  const endpoint = process.env.AZURE_DTS_ENDPOINT;
  const taskHubName = process.env.AZURE_DTS_TASKHUB;
  const connectionString = process.env.AZURE_DTS_CONNECTION_STRING;

  // Validate configuration
  if (!connectionString && (!endpoint || !taskHubName)) {
    console.error(
      "Error: Either AZURE_DTS_CONNECTION_STRING or both AZURE_DTS_ENDPOINT and AZURE_DTS_TASKHUB must be set.",
    );
    console.log("\nUsage:");
    console.log("  Option 1: Create a .env file in the examples directory (recommended):");
    console.log(
      "    AZURE_DTS_CONNECTION_STRING=Endpoint=https://myservice.durabletask.io;Authentication=DefaultAzure;TaskHub=myTaskHub",
    );
    console.log("    or");
    console.log("    AZURE_DTS_ENDPOINT=https://myservice.durabletask.io");
    console.log("    AZURE_DTS_TASKHUB=myTaskHub");
    console.log("\n  Option 2: Set environment variables directly");
    console.log("    export AZURE_DTS_CONNECTION_STRING=...");
    process.exit(1);
  }

  // Define an activity function that greets a city
  const greetCity = async (_: ActivityContext, city: string): Promise<string> => {
    console.log(`Activity executing: greeting ${city}`);
    return `Hello, ${city}!`;
  };

  // Define an activity function that processes work items
  const processWorkItem = async (_: ActivityContext, item: string): Promise<number> => {
    console.log(`Activity executing: processing ${item}`);
    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 500));
    return item.length;
  };

  // Define an orchestrator that calls activities in sequence
  const sequenceOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
    const cities = ["Tokyo", "Seattle", "London", "Paris"];
    const greetings: string[] = [];

    for (const city of cities) {
      const greeting = yield ctx.callActivity(greetCity, city);
      greetings.push(greeting);
    }

    return greetings;
  };

  // Define an orchestrator that demonstrates fan-out/fan-in pattern
  const fanOutFanInOrchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
    const workItems = ["item-1", "item-2", "item-3", "item-4", "item-5"];

    // Fan-out: schedule all activities in parallel
    const tasks: Task<number>[] = [];
    for (const item of workItems) {
      tasks.push(ctx.callActivity(processWorkItem, item));
    }

    // Fan-in: wait for all activities to complete
    const results: number[] = yield whenAll(tasks);

    // Aggregate results
    const total = results.reduce((sum, val) => sum + val, 0);
    return { workItemCount: workItems.length, totalCharacters: total };
  };

  let client;
  let worker;

  try {
    // Create client and worker using connection string or explicit parameters
    if (connectionString) {
      console.log("Using connection string authentication...");
      client = createAzureManagedClient(connectionString);
      worker = createAzureManagedWorkerBuilder(connectionString)
        .addOrchestrator(sequenceOrchestrator)
        .addOrchestrator(fanOutFanInOrchestrator)
        .addActivity(greetCity)
        .addActivity(processWorkItem)
        .build();
    } else {
      console.log("Using DefaultAzureCredential authentication...");
      const credential = new DefaultAzureCredential();
      client = createAzureManagedClient(endpoint!, taskHubName!, credential);
      worker = createAzureManagedWorkerBuilder(endpoint!, taskHubName!, credential)
        .addOrchestrator(sequenceOrchestrator)
        .addOrchestrator(fanOutFanInOrchestrator)
        .addActivity(greetCity)
        .addActivity(processWorkItem)
        .build();
    }

    // Start the worker
    console.log("Starting worker...");
    await worker.start();
    console.log("Worker started successfully!");

    // Run the sequence orchestrator
    console.log("\n--- Running Sequence Orchestrator ---");
    const sequenceId = await client.scheduleNewOrchestration(sequenceOrchestrator);
    console.log(`Orchestration scheduled with ID: ${sequenceId}`);

    const sequenceState = await client.waitForOrchestrationCompletion(sequenceId, undefined, 60);
    console.log(`Sequence orchestration completed!`);
    console.log(`Result: ${sequenceState?.serializedOutput}`);

    // Run the fan-out/fan-in orchestrator
    console.log("\n--- Running Fan-Out/Fan-In Orchestrator ---");
    const fanOutId = await client.scheduleNewOrchestration(fanOutFanInOrchestrator);
    console.log(`Orchestration scheduled with ID: ${fanOutId}`);

    const fanOutState = await client.waitForOrchestrationCompletion(fanOutId, undefined, 60);
    console.log(`Fan-out/fan-in orchestration completed!`);
    console.log(`Result: ${fanOutState?.serializedOutput}`);

    console.log("\n--- All orchestrations completed successfully! ---");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    // Cleanup: stop worker and client
    console.log("\nStopping worker and client...");
    if (worker) {
      await worker.stop();
    }
    if (client) {
      await client.stop();
    }
    console.log("Cleanup complete.");
    process.exit(0);
  }
})();
