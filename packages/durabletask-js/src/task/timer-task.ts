// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { CompletableTask } from "./completable-task";

/**
 * Minimal structural view of the orchestration context bookkeeping that a
 * {@link TimerTask} needs in order to cancel a pending timer.
 *
 * This is intentionally a narrow interface (rather than importing
 * `RuntimeOrchestrationContext`) so that `TimerTask` has no circular dependency
 * on the worker runtime. The concrete context satisfies it structurally.
 */
export interface TimerBookkeeping {
  _pendingActions: Record<number, pb.OrchestratorAction>;
  _pendingTasks: Record<number, CompletableTask<any>>;
}

/**
 * A durable timer task returned by `OrchestrationContext.createTimer`.
 *
 * In addition to the normal {@link Task} surface, a `TimerTask` can be
 * canceled. Canceling is the classic "timeout vs. work" pattern: when a racing
 * task wins (e.g. via `whenAny`), the losing timeout timer is canceled so the
 * orchestration is no longer waiting on it.
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
  private readonly _bookkeeping: TimerBookkeeping;
  private readonly _timerId: number;
  private _isCanceled = false;

  /**
   * Creates a new TimerTask.
   *
   * @param bookkeeping - The orchestration context bookkeeping holding the pending
   *   actions and tasks (the concrete `RuntimeOrchestrationContext` satisfies this).
   * @param timerId - The sequence id of the timer's `CreateTimer` action / pending task.
   */
  constructor(bookkeeping: TimerBookkeeping, timerId: number) {
    super();
    this._bookkeeping = bookkeeping;
    this._timerId = timerId;
  }

  /**
   * Whether this timer has been canceled via {@link cancel}.
   */
  get isCanceled(): boolean {
    return this._isCanceled;
  }

  /**
   * Cancels this timer so the orchestration stops waiting on it.
   *
   * Semantics:
   * - If the timer's `CreateTimer` action has not yet been dispatched to the
   *   sidecar (i.e. it is still pending in the current turn), it is removed so
   *   the timer is never scheduled at all.
   * - If the timer was already scheduled on a prior turn, it is removed from the
   *   pending-task set so the orchestrator no longer waits on it; the backend
   *   timer is reaped when the orchestration completes, and a late `TimerFired`
   *   event is ignored because no pending task remains for it.
   *
   * This is deterministic and replay-safe: it consumes no sequence number and
   * only deletes bookkeeping entries by key. Calling `cancel()` after the timer
   * has already fired (completed) or after it was already canceled is a no-op.
   */
  cancel(): void {
    if (this._isComplete || this._isCanceled) {
      // Already fired or already canceled — nothing to do.
      return;
    }

    this._isCanceled = true;

    // Drop the pending CreateTimer action (if it has not been dispatched yet)
    // so it is not scheduled, and stop tracking this timer as outstanding so
    // the orchestrator is no longer waiting on it.
    delete this._bookkeeping._pendingActions[this._timerId];
    delete this._bookkeeping._pendingTasks[this._timerId];
  }
}
