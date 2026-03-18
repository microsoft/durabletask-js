// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Registry } from "../src/worker/registry";
import {
  WorkItemFilters,
  generateWorkItemFiltersFromRegistry,
  toGrpcWorkItemFilters,
} from "../src/worker/work-item-filters";
import { VersionMatchStrategy } from "../src/worker/versioning-options";
import { TaskHubGrpcWorker } from "../src";
import { ITaskEntity } from "../src/entities/task-entity";
import { TaskEntityOperation } from "../src/entities/task-entity-operation";

// Helper orchestrators/activities/entities for tests
async function* myOrchestrator() {
  yield;
}

async function* anotherOrchestrator() {
  yield;
}

function myActivity() {
  return "done";
}

function anotherActivity() {
  return 42;
}

function myEntity(): ITaskEntity {
  return {
    run(operation: TaskEntityOperation): unknown {
      return operation.name;
    },
  };
}

function anotherEntity(): ITaskEntity {
  return {
    run(operation: TaskEntityOperation): unknown {
      return operation.name;
    },
  };
}

describe("WorkItemFilters", () => {
  describe("toGrpcWorkItemFilters", () => {
    it("should convert empty filters", () => {
      // Arrange
      const filters: WorkItemFilters = {};

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      expect(grpcFilters.getOrchestrationsList()).toHaveLength(0);
      expect(grpcFilters.getActivitiesList()).toHaveLength(0);
      expect(grpcFilters.getEntitiesList()).toHaveLength(0);
    });

    it("should convert filters with empty arrays", () => {
      // Arrange
      const filters: WorkItemFilters = {
        orchestrations: [],
        activities: [],
        entities: [],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      expect(grpcFilters.getOrchestrationsList()).toHaveLength(0);
      expect(grpcFilters.getActivitiesList()).toHaveLength(0);
      expect(grpcFilters.getEntitiesList()).toHaveLength(0);
    });

    it("should convert a single orchestration filter without versions", () => {
      // Arrange
      const filters: WorkItemFilters = {
        orchestrations: [{ name: "MyOrchestration" }],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      const orchList = grpcFilters.getOrchestrationsList();
      expect(orchList).toHaveLength(1);
      expect(orchList[0].getName()).toBe("MyOrchestration");
      expect(orchList[0].getVersionsList()).toHaveLength(0);
    });

    it("should convert a single orchestration filter with versions", () => {
      // Arrange
      const filters: WorkItemFilters = {
        orchestrations: [{ name: "MyOrchestration", versions: ["1.0.0", "2.0.0"] }],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      const orchList = grpcFilters.getOrchestrationsList();
      expect(orchList).toHaveLength(1);
      expect(orchList[0].getName()).toBe("MyOrchestration");
      expect(orchList[0].getVersionsList()).toEqual(["1.0.0", "2.0.0"]);
    });

    it("should convert multiple orchestration filters", () => {
      // Arrange
      const filters: WorkItemFilters = {
        orchestrations: [
          { name: "Orchestration1", versions: ["1.0"] },
          { name: "Orchestration2" },
        ],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      const orchList = grpcFilters.getOrchestrationsList();
      expect(orchList).toHaveLength(2);
      expect(orchList[0].getName()).toBe("Orchestration1");
      expect(orchList[0].getVersionsList()).toEqual(["1.0"]);
      expect(orchList[1].getName()).toBe("Orchestration2");
      expect(orchList[1].getVersionsList()).toHaveLength(0);
    });

    it("should convert a single activity filter without versions", () => {
      // Arrange
      const filters: WorkItemFilters = {
        activities: [{ name: "MyActivity" }],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      const actList = grpcFilters.getActivitiesList();
      expect(actList).toHaveLength(1);
      expect(actList[0].getName()).toBe("MyActivity");
      expect(actList[0].getVersionsList()).toHaveLength(0);
    });

    it("should convert a single activity filter with versions", () => {
      // Arrange
      const filters: WorkItemFilters = {
        activities: [{ name: "MyActivity", versions: ["1.0.0"] }],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      const actList = grpcFilters.getActivitiesList();
      expect(actList).toHaveLength(1);
      expect(actList[0].getName()).toBe("MyActivity");
      expect(actList[0].getVersionsList()).toEqual(["1.0.0"]);
    });

    it("should convert multiple activity filters", () => {
      // Arrange
      const filters: WorkItemFilters = {
        activities: [
          { name: "Activity1", versions: ["1.0", "2.0"] },
          { name: "Activity2" },
        ],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      const actList = grpcFilters.getActivitiesList();
      expect(actList).toHaveLength(2);
      expect(actList[0].getName()).toBe("Activity1");
      expect(actList[0].getVersionsList()).toEqual(["1.0", "2.0"]);
      expect(actList[1].getName()).toBe("Activity2");
      expect(actList[1].getVersionsList()).toHaveLength(0);
    });

    it("should convert a single entity filter", () => {
      // Arrange
      const filters: WorkItemFilters = {
        entities: [{ name: "MyEntity" }],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert — entity names are normalized to lowercase
      const entList = grpcFilters.getEntitiesList();
      expect(entList).toHaveLength(1);
      expect(entList[0].getName()).toBe("myentity");
    });

    it("should convert multiple entity filters", () => {
      // Arrange
      const filters: WorkItemFilters = {
        entities: [{ name: "Entity1" }, { name: "Entity2" }],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert — entity names are normalized to lowercase
      const entList = grpcFilters.getEntitiesList();
      expect(entList).toHaveLength(2);
      expect(entList[0].getName()).toBe("entity1");
      expect(entList[1].getName()).toBe("entity2");
    });

    it("should convert mixed filters with orchestrations, activities, and entities", () => {
      // Arrange
      const filters: WorkItemFilters = {
        orchestrations: [{ name: "Orch1", versions: ["1.0"] }],
        activities: [{ name: "Act1", versions: ["2.0"] }],
        entities: [{ name: "Ent1" }],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      expect(grpcFilters.getOrchestrationsList()).toHaveLength(1);
      expect(grpcFilters.getActivitiesList()).toHaveLength(1);
      expect(grpcFilters.getEntitiesList()).toHaveLength(1);

      expect(grpcFilters.getOrchestrationsList()[0].getName()).toBe("Orch1");
      expect(grpcFilters.getOrchestrationsList()[0].getVersionsList()).toEqual(["1.0"]);
      expect(grpcFilters.getActivitiesList()[0].getName()).toBe("Act1");
      expect(grpcFilters.getActivitiesList()[0].getVersionsList()).toEqual(["2.0"]);
      expect(grpcFilters.getEntitiesList()[0].getName()).toBe("ent1");
    });

    it("should handle orchestration filter with empty versions array", () => {
      // Arrange
      const filters: WorkItemFilters = {
        orchestrations: [{ name: "Orch1", versions: [] }],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      const orchList = grpcFilters.getOrchestrationsList();
      expect(orchList).toHaveLength(1);
      expect(orchList[0].getVersionsList()).toHaveLength(0);
    });

    it("should handle activity filter with empty versions array", () => {
      // Arrange
      const filters: WorkItemFilters = {
        activities: [{ name: "Act1", versions: [] }],
      };

      // Act
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      const actList = grpcFilters.getActivitiesList();
      expect(actList).toHaveLength(1);
      expect(actList[0].getVersionsList()).toHaveLength(0);
    });
  });

  describe("generateWorkItemFiltersFromRegistry", () => {
    it("should generate empty filters from empty registry", () => {
      // Arrange
      const registry = new Registry();

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry);

      // Assert
      expect(filters.orchestrations).toEqual([]);
      expect(filters.activities).toEqual([]);
      expect(filters.entities).toEqual([]);
    });

    it("should generate orchestration filters from registered orchestrators", () => {
      // Arrange
      const registry = new Registry();
      registry.addOrchestrator(myOrchestrator);
      registry.addOrchestrator(anotherOrchestrator);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry);

      // Assert
      expect(filters.orchestrations).toHaveLength(2);
      expect(filters.orchestrations![0].name).toBe("myOrchestrator");
      expect(filters.orchestrations![0].versions).toEqual([]);
      expect(filters.orchestrations![1].name).toBe("anotherOrchestrator");
      expect(filters.orchestrations![1].versions).toEqual([]);
    });

    it("should generate activity filters from registered activities", () => {
      // Arrange
      const registry = new Registry();
      registry.addActivity(myActivity);
      registry.addActivity(anotherActivity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry);

      // Assert
      expect(filters.activities).toHaveLength(2);
      expect(filters.activities![0].name).toBe("myActivity");
      expect(filters.activities![0].versions).toEqual([]);
      expect(filters.activities![1].name).toBe("anotherActivity");
      expect(filters.activities![1].versions).toEqual([]);
    });

    it("should generate entity filters from registered entities", () => {
      // Arrange
      const registry = new Registry();
      registry.addEntity(myEntity);
      registry.addEntity(anotherEntity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry);

      // Assert
      expect(filters.entities).toHaveLength(2);
      // Entity names are normalized to lowercase
      expect(filters.entities![0].name).toBe("myentity");
      expect(filters.entities![1].name).toBe("anotherentity");
    });

    it("should generate mixed filters from registry with all types", () => {
      // Arrange
      const registry = new Registry();
      registry.addOrchestrator(myOrchestrator);
      registry.addActivity(myActivity);
      registry.addEntity(myEntity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry);

      // Assert
      expect(filters.orchestrations).toHaveLength(1);
      expect(filters.activities).toHaveLength(1);
      expect(filters.entities).toHaveLength(1);
      expect(filters.orchestrations![0].name).toBe("myOrchestrator");
      expect(filters.activities![0].name).toBe("myActivity");
      expect(filters.entities![0].name).toBe("myentity");
    });

    it("should include version when versioning strategy is Strict", () => {
      // Arrange
      const registry = new Registry();
      registry.addOrchestrator(myOrchestrator);
      registry.addActivity(myActivity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry, {
        version: "1.0.0",
        matchStrategy: VersionMatchStrategy.Strict,
      });

      // Assert
      expect(filters.orchestrations![0].versions).toEqual(["1.0.0"]);
      expect(filters.activities![0].versions).toEqual(["1.0.0"]);
    });

    it("should not include version when versioning strategy is None", () => {
      // Arrange
      const registry = new Registry();
      registry.addOrchestrator(myOrchestrator);
      registry.addActivity(myActivity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry, {
        version: "1.0.0",
        matchStrategy: VersionMatchStrategy.None,
      });

      // Assert
      expect(filters.orchestrations![0].versions).toEqual([]);
      expect(filters.activities![0].versions).toEqual([]);
    });

    it("should not include version when versioning strategy is CurrentOrOlder", () => {
      // Arrange
      const registry = new Registry();
      registry.addOrchestrator(myOrchestrator);
      registry.addActivity(myActivity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry, {
        version: "2.0.0",
        matchStrategy: VersionMatchStrategy.CurrentOrOlder,
      });

      // Assert
      expect(filters.orchestrations![0].versions).toEqual([]);
      expect(filters.activities![0].versions).toEqual([]);
    });

    it("should not include version when Strict but version is not set", () => {
      // Arrange
      const registry = new Registry();
      registry.addOrchestrator(myOrchestrator);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry, {
        matchStrategy: VersionMatchStrategy.Strict,
      });

      // Assert
      expect(filters.orchestrations![0].versions).toEqual([]);
    });

    it("should not include version when no versioning options provided", () => {
      // Arrange
      const registry = new Registry();
      registry.addOrchestrator(myOrchestrator);
      registry.addActivity(myActivity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry);

      // Assert
      expect(filters.orchestrations![0].versions).toEqual([]);
      expect(filters.activities![0].versions).toEqual([]);
    });

    it("should use named registrations correctly", () => {
      // Arrange
      const registry = new Registry();
      registry.addNamedOrchestrator("CustomOrchName", myOrchestrator);
      registry.addNamedActivity("CustomActName", myActivity);
      registry.addNamedEntity("CustomEntName", myEntity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry);

      // Assert
      expect(filters.orchestrations![0].name).toBe("CustomOrchName");
      expect(filters.activities![0].name).toBe("CustomActName");
      // Entity names are lowercased in registry
      expect(filters.entities![0].name).toBe("customentname");
    });

    it("should not share version arrays between filters", () => {
      // Arrange
      const registry = new Registry();
      registry.addOrchestrator(myOrchestrator);
      registry.addOrchestrator(anotherOrchestrator);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry, {
        version: "1.0.0",
        matchStrategy: VersionMatchStrategy.Strict,
      });

      // Assert - modifying one should not affect the other
      filters.orchestrations![0].versions!.push("2.0.0");
      expect(filters.orchestrations![1].versions).toEqual(["1.0.0"]);
    });

    it("should not include entity versions even when Strict versioning is set", () => {
      // Arrange
      const registry = new Registry();
      registry.addEntity(myEntity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry, {
        version: "1.0.0",
        matchStrategy: VersionMatchStrategy.Strict,
      });

      // Assert - entities don't have versions (matching .NET SDK behavior)
      expect(filters.entities![0]).toEqual({ name: "myentity" });
      expect((filters.entities![0] as any).versions).toBeUndefined();
    });
  });

  describe("TaskHubGrpcWorker workItemFilters option", () => {
    it("should accept workItemFilters option", () => {
      // Arrange
      const filters: WorkItemFilters = {
        orchestrations: [{ name: "MyOrch" }],
        activities: [{ name: "MyAct" }],
      };

      // Act
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        workItemFilters: filters,
      });

      // Assert
      expect(worker).toBeDefined();
    });

    it("should accept null workItemFilters to disable filtering", () => {
      // Act
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        workItemFilters: null,
      });

      // Assert
      expect(worker).toBeDefined();
    });

    it("should work without workItemFilters option (auto-generate default)", () => {
      // Act
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
      });

      // Assert
      expect(worker).toBeDefined();
    });

    it("should accept workItemFilters with versioning options together", () => {
      // Arrange
      const filters: WorkItemFilters = {
        orchestrations: [{ name: "MyOrch", versions: ["1.0"] }],
      };

      // Act
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        versioning: {
          version: "1.0",
          matchStrategy: VersionMatchStrategy.Strict,
        },
        workItemFilters: filters,
      });

      // Assert
      expect(worker).toBeDefined();
    });
  });

  describe("Registry name getters", () => {
    it("should return empty arrays for empty registry", () => {
      // Arrange
      const registry = new Registry();

      // Assert
      expect(registry.getOrchestratorNames()).toEqual([]);
      expect(registry.getActivityNames()).toEqual([]);
      expect(registry.getEntityNames()).toEqual([]);
    });

    it("should return orchestrator names", () => {
      // Arrange
      const registry = new Registry();
      registry.addOrchestrator(myOrchestrator);
      registry.addNamedOrchestrator("Custom", anotherOrchestrator);

      // Assert
      expect(registry.getOrchestratorNames()).toEqual(["myOrchestrator", "Custom"]);
    });

    it("should return activity names", () => {
      // Arrange
      const registry = new Registry();
      registry.addActivity(myActivity);
      registry.addNamedActivity("Custom", anotherActivity);

      // Assert
      expect(registry.getActivityNames()).toEqual(["myActivity", "Custom"]);
    });

    it("should return entity names (lowercased)", () => {
      // Arrange
      const registry = new Registry();
      registry.addEntity(myEntity);
      registry.addNamedEntity("CustomEntity", anotherEntity);

      // Assert
      expect(registry.getEntityNames()).toEqual(["myentity", "customentity"]);
    });
  });

  describe("End-to-end: registry → filters → grpc conversion", () => {
    it("should produce correct gRPC message from registry with all types", () => {
      // Arrange
      const registry = new Registry();
      registry.addNamedOrchestrator("ProcessOrder", myOrchestrator);
      registry.addNamedActivity("SendEmail", myActivity);
      registry.addNamedEntity("Counter", myEntity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry, {
        version: "1.0.0",
        matchStrategy: VersionMatchStrategy.Strict,
      });
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      const orchList = grpcFilters.getOrchestrationsList();
      expect(orchList).toHaveLength(1);
      expect(orchList[0].getName()).toBe("ProcessOrder");
      expect(orchList[0].getVersionsList()).toEqual(["1.0.0"]);

      const actList = grpcFilters.getActivitiesList();
      expect(actList).toHaveLength(1);
      expect(actList[0].getName()).toBe("SendEmail");
      expect(actList[0].getVersionsList()).toEqual(["1.0.0"]);

      const entList = grpcFilters.getEntitiesList();
      expect(entList).toHaveLength(1);
      expect(entList[0].getName()).toBe("counter"); // lowercased
    });

    it("should produce correct gRPC message with no versioning", () => {
      // Arrange
      const registry = new Registry();
      registry.addNamedOrchestrator("Workflow", myOrchestrator);
      registry.addNamedActivity("Task1", myActivity);

      // Act
      const filters = generateWorkItemFiltersFromRegistry(registry);
      const grpcFilters = toGrpcWorkItemFilters(filters);

      // Assert
      expect(grpcFilters.getOrchestrationsList()[0].getName()).toBe("Workflow");
      expect(grpcFilters.getOrchestrationsList()[0].getVersionsList()).toEqual([]);
      expect(grpcFilters.getActivitiesList()[0].getName()).toBe("Task1");
      expect(grpcFilters.getActivitiesList()[0].getVersionsList()).toEqual([]);
    });
  });

  describe("TaskHubGrpcWorker._buildGetWorkItemsRequest", () => {
    it("should not send filters when workItemFilters is undefined (default)", () => {
      // Arrange
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
      });
      worker.addOrchestrator(myOrchestrator);
      worker.addActivity(myActivity);

      // Act
      const request = (worker as any)._buildGetWorkItemsRequest();

      // Assert — no filters sent by default (opt-in only)
      expect(request.hasWorkitemfilters()).toBe(false);
    });

    it("should auto-generate filters from registry when workItemFilters is 'auto'", () => {
      // Arrange
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        workItemFilters: "auto",
      });
      worker.addOrchestrator(myOrchestrator);
      worker.addActivity(myActivity);

      // Act
      const request = (worker as any)._buildGetWorkItemsRequest();

      // Assert
      expect(request.hasWorkitemfilters()).toBe(true);
      const filters = request.getWorkitemfilters()!;
      const orchNames = filters.getOrchestrationsList().map((o: any) => o.getName());
      const actNames = filters.getActivitiesList().map((a: any) => a.getName());
      expect(orchNames).toContain("myOrchestrator");
      expect(actNames).toContain("myActivity");
    });

    it("should not send filters when workItemFilters is not configured (default)", () => {
      // Arrange
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
      });
      worker.addOrchestrator(myOrchestrator);

      // Act
      const request = (worker as any)._buildGetWorkItemsRequest();

      // Assert — default is no filters (opt-in only)
      expect(request.hasWorkitemfilters()).toBe(false);
    });

    it("should use explicit filters when workItemFilters is provided", () => {
      // Arrange
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        workItemFilters: {
          orchestrations: [{ name: "ExplicitOrch", versions: ["2.0"] }],
          activities: [{ name: "ExplicitAct" }],
          entities: [{ name: "ExplicitEnt" }],
        },
      });
      // Register different names to prove explicit filters take precedence
      worker.addOrchestrator(myOrchestrator);

      // Act
      const request = (worker as any)._buildGetWorkItemsRequest();

      // Assert
      expect(request.hasWorkitemfilters()).toBe(true);
      const filters = request.getWorkitemfilters()!;

      const orchList = filters.getOrchestrationsList();
      expect(orchList).toHaveLength(1);
      expect(orchList[0].getName()).toBe("ExplicitOrch");
      expect(orchList[0].getVersionsList()).toEqual(["2.0"]);

      const actList = filters.getActivitiesList();
      expect(actList).toHaveLength(1);
      expect(actList[0].getName()).toBe("ExplicitAct");

      const entList = filters.getEntitiesList();
      expect(entList).toHaveLength(1);
      expect(entList[0].getName()).toBe("explicitent");
    });

    it("should include version in auto-generated filters when Strict versioning is set", () => {
      // Arrange
      const worker = new TaskHubGrpcWorker({
        hostAddress: "localhost:4001",
        workItemFilters: "auto",
        versioning: {
          version: "3.0.0",
          matchStrategy: VersionMatchStrategy.Strict,
        },
      });
      worker.addOrchestrator(myOrchestrator);

      // Act
      const request = (worker as any)._buildGetWorkItemsRequest();

      // Assert
      const filters = request.getWorkitemfilters()!;
      expect(filters.getOrchestrationsList()[0].getVersionsList()).toEqual(["3.0.0"]);
    });
  });
});
