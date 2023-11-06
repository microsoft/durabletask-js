import { isPromise } from "util/types";
import { ActivityContext } from "../task/context/activity-context";
import { ActivityNotRegisteredError } from "./exception/activity-not-registered-error";
import { Registry } from "./registry";

export class ActivityExecutor {
  private _registry: Registry;

  constructor(registry: Registry) {
    this._registry = registry;
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
    console.log(`Activity ${name} completed with output ${encodedOutput} (${chars} chars)`);

    return encodedOutput;
  }
}
