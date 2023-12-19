import { TActivity } from "../types/activity.type";
import { TInput } from "../types/input.type";
import { TOrchestrator } from "../types/orchestrator.type";
import { TOutput } from "../types/output.type";

export class Registry {
  private _orchestrators: Record<string, TOrchestrator>;
  private _activities: Record<string, TActivity<TInput, TOutput>>;

  constructor() {
    this._orchestrators = {};
    this._activities = {};
  }

  addOrchestrator(name: string, fn: TOrchestrator): string {
    if (!fn) {
      throw new Error("An orchestrator function argument is required.");
    }

    this.addNamedOrchestrator(name, fn);
    return name;
  }

  addNamedOrchestrator(name: string, fn: TOrchestrator): void {
    if (!name) {
      throw new Error("A non-empty orchestrator name is required.");
    }

    if (name in this._orchestrators) {
      throw new Error(`A '${name}' orchestrator already exists.`);
    }

    this._orchestrators[name] = fn;
  }

  getOrchestrator(name?: string): TOrchestrator | undefined {
    if (!name) {
      return undefined;
    }

    return this._orchestrators[name];
  }

  addActivity(name: string, fn: TActivity<TInput, TOutput>): string {
    if (!fn) {
      throw new Error("An activity function argument is required.");
    }

    this.addNamedActivity(name, fn);
    return name;
  }

  addNamedActivity(name: string, fn: TActivity<TInput, TOutput>): void {
    if (!name) {
      throw new Error("A non-empty activity name is required.");
    }

    if (name in this._activities) {
      throw new Error(`A '${name}' activity already exists.`);
    }

    this._activities[name] = fn;
  }

  getActivity(name: string): TActivity<TInput, TOutput> | undefined {
    return this._activities[name];
  }

  _getFunctionName(fn: Function): string {
    return fn.name || fn.toString().match(/function\s*([^(]*)\(/)![1];
  }
}
