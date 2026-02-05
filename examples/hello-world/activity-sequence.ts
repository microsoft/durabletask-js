// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  TaskHubGrpcClient,
  TaskHubGrpcWorker,
  ActivityContext,
  OrchestrationContext,
  TOrchestrator,
  // Logger types for custom logging
  // ConsoleLogger (default) - logs to console
  // NoOpLogger - silent mode, useful for testing
  // You can also implement your own Logger interface
  ConsoleLogger,
} from "@microsoft/durabletask-js";

// Wrap the entire code in an immediately-invoked async function
(async () => {
  // Update the gRPC client and worker to use a local address and port
  const grpcServerAddress = "localhost:4001";

  // Optional: Create a custom logger (defaults to ConsoleLogger if not provided)
  // You can implement your own Logger interface to integrate with Winston, Pino, etc.
  const logger = new ConsoleLogger();

  // Pass the logger as the 6th parameter (after metadataGenerator)
  // Parameters: hostAddress, options, useTLS, credentials, metadataGenerator, logger
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

  const hello = async (_: ActivityContext, name: string) => {
    return `Hello ${name}!`;
  };

  const sequence: TOrchestrator = async function* (ctx: OrchestrationContext): any {
    const cities: string[] = [];

    const result1 = yield ctx.callActivity(hello, "Tokyo");
    cities.push(result1);
    const result2 = yield ctx.callActivity(hello, "Seattle"); // Correct the spelling of "Seattle"
    cities.push(result2);
    const result3 = yield ctx.callActivity(hello, "London");
    cities.push(result3);

    return cities;
  };

  taskHubWorker.addOrchestrator(sequence);
  taskHubWorker.addActivity(hello);

  // Wrap the worker startup in a try-catch block to handle any errors during startup
  try {
    await taskHubWorker.start();
    logger.info("Worker started successfully");
  } catch (error) {
    logger.error("Error starting worker:", error);
  }

  // Schedule a new orchestration
  try {
    const id = await taskHubClient.scheduleNewOrchestration(sequence);
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
