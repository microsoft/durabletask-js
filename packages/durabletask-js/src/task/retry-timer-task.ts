// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CompletableTask } from "./completable-task";
import { RetryableTask } from "./retryable-task";

/**
 * A timer task that is associated with a retryable task for retry purposes.
 *
 * When this timer fires, the retryable task should be rescheduled for another attempt.
 */
export class RetryTimerTask<T> extends CompletableTask<T> {
  private readonly _retryableParent: RetryableTask<any>;

  /**
   * Creates a new RetryTimerTask.
   *
   * @param retryableParent - The retryable task that this timer is associated with
   */
  constructor(retryableParent: RetryableTask<any>) {
    super();
    this._retryableParent = retryableParent;
  }

  /**
   * Gets the retryable task that this timer is associated with.
   */
  get retryableParent(): RetryableTask<any> {
    return this._retryableParent;
  }
}
