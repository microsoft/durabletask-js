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
const HARNESS_DISPOSED_MESSAGE = "The orchestration harness has been disposed.";

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
  /** A past time is accepted, but future scheduled starts are not supported by the in-memory backend. */
  startAt?: Date;
}

/** Options for a one-shot orchestrator test. */
export interface OrchestratorTestOptions<TInput = unknown> extends OrchestrationStartOptions<TInput> {
  activities?: Readonly<Record<string, TestActivityHandler<any, any>>>;
}

/** Options for an interactive orchestration harness. */
export interface OrchestrationHarnessOptions {
  /**
   * Default timeout for observing a run. A timeout rejects only that wait; the harness remains live
   * and owned by the caller until {@link OrchestrationHarness.dispose} finishes.
   */
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
  /**
   * Stops harness processing after in-flight orchestrator and activity handlers settle.
   *
   * @remarks Arbitrary JavaScript promises cannot be forcibly cancelled. If user code never
   * settles, disposal also remains pending.
   */
  dispose(): Promise<void>;
}

/**
 * Creates a host-free orchestration harness backed by the real replay executor.
 *
 * @remarks Durable timers use real wall-clock time. The current core in-memory backend does not
 * expose a virtual clock or timer-advance API, so tests should schedule short timer delays.
 * Wait timeouts reject only the observation call; the harness remains live and must still be
 * disposed. Disposal awaits in-flight orchestrator and activity handlers because arbitrary
 * JavaScript promises cannot be forcibly cancelled.
 */
export function createOrchestrationHarness(options: OrchestrationHarnessOptions = {}): OrchestrationHarness {
  return new InMemoryOrchestrationHarness(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
}

/**
 * Runs one orchestrator to a terminal state and always releases its worker.
 *
 * @remarks Durable timers use real wall-clock time. The current core in-memory backend does not
 * expose a virtual clock or timer-advance API, so tests should schedule short timer delays.
 * This helper intentionally has no forced timeout: it awaits terminal orchestration execution and
 * worker cleanup before returning. Arbitrary JavaScript promises cannot be forcibly cancelled, so
 * non-cooperative orchestrator or activity code remains subject to the test runner's own timeout.
 */
export async function runOrchestrator<TOutput = unknown, TInput = unknown>(
  handler: OrchestrationHandler,
  options: OrchestratorTestOptions<TInput> = {},
): Promise<OrchestrationTestResult<TOutput>> {
  const harness = createOrchestrationHarness({ timeoutMs: 0 });
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
  private readonly runs = new Set<InMemoryOrchestrationRun<unknown>>();
  private transition: Promise<void> = Promise.resolve();
  private workerStartPromise: Promise<void> | undefined;
  private workerStarted = false;
  private startRequested = false;
  private disposed = false;
  private disposePromise: Promise<void> | undefined;

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

  start<TOutput, TInput>(
    name: string,
    options: OrchestrationStartOptions<TInput> = {},
  ): Promise<OrchestrationRun<TOutput>> {
    this.startRequested = true;
    return this.enqueueTransition(async () => {
      this.ensureNotDisposed();
      validateStartAt(options.startAt);
      await this.ensureWorkerStarted();
      this.ensureNotDisposed();

      const instanceId = await this.client.scheduleNewOrchestration(
        name,
        options.input,
        options.instanceId,
        options.startAt,
      );
      this.ensureNotDisposed();

      const run = new InMemoryOrchestrationRun<TOutput>(instanceId, this.client, this.timeoutMs);
      this.runs.add(run as InMemoryOrchestrationRun<unknown>);
      return run;
    });
  }

  dispose(): Promise<void> {
    if (!this.disposePromise) {
      this.disposed = true;
      for (const run of this.runs) {
        run.markDisposed();
      }
      this.disposePromise = this.enqueueTransition(() => this.disposeCore());
    }
    return this.disposePromise;
  }

  private async disposeCore(): Promise<void> {
    await this.workerStartPromise?.catch(() => undefined);
    try {
      if (this.workerStarted) {
        await this.worker.stop();
      }
      await Promise.all([...this.runs].map((run) => run.captureTerminalSnapshot()));
    } finally {
      this.backend.reset();
      await this.client.stop();
    }
  }

  private ensureCanRegister(): void {
    this.ensureNotDisposed();
    if (this.startRequested) {
      throw new Error("Orchestrators and activities must be registered before the first run starts.");
    }
  }

  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw createHarnessDisposedError();
    }
  }

  private ensureWorkerStarted(): Promise<void> {
    if (!this.workerStartPromise) {
      this.workerStartPromise = this.worker.start().then(() => {
        this.workerStarted = true;
      });
    }
    return this.workerStartPromise;
  }

  private enqueueTransition<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.transition.then(operation);
    this.transition = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

