// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isPromise } from "util/types";
import { ActivityContext } from "../task/context/activity-context";
import { Logger, ConsoleLogger } from "../types/logger.type";
import { ActivityNotRegisteredError } from "./exception/activity-not-registered-error";
import { Registry } from "./registry";
import * as WorkerLogs from "./logs";
import {
  ActivityExecutionOptions,
  ActivityMiddleware,
  DefaultActivityMiddlewareContext,
  MiddlewareFeatures,
  runActivityMiddleware,
} from "./middleware";

export class ActivityExecutor {
  private _registry: Registry;
  private _logger: Logger;
  private _middleware: readonly ActivityMiddleware[];

  constructor(registry: Registry, logger?: Logger, middleware: readonly ActivityMiddleware[] = []) {
    this._registry = registry;
    this._logger = logger ?? new ConsoleLogger();
    this._middleware = [...middleware];
  }

  public async execute(
    orchestrationId: string,
    name: string,
    taskId: number,
    encodedInput?: string,
    options: ActivityExecutionOptions = {},
  ): Promise<string | undefined> {
    const fn = this._registry.getActivity(name);

    if (!fn) {
      throw new ActivityNotRegisteredError(name);
    }

    // Log activity start (EventId 603)
    WorkerLogs.activityStarted(this._logger, orchestrationId, name);

    try {
      // Deserialize the input inside the try-catch so that malformed JSON
      // is reported through the same activityFailed log path (EventId 605)
      // as any other activity execution error.
      const activityInput = encodedInput ? JSON.parse(encodedInput) : undefined;
      const ctx = new ActivityContext(orchestrationId, taskId);
      const middlewareContext = new DefaultActivityMiddlewareContext(
        name,
        orchestrationId,
        taskId,
        options.version,
        options.tags,
        activityInput,
        encodedInput || undefined,
        ctx,
        options.features ?? new MiddlewareFeatures(),
      );

      await runActivityMiddleware(middlewareContext, this._middleware, async () => {
        const activityOutput = fn(ctx, activityInput);
        return isPromise(activityOutput) ? await activityOutput : activityOutput;
      });

      // Return the output
      const encodedOutput =
        middlewareContext.result !== undefined ? JSON.stringify(middlewareContext.result) : undefined;

      // Log activity completion (EventId 604)
      WorkerLogs.activityCompleted(this._logger, orchestrationId, name);

      return encodedOutput;
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      // Log activity failure (EventId 605)
      WorkerLogs.activityFailed(this._logger, orchestrationId, name, err);
      throw err;
    }
  }
}
