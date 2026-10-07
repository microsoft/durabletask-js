// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WhenAllTask } from "./when-all-task";
import { Task } from "./task";
import { WhenAnyTask } from "./when-any-task";

/**
 * Returns a task that completes after every provided task completes or fails.
 * Results preserve input order and duplicate task references. Tasks may be shared between groups.
 *
 * @param tasks the tasks to wait for
 * @returns {WhenAllTask} a task containing the ordered results, or an aggregate of child failures
 */
export function whenAll<T>(tasks: Task<T>[]): WhenAllTask<T> {
  return new WhenAllTask(tasks);
}

/**
 * Returns a task that completes when any of the provided tasks complete or fail
 *
 * @param tasks
 * @returns
 */
export function whenAny(tasks: Task<any>[]): WhenAnyTask {
  return new WhenAnyTask(tasks);
}

/**
 * Returns the name of the provided function
 *
 * @param fn
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getName(fn: Function): string {
  if (!fn) {
    throw new Error("Cannot infer a name from a null or undefined function. Please provide a name explicitly.");
  }

  const name = fn.name;

  if (!name) {
    throw new Error("Cannot infer a name from a lambda function. Please provide a name explicitly.");
  }

  return name;
}
