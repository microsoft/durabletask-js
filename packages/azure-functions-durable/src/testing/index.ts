// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext } from "@azure/functions";
import {
  EntityInstanceId,
  InMemoryOrchestrationBackend,
  OrchestrationState,
  OrchestrationStatus,
  TaskEntityShim,
  TestOrchestrationClient,
  TestOrchestrationWorker,
} from "@microsoft/durabletask-js";
import type { EntityHandler as RegisteredEntityHandler, OrchestrationHandler } from "../app";
import { wrapEntity } from "../entity-context";
import { wrapOrchestrator } from "../orchestration-context";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_ORCHESTRATOR_NAME = "orchestrator";
const DEFAULT_ENTITY_NAME = "entity";
const DEFAULT_ENTITY_KEY = "test";

/** An Azure Functions activity handler used by the testing helpers. */
export type TestActivityHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: InvocationContext,
) => TOutput | Promise<TOutput>;

/** Options for running an activity directly. */
export interface ActivityTestOptions {
  /** Function name exposed on the generated invocation context. */
  functionName?: string;
  /** Invocation context to pass instead of creating one. */
  context?: InvocationContext;
}

/** Runs one activity invocation without starting a Functions host. */
export async function runActivity<TInput, TOutput>(
  handler: TestActivityHandler<TInput, TOutput>,
  input: TInput,
  options: ActivityTestOptions = {},
): Promise<TOutput> {
  const context = options.context ?? new InvocationContext({ functionName: options.functionName ?? "activity" });
  return await handler(input, context);
}

/** Plain failure details returned for a failed orchestration. */
export interface OrchestrationTestFailure {
  errorType: string;
  message: string;
  stackTrace?: string;
}

/** Runtime states exposed by the Functions testing API. */
export type OrchestrationTestStatus = "Pending" | "Running" | "Completed" | "Failed" | "Terminated" | "Suspended";

/** A deserialized snapshot of an orchestration run. */
export interface OrchestrationTestResult<TOutput = unknown> {
  instanceId: string;
  status: OrchestrationTestStatus;
  output?: TOutput;
  customStatus?: unknown;
  failure?: OrchestrationTestFailure;
}

/** Options shared by one-shot and harness orchestration starts. */
export interface OrchestrationStartOptions<TInput = unknown> {
  input?: TInput;
  instanceId?: string;
  startAt?: Date;
}

/** Options for a one-shot orchestrator test. */
export interface OrchestratorTestOptions<TInput = unknown> extends OrchestrationStartOptions<TInput> {
  activities?: Readonly<Record<string, TestActivityHandler<any, any>>>;
  timeoutMs?: number;
}

/** Options for an interactive orchestration harness. */
export interface OrchestrationHarnessOptions {
  timeoutMs?: number;
}

/** A running orchestration controlled through an in-memory harness. */
export interface OrchestrationRun<TOutput = unknown> {
  readonly instanceId: string;
  readonly status: OrchestrationTestStatus;
  readonly output: TOutput | undefined;
  readonly customStatus: unknown;
  readonly failure: OrchestrationTestFailure | undefined;
  waitForStart(timeoutMs?: number): Promise<OrchestrationTestResult<TOutput>>;
  waitForCompletion(timeoutMs?: number): Promise<OrchestrationTestResult<TOutput>>;
  raiseEvent<TData = unknown>(name: string, data?: TData): Promise<void>;
  terminate<TOutputData = unknown>(output?: TOutputData): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  refresh(): Promise<OrchestrationTestResult<TOutput>>;
}

/** In-memory harness for interactive orchestration tests. */
export interface OrchestrationHarness {
  registerOrchestrator(name: string, handler: OrchestrationHandler): OrchestrationHarness;
  registerActivity<TInput = unknown, TOutput = unknown>(
    name: string,
    handler: TestActivityHandler<TInput, TOutput>,
  ): OrchestrationHarness;
  start<TOutput = unknown, TInput = unknown>(
    name: string,
    options?: OrchestrationStartOptions<TInput>,
  ): Promise<OrchestrationRun<TOutput>>;
  dispose(): Promise<void>;
}

/**
 * Creates a host-free orchestration harness backed by the real replay executor.
 *
 * @remarks Durable timers use real wall-clock time. The current core in-memory backend does not
 * expose a virtual clock or timer-advance API, so tests should schedule short timer delays.
 */
