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
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

// Load environment variables from .env file
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Read the OTLP endpoint from the environment (defaults to Jaeger's OTLP HTTP port)
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "durabletask-js-tracing-sample",
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  }),
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
// 3. Application code — FanOutFanIn pattern (matches Java tracing sample)
// --------------------------------------------------------------------------
(async () => {
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

  /** Simulates getting weather for a city. */
  const getWeather = async (_ctx: ActivityContext, city: string): Promise<string> => {
    console.log(`  [GetWeather] Getting weather for: ${city}`);
    await new Promise((r) => setTimeout(r, 20));
    return `${city}=72F`;
  };

  /** Aggregates weather results into a summary. */
  const createSummary = async (_ctx: ActivityContext, input: string): Promise<string> => {
    console.log(`  [CreateSummary] Creating summary for: ${input}`);
    return `Weather Report: ${input}`;
  };

  // --- Orchestrator: Fan-Out/Fan-In with timer ---

  /**
   * Demonstrates a Fan-Out/Fan-In pattern that produces a rich trace:
   *
   *   create_orchestration:FanOutFanIn (Producer)
   *     └─ orchestration:FanOutFanIn (Server)
   *          ├─ orchestration:FanOutFanIn:timer (Internal, ~1s)
   *          ├─ activity:getWeather (Client+Server, ×5 parallel)
   *          └─ activity:createSummary (Client+Server)
   */
  const fanOutFanIn: TOrchestrator = async function* (ctx: OrchestrationContext): any {
    // Timer: wait 1 second (demonstrates timer span with creation-to-fired duration)
    const timerDelay = new Date(ctx.currentUtcDateTime.getTime() + 1000);
    yield ctx.createTimer(timerDelay);

    // Fan-out: schedule parallel weather lookups
    const cities = ["Seattle", "Tokyo", "London", "Paris", "Sydney"];
    const tasks = cities.map((city) => ctx.callActivity(getWeather, city));
    const results: string[] = yield whenAll(tasks);

    // Aggregate results
    const summary: string = yield ctx.callActivity(createSummary, results.join(", "));

    return summary;
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
      .addOrchestrator(fanOutFanIn)
      .addActivity(getWeather)
      .addActivity(createSummary)
      .build();

    // --- Start worker ---
    console.log("Starting worker...");
    await worker.start();
    await new Promise((r) => setTimeout(r, 2000));
    console.log("Worker started with OpenTelemetry tracing.");

    // --- Run orchestration ---
    console.log("\nScheduling FanOutFanIn orchestration...");
    const instanceId = await client.scheduleNewOrchestration(fanOutFanIn);
    console.log(`Started orchestration: ${instanceId}`);

    console.log("Waiting for completion...");
    const state = await client.waitForOrchestrationCompletion(instanceId, true, 60);
    console.log(`Status: ${state?.runtimeStatus}`);
    console.log(`Result: ${state?.serializedOutput}`);

    console.log("\nView traces in Jaeger UI: http://localhost:16686");
    console.log('  Search for service: durabletask-js-tracing-sample');
    console.log("View orchestration in DTS Dashboard: http://localhost:8082");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    console.log("\nShutting down...");
    if (worker) await worker.stop();
    if (client) await client.stop();
    await sdk.shutdown();
    console.log("Done.");
    process.exit(0);
  }
})();
