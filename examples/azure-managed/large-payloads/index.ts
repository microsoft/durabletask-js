// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as dotenv from "dotenv";
import * as path from "path";
import { ActivityContext, OrchestrationContext } from "@microsoft/durabletask-js";
import { BlobPayloadStore } from "@microsoft/durabletask-js-azureblob";
import {
  DurableTaskAzureManagedClientBuilder,
  createAzureManagedWorkerBuilder,
} from "@microsoft/durabletask-js-azuremanaged";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function echo(_context: ActivityContext, input: string): Promise<string> {
  return input;
}

async function* largePayload(context: OrchestrationContext, input: string): AsyncGenerator {
  context.setCustomStatus({ phase: "echo", inputBytes: input.length });
  return yield context.callActivity(echo, input);
}

async function main(): Promise<void> {
  const scheduler = process.env.DURABLE_TASK_SCHEDULER_CONNECTION_STRING;
  const storage = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!scheduler || !storage) {
    throw new Error("Set DURABLE_TASK_SCHEDULER_CONNECTION_STRING and AZURE_STORAGE_CONNECTION_STRING.");
  }
  const store = new BlobPayloadStore({ connectionString: storage });
  const payloads = { store };
  const worker = createAzureManagedWorkerBuilder(scheduler)
    .useExternalizedPayloads(payloads)
    .addOrchestrator(largePayload)
    .addActivity(echo)
    .build();
  const client = new DurableTaskAzureManagedClientBuilder()
    .connectionString(scheduler)
    .useExternalizedPayloads(payloads)
    .build();
  let started = false;
  try {
    await worker.start();
    started = true;
    const input = "x".repeat(300 * 1024);
    const id = await client.scheduleNewOrchestration(largePayload, input);
    const state = await client.waitForOrchestrationCompletion(id, true, 60);
    if (!state) throw new Error("The orchestration was not found.");
    state.raiseIfFailed();
    if (state.serializedOutput !== JSON.stringify(input))
      throw new Error("The hydrated output did not match the input.");
    console.log(`Round-tripped ${Buffer.byteLength(input, "utf8")} bytes through orchestration and activity payloads.`);
    console.log(`Instance ${id} retained. Auto-purge is a separate, task-hub-wide opt-in; see the sample README.`);
  } finally {
    if (started) await worker.stop();
    await client.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
