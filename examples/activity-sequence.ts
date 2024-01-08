import { TaskHubGrpcClient } from "../src/client";
import { ActivityContext } from "../src/task/context/activity-context";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";

// Wrap the entire code in an immediately-invoked async function
(async () => {
  // Update the gRPC client and worker to use a local address and port
  const grpcServerAddress = "localhost:4001";
  let taskHubClient: TaskHubGrpcClient = new TaskHubGrpcClient(grpcServerAddress);
  let taskHubWorker: TaskHubGrpcWorker = new TaskHubGrpcWorker(grpcServerAddress);

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
    console.log("Worker started successfully");
  } catch (error) {
    console.error("Error starting worker:", error);
  }

  // Schedule a new orchestration
  try {
    const id = await taskHubClient.scheduleNewOrchestration(sequence, 1);
    console.log(`Orchestration scheduled with ID: ${id}`);

    // Wait for orchestration completion
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, 30);

    console.log(`Orchestration completed! Result: ${state?.serializedOutput}`);
  } catch (error) {
    console.error("Error scheduling or waiting for orchestration:", error);
  }

  // stop worker and client
  await taskHubWorker.stop();
  await taskHubClient.stop();
})();
