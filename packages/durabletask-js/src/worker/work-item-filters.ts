// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { Registry } from "./registry";
import { VersioningOptions, VersionMatchStrategy } from "./versioning-options";

/**
 * Filter for orchestration work items.
 */
export interface OrchestrationWorkItemFilter {
  /** The name of the orchestration to filter for. */
  name: string;
  /** The versions of the orchestration to filter for. Empty array matches all versions. */
  versions?: string[];
}

/**
 * Filter for activity work items.
 */
export interface ActivityWorkItemFilter {
  /** The name of the activity to filter for. */
  name: string;
  /** The versions of the activity to filter for. Empty array matches all versions. */
  versions?: string[];
}

/**
 * Filter for entity work items.
 */
export interface EntityWorkItemFilter {
  /** The name of the entity to filter for. */
  name: string;
}

/**
 * Work item filters that control which work items a worker receives from the sidecar.
 * When provided, the sidecar will only send work items matching these filters.
 * By default, filters are auto-generated from the registered orchestrations, activities,
 * and entities in the worker's registry.
 */
export interface WorkItemFilters {
  /** Orchestration filters. Only orchestrations matching these filters will be dispatched to this worker. */
  orchestrations?: OrchestrationWorkItemFilter[];
  /** Activity filters. Only activities matching these filters will be dispatched to this worker. */
  activities?: ActivityWorkItemFilter[];
  /** Entity filters. Only entities matching these filters will be dispatched to this worker. */
  entities?: EntityWorkItemFilter[];
}

/**
 * Generates work item filters from the worker's registry and versioning options.
 * This mirrors the .NET SDK's `FromDurableTaskRegistry` method.
 *
 * @param registry - The registry containing registered orchestrations, activities, and entities.
 * @param versioning - Optional versioning options for the worker.
 * @returns Work item filters generated from the registry.
 */
export function generateWorkItemFiltersFromRegistry(
  registry: Registry,
  versioning?: VersioningOptions,
): WorkItemFilters {
  const versions: string[] = [];
  if (versioning?.matchStrategy === VersionMatchStrategy.Strict && versioning.version) {
    versions.push(versioning.version);
  }

  return {
    orchestrations: registry.getOrchestratorNames().map((name) => ({
      name,
      versions: [...versions],
    })),
    activities: registry.getActivityNames().map((name) => ({
      name,
      versions: [...versions],
    })),
    entities: registry.getEntityNames().map((name) => ({
      name,
    })),
  };
}

/**
 * Converts SDK work item filters to the protobuf WorkItemFilters message.
 *
 * @param filters - The SDK work item filters to convert.
 * @returns The protobuf WorkItemFilters message.
 */
export function toGrpcWorkItemFilters(filters: WorkItemFilters): pb.WorkItemFilters {
  const grpcFilters = new pb.WorkItemFilters();

  if (filters.orchestrations) {
    for (const orchFilter of filters.orchestrations) {
      const grpcOrchFilter = new pb.OrchestrationFilter();
      grpcOrchFilter.setName(orchFilter.name);
      if (orchFilter.versions && orchFilter.versions.length > 0) {
        grpcOrchFilter.setVersionsList(orchFilter.versions);
      }
      grpcFilters.addOrchestrations(grpcOrchFilter);
    }
  }

  if (filters.activities) {
    for (const actFilter of filters.activities) {
      const grpcActFilter = new pb.ActivityFilter();
      grpcActFilter.setName(actFilter.name);
      if (actFilter.versions && actFilter.versions.length > 0) {
        grpcActFilter.setVersionsList(actFilter.versions);
      }
      grpcFilters.addActivities(grpcActFilter);
    }
  }

  if (filters.entities) {
    for (const entFilter of filters.entities) {
      const grpcEntFilter = new pb.EntityFilter();
      // Entity names are normalized to lowercase in the backend (matching .NET SDK behavior)
      grpcEntFilter.setName(entFilter.name.toLowerCase());
      grpcFilters.addEntities(grpcEntFilter);
    }
  }

  return grpcFilters;
}
