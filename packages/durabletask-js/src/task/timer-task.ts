// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CompletableTask } from "./completable-task";

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
 * const timeoutTask = context.createTimer(expirationDate);
 * const workTask = context.callActivity("DoWork");
 * const winner = yield context.whenAny([timeoutTask, workTask]);
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

  /**
   * Registers the handler invoked when this timer is first canceled.
   *
   * The orchestration context supplies a closure that removes the timer's
   * pending `CreateTimer` action and pending-task entry, so this class needs no
   * knowledge of the context's internals.
   *
   * @param handler - Called once, when {@link cancel} first transitions the timer
   *   to the canceled state.
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
   * This is deterministic and replay-safe: it consumes no sequence number and
   * only runs the injected handler. Cancel does NOT mark the task complete
   * (`isCompleted` stays false). Calling `cancel()` after the timer has already
   * fired (completed) or after it was already canceled is a no-op, so the handler
   * runs at most once.
   */
  cancel(): void {
    if (this._isComplete || this._isCanceled) {
      // Already fired or already canceled — nothing to do.
      return;
    }

    this._isCanceled = true;
    this._cancelHandler?.();
  }
}