export function createOrchestrationHarness(options: OrchestrationHarnessOptions = {}): OrchestrationHarness {
  return new InMemoryOrchestrationHarness(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
}

/**
 * Runs one orchestrator to a terminal state and always releases its worker.
 *
 * @remarks Durable timers use real wall-clock time. The current core in-memory backend does not
 * expose a virtual clock or timer-advance API, so tests should schedule short timer delays.
 */
export async function runOrchestrator<TOutput = unknown, TInput = unknown>(
  handler: OrchestrationHandler,
  options: OrchestratorTestOptions<TInput> = {},
): Promise<OrchestrationTestResult<TOutput>> {
  const harness = createOrchestrationHarness({ timeoutMs: options.timeoutMs });
  harness.registerOrchestrator(DEFAULT_ORCHESTRATOR_NAME, handler);
  for (const [name, activity] of Object.entries(options.activities ?? {})) {
    harness.registerActivity(name, activity);
  }

  try {
    const run = await harness.start<TOutput, TInput>(DEFAULT_ORCHESTRATOR_NAME, options);
    return await run.waitForCompletion();
  } finally {
    await harness.dispose();
  }
}

/** One operation in a standalone entity batch. */
export interface EntityTestOperation<TInput = unknown> {
  name: string;
  input?: TInput;
}

/** Options for a standalone entity batch. */
export interface EntityTestOptions<TState = unknown> {
  initialState?: TState;
  operations: ReadonlyArray<EntityTestOperation>;
  entityName?: string;
  entityKey?: string;
}

/** Deserialized state and operation return values from an entity batch. */
export interface EntityTestResult<TState = unknown, TResult = unknown> {
  state: TState | undefined;
  results: Array<TResult | undefined>;
}

/** Error thrown when an entity operation in a test batch fails. */
export class EntityOperationError extends Error {
  readonly operationName: string;
  readonly operationIndex: number;
  readonly errorType: string;
  readonly stackTrace?: string;

  constructor(operationName: string, operationIndex: number, failure: OrchestrationTestFailure) {
    super(`Entity operation '${operationName}' at index ${operationIndex} failed: ${failure.message}`);
    this.name = "EntityOperationError";
    this.operationName = operationName;
    this.operationIndex = operationIndex;
    this.errorType = failure.errorType;
    this.stackTrace = failure.stackTrace;
  }
}

/**
 * Runs an entity batch directly through the core entity executor.
 *
 * @remarks This is a standalone unit seam. It does not enqueue entity messages in the orchestration
 * harness; end-to-end in-memory entity routing is not available in the current core test backend.
 */
export async function runEntity<TState = unknown, TResult = unknown>(
  handler: RegisteredEntityHandler,
  options: EntityTestOptions<TState>,
): Promise<EntityTestResult<TState, TResult>> {
  const entityName = options.entityName ?? DEFAULT_ENTITY_NAME;
  const entityKey = options.entityKey ?? DEFAULT_ENTITY_KEY;
  const entityId = new EntityInstanceId(entityName, entityKey);
  const executor = new TaskEntityShim(wrapEntity(handler)(), entityId);
  const request = createEntityBatchRequest(options.initialState, options.operations);
  const response = await executor.executeAsync(request);

  const results = response.getResultsList().map((operationResult, index) => {
    const failureDetails = operationResult.getFailure()?.getFailuredetails();
    if (failureDetails) {
      throw new EntityOperationError(options.operations[index].name, index, {
        errorType: failureDetails.getErrortype(),
        message: failureDetails.getErrormessage(),
        stackTrace: failureDetails.getStacktrace()?.getValue(),
      });
    }
    return deserialize<TResult>(operationResult.getSuccess()?.getResult()?.getValue());
  });

  return {
    state: deserialize<TState>(response.getEntitystate()?.getValue()),
    results,
  };
}

class InMemoryOrchestrationHarness implements OrchestrationHarness {
  private readonly backend = new InMemoryOrchestrationBackend();
  private readonly worker = new TestOrchestrationWorker(this.backend);
  private readonly client = new TestOrchestrationClient(this.backend);
  private started = false;
  private disposed = false;

  constructor(private readonly timeoutMs: number) {}

  registerOrchestrator(name: string, handler: OrchestrationHandler): OrchestrationHarness {
    this.ensureCanRegister();
    this.worker.addNamedOrchestrator(name, wrapOrchestrator(handler));
    return this;
  }

  registerActivity<TInput, TOutput>(name: string, handler: TestActivityHandler<TInput, TOutput>): OrchestrationHarness {
    this.ensureCanRegister();
    this.worker.addNamedActivity(name, async (_context, input) => {
      return await runActivity(handler, input as TInput, { functionName: name });
    });
    return this;
  }

  async start<TOutput, TInput>(
    name: string,
    options: OrchestrationStartOptions<TInput> = {},
  ): Promise<OrchestrationRun<TOutput>> {
    this.ensureNotDisposed();
    if (!this.started) {
      await this.worker.start();
      this.started = true;
    }

    const instanceId = await this.client.scheduleNewOrchestration(
      name,
      options.input,
      options.instanceId,
      options.startAt,
    );
    return new InMemoryOrchestrationRun<TOutput>(instanceId, this.client, this.timeoutMs);
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    try {
      if (this.started) {
        await this.worker.stop();
      }
    } finally {
      this.backend.reset();
      await this.client.stop();
    }
  }

  private ensureCanRegister(): void {
    this.ensureNotDisposed();
    if (this.started) {
      throw new Error("Orchestrators and activities must be registered before the first run starts.");
    }
  }

  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new Error("The orchestration harness has been disposed.");
    }
  }
}

