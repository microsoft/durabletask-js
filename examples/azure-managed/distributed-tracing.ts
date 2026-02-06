// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This sample demonstrates how to enable OpenTelemetry distributed tracing with
// the Azure Managed Durable Task Scheduler (DTS). Traces are exported to a local
// Jaeger or OTLP-compatible collector so you can visualize the full orchestration
// lifecycle – scheduling, orchestrator execution, activity execution, sub-orchestrations,
// timers, and more – as linked spans in a single trace.

// --------------------------------------------------------------------------
// 1. OpenTelemetry SDK bootstrap – MUST run before any other imports so the
//    global TracerProvider is registered before the Durable Task SDK loads.
// --------------------------------------------------------------------------
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

// Load environment variables from .env file
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, ".env") });

// Read the OTLP endpoint from the environment (defaults to Jaeger's OTLP HTTP port)
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "durabletask-js-tracing-example",
  }),
  spanProcessors: [new SimpleSpanProcessor(traceExporter)],
});

sdk.start();
console.log(`OpenTelemetry SDK started – exporting traces to ${otlpEndpoint}`);

// --------------------------------------------------------------------------
// 2. Durable Task imports (after OTel is initialised)
// --------------------------------------------------------------------------
import {
  DurableTaskAzureManagedClientBuilder,
  DurableTaskAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";
import { ConsoleLogger } from "@microsoft/durabletask-js";
import { ActivityContext } from "@microsoft/durabletask-js/dist/task/context/activity-context";
import { OrchestrationContext } from "@microsoft/durabletask-js/dist/task/context/orchestration-context";
import { TOrchestrator } from "@microsoft/durabletask-js/dist/types/orchestrator.type";
import { whenAll } from "@microsoft/durabletask-js/dist/task";

// --------------------------------------------------------------------------
// 3. Application code
// --------------------------------------------------------------------------
(async () => {
  // Use ConsoleLogger so structured log events (with event IDs and categories) are
  // printed to the console by default, similar to .NET's default ILogger<T> output.
  // For production, consider using createAzureLogger() which integrates with @azure/logger
  // and respects the AZURE_LOG_LEVEL environment variable.
  const sdkLogger = new ConsoleLogger();

  // --- Configuration ---
  const connectionString = process.env.DURABLE_TASK_SCHEDULER_CONNECTION_STRING;
  const endpoint = process.env.AZURE_DTS_ENDPOINT;
  const taskHubName = process.env.AZURE_DTS_TASKHUB;

  if (!connectionString && (!endpoint || !taskHubName)) {
    console.error(
      "Error: Either DURABLE_TASK_SCHEDULER_CONNECTION_STRING or both AZURE_DTS_ENDPOINT and AZURE_DTS_TASKHUB must be set.",
    );
    console.log("\nFor the DTS emulator, set:");
    console.log(
      '  DURABLE_TASK_SCHEDULER_CONNECTION_STRING="Endpoint=http://localhost:8080;Authentication=None;TaskHub=default"',
    );
    process.exit(1);
  }

  // --- Activity definitions ---

  /** Simulates fetching data from an external service. */
  const fetchData = async (_ctx: ActivityContext, source: string): Promise<string> => {
    console.log(`  [fetchData] Fetching data from "${source}"...`);
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
    return `data-from-${source}`;
  };

  /** Simulates transforming a piece of data. */
  const transformData = async (_ctx: ActivityContext, input: string): Promise<string> => {
    console.log(`  [transformData] Transforming "${input}"...`);
    await new Promise((r) => setTimeout(r, 200));
    return `transformed(${input})`;
  };

  /** Simulates persisting results to a database. */
  const saveResults = async (_ctx: ActivityContext, results: string[]): Promise<number> => {
    console.log(`  [saveResults] Saving ${results.length} results...`);
    await new Promise((r) => setTimeout(r, 150));
    return results.length;
  };

  // --- Orchestrator: data pipeline (chaining + fan-out/fan-in) ---

  /**
   * Demonstrates a realistic data-processing pipeline that produces a rich
   * distributed trace:
   *
   * 1. Fan-out – fetch data from multiple sources in parallel.
   * 2. Fan-out – transform each result in parallel.
   * 3. Chain  – save all transformed results.
   *
   * The resulting trace will show:
   *   create_orchestration → orchestration (server)
   *       ├─ activity:fetchData (×N, parallel)
   *       ├─ activity:transformData (×N, parallel)
   *       └─ activity:saveResults
   */
  const dataPipelineOrchestrator: TOrchestrator = async function* (
    ctx: OrchestrationContext,
  ): any {
    const sources: string[] = yield ctx.callActivity(getDataSources);

    // Step 1 – fan-out: fetch from all sources in parallel
    const fetchTasks = [];
    for (const source of sources) {
      fetchTasks.push(ctx.callActivity(fetchData, source));
    }
    const rawData: string[] = yield whenAll(fetchTasks);

    // Step 2 – fan-out: transform all fetched data in parallel
    const transformTasks = [];
    for (const raw of rawData) {
      transformTasks.push(ctx.callActivity(transformData, raw));
    }
    const transformed: string[] = yield whenAll(transformTasks);

    // Step 3 – chain: save all results
    const savedCount: number = yield ctx.callActivity(saveResults, transformed);

    return {
      sourcesProcessed: sources.length,
      resultsSaved: savedCount,
      data: transformed,
    };
  };

  /** Returns the list of data sources to process. */
  const getDataSources = async (_ctx: ActivityContext): Promise<string[]> => {
    return ["users-api", "orders-api", "inventory-api", "analytics-api"];
  };

  // --- Orchestrator: simple sequence (for a cleaner trace comparison) ---

  const sequenceOrchestrator: TOrchestrator = async function* (
    ctx: OrchestrationContext,
  ): any {
    const cities = ["Tokyo", "Seattle", "London"];
    const greetings: string[] = [];
    for (const city of cities) {
      const greeting: string = yield ctx.callActivity(greetCity, city);
      greetings.push(greeting);
    }
    return greetings;
  };

  const greetCity = async (_ctx: ActivityContext, city: string): Promise<string> => {
    console.log(`  [greetCity] Greeting ${city}`);
    await new Promise((r) => setTimeout(r, 100));
    return `Hello, ${city}!`;
  };

  // --- Create client & worker ---

  let client;
  let worker;

  try {
    const clientBuilder = new DurableTaskAzureManagedClientBuilder().logger(sdkLogger);
    const workerBuilder = new DurableTaskAzureManagedWorkerBuilder().logger(sdkLogger);

    if (connectionString) {
      clientBuilder.connectionString(connectionString);
      workerBuilder.connectionString(connectionString);
    } else {
      const { DefaultAzureCredential } = await import("@azure/identity");
      const credential = new DefaultAzureCredential();
      clientBuilder.endpoint(endpoint!, taskHubName!, credential);
      workerBuilder.endpoint(endpoint!, taskHubName!, credential);
    }

    client = clientBuilder.build();
    worker = workerBuilder
      .addOrchestrator(dataPipelineOrchestrator)
      .addOrchestrator(sequenceOrchestrator)
      .addActivity(fetchData)
      .addActivity(transformData)
      .addActivity(saveResults)
      .addActivity(getDataSources)
      .addActivity(greetCity)
      .build();

    // --- Start worker ---
    console.log("Starting worker...");
    await worker.start();
    // Allow the worker time to establish the gRPC stream with the scheduler.
    // worker.start() returns before the connection is fully established.
    await new Promise((r) => setTimeout(r, 2000));
    console.log("Worker started.");

    // --- Run orchestrations ---

    // 1) Sequence orchestration
    console.log("\n=== Sequence Orchestration ===");
    const seqId = await client.scheduleNewOrchestration(sequenceOrchestrator);
    console.log(`Scheduled: ${seqId}`);
    const seqState = await client.waitForOrchestrationCompletion(seqId, true, 60);
    console.log(`Completed – result: ${seqState?.serializedOutput}`);

    // 2) Data pipeline orchestration (fan-out/fan-in)
    console.log("\n=== Data Pipeline Orchestration ===");
    const pipelineId = await client.scheduleNewOrchestration(dataPipelineOrchestrator);
    console.log(`Scheduled: ${pipelineId}`);
    const pipelineState = await client.waitForOrchestrationCompletion(pipelineId, true, 60);
    console.log(`Completed – result: ${pipelineState?.serializedOutput}`);

    console.log("\n=== All orchestrations completed! ===");
    console.log(
      `Open Jaeger UI at http://localhost:16686 and search for service "durabletask-js-tracing-example" to view traces.`,
    );
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    console.log("\nShutting down...");
    if (worker) await worker.stop();
    if (client) await client.stop();

    // Flush remaining spans before exit
    await sdk.shutdown();
    console.log("Done.");
    process.exit(0);
  }
})();
