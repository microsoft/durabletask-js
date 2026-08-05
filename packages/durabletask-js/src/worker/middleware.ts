// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityContext } from "../task/context/activity-context";
import { OrchestrationContext } from "../task/context/orchestration-context";
import { ParentOrchestrationInstance } from "../types/parent-orchestration-instance.type";

declare const middlewareFeatureType: unique symbol;

/**
 * A typed symbol used to store a host-specific object in {@link MiddlewareFeatures}.
 */
export type MiddlewareFeature<T> = symbol & {
  readonly [middlewareFeatureType]?: T;
};

/**
 * Creates a typed key for a host-specific middleware feature.
 */
export function createMiddlewareFeature<T>(description?: string): MiddlewareFeature<T> {
  return Symbol(description) as MiddlewareFeature<T>;
}

/**
 * Per-work-item host objects available to durable middleware.
 *
 * Feature values are process-local and are never serialized into durable history.
 */
export class MiddlewareFeatures {
  readonly #features = new Map<symbol, unknown>();

  get<T>(key: MiddlewareFeature<T>): T | undefined {
    return this.#features.get(key) as T | undefined;
  }

  set<T>(key: MiddlewareFeature<T>, value: T): this {
    this.#features.set(key, value);
    return this;
  }

  has(key: symbol): boolean {
    return this.#features.has(key);
  }

  delete(key: symbol): boolean {
    return this.#features.delete(key);
  }
}

export interface OrchestrationMiddlewareContext<TInput = unknown, TResult = unknown> {
  readonly name: string;
  readonly instanceId: string;
  readonly version?: string;
  readonly parent?: ParentOrchestrationInstance;
  readonly tags?: Readonly<Record<string, string>>;
  readonly input: TInput;
  readonly rawInput?: string;
  readonly isReplaying: boolean;
  readonly orchestrationContext: OrchestrationContext;
  readonly features: MiddlewareFeatures;
  readonly result?: TResult;
  readonly failure?: Error;
}

export type OrchestrationMiddlewareNext = (context: OrchestrationMiddlewareContext) => Promise<void>;

export type OrchestrationMiddleware = (
  context: OrchestrationMiddlewareContext,
  next: OrchestrationMiddlewareNext,
) => Promise<void>;

export interface ActivityMiddlewareContext<TInput = unknown, TResult = unknown> {
  readonly name: string;
  readonly instanceId: string;
  readonly taskId: number;
  readonly version?: string;
  readonly tags?: Readonly<Record<string, string>>;
  readonly input: TInput;
  readonly rawInput?: string;
  readonly activityContext: ActivityContext;
  readonly features: MiddlewareFeatures;
  readonly result?: TResult;
  readonly failure?: Error;
  setResult(result: TResult): void;
}

export type ActivityMiddlewareNext = (context: ActivityMiddlewareContext) => Promise<void>;

export type ActivityMiddleware = (context: ActivityMiddlewareContext, next: ActivityMiddlewareNext) => Promise<void>;

export interface ActivityExecutionOptions {
  version?: string;
  tags?: Readonly<Record<string, string>>;
  features?: MiddlewareFeatures;
}

export class DefaultOrchestrationMiddlewareContext implements OrchestrationMiddlewareContext {
  private _result?: unknown;
  private _failure?: Error;

  constructor(
    readonly name: string,
    readonly instanceId: string,
    readonly version: string | undefined,
    readonly parent: ParentOrchestrationInstance | undefined,
    tags: Readonly<Record<string, string>> | undefined,
    readonly input: unknown,
    readonly rawInput: string | undefined,
    readonly isReplaying: boolean,
    readonly orchestrationContext: OrchestrationContext,
    readonly features: MiddlewareFeatures,
  ) {
    this.tags = copyTags(tags);
  }

  readonly tags?: Readonly<Record<string, string>>;

  get result(): unknown {
    return this._result;
  }

  get failure(): Error | undefined {
    return this._failure;
  }

  setExecutionResult(result: unknown, failure?: Error): void {
    this._result = result;
    this._failure = failure;
  }
}

export class DefaultActivityMiddlewareContext implements ActivityMiddlewareContext {
  private _result?: unknown;
  private _failure?: Error;
  private _resultRevision = 0;

  constructor(
    readonly name: string,
    readonly instanceId: string,
    readonly taskId: number,
    readonly version: string | undefined,
    tags: Readonly<Record<string, string>> | undefined,
    readonly input: unknown,
    readonly rawInput: string | undefined,
    readonly activityContext: ActivityContext,
    readonly features: MiddlewareFeatures,
  ) {
    this.tags = copyTags(tags);
  }

  readonly tags?: Readonly<Record<string, string>>;

  get result(): unknown {
    return this._result;
  }

  get failure(): Error | undefined {
    return this._failure;
  }

  get resultRevision(): number {
    return this._resultRevision;
  }

  get hasResult(): boolean {
    return this._resultRevision > 0;
  }

  setResult(result: unknown): void {
    this._result = result;
    this._failure = undefined;
    this._resultRevision++;
  }

  setFailure(error: Error): void {
    this._failure = error;
  }
}