class InMemoryOrchestrationRun<TOutput> implements OrchestrationRun<TOutput> {
  private currentStatus: OrchestrationTestStatus = "Pending";
  private currentOutput: TOutput | undefined;
  private currentCustomStatus: unknown;
  private currentFailure: OrchestrationTestFailure | undefined;

  constructor(
    readonly instanceId: string,
    private readonly client: TestOrchestrationClient,
    private readonly timeoutMs: number,
  ) {}

  get status(): OrchestrationTestStatus {
    return this.currentStatus;
  }

  get output(): TOutput | undefined {
    return this.currentOutput;
  }

  get customStatus(): unknown {
    return this.currentCustomStatus;
  }

  get failure(): OrchestrationTestFailure | undefined {
    return this.currentFailure;
  }

  async waitForStart(timeoutMs: number = this.timeoutMs): Promise<OrchestrationTestResult<TOutput>> {
    const state = await this.client.waitForOrchestrationStart(this.instanceId, true, timeoutMs / 1000);
    return this.applyState(requireState(state, this.instanceId));
  }

  async waitForCompletion(timeoutMs: number = this.timeoutMs): Promise<OrchestrationTestResult<TOutput>> {
    const state = await this.client.waitForOrchestrationCompletion(this.instanceId, true, timeoutMs / 1000);
    return this.applyState(requireState(state, this.instanceId));
  }

  async raiseEvent<TData>(name: string, data?: TData): Promise<void> {
    await this.client.raiseOrchestrationEvent(this.instanceId, name, data);
  }

  async terminate<TOutputData>(output?: TOutputData): Promise<void> {
    await this.client.terminateOrchestration(this.instanceId, output);
  }

  async suspend(): Promise<void> {
    await this.client.suspendOrchestration(this.instanceId);
    await this.refresh();
  }

  async resume(): Promise<void> {
    await this.client.resumeOrchestration(this.instanceId);
    await this.refresh();
  }

  async refresh(): Promise<OrchestrationTestResult<TOutput>> {
    const state = await this.client.getOrchestrationState(this.instanceId, true);
    return this.applyState(requireState(state, this.instanceId));
  }

  private applyState(state: OrchestrationState): OrchestrationTestResult<TOutput> {
    this.currentStatus = toTestStatus(state.runtimeStatus);
    this.currentOutput = deserialize<TOutput>(state.serializedOutput);
    this.currentCustomStatus = deserialize(state.serializedCustomStatus);
    this.currentFailure = state.failureDetails
      ? {
          errorType: state.failureDetails.errorType,
          message: state.failureDetails.message,
          stackTrace: state.failureDetails.stackTrace,
        }
      : undefined;

    return {
      instanceId: this.instanceId,
      status: this.currentStatus,
      output: this.currentOutput,
      customStatus: this.currentCustomStatus,
      failure: this.currentFailure,
    };
  }
}

function createEntityBatchRequest<TState>(
  initialState: TState | undefined,
  operations: ReadonlyArray<EntityTestOperation>,
): Parameters<TaskEntityShim["executeAsync"]>[0] {
  // TaskEntityShim reads only these protobuf accessors. Keeping this adapter local avoids exposing
  // generated protocol types through the durable-functions testing API.
  const request = {
    getEntitystate: () => serializedValue(initialState),
    getOperationsList: () =>
      operations.map((operation) => ({
        getOperation: () => operation.name,
        getInput: () => serializedValue(operation.input),
      })),
  };
  return request as Parameters<TaskEntityShim["executeAsync"]>[0];
}

function serializedValue(value: unknown): { getValue(): string } | undefined {
  if (value === undefined) {
    return undefined;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError("Test values must be JSON-serializable.");
  }
  return { getValue: () => serialized };
}

function deserialize<T>(value: string | undefined): T | undefined {
  return value === undefined ? undefined : (JSON.parse(value) as T);
}

function requireState(state: OrchestrationState | undefined, instanceId: string): OrchestrationState {
  if (!state) {
    throw new Error(`Orchestration '${instanceId}' was not found.`);
  }
  return state;
}

function toTestStatus(status: OrchestrationStatus): OrchestrationTestStatus {
  switch (status) {
    case OrchestrationStatus.PENDING:
      return "Pending";
    case OrchestrationStatus.RUNNING:
      return "Running";
    case OrchestrationStatus.COMPLETED:
      return "Completed";
    case OrchestrationStatus.FAILED:
      return "Failed";
    case OrchestrationStatus.TERMINATED:
      return "Terminated";
    case OrchestrationStatus.SUSPENDED:
      return "Suspended";
    case OrchestrationStatus.CONTINUED_AS_NEW:
      return "Running";
    default:
      throw new Error(`Unexpected orchestration status value: ${String(status)}.`);
  }
}

/** Namespace-style access matching the rest of the Durable Functions API. */
export const test = {
  createOrchestrationHarness,
  runActivity,
  runEntity,
  runOrchestrator,
};
