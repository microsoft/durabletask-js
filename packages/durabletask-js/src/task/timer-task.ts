// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CompletableTask } from "./completable-task";
import { TaskCancelledError } from "./exception/task-cancelled-error";

/**
 * A durable timer task returned by `OrchestrationContext.createTimer`.
 *
 * In addition to the normal {@link Task} surface, a `TimerTask` can be
 * canceled. Canceling is the classic "timeout vs. work" pattern: when a racing
 * task wins (e.g. via `whenAny`), the losing timeout timer is canceled so the
 * orchestration is no longer waiting on it.
 *
 * `TimerTask` is decoupled from the orchestration context's internal
 * bookkeeping: the context injects a cancel handler via {@link setCancelHandler}
 * and this class knows nothing about pending actions or tasks. This mirrors the
 * `CancellableTask.set_cancel_handler` pattern in the Python SDK.
 *
 * @example Cancel the loser of a race
 * ```typescript
 * import { whenAny } from "@microsoft/durabletask-js";
 *
 * const timeoutTask = context.createTimer(expirationDate);
 * const workTask = context.callActivity("DoWork");
 * const winner = yield whenAny([timeoutTask, workTask]);
 * if (winner === workTask && !timeoutTask.isCompleted) {
 *   timeoutTask.cancel();
 * }
 * ```
 */
export class TimerTask extends CompletableTask<undefined> {
  private _cancelHandler?: () => void;
  private _isCanceled = false;

  /**
   * Whether this timer has been canceled via {@link cancel}.
   */
  get isCanceled(): boolean {
    return this._isCanceled;
  }

  /** The timer result, or an exception if pending, failed, or canceled. */
  override get result(): undefined {
    return this.getResult();
  }

  override getResult(): undefined {
    if (this._isCanceled) {
      throw new TaskCancelledError();
    }
    return super.getResult();
  }

  /**
   * Registers the handler invoked when this timer is first canceled.
   *
   * The orchestration context supplies a closure that removes the timer's
   * pending `CreateTimer` action and pending-task entry, so this class needs no
   * knowledge of the context's internals.
   *
   * @internal Invoked by the orchestration context when the timer is created.
   *   Not part of the public `TimerTask` surface; orchestrator code must not call it.
   * @param handler - Invoked before changing task state. If it throws, cancellation
   *   is not applied.
   */
  setCancelHandler(handler: () => void): void {
    this._cancelHandler = handler;
  }

  /**
   * Cancels this timer so the orchestration stops waiting on it.
   *
   * The actual bookkeeping is performed by the cancel handler injected via
   * {@link setCancelHandler}. The orchestration context's handler:
   * - Removes the timer's `CreateTimer` action if it has not yet been dispatched
   *   to the sidecar (i.e. it is still pending in the current turn), so the timer
   *   is never scheduled at all.
   * - Otherwise drops the timer from the pending-task set so the orchestrator no
   *   longer waits on it; the backend timer is reaped when the orchestration
   *   completes, and a late `TimerFired` event is ignored because no pending task
   *   remains for it.
   *
   * Cancellation marks this timer complete and canceled, but not failed, and
   * notifies its composite parent. Reading `result` or `getResult()` then throws
   * {@link TaskCancelledError}. A whenAny parent completes with this timer;
   * whenAll propagates cancellation when collecting its final child results.
   *
   * @returns true if cancellation was applied; false if already terminal.
   * @throws If the cancel handler or parent completion callback throws.
   */
  cancel(): boolean {
    if (this._isComplete) {
      return false;
    }

    this._cancelHandler?.();
    this._isCanceled = true;
    this.complete(undefined);
    return true;
  }
}
