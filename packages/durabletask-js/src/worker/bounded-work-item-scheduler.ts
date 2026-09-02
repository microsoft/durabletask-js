// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface ScheduledWorkItem {
  execute(): Promise<void>;
  onError(error: Error): void;
}

/**
 * A non-blocking scheduler with at most one waiting item per active permit.
 *
 * The backend normally honors the limits sent in GetWorkItemsRequest, so the
 * bounded waiting area only absorbs small races and in-flight deliveries. A
 * caller must abandon items rejected by schedule() or returned by stop().
 */
export class BoundedWorkItemScheduler<T extends ScheduledWorkItem> {
  private readonly _waiting: T[] = [];
  private _active = 0;
  private _accepting = true;

  constructor(
    private readonly _limit: number,
    private readonly _track: (promise: Promise<void>, onError: (error: Error) => void) => void,
  ) {}

  schedule(item: T): boolean {
    if (!this._accepting || this._limit === 0) {
      return false;
    }

    if (this._active < this._limit) {
      this._start(item);
      return true;
    }

    if (this._waiting.length < this._limit) {
      this._waiting.push(item);
      return true;
    }

    return false;
  }

  stop(): T[] {
    this._accepting = false;
    return this._waiting.splice(0);
  }

  private _start(item: T): void {
    this._active++;
    const lifecycle = Promise.resolve()
      .then(() => item.execute())
      .finally(() => {
        this._active--;
        this._dispatchNext();
      });
    this._track(lifecycle, item.onError);
  }

  private _dispatchNext(): void {
    if (!this._accepting || this._active >= this._limit) {
      return;
    }

    const next = this._waiting.shift();
    if (next) {
      this._start(next);
    }
  }
}
