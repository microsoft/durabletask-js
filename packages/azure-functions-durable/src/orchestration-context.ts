// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  ConsoleLogger,
  EntityInstanceId,
  OrchestrationContext,
  Task,
  TOrchestrator,
  whenAll,
  whenAny,
} from "@microsoft/durabletask-js";
import { RetryOptions } from "./retry-options";

/**
 * Classic Durable Functions (v3) orchestration context, exposed to migrating orchestrators as
 * `context.df`.
 *
 * @remarks
 * This is an adapter, not a re-implementation: every method forwards to the core durabletask
 * {@link OrchestrationContext}. It lets orchestrator bodies written against the legacy
 * `durable-functions` `context.df.*` API run unchanged on the gRPC/durabletask engine.
 */
export class DurableOrchestrationContext {
  private _customStatus: unknown;

  constructor(
    private readonly _ctx: OrchestrationContext,
    private readonly _input: unknown,
  ) {}

  /** The instance ID of the current orchestration. */
  get instanceId(): string {
    return this._ctx.instanceId;
  }

  /** The ID of the parent orchestration, or `undefined` if this is a top-level orchestration. */
  get parentInstanceId(): string | undefined {
    return this._ctx.parent?.instanceId;
  }

  /** Whether the orchestrator is currently replaying from history. */
  get isReplaying(): boolean {
    return this._ctx.isReplaying;
  }

  /** The replay-safe current UTC date/time. */
  get currentUtcDateTime(): Date {
    return this._ctx.currentUtcDateTime;
  }

  /** The version assigned to the current orchestration instance (empty string if none). */
  get version(): string {
    return this._ctx.version;
  }

  /** The custom status set during this execution via {@link setCustomStatus} (or `undefined`). */
  get customStatus(): unknown {
    return this._customStatus;
  }

  /**
   * `Task.all` / `Task.any` fan-out/fan-in helpers (v3 shape), forwarding to the core
   * `whenAll` / `whenAny` combinators.
   */
  readonly Task = {
    all: (tasks: Task<unknown>[]): Task<unknown[]> => whenAll(tasks),
    any: (tasks: Task<unknown>[]): Task<Task<unknown>> => whenAny(tasks) as unknown as Task<Task<unknown>>,
  };

  /** Gets the orchestration input. */
  getInput<T = unknown>(): T {
    return this._input as T;
  }

  /** Schedules an activity for execution. */
  callActivity<T = unknown>(name: string, input?: unknown): Task<T> {
    return this._ctx.callActivity<unknown, T>(name, input);
  }

  /** Schedules an activity for execution with a retry policy. */
  callActivityWithRetry<T = unknown>(
    name: string,
    retryOptions: RetryOptions,
    input?: unknown,
  ): Task<T> {
    return this._ctx.callActivity<unknown, T>(name, input, {
      retry: retryOptions.toRetryPolicy(),
    });
  }

  /** Schedules a sub-orchestrator for execution. */
  callSubOrchestrator<T = unknown>(
    name: string,
    input?: unknown,
    instanceId?: string,
    version?: string,
  ): Task<T> {
    return this._ctx.callSubOrchestrator<unknown, T>(
      name,
      input,
      instanceId !== undefined || version !== undefined ? { instanceId, version } : undefined,
    );
  }

  /** Schedules a sub-orchestrator for execution with a retry policy. */
  callSubOrchestratorWithRetry<T = unknown>(
    name: string,
    retryOptions: RetryOptions,
    input?: unknown,
    instanceId?: string,
    version?: string,
  ): Task<T> {
    return this._ctx.callSubOrchestrator<unknown, T>(name, input, {
      retry: retryOptions.toRetryPolicy(),
      instanceId,
      version,
    });
  }

  /** Creates a durable timer that fires at the specified time. */
  createTimer(fireAt: Date | number): Task<unknown> {
    return this._ctx.createTimer(fireAt);
  }

  /** Waits for an external event with the given name. */
  waitForExternalEvent<T = unknown>(name: string): Task<T> {
    return this._ctx.waitForExternalEvent(name) as Task<T>;
  }

  /** Restarts the orchestration with a new input. */
  continueAsNew(input: unknown, saveEvents = true): void {
    this._ctx.continueAsNew(input, saveEvents);
  }

  /** Sets the orchestration's custom status payload. */
  setCustomStatus(customStatus: unknown): void {
    this._customStatus = customStatus;
    this._ctx.setCustomStatus(customStatus);
  }

  /**
   * Creates a new replay-safe UUID string.
   *
   * @param _instanceId - Accepted for classic v3 signature compatibility; ignored. The core engine
   *   derives the deterministic UUID from the instance ID and an internal sequence counter.
   */
  newGuid(_instanceId?: string): string {
    return this._ctx.newGuid();
  }

