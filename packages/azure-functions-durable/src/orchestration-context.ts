// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  ConsoleLogger,
  EntityInstanceId,
  OrchestrationContext,
  Task,
  TimerTask,
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
  callActivityWithRetry<T = unknown>(name: string, retryOptions: RetryOptions, input?: unknown): Task<T> {
    return this._ctx.callActivity<unknown, T>(name, input, {
      retry: retryOptions.toRetryPolicy(),
    });
  }

  /** Schedules a sub-orchestrator for execution. */
  callSubOrchestrator<T = unknown>(name: string, input?: unknown, instanceId?: string, version?: string): Task<T> {
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

  /**
   * Creates a durable timer that fires at the specified time.
   *
   * @returns A cancelable {@link TimerTask}. Call `.cancel()` (and check `.isCanceled`) to support
   *   the classic durable-timeout pattern where a timer races activity work via `Task.any`.
   */
  createTimer(fireAt: Date | number): TimerTask {
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
    throw new Error("callHttp is not supported: the durabletask engine has no durable-HTTP (callHttp) equivalent.");
  }

  /** Calls an entity operation and waits for its result. */
  callEntity<T = unknown>(entityId: EntityInstanceId, operationName: string, operationInput?: unknown): Task<T> {
    return this._ctx.entities.callEntity<T>(entityId, operationName, operationInput);
  }

  /** Signals an entity operation (fire-and-forget). */
  signalEntity(entityId: EntityInstanceId, operationName: string, operationInput?: unknown): void {
    this._ctx.entities.signalEntity(entityId, operationName, operationInput);
  }
}

/**
 * The object passed to a classic (v3) orchestrator function; its `df` is the durable context.
 *
 * @remarks
 * Breaking change from `durable-functions` v3: v3's `OrchestrationContext extends InvocationContext`,
 * so orchestrators could read `context.invocationId`, `context.functionName`, `context.extraInputs`,
 * etc. This context intentionally exposes only `df` plus replay-safe log helpers; orchestrator code
 * that touched `InvocationContext` members must be updated. See the package README/CHANGELOG.
 */
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
 * Core-native orchestrators are driven directly by the engine and are returned unchanged. Classic v3
 * orchestrators use `context.df.*` and are wrapped so the engine drives them while `context.df`
 * forwards to the core {@link OrchestrationContext}.
 *
 * Detection is by generator/async kind, mirroring the engine's own gate (it only drives values
 * exposing `Symbol.asyncIterator`), not by arity:
 * - `async function*` (core-native, e.g. `async function*(ctx) { yield ctx.callActivity(...) }`) is
 *   passed through — wrapping it would swap in a classic `{ df, log }` context and silently break it.
 * - `async function` (core-native non-generator, e.g. `async (ctx, input) => ...`) is passed through;
 *   the engine awaits it. A classic v3 orchestrator is never a plain async function (it must be a
 *   generator to `yield` durable tasks), so `async` unambiguously means core-native.
 * - `function*` (classic v3 sync generator) is wrapped; the engine cannot drive a sync generator, so
 *   the wrapper delegates to it via `yield*`.
 * - A plain SYNC (non-generator) SINGLE-ARGUMENT function `(ctx) => value` is CORE-NATIVE and passes
 *   through unchanged, receiving the core {@link OrchestrationContext}. This fixes #321 (a native
 *   `(ctx) => ctx.instanceId` previously mis-routed by arity to the classic context). BREAKING: a
 *   classic v3 orchestrator written as a plain single-arg non-generator using `context.df.*` is no
 *   longer supported — convert it to a `function*` generator (the standard classic shape,
 *   unaffected) or to the core-native `ctx.*` API. A zero-arg sync function keeps its prior classic
 *   classification, and `(ctx, input)` remains core-native as before.
 */
export function wrapOrchestrator(handler: TOrchestrator | ClassicOrchestrator): TOrchestrator {
  if (typeof handler === "function" && isClassicOrchestrator(handler)) {
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
      if (isDrivableGenerator(result)) {
        return yield* result;
      }
      return result;
    };
    return wrapped as unknown as TOrchestrator;
  }
  return handler as TOrchestrator;
}

/**
 * @hidden
 * Classifies a handler as a classic v3 orchestrator (must be wrapped) versus a core-native one
 * (must pass through). Prefers generator/async kind over arity so that single-parameter core-native
 * `async function*(ctx)` / `async (ctx) => ...` orchestrators are not mis-detected as classic.
 */
function isClassicOrchestrator(handler: TOrchestrator | ClassicOrchestrator): boolean {
  const kind = (handler as { constructor?: { name?: string } }).constructor?.name;
  if (kind === "AsyncGeneratorFunction" || kind === "AsyncFunction") {
    // Core-native: the engine drives async generators directly and awaits plain async
    // orchestrators. A classic v3 orchestrator is never a plain async function — it must be a
    // (sync) generator to `yield` durable tasks — so `async` unambiguously means core-native.
    return false;
  }
  if (kind === "GeneratorFunction") {
    return true; // classic v3: a sync generator the engine can't drive on its own.
  }
  // Plain SYNC (non-generator) function: ONLY the single-argument shape `(ctx) => value` changes —
  // it is now CORE-NATIVE (passes through unchanged, receiving the core OrchestrationContext),
  // fixing #321. Every other arity keeps its prior classification: a zero-arg function stays classic,
  // and `(ctx, input)` was already core-native. Only a sync generator (`function*`) is classic
  // (handled above). A classic v3 orchestrator written as a plain single-arg non-generator using
  // `context.df.*` is no longer supported (breaking) — see #321 and the package README/CHANGELOG.
  return handler.length === 0;
}

/**
 * @hidden
 * Accepts both sync and async generators so the wrapper can drive whichever the classic handler
 * returns (`yield*` in an async generator delegates to either).
 */
function isDrivableGenerator(
  value: unknown,
): value is Generator<Task<unknown>, unknown, unknown> | AsyncGenerator<Task<unknown>, unknown, unknown> {
  return (
    value != null &&
    typeof (value as Iterator<unknown>).next === "function" &&
    (typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function" ||
      typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function")
  );
}
