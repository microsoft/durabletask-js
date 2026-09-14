// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from "@azure/functions";
import {
  InMemoryOrchestrationBackend,
  TestOrchestrationClient,
  TestOrchestrationWorker,
} from "@microsoft/durabletask-js";
import type { TaskFailureDetails } from "@microsoft/durabletask-js";
import type { ActivityHandler, OrchestrationHandler } from "../app";
import { wrapOrchestrator } from "../orchestration-context";
import { OrchestrationRuntimeStatus, toDurableOrchestrationStatus } from "../orchestration-status";

const ORCHESTRATOR_NAME = "orchestrator";
const DEFAULT_ACTIVITY_NAME = "activity";

/**
 * Creates the {@link InvocationContext} an activity handler receives at runtime.
 *
 * @remarks Activities are ordinary Azure Functions handlers with no durable state, so they are
 * tested by calling them directly: `await sayHello("World", createActivityContext("sayHello"))`.
 */
export function createActivityContext(functionName: string = DEFAULT_ACTIVITY_NAME): InvocationContext {
  return new InvocationContext({ functionName });
}

/** Options for {@link runOrchestrator}. */
export interface OrchestratorTestOptions<TInput = unknown> {
  /** Input passed to the orchestrator. */
  input?: TInput;
  /** Instance id to schedule under. Defaults to a generated id. */
  instanceId?: string;
  /** Activity implementations the orchestrator may call, keyed by activity name. */
  activities?: Readonly<Record<string, ActivityHandler>>;
}

/**
 * The terminal state of an orchestration run.
 *
 * @remarks `runtimeStatus`, `output`, and `customStatus` are produced by the same mapping
 * `DurableFunctionsClient.getStatus` applies at runtime, so a test asserts on exactly the values a
 * deployed client would observe.
 */
export interface OrchestrationTestResult<TOutput = unknown> {
  instanceId: string;
  runtimeStatus: OrchestrationRuntimeStatus;
  output?: TOutput;
  customStatus?: unknown;
  /** Populated when the orchestration failed. */
  failure?: TaskFailureDetails;
}

/**
 * Runs one orchestrator to a terminal state on the in-memory backend and always releases its worker.
 *
 * @remarks Durable timers use real wall-clock time, because the in-memory backend has no virtual
 * clock; tests should schedule short delays. There is no forced timeout: the helper returns only
 * once the orchestration is terminal and the worker has drained, so activity code cannot keep
 * mutating test state after it returns. Arbitrary JavaScript promises cannot be cancelled, so a
 * handler that never settles leaves this helper pending and the test runner's timeout applies.
 *
 * Interactive scenarios (external events, terminate, suspend/resume) are covered by driving
 * `TestOrchestrationWorker` and `TestOrchestrationClient` from `@microsoft/durabletask-js` directly
 * and registering handlers with {@link wrapOrchestrator}; see the package README.
 */
export async function runOrchestrator<TOutput = unknown, TInput = unknown>(
  handler: OrchestrationHandler,
  options: OrchestratorTestOptions<TInput> = {},
): Promise<OrchestrationTestResult<TOutput>> {
  const backend = new InMemoryOrchestrationBackend();
  const worker = new TestOrchestrationWorker(backend);
  const client = new TestOrchestrationClient(backend);

  worker.addNamedOrchestrator(ORCHESTRATOR_NAME, wrapOrchestrator(handler));
  for (const [name, activity] of Object.entries(options.activities ?? {})) {
    worker.addNamedActivity(name, async (_context, input) => activity(input, createActivityContext(name)));
  }

  await worker.start();
  try {
    const instanceId = await client.scheduleNewOrchestration(ORCHESTRATOR_NAME, options.input, options.instanceId);
    // A zero timeout disables the backend's wait timer, per the no-forced-timeout remark above.
    const state = await client.waitForOrchestrationCompletion(instanceId, true, 0);
    if (!state) {
      throw new Error(`Orchestration '${instanceId}' was not found.`);
    }

    const status = toDurableOrchestrationStatus(state);
    return {
      instanceId: status.instanceId,
      runtimeStatus: status.runtimeStatus,
      output: status.output as TOutput | undefined,
      customStatus: status.customStatus,
      failure: state.failureDetails
        ? {
            errorType: state.failureDetails.errorType,
            message: state.failureDetails.message,
            stackTrace: state.failureDetails.stackTrace,
          }
        : undefined,
    };
  } finally {
    // Stopping the worker drains the in-flight orchestrator/activity handler; resetting the backend
    // clears durable timers that would otherwise keep the process alive after the test.
    await worker.stop();
    backend.reset();
  }
}