  /**
   * Schedules a durable HTTP call (classic v3 API).
   *
   * @remarks
   * Not supported: the durabletask engine has no durable-HTTP (`callHttp`) equivalent, so this
   * throws. This mirrors the Python provider, which raises for the same reason.
   */
  callHttp(_options: unknown): never {
    throw new Error(
      "callHttp is not supported: the durabletask engine has no durable-HTTP (callHttp) equivalent.",
    );
  }

  /** Calls an entity operation and waits for its result. */
  callEntity<T = unknown>(
    entityId: EntityInstanceId,
    operationName: string,
    operationInput?: unknown,
  ): Task<T> {
    return this._ctx.entities.callEntity<T>(entityId, operationName, operationInput);
  }

  /** Signals an entity operation (fire-and-forget). */
  signalEntity(
    entityId: EntityInstanceId,
    operationName: string,
    operationInput?: unknown,
  ): void {
    this._ctx.entities.signalEntity(entityId, operationName, operationInput);
  }
}

/** The object passed to a classic (v3) orchestrator function; its `df` is the durable context. */
export interface ClassicOrchestrationContext {
  df: DurableOrchestrationContext;
  /** Replay-safe log at info level (suppressed during replay). Alias of {@link info}. */
  log(...args: unknown[]): void;
  /** Replay-safe error log (suppressed during replay). */
  error(...args: unknown[]): void;
  /** Replay-safe warning log (suppressed during replay). */
  warn(...args: unknown[]): void;
  /** Replay-safe info log (suppressed during replay). */
  info(...args: unknown[]): void;
  /** Replay-safe debug log (suppressed during replay). */
  debug(...args: unknown[]): void;
  /** Replay-safe trace log (mapped to debug; suppressed during replay). */
  trace(...args: unknown[]): void;
}

/**
 * A classic Durable Functions (v3) orchestrator: a single-argument generator function that reads
 * and schedules work through `context.df.*`.
 */
export type ClassicOrchestrator = (
  context: ClassicOrchestrationContext,
) => Generator<Task<unknown>, unknown, unknown> | unknown;

/**
 * Adapts an orchestrator handler for registration on the core worker.
 *
 * @remarks
 * Core-native orchestrators declare `(ctx, input)` and are returned unchanged. Classic v3
 * orchestrators declare a single `context` parameter and use `context.df.*`; those are wrapped so
 * the core engine drives them while `context.df` forwards to the core {@link OrchestrationContext}.
 *
 * Detection is by arity: only single-parameter functions are treated as classic. Declare your
 * core-native orchestrator as `(ctx, input)` so it passes through.
 */
export function wrapOrchestrator(handler: TOrchestrator | ClassicOrchestrator): TOrchestrator {
  if (typeof handler === "function" && handler.length === 1) {
    const classic = handler as ClassicOrchestrator;
    // The core engine only drives orchestrators whose invocation returns an ASYNC generator
    // (it gates on Symbol.asyncIterator). Classic v3 orchestrators are SYNC generators, so the
    // wrapper must itself be an async generator that delegates to the classic one via `yield*`;
    // that forwards each core Task to the engine and pipes sent results back into the classic body.
    const wrapped = async function* (
      ctx: OrchestrationContext,
      input: unknown,
    ): AsyncGenerator<Task<unknown>, unknown, unknown> {
      const df = new DurableOrchestrationContext(ctx, input);
      // Replay-safe logger: output is suppressed while the engine replays history, matching the
      // .NET/Python providers. Core Logger has no `trace`/plain `log`, so log→info and trace→debug.
      const logger = ctx.createReplaySafeLogger(new ConsoleLogger());
      const toArgs = (a: unknown[]) => a as [string, ...unknown[]];
      const classicCtx: ClassicOrchestrationContext = {
        df,
        log: (...a) => logger.info(...toArgs(a)),
        info: (...a) => logger.info(...toArgs(a)),
        warn: (...a) => logger.warn(...toArgs(a)),
        error: (...a) => logger.error(...toArgs(a)),
        debug: (...a) => logger.debug(...toArgs(a)),
        trace: (...a) => logger.debug(...toArgs(a)),
      };
      const result = classic(classicCtx);
      if (isGenerator(result)) {
        return yield* result;
      }
      return result;
    };
    return wrapped as unknown as TOrchestrator;
  }
  return handler as TOrchestrator;
}

/** @hidden */
function isGenerator(value: unknown): value is Generator<Task<unknown>, unknown, unknown> {
  return (
    value != null &&
    typeof (value as Iterator<unknown>).next === "function" &&
    typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function"
  );
}