class InMemoryOrchestrationRun<TOutput> implements OrchestrationRun<TOutput> {
  private currentStatus: OrchestrationTestStatus = "Pending";
  private currentOutput: TOutput | undefined;
  private currentCustomStatus: unknown;
  private currentFailure: OrchestrationTestFailure | undefined;
  private terminalResult: OrchestrationTestResult<TOutput> | undefined;
  private disposed = false;

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
    const state = await this.executeWhileActive(() =>
      this.client.waitForOrchestrationStart(this.instanceId, true, timeoutMs / 1000),
    );
    return this.applyState(requireState(state, this.instanceId));
  }

  async waitForCompletion(timeoutMs: number = this.timeoutMs): Promise<OrchestrationTestResult<TOutput>> {
    if (this.terminalResult) {
      return this.terminalResult;
    }
    if (this.disposed) {
      throw createHarnessDisposedError();
    }

    try {
      const state = await this.client.waitForOrchestrationCompletion(this.instanceId, true, timeoutMs / 1000);
      return this.applyState(requireState(state, this.instanceId));
    } catch (error) {
      if (this.disposed) {
        if (this.terminalResult) {
          return this.terminalResult;
        }
        throw createHarnessDisposedError();
      }
      throw error;
    }
  }

  async raiseEvent<TData>(name: string, data?: TData): Promise<void> {
    await this.executeWhileActive(() => this.client.raiseOrchestrationEvent(this.instanceId, name, data));
  }

  async terminate<TOutputData>(output?: TOutputData): Promise<void> {
    await this.executeWhileActive(() => this.client.terminateOrchestration(this.instanceId, output));
  }

  async suspend(): Promise<void> {
    await this.executeWhileActive(() => this.client.suspendOrchestration(this.instanceId));
    await this.refresh();
  }

  async resume(): Promise<void> {
    await this.executeWhileActive(() => this.client.resumeOrchestration(this.instanceId));
    await this.refresh();
  }

  async refresh(): Promise<OrchestrationTestResult<TOutput>> {
    const state = await this.executeWhileActive(() => this.client.getOrchestrationState(this.instanceId, true));
    return this.applyState(requireState(state, this.instanceId));
  }

  markDisposed(): void {
    this.disposed = true;
  }

  async captureTerminalSnapshot(): Promise<void> {
    if (this.terminalResult) {
      return;
    }
    const state = await this.client.getOrchestrationState(this.instanceId, true);
    if (state && isTerminalStatus(state.runtimeStatus)) {
      this.applyState(state);
    }
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

    const result = {
      instanceId: this.instanceId,
      status: this.currentStatus,
      output: this.currentOutput,
      customStatus: this.currentCustomStatus,
      failure: this.currentFailure,
    };
    if (isTerminalStatus(state.runtimeStatus)) {
      this.terminalResult = result;
    }
    return result;
  }

  private async executeWhileActive<T>(operation: () => Promise<T>): Promise<T> {
    this.ensureActive();
    try {
      const result = await operation();
      this.ensureActive();
      return result;
    } catch (error) {
      if (this.disposed) {
        throw createHarnessDisposedError();
      }
      throw error;
    }
  }

  private ensureActive(): void {
    if (this.disposed) {
      throw createHarnessDisposedError();
    }
  }
}

function createEntityBatchRequest<TState>(
  initialState: TState | undefined,
  operations: ReadonlyArray<EntityTestOperation>,
): Parameters<TaskEntityShim["executeAsync"]>[0] {
  // TaskEntityShim reads only these protobuf accessors. Keeping this adapter local avoids exposing
  // generated protocol types through the durable-functions testing API.
  const request = {
    getEntitystate: () => serializedStateValue(initialState),
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

function serializedStateValue(value: unknown): { getValue(): string } | undefined {
  return value == null ? undefined : serializedValue(value);
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
      return "Running";
  }
}

function isTerminalStatus(status: OrchestrationStatus): boolean {
  return (
    status === OrchestrationStatus.COMPLETED ||
    status === OrchestrationStatus.FAILED ||
    status === OrchestrationStatus.TERMINATED
  );
}

function validateStartAt(startAt: Date | undefined): void {
  if (!startAt) {
    return;
  }
  if (Number.isNaN(startAt.getTime())) {
    throw new TypeError("startAt must be a valid Date.");
  }
  if (startAt.getTime() > Date.now()) {
    throw new Error("Future startAt values are not supported by the in-memory orchestration harness.");
  }
}

function createHarnessDisposedError(): Error {
  return new Error(HARNESS_DISPOSED_MESSAGE);
}

/** Namespace-style access matching the rest of the Durable Functions API. */
export const test = {
  createOrchestrationHarness,
  runActivity,
  runEntity,
  runOrchestrator,
};
