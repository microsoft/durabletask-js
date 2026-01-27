// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TActivity } from "../types/activity.type";
import { TInput } from "../types/input.type";
import { TOrchestrator } from "../types/orchestrator.type";
import { TOutput } from "../types/output.type";
import { ITaskEntity, EntityFactory } from "../entities/task-entity";

/**
 * Registry for orchestrators, activities, and entities.
 *
 * @remarks
 * This class is used by the worker to look up task implementations by name.
 * Entity names are normalized to lowercase for case-insensitive matching,
 * consistent with dotnet's EntityInstanceId behavior.
 *
 * Dotnet reference: src/Worker/Core/DurableTaskFactory.cs
 */
export class Registry {
  private _orchestrators: Record<string, TOrchestrator>;
  private _activities: Record<string, TActivity<TInput, TOutput>>;
  private _entities: Record<string, EntityFactory>;

  constructor() {
    this._orchestrators = {};
    this._activities = {};
    this._entities = {};
  }

  addOrchestrator(fn: TOrchestrator): string {
    if (!fn) {
      throw new Error("An orchestrator function argument is required.");
    }

    const name = this._getFunctionName(fn);
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

  addActivity(fn: TActivity<TInput, TOutput>): string {
    if (!fn) {
      throw new Error("An activity function argument is required.");
    }

    const name = this._getFunctionName(fn);
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

  /**
   * Registers an entity factory with auto-detected name.
   *
   * @param factory - Factory function that creates entity instances.
   * @returns The registered entity name (normalized to lowercase).
   *
   * @remarks
   * The entity name is derived from the factory function name.
   * Entity names are normalized to lowercase for case-insensitive matching.
   *
   * Dotnet reference: src/Worker/Core/DurableTaskFactory.cs
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
   *
   * Dotnet reference: src/Worker/Core/DurableTaskFactory.cs
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
   *
   * Dotnet reference: src/Worker/Core/DurableTaskFactory.cs - TryCreateEntity
   */
  getEntity(name: string): EntityFactory | undefined {
    if (!name) {
      return undefined;
    }

    // Normalize to lowercase for case-insensitive matching
    return this._entities[name.toLowerCase()];
  }

  _getFunctionName(fn: Function): string {
    if (fn.name) {
      return fn.name;
    }

    const fnStr = fn.toString();
    const start = fnStr.indexOf("function") + "function".length;
    const end = fnStr.indexOf("(", start);

    return fnStr.slice(start, end).trim() || "";
  }
}
