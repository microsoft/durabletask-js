// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isPromise } from "util/types";
import { ActivityContext } from "../task/context/activity-context";
import { Logger, ConsoleLogger } from "../types/logger.type";
import { ActivityNotRegisteredError } from "./exception/activity-not-registered-error";
import { Registry } from "./registry";

export class ActivityExecutor {
  private _registry: Registry;
  private _logger: Logger;

  constructor(registry: Registry, logger?: Logger) {
    this._registry = registry;
    this._logger = logger ?? new ConsoleLogger();
  }

  public async execute(
    orchestrationId: string,
    name: string,
    taskId: number,
    encodedInput?: string,
  ): Promise<string | undefined> {
    const fn = this._registry.getActivity(name);

    if (!fn) {
      throw new ActivityNotRegisteredError(name);
    }

    const activityInput = encodedInput ? JSON.parse(encodedInput) : undefined;
    const ctx = new ActivityContext(orchestrationId, taskId);

    // Execute the activity function
    let activityOutput = fn(ctx, activityInput);

    if (isPromise(activityOutput)) {
      activityOutput = await activityOutput;
    }

    // Return the output
    const encodedOutput = activityOutput ? JSON.stringify(activityOutput) : undefined;
    const chars = encodedOutput ? encodedOutput.length : 0;
    this._logger.info(`Activity ${name} completed (${chars} chars)`);

    return encodedOutput;
  }
}
