// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/** Thrown when reading the result of a canceled durable timer. */
export class TaskCancelledError extends Error {
  constructor() {
    super("The task was cancelled.");
    this.name = "TaskCancelledError";
  }
}
