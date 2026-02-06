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
  // Logger types are re-exported for convenience
  // ConsoleLogger is used by default
  // Use createAzureLogger to integrate with @azure/logger
  createAzureLogger,
} from "@microsoft/durabletask-js-azuremanaged";
import { ActivityContext } from "@microsoft/durabletask-js/dist/task/context/activity-context";
import { OrchestrationContext } from "@microsoft/durabletask-js/dist/task/context/orchestration-context";
import { TOrchestrator } from "@microsoft/durabletask-js/dist/types/orchestrator.type";
import { whenAll } from "@microsoft/durabletask-js/dist/task";

// Wrap the entire code in an immediately-invoked async function
(async () => {
  // Create a logger for this example
  // This uses Azure SDK's logging infrastructure - set AZURE_LOG_LEVEL=verbose to see all logs
  const logger = createAzureLogger("example");

  // Configuration for Azure Managed DTS
  // These values should be set as environment variables
  const endpoint = process.env.AZURE_DTS_ENDPOINT;
  const taskHubName = process.env.AZURE_DTS_TASKHUB;
  const connectionString = process.env.DURABLE_TASK_SCHEDULER_CONNECTION_STRING;

  // Validate configuration
  if (!connectionString && (!endpoint || !taskHubName)) {
    logger.error(
      "Error: Either DURABLE_TASK_SCHEDULER_CONNECTION_STRING or both AZURE_DTS_ENDPOINT and AZURE_DTS_TASKHUB must be set.",
    );
    logger.info("\nUsage:");
    logger.info("  Option 1: Create a .env file in the examples directory (recommended):");
    logger.info(
      "    DURABLE_TASK_SCHEDULER_CONNECTION_STRING=Endpoint=https://myservice.durabletask.io;Authentication=DefaultAzure;TaskHub=myTaskHub",
    );
    logger.info("    or");
    logger.info("    AZURE_DTS_ENDPOINT=https://myservice.durabletask.io");
    logger.info("    AZURE_DTS_TASKHUB=myTaskHub");
    logger.info("\n  Option 2: Set environment variables directly");
    logger.info("    export DURABLE_TASK_SCHEDULER_CONNECTION_STRING=...");
    process.exit(1);
  }

  // Define an activity function that greets a city
  const greetCity = async (_: ActivityContext, city: string): Promise<string> => {
    logger.info(`Activity executing: greeting ${city}`);
    return `Hello, ${city}!`;
  };

  // Define an activity function that processes work items
  const processWorkItem = async (_: ActivityContext, item: string): Promise<number> => {
    logger.info(`Activity executing: processing ${item}`);
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
    const tasks = [];
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
      logger.info("Using connection string authentication...");
      client = createAzureManagedClient(connectionString);
      worker = createAzureManagedWorkerBuilder(connectionString)
        .addOrchestrator(sequenceOrchestrator)
        .addOrchestrator(fanOutFanInOrchestrator)
        .addActivity(greetCity)
        .addActivity(processWorkItem)
        .build();
    } else {
      logger.info("Using DefaultAzureCredential authentication...");
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
    logger.info("Starting worker...");
    await worker.start();
    // Allow the worker time to establish the gRPC stream with the scheduler.
    // worker.start() returns before the connection is fully established.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    logger.info("Worker started successfully!");

    // Run the sequence orchestrator
    logger.info("\n--- Running Sequence Orchestrator ---");
    const sequenceId = await client.scheduleNewOrchestration(sequenceOrchestrator);
    logger.info(`Orchestration scheduled with ID: ${sequenceId}`);

    const sequenceState = await client.waitForOrchestrationCompletion(sequenceId, true, 60);
    logger.info(`Sequence orchestration completed!`);
    logger.info(`Result: ${sequenceState?.serializedOutput}`);

    // Run the fan-out/fan-in orchestrator
    logger.info("\n--- Running Fan-Out/Fan-In Orchestrator ---");
    const fanOutId = await client.scheduleNewOrchestration(fanOutFanInOrchestrator);
    logger.info(`Orchestration scheduled with ID: ${fanOutId}`);

    const fanOutState = await client.waitForOrchestrationCompletion(fanOutId, true, 60);
    logger.info(`Fan-out/fan-in orchestration completed!`);
    logger.info(`Result: ${fanOutState?.serializedOutput}`);

    logger.info("\n--- All orchestrations completed successfully! ---");
  } catch (error) {
    logger.error("Error:", error);
    process.exit(1);
  } finally {
    // Cleanup: stop worker and client
    logger.info("\nStopping worker and client...");
    if (worker) {
      await worker.stop();
    }
    if (client) {
      await client.stop();
    }
    logger.info("Cleanup complete.");
    process.exit(0);
  }
})();
