// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TActivity } from "../types/activity.type";
import { TInput } from "../types/input.type";
import { TOrchestrator } from "../types/orchestrator.type";
import { TOutput } from "../types/output.type";
import { EntityFactory } from "../entities/task-entity";

interface TaskRegistration<T> {
  readonly name: string;
  readonly version: string;
  readonly fn: T;
}

type TaskRegistrations<T> = Map<string, Map<string, TaskRegistration<T>>>;

function addRegistration<T>(
  registrations: TaskRegistrations<T>,
  kind: string,
  name: string,
  fn: T,
  version = "",
): void {
  if (!name) {
    throw new Error(`A non-empty ${kind} name is required.`);
  }
  version = version ?? "";
  if (version && !version.trim()) {
    throw new Error("A task version must not contain only whitespace.");
  }
  const key = version.toLowerCase();
  const versions = registrations.get(name) ?? new Map<string, TaskRegistration<T>>();
  if (versions.has(key)) {
    const versionText = version ? ` with version '${version}'` : "";
    throw new Error(`A '${name}' ${kind}${versionText} already exists.`);
  }
  versions.set(key, { name, version, fn });
  registrations.set(name, versions);
}

function getRegisteredTask<T>(registrations: TaskRegistrations<T>, name: string, version?: string): T | undefined {
  const versions = registrations.get(name);
  // Like the .NET processor, treat whitespace-only wire versions as unversioned.
  const key = version?.trim() ? version.toLowerCase() : "";
  const exact = versions?.get(key);
  if (exact) {
    return exact.fn;
  }
  // Legacy registrations handle any version only until this name opts into versioned dispatch.
  return key && versions?.size === 1 ? versions.get("")?.fn : undefined;
}

/**
 * Registry for orchestrators, activities, and entities.
 *
 * @remarks
 * Task names are case-sensitive; versions are case-insensitive opaque strings.
 * An omitted or empty version registers the unversioned implementation.
 * Entity names are normalized to lowercase for case-insensitive matching.
 */
export class Registry {
  private _orchestrators: TaskRegistrations<TOrchestrator>;
  private _activities: TaskRegistrations<TActivity<TInput, TOutput>>;
  private _entities: Record<string, EntityFactory>;

  constructor() {
    this._orchestrators = new Map();
    this._activities = new Map();
    this._entities = {};
  }

  addOrchestrator(fn: TOrchestrator, version?: string): string {
    if (!fn) {
      throw new Error("An orchestrator function argument is required.");
    }

    const name = this._getFunctionName(fn);
    this.addNamedOrchestrator(name, fn, version);
    return name;
  }

  addNamedOrchestrator(name: string, fn: TOrchestrator, version?: string): void {
    addRegistration(this._orchestrators, "orchestrator", name, fn, version);
  }

  getOrchestrator(name?: string, version?: string): TOrchestrator | undefined {
    if (!name) {
      return undefined;
    }

    return getRegisteredTask(this._orchestrators, name, version);
  }

  addActivity(fn: TActivity<TInput, TOutput>, version?: string): string {
    if (!fn) {
      throw new Error("An activity function argument is required.");
    }

    const name = this._getFunctionName(fn);
    this.addNamedActivity(name, fn, version);
    return name;
  }

  addNamedActivity(name: string, fn: TActivity<TInput, TOutput>, version?: string): void {
    addRegistration(this._activities, "activity", name, fn, version);
  }

  getActivity(name: string, version?: string): TActivity<TInput, TOutput> | undefined {
    return getRegisteredTask(this._activities, name, version);
  }

  /**
   * Registers an entity factory with auto-detected name.
   *
   * @param factory - Factory function that creates entity instances.
   * @returns The registered entity name (normalized to lowercase).
   *
   * @remarks
   * The entity name is derived from the factory function name.
   * Entity names are normalized to lowercase for case-insensitive matching.
   */
  addEntity(factory: EntityFactory): string {
    if (!factory) {
      throw new Error("An entity factory argument is required.");
    }

    const name = this._getFunctionName(factory);
    this.addNamedEntity(name, factory);
    return name.toLowerCase();
  }

  /**
   * Registers an entity factory with a specific name.
   *
   * @param name - The name to register the entity under.
   * @param factory - Factory function that creates entity instances.
   *
   * @remarks
   * Entity names are normalized to lowercase for case-insensitive matching,
   * consistent with EntityInstanceId's name normalization.
   */
  addNamedEntity(name: string, factory: EntityFactory): void {
    if (!name) {
      throw new Error("A non-empty entity name is required.");
    }

    if (!factory) {
      throw new Error("An entity factory argument is required.");
    }

    // Normalize to lowercase for case-insensitive matching (like EntityInstanceId)
    const normalizedName = name.toLowerCase();

    if (normalizedName in this._entities) {
      throw new Error(`An entity named '${name}' already exists.`);
    }

    this._entities[normalizedName] = factory;
  }

  /**
   * Gets an entity factory by name.
   *
   * @param name - The name of the entity to look up.
   * @returns The entity factory, or undefined if not found.
   *
   * @remarks
   * The name is normalized to lowercase before lookup.
   */
  getEntity(name: string): EntityFactory | undefined {
    if (!name) {
      return undefined;
    }

    // Normalize to lowercase for case-insensitive matching
    return this._entities[name.toLowerCase()];
  }

  /**
   * Gets the names of all registered orchestrators.
   */
  getOrchestratorNames(): string[] {
    return [...this._orchestrators.keys()];
  }

  /**
   * Gets the names of all registered activities.
   */
  getActivityNames(): string[] {
    return [...this._activities.keys()];
  }

  /** Gets every orchestrator registration, including versions sharing the same name. */
  getOrchestratorRegistrations(): TaskRegistration<TOrchestrator>[] {
    return [...this._orchestrators.values()].flatMap((versions) => [...versions.values()]);
  }

  /** Gets every activity registration, including versions sharing the same name. */
  getActivityRegistrations(): TaskRegistration<TActivity<TInput, TOutput>>[] {
    return [...this._activities.values()].flatMap((versions) => [...versions.values()]);
  }

  /**
   * Gets the names of all registered entities.
   */
  getEntityNames(): string[] {
    return Object.keys(this._entities);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  _getFunctionName(fn: Function): string {
    if (fn.name) {
      return fn.name;
    }

    const fnStr = fn.toString().trimStart();
    let start = 0;
    const isWhitespace = (char: string | undefined) => char !== undefined && char.trim() === "";

    if (fnStr.startsWith("async")) {
      const afterAsync = "async".length;
      if (!isWhitespace(fnStr[afterAsync])) {
        return "";
      }

      start = afterAsync;
      while (isWhitespace(fnStr[start])) {
        start++;
      }
    }

    if (!fnStr.startsWith("function", start)) {
      return "";
    }

    start += "function".length;
    while (isWhitespace(fnStr[start])) {
      start++;
    }

    if (fnStr[start] === "*") {
      start++;
      while (isWhitespace(fnStr[start])) {
        start++;
      }
    }

    const end = fnStr.indexOf("(", start);
    if (end === -1) {
      return "";
    }

    return fnStr.slice(start, end).trim();
  }
}
