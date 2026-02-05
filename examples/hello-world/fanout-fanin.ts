// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  ActivityContext,
  OrchestrationContext,
  Task,
  TOrchestrator,
  whenAll,
  // Logger types: ConsoleLogger (default), NoOpLogger (silent)
  ConsoleLogger,
} from "@microsoft/durabletask-js";

// Wrap the entire code in an immediately-invoked async function
(async () => {
  // Update the gRPC client and worker to use a local address and port
  const grpcServerAddress = "localhost:4001";

  // Optional: Use a custom logger (ConsoleLogger is the default)
  const logger = new ConsoleLogger();

  const taskHubClient: TaskHubGrpcClient = new TaskHubGrpcClient(
    grpcServerAddress,
    undefined,
    undefined,
    undefined,
    undefined,
    logger,
  );
  const taskHubWorker: TaskHubGrpcWorker = new TaskHubGrpcWorker(
    grpcServerAddress,
    undefined,
    undefined,
    undefined,
    undefined,
    logger,
  );

  function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async function getWorkItemsActivity(_: ActivityContext): Promise<string[]> {
    const count: number = getRandomInt(2, 10);
    logger.info(`generating ${count} work items...`);

    const workItems: string[] = Array.from({ length: count }, (_, i) => `work item ${i}`);
    return workItems;
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function processWorkItemActivity(context: ActivityContext, item: string): Promise<number> {
    logger.info(`processing work item: ${item}`);

    // Simulate some work that takes a variable amount of time
    const sleepTime = Math.random() * 5000;
    await sleep(sleepTime);

    // Return a result for the given work item, which is also a random number in this case
    return Math.floor(Math.random() * 11);
  }

  const orchestrator: TOrchestrator = async function* (ctx: OrchestrationContext): any {
    const tasks: Task<any>[] = [];
    const workItems = yield ctx.callActivity(getWorkItemsActivity);
    for (const workItem of workItems) {
      tasks.push(ctx.callActivity(processWorkItemActivity, workItem));
    }
    const results: number[] = yield whenAll(tasks);
    const sum: number = results.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    return sum;
  };

  taskHubWorker.addOrchestrator(orchestrator);
  taskHubWorker.addActivity(getWorkItemsActivity);
  taskHubWorker.addActivity(processWorkItemActivity);

  // Wrap the worker startup in a try-catch block to handle any errors during startup
  try {
    await taskHubWorker.start();
    logger.info("Worker started successfully");
  } catch (error) {
    logger.error("Error starting worker:", error);
  }

  // Schedule a new orchestration
  try {
    const id = await taskHubClient.scheduleNewOrchestration(orchestrator);
    logger.info(`Orchestration scheduled with ID: ${id}`);

    // Wait for orchestration completion
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    logger.info(`Orchestration completed! Result: ${state?.serializedOutput}`);
  } catch (error) {
    logger.error("Error scheduling or waiting for orchestration:", error);
  }

  // stop worker and client
  await taskHubWorker.stop();
  await taskHubClient.stop();
})();