export async function runOrchestrationMiddleware(
  context: DefaultOrchestrationMiddlewareContext,
  middleware: readonly OrchestrationMiddleware[],
  body: () => Promise<void>,
  suspended?: Promise<void>,
): Promise<"completed" | "suspended"> {
  const validation = new MiddlewareValidation();

  const invoke = async (index: number): Promise<void> => {
    if (index === middleware.length) {
      await body();
      return;
    }

    let nextCalls = 0;
    let nextStarted = false;
    let nextSettled = false;
    let nextPromise: Promise<void> | undefined;
    await middleware[index](context, (nextContext) => {
      if (nextContext !== context || nextCalls++ !== 0) {
        const error = new Error("Orchestration middleware must call next exactly once.");
        validation.record(error);
        return createLazyPromise(() => Promise.reject(error));
      }

      nextPromise = createLazyPromise(async () => {
        nextStarted = true;
        try {
          await invoke(index + 1);
        } finally {
          nextSettled = true;
        }
      });
      return nextPromise;
    });

    if (nextCalls !== 1) {
      validation.record(new Error("Orchestration middleware must call next exactly once."));
    } else if (!nextStarted || !nextSettled) {
      validation.record(new Error("Orchestration middleware must not return before next(context) completes."));
      if (nextStarted && nextPromise) {
        if (suspended) {
          await Promise.race([nextPromise.catch(() => {}), suspended]);
        } else {
          await nextPromise.catch(() => {});
        }
      }
    }

    validation.throwIfFailed();
  };

  try {
    const invocation = invoke(0).then(() => "completed" as const);
    const outcome = suspended
      ? await Promise.race([invocation, suspended.then(() => "suspended" as const)])
      : await invocation;
    if (outcome === "suspended") {
      await Promise.resolve();
    }
    validation.throwIfFailed();
    return outcome;
  } catch (error: unknown) {
    validation.throwIfFailed();
    throw error;
  }
}

export async function runActivityMiddleware(
  context: DefaultActivityMiddlewareContext,
  middleware: readonly ActivityMiddleware[],
  body: () => Promise<unknown>,
): Promise<void> {
  const validation = new MiddlewareValidation();

  const invoke = async (index: number): Promise<void> => {
    if (index === middleware.length) {
      if (!context.hasResult) {
        try {
          context.setResult(await body());
        } catch (error: unknown) {
          const failure = error instanceof Error ? error : new Error(String(error));
          context.setFailure(failure);
          throw failure;
        }
      }
      return;
    }

    let nextCalls = 0;
    let nextStarted = false;
    let nextSettled = false;
    let nextPromise: Promise<void> | undefined;
    const resultRevision = context.resultRevision;
    await middleware[index](context, (nextContext) => {
      if (nextContext !== context || nextCalls++ !== 0) {
        const error = new Error("Activity middleware must call next at most once.");
        validation.record(error);
        return createLazyPromise(() => Promise.reject(error));
      }
      if (context.hasResult) {
        const error = new Error("Activity middleware cannot call next after setResult.");
        validation.record(error);
        return createLazyPromise(() => Promise.reject(error));
      }

      nextPromise = createLazyPromise(async () => {
        nextStarted = true;
        try {
          await invoke(index + 1);
        } finally {
          nextSettled = true;
        }
      });
      return nextPromise;
    });

    if (nextCalls === 0 && context.resultRevision === resultRevision) {
      validation.record(new Error("Activity middleware must call next exactly once or call setResult."));
    } else if (nextPromise && (!nextStarted || !nextSettled)) {
      validation.record(new Error("Activity middleware must not return before next(context) completes."));
      if (nextStarted) {
        await nextPromise;
      }
    }

    validation.throwIfFailed();
  };

  try {
    await invoke(0);
    validation.throwIfFailed();
    if (context.failure) {
      throw context.failure;
    }
  } catch (error: unknown) {
    const failure = validation.failure ?? (error instanceof Error ? error : new Error(String(error)));
    context.setFailure(failure);
    throw failure;
  }
}

function copyTags(tags: Readonly<Record<string, string>> | undefined): Readonly<Record<string, string>> | undefined {
  return tags ? Object.freeze({ ...tags }) : undefined;
}

class MiddlewareValidation {
  private _failure?: Error;

  get failure(): Error | undefined {
    return this._failure;
  }

  record(error: Error): void {
    this._failure ??= error;
  }

  throwIfFailed(): void {
    if (this._failure) {
      throw this._failure;
    }
  }
}

function createLazyPromise<T>(start: () => Promise<T>): Promise<T> {
  let promise: Promise<T> | undefined;
  const getPromise = (): Promise<T> => {
    promise ??= start();
    return promise;
  };
  const observe = <TResult>(result: Promise<TResult>): Promise<TResult> => {
    void result.catch(() => {});
    return {
      then: (onFulfilled, onRejected) => observe(result.then(onFulfilled, onRejected)),
      catch: (onRejected) => observe(result.catch(onRejected)),
      finally: (onFinally) => observe(result.finally(onFinally)),
      [Symbol.toStringTag]: "Promise",
    } as Promise<TResult>;
  };

  return {
    then: (onFulfilled, onRejected) => observe(getPromise().then(onFulfilled, onRejected)),
    catch: (onRejected) => observe(getPromise().catch(onRejected)),
    finally: (onFinally) => observe(getPromise().finally(onFinally)),
    [Symbol.toStringTag]: "Promise",
  } as Promise<T>;
}
